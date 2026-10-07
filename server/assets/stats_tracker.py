"""Persist usage counters, round summaries, and structured gameplay events."""

import json
import copy
import hashlib
import logging
import os
import re
import time
from logging.handlers import RotatingFileHandler
from threading import Lock
from uuid import uuid4


class StatsTracker:
    def __init__(self, storage_path):
        self.storage_path = storage_path
        self.lock = Lock()
        self.server_run_id = str(uuid4())
        self.environment = 'development' if os.environ.get('DEV', '').lower() in ('1', 'true', 'yes') else 'production'
        self._last_save = 0
        self.events_path = os.path.join(os.path.dirname(storage_path), 'logs', 'gameplay-events.jsonl')
        os.makedirs(os.path.dirname(self.events_path), exist_ok=True)
        self.event_logger = logging.Logger('gameplay_events', level=logging.INFO)
        handler = RotatingFileHandler(self.events_path, maxBytes=10 * 1024 * 1024,
                                      backupCount=9, encoding='utf-8', delay=True)
        handler.setFormatter(logging.Formatter('%(message)s'))
        self.event_logger.addHandler(handler)
        self.data = {
            'total_games_created': 0,
            'total_games_completed': 0,
            'unique_player_ids': [],     # persisted as list, used as set
            'completed_games': [],       # list of game records
            'acquisition': {},
            'acquisition_since': time.time(),
            'metrics_schema_version': 2,
            'metrics_since': time.time(),
            'event_counts': {},
            'failure_reasons': {},
            'round_outcomes': {},
            'round_history': [],
        }
        self._load()
        self.data['metrics_schema_version'] = 2
        # A restart does not establish when an unfinished round actually ended.
        for record in self.data['round_history']:
            if record.get('outcome') == 'in_progress':
                record.update(outcome='interrupted', end_reason='server_restart',
                              closed_at=time.time(), ended_at=None, duration_seconds=None)
                outcomes = self.data['round_outcomes']
                outcomes['interrupted'] = outcomes.get('interrupted', 0) + 1
                self._event_locked('round_interrupted', **record,
                                   round_server_run_id=record.get('server_run_id'))
        self.record_event('server_started', flush=True)

    # ---- persistence ----

    def _load(self):
        if not os.path.exists(self.storage_path):
            return
        try:
            with open(self.storage_path, 'r') as f:
                loaded = json.load(f)
            for key in self.data:
                if key in loaded:
                    self.data[key] = loaded[key]
        except (json.JSONDecodeError, IOError):
            # Corrupt file — keep defaults, don't crash the server
            pass

    def _save_locked(self):
        try:
            os.makedirs(os.path.dirname(self.storage_path) or '.', exist_ok=True)
            tmp = self.storage_path + '.tmp'
            with open(tmp, 'w') as f:
                json.dump(self.data, f, indent=2)
            os.replace(tmp, self.storage_path)
            self._last_save = time.monotonic()
        except OSError:
            logging.getLogger('app_logger').exception('Usage stats write failed')

    # ---- recording ----

    @staticmethod
    def normalize_acquisition(value):
        value = value if isinstance(value, dict) else {}
        sources = {'direct', 'google', 'bing', 'chatgpt', 'facebook', 'instagram',
                   'snapchat', 'reddit', 'youtube', 'shared-link', 'other', 'unknown'}
        pages = {'/', '/play', '/among-us-irl', '/how-to-play-among-us-irl',
                 '/among-us-irl-task-ideas', '/among-us-irl-task-generator',
                 '/social-deduction-games', '/among-us-birthday-party', '/party-games-for-10-people',
                 '/party-games-for-adults', '/murder-mystery-party-game',
                 '/birthday-party-games-for-adults', '/game-night-ideas',
                 '/make-cleaning-fun-for-kids', '/traitors-at-home', '/party-games-on-your-phone',
                 '/sleepover-games-for-teens', '/indoor-family-reunion-games', '/how-to-play', '/faq', '/about'}
        source = value.get('source')
        page = value.get('landing_page')
        return {
            'source': source if isinstance(source, str) and source in sources else 'unknown',
            'landing_page': page if isinstance(page, str) and page in pages else '/play',
        }

    def _acquisition_bucket(self, acquisition):
        acquisition = self.normalize_acquisition(acquisition)
        key = acquisition['source'] + '|' + acquisition['landing_page']
        return self.data['acquisition'].setdefault(key, {
            **acquisition, 'rooms_created': 0, 'rooms_started': 0,
            'rounds_started': 0, 'rounds_completed': 0,
        })

    def _event_locked(self, event, game=None, player_id=None, connection_id=None, **fields):
        now = time.time()
        room_session_id = getattr(game, 'room_session_id', None)
        record = {
            **fields,
            'schema_version': 2, 'event_id': str(uuid4()), 'event': event,
            'timestamp': now, 'server_run_id': self.server_run_id,
            'environment': self.environment,
        }
        if game:
            record.update(room_code=getattr(game, 'room_code', None), room_session_id=room_session_id,
                          round_id=getattr(game, 'round_id', None) if getattr(game, 'round_started_at', None) is not None else None)
        for name, value, salt in (
            ('participant_id', player_id, room_session_id or self.server_run_id),
            ('connection_id', connection_id, self.server_run_id),
        ):
            if value:
                record[name] = hashlib.sha256(f'{salt}:{value}'.encode()).hexdigest()[:24]
        if 'room_code' in record and not re.fullmatch(r'[A-Z0-9]{4}', str(record['room_code'])):
            record['room_code'] = None
        self.event_logger.info(json.dumps(record, ensure_ascii=True, separators=(',', ':')))
        counts = self.data['event_counts']
        counts[event] = counts.get(event, 0) + 1
        if fields.get('reason') and (event.endswith('_rejected') or event in ('reconnect_failed', 'socket_error')):
            key = event + ':' + fields['reason']
            self.data['failure_reasons'][key] = self.data['failure_reasons'].get(key, 0) + 1
        if game and event in ('task_completed', 'meeting_started', 'card_played', 'meltdown_started'):
            game.last_gameplay_at = now
            for row in reversed(self.data['round_history']):
                if row.get('round_id') == game.round_id and row.get('outcome') == 'in_progress':
                    row['last_gameplay_at'] = now
                    row['tasks_completed'] = game.stats.get('tasks_completed', 0)
                    row['meetings_called'] = game.stats.get('meetings_called', 0)
                    if event == 'task_completed' and not fields.get('is_fake') and row.get('first_task_seconds') is None:
                        row['first_task_seconds'] = round(max(0, time.monotonic() - game.round_started_monotonic), 3)
                    break

    def record_event(self, event, game=None, player_id=None, connection_id=None, flush=False, **fields):
        with self.lock:
            self._event_locked(event, game, player_id, connection_id, **fields)
            # JSONL events flush on each write. Aggregate counters checkpoint every ten seconds.
            if flush or time.monotonic() - self._last_save >= 10:
                self._save_locked()

    def record_game_created(self, room_code, acquisition=None, game=None):
        with self.lock:
            self.data['total_games_created'] += 1
            self._acquisition_bucket(acquisition)['rooms_created'] += 1
            self._event_locked('room_created', game, room_code=room_code,
                               acquisition=self.normalize_acquisition(acquisition))
            self._save_locked()

    def record_game_started(self, game):
        with self.lock:
            if len(game.players) < 3 or getattr(game, '_stats_start_recorded', False):
                return
            game.round_started_at = time.time()
            game.round_started_monotonic = time.monotonic()
            game.round_ended_monotonic = None
            game.last_gameplay_at = game.round_started_at
            game.round_number = getattr(game, 'round_number', 0) + 1
            game.room_session_id = getattr(game, 'room_session_id', str(uuid4()))
            game.round_id = getattr(game, 'round_id', str(uuid4()))
            tasks = getattr(game, 'collaborative_tasks', [])
            content = sorted((str(task.get('task', '')).strip(), str(task.get('location', '')).strip()) for task in tasks)
            locations = {location.casefold() for _, location in content if location.casefold() not in ('', 'other', 'none', 'anywhere')}
            game._round_metrics = {
                'schema_version': 2, 'duration_basis': 'round_start',
                'room_code': getattr(game, 'room_code', None), 'room_session_id': game.room_session_id,
                'round_id': game.round_id, 'round_number': game.round_number,
                'server_run_id': self.server_run_id, 'environment': self.environment,
                'room_created_at': getattr(game, 'created_at', None),
                'lobby_started_at': getattr(game, 'lobby_started_at', None),
                'room_opened_at': getattr(game, 'room_opened_at', None),
                'started_at': game.round_started_at,
                'setup_seconds': round(max(0, time.monotonic() - game.lobby_started_monotonic), 3)
                    if getattr(game, 'lobby_started_monotonic', None) is not None else None,
                'player_count_at_start': len(game.players),
                'active_player_count_at_start': sum(bool(getattr(player, 'active', False)) for player in game.players),
                'intruder_count': getattr(game, 'numIntruders', None),
                'task_list_code': getattr(game, 'collaborative_task_list_code', None),
                'task_fingerprint': hashlib.sha256(json.dumps(content, ensure_ascii=True).encode()).hexdigest(),
                'task_count_at_start': len(tasks), 'used_location_count': len(locations),
                'configured_location_count': len({str(loc).strip().casefold() for loc in getattr(game, 'locations', []) if str(loc).strip().casefold() not in ('', 'other')}),
                'task_goal': getattr(game, 'taskGoal', None), 'tasks_per_crewmate': getattr(game, 'task_ratio', None),
                'meeting_seconds': getattr(game, 'vote_time', None), 'has_reactor': getattr(game, 'has_reactor', False),
                'card_deck_preset': getattr(game, 'card_deck_preset', None),
                'acquisition': self.normalize_acquisition(getattr(game, 'acquisition', None)),
                'first_task_seconds': None, 'last_gameplay_at': game.round_started_at,
            }
            self.data['round_history'].append({**game._round_metrics, 'outcome': 'in_progress'})
            self.data['round_history'] = self.data['round_history'][-1000:]
            self._event_locked('round_started', game, **game._round_metrics)
            game._stats_start_recorded = True
            bucket = self._acquisition_bucket(getattr(game, 'acquisition', None))
            bucket['rounds_started'] += 1
            if not getattr(game, '_acquisition_room_started', False):
                bucket['rooms_started'] += 1
                game._acquisition_room_started = True
            self._save_locked()

    def record_player_seen(self, player_id):
        if not player_id:
            return
        with self.lock:
            seen = set(self.data['unique_player_ids'])
            if player_id in seen:
                return
            seen.add(player_id)
            self.data['unique_player_ids'] = list(seen)
            self._save_locked()

    def record_game_ended(self, game):
        if game is None:
            return
        with self.lock:
            # Avoid double-recording if multiple end paths fire
            if getattr(game, '_stats_recorded', False):
                return
            started_at = getattr(game, 'round_started_at', None)
            ended_at = getattr(game, 'end_time', None) or time.time()
            duration = None
            if started_at is not None:
                duration = self._duration(game, ended_at)

            stats = getattr(game, 'stats', {}) or {}

            record = {
                **getattr(game, '_round_metrics', {}),
                'schema_version': 2, 'duration_basis': 'round_start' if started_at is not None else 'unknown',
                'room_code': getattr(game, 'room_code', None),
                'started_at': started_at,
                'ended_at': ended_at,
                'duration_seconds': duration,
                'end_state': getattr(game, 'end_state', None),
                'player_count': len(getattr(game, 'players', [])),
                'intruder_count': getattr(game, 'initial_numIntruders', None),
                'meetings_called': stats.get('meetings_called', 0),
                'players_voted_out': stats.get('players_voted_out', 0),
                'cards_played': stats.get('cards_played', 0),
                'meltdowns_triggered': stats.get('meltdowns_triggered', 0),
                'tasks_completed': stats.get('tasks_completed', 0),
                'fake_tasks_sent': stats.get('fake_tasks_sent', []),
                'fake_tasks_completed': stats.get('fake_tasks_completed', []),
                'taunts_sent': stats.get('taunts_sent', []),
            }

            self._finish_round_locked(game, record, 'completed', 'game_result')
            game._stats_recorded = True

            self.data['total_games_completed'] += 1
            if getattr(game, '_stats_start_recorded', False):
                self._acquisition_bucket(getattr(game, 'acquisition', None))['rounds_completed'] += 1
            self.data['completed_games'].append(record)
            # Trim so the file doesn't grow forever
            if len(self.data['completed_games']) > 1000:
                self.data['completed_games'] = self.data['completed_games'][-1000:]

            self._save_locked()

    @staticmethod
    def _duration(game, ended_at):
        start = getattr(game, 'round_started_monotonic', None)
        if start is not None:
            end = getattr(game, 'round_ended_monotonic', None)
            return round(max(0, (end if end is not None else time.monotonic()) - start), 3)
        start = getattr(game, 'round_started_at', None)
        return round(max(0, ended_at - start), 3) if start is not None else None

    def _finish_round_locked(self, game, record, outcome, reason):
        previous = next((row for row in reversed(self.data['round_history']) if row.get('round_id') == getattr(game, 'round_id', None)), {})
        players = getattr(game, 'players', [])
        record.update(round_id=getattr(game, 'round_id', None), outcome=outcome, end_reason=reason,
                      first_task_seconds=previous.get('first_task_seconds'),
                      last_gameplay_at=getattr(game, 'last_gameplay_at', None),
                      player_count_at_end=len(players),
                      active_player_count_at_end=sum(bool(getattr(player, 'active', False)) for player in players),
                      crew_score=getattr(game, 'crew_score', None), task_goal=getattr(game, 'taskGoal', None))
        # Keep the event summary free of the legacy record's names and task text.
        summary = {key: value for key, value in record.items() if key not in ('fake_tasks_sent', 'fake_tasks_completed', 'taunts_sent')}
        stats = getattr(game, 'stats', {})
        for key in ('fake_tasks_sent', 'fake_tasks_completed', 'taunts_sent'):
            summary[key + '_count'] = len(stats.get(key, []))
        if previous:
            previous.update(summary)
        else:
            self.data['round_history'].append(summary.copy())
            self.data['round_history'] = self.data['round_history'][-1000:]
        outcomes = self.data['round_outcomes']
        outcomes[outcome] = outcomes.get(outcome, 0) + 1
        self._event_locked('round_ended', game, **summary)

    def record_round_abandoned(self, game, reason):
        with self.lock:
            if getattr(game, 'round_started_at', None) is None or getattr(game, '_stats_recorded', False):
                return
            now = time.time()
            record = {**game._round_metrics, 'ended_at': now, 'duration_seconds': self._duration(game, now),
                      'duration_basis': 'round_start_to_close', 'end_state': None,
                      **{key: game.stats.get(key, 0) for key in ('tasks_completed', 'meetings_called', 'cards_played', 'players_voted_out', 'meltdowns_triggered')}}
            self._finish_round_locked(game, record, 'abandoned', reason)
            game._stats_recorded = True
            self._save_locked()

    def record_room_closed(self, game, reason):
        self.record_round_abandoned(game, reason)
        self.record_event('room_closed', game, reason=reason, flush=True,
                          room_lifetime_seconds=round(max(0, time.time() - game.created_at), 3),
                          rounds_started=game.round_number, player_count=len(game.players))

    # ---- reporting ----

    def snapshot(self):
        """Return a copy of the current stats data (thread-safe)."""
        with self.lock:
            return {
                'total_games_created': self.data['total_games_created'],
                'total_games_completed': self.data['total_games_completed'],
                'unique_player_ids_count': len(self.data['unique_player_ids']),
                'completed_games': copy.deepcopy(self.data['completed_games']),
                'acquisition': [row.copy() for row in self.data['acquisition'].values()],
                'acquisition_since': self.data['acquisition_since'],
                'metrics_schema_version': self.data['metrics_schema_version'],
                'metrics_since': self.data['metrics_since'],
                'event_counts': self.data['event_counts'].copy(),
                'failure_reasons': self.data['failure_reasons'].copy(),
                'round_outcomes': self.data['round_outcomes'].copy(),
                'round_history': copy.deepcopy(self.data['round_history']),
            }

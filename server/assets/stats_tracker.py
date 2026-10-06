"""
Lightweight usage stats tracker.

Persists to a single JSON file on disk. Designed to be cheap and simple:
- Counts games created and completed
- Records each completed game (room_code, timestamps, duration, end_state,
  player_count, basic in-game stats)
- Tracks unique player IDs ever seen across all games

Not a real analytics pipeline. Good enough to answer "are people using this?".
"""

import json
import os
import time
from threading import Lock


class StatsTracker:
    def __init__(self, storage_path):
        self.storage_path = storage_path
        self.lock = Lock()
        self.data = {
            'total_games_created': 0,
            'total_games_completed': 0,
            'unique_player_ids': [],     # persisted as list, used as set
            'completed_games': [],       # list of game records
            'acquisition': {},
            'acquisition_since': time.time(),
        }
        self._load()

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
        except IOError:
            pass

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
                 '/how-to-play', '/faq', '/about'}
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

    def record_game_created(self, room_code, acquisition=None):
        with self.lock:
            self.data['total_games_created'] += 1
            self._acquisition_bucket(acquisition)['rooms_created'] += 1
            self._save_locked()

    def record_game_started(self, game):
        with self.lock:
            if len(game.players) < 3 or getattr(game, '_stats_start_recorded', False):
                return
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
            game._stats_recorded = True

            started_at = getattr(game, 'created_at', None)
            ended_at = getattr(game, 'end_time', None) or time.time()
            duration = None
            if started_at:
                duration = max(0, int(ended_at - started_at))

            stats = getattr(game, 'stats', {}) or {}

            record = {
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

            self.data['total_games_completed'] += 1
            if getattr(game, '_stats_start_recorded', False):
                self._acquisition_bucket(getattr(game, 'acquisition', None))['rounds_completed'] += 1
            self.data['completed_games'].append(record)
            # Trim so the file doesn't grow forever
            if len(self.data['completed_games']) > 1000:
                self.data['completed_games'] = self.data['completed_games'][-1000:]

            self._save_locked()

    # ---- reporting ----

    def snapshot(self):
        """Return a copy of the current stats data (thread-safe)."""
        with self.lock:
            return {
                'total_games_created': self.data['total_games_created'],
                'total_games_completed': self.data['total_games_completed'],
                'unique_player_ids_count': len(self.data['unique_player_ids']),
                'completed_games': list(self.data['completed_games']),
                'acquisition': [row.copy() for row in self.data['acquisition'].values()],
                'acquisition_since': self.data['acquisition_since'],
            }

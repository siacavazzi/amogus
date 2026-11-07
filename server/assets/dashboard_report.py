"""Builds the private dashboard's numbers from the gameplay event log.

The log (logs/gameplay-events.jsonl plus its rotated .1 to .9 copies) is read once and then
only its new lines, so a refresh costs milliseconds. The server runs one eventlet worker, so
the first read yields every few thousand lines instead of holding up live games.

Days and weeks are UTC. Weeks start on Monday.
"""

import json
import os
import re
import statistics
import time
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from threading import Lock

DAY = 86400
KEEP_SECONDS = 70 * DAY          # events older than this drop out of memory
SESSION_GAP = 2 * 3600           # rounds further apart than this are separate sessions
REPORT_TTL = 60                  # seconds a built report is reused

_EVENTS = (
    'room_created', 'host_entered', 'room_opened', 'player_joined', 'player_reconnected',
    'room_entered', 'join_rejected', 'round_started', 'round_ended', 'round_interrupted',
    'room_closed', 'client_error', 'socket_error', 'page_translated',
)
_WANTED = re.compile(r'"event": ?"(' + '|'.join(_EVENTS) + r')"')

IN_APP_BROWSERS = {'facebook_app', 'instagram', 'snapchat_app', 'tiktok_app', 'google_app', 'line_app'}

SIZE_BUCKETS = ((3, 4, '3–4'), (5, 6, '5–6'), (7, 9, '7–9'), (10, 14, '10–14'), (15, 19, '15–19'), (20, 10 ** 6, '20+'))
ROUND_BUCKETS = ((1, 1, '1'), (2, 2, '2'), (3, 4, '3–4'), (5, 9, '5–9'), (10, 10 ** 6, '10+'))

ENDINGS = (
    ('crew_vote', 'Crew voted the intruders out'),
    ('crew_tasks', 'Crew finished the tasks'),
    ('crew_other', 'Crew won another way'),
    ('intruders', 'Intruders won'),
    ('meltdown', 'Meltdown'),
    ('abandoned', 'Stopped without a result'),
    ('interrupted', 'Lost to a server restart'),
)


def _day(ts):
    return datetime.fromtimestamp(ts, timezone.utc).strftime('%Y-%m-%d')


def _week(ts):
    d = datetime.fromtimestamp(ts, timezone.utc).date()
    return (d - timedelta(days=d.weekday())).isoformat()


def _lang(value):
    if not isinstance(value, str) or not value:
        return None
    base = value.split('-')[0].lower()
    return 'no' if base in ('nb', 'nn') else base


def _ending(rnd):
    if rnd.get('outcome') == 'interrupted':
        return 'interrupted'
    if rnd.get('outcome') == 'abandoned' or rnd.get('end') is None:
        return 'abandoned'
    state, win = rnd.get('end_state'), rnd.get('win')
    if state == 'meltdown_fail' or win == 'meltdown':
        return 'meltdown'
    if state == 'sus_victory':
        return 'intruders'
    if win == 'intruders_voted_out':
        return 'crew_vote'
    if win == 'tasks':
        return 'crew_tasks'
    return 'crew_other' if state == 'victory' else 'abandoned'


def _bucket(value, buckets):
    for low, high, label in buckets:
        if low <= value <= high:
            return label
    return None


def _ranked(counter, limit=None):
    rows = [{'key': key, 'count': count} for key, count in counter.most_common() if key is not None]
    return rows[:limit] if limit else rows


class EventLogIndex:
    """Keeps the compact facts the dashboard needs, read incrementally from the event log."""

    def __init__(self, events_path):
        self.events_path = events_path
        self.lock = Lock()
        self.offsets = {}      # inode -> bytes read
        self.reset()
        self._report = None
        self._report_at = 0

    def reset(self):
        self.rooms = {}
        self.rounds = {}
        self.joins = []        # one per phone per room
        self.entries = []
        self.rejections = []
        self.client_errors = []
        self.socket_errors = []
        self.translated = []
        self.first_event_at = None
        self.first_device_at = None
        self.device_first_seen = {}

    # ---- reading ----

    def _files(self):
        paths = [f'{self.events_path}.{n}' for n in range(9, 0, -1)] + [self.events_path]
        return [path for path in paths if os.path.exists(path)]

    def refresh(self):
        with self.lock:
            seen = set()
            for path in self._files():
                try:
                    stat = os.stat(path)
                except OSError:
                    continue
                inode = stat.st_ino
                seen.add(inode)
                start = self.offsets.get(inode, 0)
                if stat.st_size < start:   # truncated or replaced: read it again
                    start = 0
                if stat.st_size == start:
                    continue
                self.offsets[inode] = self._read(path, start)
            for inode in list(self.offsets):
                if inode not in seen:
                    del self.offsets[inode]
            self._prune(time.time() - KEEP_SECONDS)

    def _read(self, path, start):
        with open(path, 'rb') as handle:
            handle.seek(start)
            position = start
            for count, raw in enumerate(handle):
                if not raw.endswith(b'\n'):
                    break               # a line still being written: read it next time
                position += len(raw)
                if count % 2000 == 1999:
                    time.sleep(0)       # let live games run during a long first read
                line = raw.decode('utf-8', 'replace')
                if not _WANTED.search(line):
                    continue
                try:
                    self.add(json.loads(line))
                except (ValueError, TypeError, KeyError):
                    continue
            return position

    def _room(self, event):
        rs = event.get('room_session_id')
        if not rs:
            return None
        room = self.rooms.get(rs)
        if room is None:
            room = self.rooms[rs] = {
                'id': rs, 'code': event.get('room_code'), 'created': event.get('timestamp'),
                'source': None, 'page': None, 'host_device': None, 'host_browser': None,
                'host_lang': None, 'host_offset': None, 'host_anon': None, 'opened': None, 'closed': None,
                'participants': {}, 'rounds': [], 'anon': set(), 'langs': Counter(),
            }
        return room

    def _device(self, device, ts):
        if device and device not in self.device_first_seen:
            self.device_first_seen[device] = ts
            if self.first_device_at is None or ts < self.first_device_at:
                self.first_device_at = ts

    def add(self, event):
        name, ts = event.get('event'), event.get('timestamp')
        if not isinstance(ts, (int, float)):
            return
        if self.first_event_at is None or ts < self.first_event_at:
            self.first_event_at = ts
        anon = event.get('anon_device_id') if isinstance(event.get('anon_device_id'), str) else None
        self._device(anon, ts)

        if name in ('room_created', 'host_entered', 'room_opened', 'room_closed'):
            room = self._room(event)
            if room is None:
                return
            if name == 'room_created':
                room['created'] = ts
                acq = event.get('acquisition') or {}
                room['source'], room['page'] = acq.get('source'), acq.get('landing_page')
            elif name == 'host_entered':
                room['host_device'] = event.get('device_class')
                room['host_browser'] = event.get('browser_family')
                room['host_lang'] = _lang(event.get('device_lang'))
                room['host_offset'] = event.get('utc_offset_minutes')
                room['host_anon'] = anon or room['host_anon']
                room['created'] = min(room['created'] or ts, ts)
            elif name == 'room_opened':
                room['opened'] = room['opened'] or ts
            else:
                room['closed'] = ts
            return

        if name in ('player_joined', 'player_reconnected'):
            room = self._room(event)
            participant = event.get('participant_id')
            if room is None or not participant:
                return
            if anon:
                room['anon'].add(anon)
            if participant in room['participants']:
                if anon and not room['participants'][participant].get('anon'):
                    room['participants'][participant]['anon'] = anon
                return
            if name != 'player_joined':
                return
            join = {
                'ts': ts, 'room': room['id'], 'device': event.get('device_class'),
                'browser': event.get('browser_family'), 'os': event.get('os_family'),
                'lang': _lang(event.get('device_lang')), 'game_lang': _lang(event.get('game_lang')),
                'translated': _lang(event.get('translated_to')), 'anon': anon,
                'waiting': bool(event.get('waiting_for_next_round')),
            }
            room['participants'][participant] = join
            if join['lang']:
                room['langs'][join['lang']] += 1
            self.joins.append(join)
            return

        if name == 'round_started':
            room = self._room(event)
            rid = event.get('round_id')
            if room is None or not rid or rid in self.rounds:
                return
            rnd = {
                'id': rid, 'room': room['id'], 'start': event.get('started_at') or ts,
                'players': event.get('player_count_at_start') or 0,
                'task_source': event.get('task_source'), 'setup_origin': event.get('setup_origin'),
                'number': event.get('round_number'), 'end': None, 'outcome': 'in_progress',
                'end_state': None, 'win': None, 'duration': None,
                'anon': [d for d in event.get('anon_device_ids') or [] if isinstance(d, str)],
            }
            for device in rnd['anon']:
                self._device(device, ts)
                room['anon'].add(device)
            self.rounds[rid] = rnd
            room['rounds'].append(rnd)
            return

        if name in ('round_ended', 'round_interrupted'):
            rnd = self.rounds.get(event.get('round_id'))
            if rnd is None:
                return
            rnd['outcome'] = 'interrupted' if name == 'round_interrupted' else event.get('outcome') or 'completed'
            rnd['end'] = event.get('ended_at') if rnd['outcome'] == 'completed' else None
            rnd['end_state'] = event.get('end_state')
            rnd['win'] = event.get('win_condition')
            rnd['duration'] = event.get('duration_seconds') if rnd['outcome'] == 'completed' else None
            for device in event.get('anon_device_ids') or []:
                if isinstance(device, str) and device not in rnd['anon']:
                    rnd['anon'].append(device)
                    self.rooms.get(rnd['room'], {}).get('anon', set()).add(device)
            return

        if name == 'room_entered':
            if not event.get('is_creator'):
                self.entries.append((ts, event.get('entry_method') or 'unknown'))
        elif name == 'join_rejected':
            self.rejections.append((ts, event.get('reason') or 'unknown'))
        elif name == 'client_error':
            self.client_errors.append((ts, event.get('error_type') or 'unknown', event.get('screen') or ''))
        elif name == 'socket_error':
            self.socket_errors.append((ts, event.get('command') or '', event.get('reason') or ''))
        elif name == 'page_translated':
            self.translated.append((ts, _lang(event.get('lang'))))

    def _prune(self, cutoff):
        for rs in [rs for rs, room in self.rooms.items() if (room['created'] or 0) < cutoff
                   and all(r['start'] < cutoff for r in room['rounds'])]:
            for rnd in self.rooms[rs]['rounds']:
                self.rounds.pop(rnd['id'], None)
            del self.rooms[rs]
        self.joins = [j for j in self.joins if j['ts'] >= cutoff]
        for name in ('entries', 'rejections', 'client_errors', 'socket_errors', 'translated'):
            setattr(self, name, [row for row in getattr(self, name) if row[0] >= cutoff])

    # ---- reporting ----

    def report(self, now=None, feedback=(), force=False):
        if not force and self._report and time.time() - self._report_at < REPORT_TTL:
            return self._report
        self.refresh()
        with self.lock:
            built = build_report(self, now or time.time(), feedback)
        self._report, self._report_at = built, time.time()
        return built


def _sessions(rooms, rounds_in):
    """Groups back-to-back rounds. Rooms that share 2+ devices within the gap join one session."""
    played = [room for room in rooms if rounds_in[room['id']]]
    parent = {room['id']: room['id'] for room in played}

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    by_device = defaultdict(list)
    for room in played:
        for device in room['anon']:
            by_device[device].append(room)
    for linked in by_device.values():
        for i, a in enumerate(linked):
            for b in linked[i + 1:]:
                if find(a['id']) == find(b['id']) or len(a['anon'] & b['anon']) < 2:
                    continue
                a_start, a_end = rounds_in[a['id']][0]['start'], rounds_in[a['id']][-1]['start']
                b_start, b_end = rounds_in[b['id']][0]['start'], rounds_in[b['id']][-1]['start']
                if b_start - a_end <= SESSION_GAP and a_start - b_end <= SESSION_GAP:
                    parent[find(a['id'])] = find(b['id'])

    groups = defaultdict(list)
    for room in played:
        groups[find(room['id'])].append(room)
    sessions = []
    for members in groups.values():
        rounds = sorted((r for room in members for r in rounds_in[room['id']]), key=lambda r: r['start'])
        current = [rounds[0]]
        for rnd in rounds[1:]:
            if rnd['start'] - current[-1]['start'] > SESSION_GAP:
                sessions.append(current)
                current = []
            current.append(rnd)
        sessions.append(current)
    return sessions


def _local_hours(rounds, rooms):
    """Rounds by the hour they started on the host's clock. Rounds with no known offset are left out."""
    hours = [0] * 24
    for rnd in rounds:
        offset = (rooms.get(rnd['room']) or {}).get('host_offset')
        if isinstance(offset, int):
            hours[int(((rnd['start'] + offset * 60) % DAY) // 3600)] += 1
    return hours


def _window(index, start, end, feedback):
    rooms = [room for room in index.rooms.values() if room['created'] and start <= room['created'] < end]
    rounds = [rnd for rnd in index.rounds.values() if start <= rnd['start'] < end]
    rounds_by_room = defaultdict(list)
    for rnd in sorted(rounds, key=lambda r: r['start']):
        rounds_by_room[rnd['room']].append(rnd)
    played_rooms = [index.rooms[rs] for rs in rounds_by_room if rs in index.rooms]
    joins = [j for j in index.joins if start <= j['ts'] < end]
    played_ids = set(rounds_by_room)
    played_joins = [j for j in joins if j['room'] in played_ids]

    # Hosts: the device that created the room. A desktop host is usually the reactor screen.
    hosts = defaultdict(lambda: {'created': 0, 'played': 0})
    for room in rooms:
        kind = {'mobile': 'phone'}.get(room['host_device'], room['host_device'] or 'unknown')
        hosts[kind]['created'] += 1
        hosts[kind]['played'] += bool(room['rounds'] and any(r['start'] < end for r in room['rounds']))

    sources = defaultdict(lambda: {'created': 0, 'played': 0})
    for room in rooms:
        key = room['source'] or 'unknown'
        sources[key]['created'] += 1
        sources[key]['played'] += bool(room['rounds'])

    funnel = [
        ('created', 'Rooms created', len(rooms)),
        ('opened', 'Opened to players', sum(1 for r in rooms if r['opened'])),
        ('three', '3+ phones joined', sum(1 for r in rooms if len(r['participants']) >= 3)),
        ('played', 'Played a round', sum(1 for r in rooms if r['rounds'])),
    ]

    sessions = _sessions(played_rooms, rounds_by_room)
    lengths = [len(s) for s in sessions]
    endings = Counter(_ending(rnd) for rnd in rounds if rnd['outcome'] != 'in_progress')
    in_progress = sum(1 for rnd in rounds if rnd['outcome'] == 'in_progress')

    browsers = Counter(j['browser'] or 'unknown' for j in played_joins)
    langs = Counter(j['lang'] for j in played_joins if j['lang'])
    translated = Counter(j['translated'] for j in played_joins if j['translated'])
    task_sources = Counter((rounds_by_room[rs][0].get('task_source') or 'unknown') for rs in rounds_by_room)

    # Devices: only rounds whose phones reported one count; earlier rounds are unknown, not new.
    devices = set()
    for rnd in rounds:
        devices.update(rnd['anon'])
    for j in played_joins:
        if j['anon']:
            devices.add(j['anon'])
    returning = {d for d in devices if index.device_first_seen.get(d, start) < start}

    seats = sum(len(room['participants']) for room in played_rooms)
    durations = [rnd['duration'] for rnd in rounds if rnd['duration']]

    recent = []
    for room in sorted(played_rooms, key=lambda r: rounds_by_room[r['id']][0]['start'], reverse=True)[:60]:
        rs = rounds_by_room[room['id']]
        ends = Counter(_ending(r) for r in rs)
        recent.append({
            'code': room['code'], 'first_round': rs[0]['start'], 'last_round': rs[-1]['start'],
            'rounds': len(rs), 'max_players': max(r['players'] for r in rs),
            'phones': len(room['participants']),
            'crew_wins': ends['crew_vote'] + ends['crew_tasks'] + ends['crew_other'],
            'intruder_wins': ends['intruders'] + ends['meltdown'],
            'unfinished': ends['abandoned'] + ends['interrupted'],
            'host_device': {'mobile': 'phone'}.get(room['host_device'], room['host_device'] or 'unknown'),
            'source': room['source'] or 'unknown', 'language': (room['langs'].most_common(1) or [[None]])[0][0],
            'utc_offset_minutes': room['host_offset'],
            'in_app_share': round(sum(1 for p in room['participants'].values() if p['browser'] in IN_APP_BROWSERS)
                                  / len(room['participants']), 2) if room['participants'] else None,
            'returning_devices': sum(1 for d in room['anon'] if index.device_first_seen.get(d, start) < start),
            'devices': len(room['anon']),
            'task_source': rs[0].get('task_source') or 'unknown',
        })

    ratings = Counter(row.get('rating') or 'comment_only' for row in feedback
                      if start <= (row.get('submitted_at') or 0) < end and not row.get('analytics_excluded'))

    return {
        'start': start, 'end': end,
        'totals': {
            'rounds': len(rounds), 'rooms_played': len(played_rooms), 'rooms_created': len(rooms),
            'seats': seats, 'devices': len(devices), 'returning_devices': len(returning),
            'biggest_round': max((r['players'] for r in rounds), default=0),
            'median_round_seconds': round(statistics.median(durations)) if durations else None,
            'sessions': len(sessions), 'in_progress': in_progress,
        },
        'local_hours': _local_hours(rounds, index.rooms),
        'group_sizes': [{'key': label, 'count': sum(1 for r in rounds if _bucket(r['players'], SIZE_BUCKETS) == label)}
                        for _, _, label in SIZE_BUCKETS],
        'session_lengths': [{'key': label, 'count': sum(1 for n in lengths if _bucket(n, ROUND_BUCKETS) == label)}
                            for _, _, label in ROUND_BUCKETS],
        'session_stats': {
            'median_rounds': statistics.median(lengths) if lengths else None,
            'multi_round_share': round(sum(1 for n in lengths if n > 1) / len(lengths), 3) if lengths else None,
            'rooms_per_session': round(len(played_rooms) / len(sessions), 2) if sessions else None,
        },
        'endings': [{'key': key, 'label': label, 'count': endings.get(key, 0)} for key, label in ENDINGS],
        'hosts': sorted(({'key': key, **value} for key, value in hosts.items()),
                        key=lambda r: (r['key'] == 'unknown', -r['created'])),
        'sources': sorted(({'key': key, **value} for key, value in sources.items()),
                          key=lambda r: (r['key'] == 'unknown', -r['played'], -r['created'])),
        'funnel': [{'key': key, 'label': label, 'count': count} for key, label, count in funnel],
        'browsers': _ranked(browsers),
        'in_app': {'phones': sum(v for k, v in browsers.items() if k in IN_APP_BROWSERS), 'of': sum(browsers.values())},
        'languages': _ranked(langs, 12),
        'translated': _ranked(translated),
        'task_sources': _ranked(task_sources),
        'entry_methods': _ranked(Counter(m for ts, m in index.entries if start <= ts < end)),
        'join_rejections': _ranked(Counter(r for ts, r in index.rejections if start <= ts < end)),
        'client_errors': [{'key': f'{kind} on {screen}' if screen else kind, 'count': count} for (kind, screen), count in
                          Counter((k, s) for ts, k, s in index.client_errors if start <= ts < end).most_common(8)],
        'socket_errors': [{'key': f'{command}: {reason}', 'count': count} for (command, reason), count in
                          Counter((c, r) for ts, c, r in index.socket_errors if start <= ts < end).most_common(8)],
        'error_totals': {
            'client': sum(1 for row in index.client_errors if start <= row[0] < end),
            'socket': sum(1 for row in index.socket_errors if start <= row[0] < end),
        },
        'feedback': [{'key': key, 'count': ratings.get(key, 0)} for key in ('fun', 'okay', 'needs_work', 'comment_only')],
        'recent_rooms': recent,
    }


def build_report(index, now, feedback=()):
    today = datetime.fromtimestamp(now, timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    day_starts = [(today - timedelta(days=n)).timestamp() for n in range(27, -1, -1)]
    this_week = today - timedelta(days=today.weekday())
    week_starts = [(this_week - timedelta(weeks=n)).timestamp() for n in range(7, -1, -1)]

    def series(starts, length):
        rows = []
        for start in starts:
            end = start + length
            rounds = [r for r in index.rounds.values() if start <= r['start'] < end]
            rooms_played = {r['room'] for r in rounds}
            created = sum(1 for room in index.rooms.values() if room['created'] and start <= room['created'] < end)
            devices = set()
            for r in rounds:
                devices.update(r['anon'])
            devices.update(j['anon'] for j in index.joins if j['anon'] and start <= j['ts'] < end and j['room'] in rooms_played)
            returning = sum(1 for d in devices if index.device_first_seen.get(d, start) < start)
            rows.append({
                'start': start, 'label': _day(start), 'rounds': len(rounds), 'rooms_played': len(rooms_played),
                'rooms_created': created,
                'seats': sum(len(index.rooms[rs]['participants']) for rs in rooms_played if rs in index.rooms),
                'big_rounds': sum(1 for r in rounds if r['players'] >= 7),
                'devices': len(devices), 'returning_devices': returning, 'new_devices': len(devices) - returning,
                'partial': end > now,
            })
        return rows

    windows = {}
    for days in (7, 28):
        start = now - days * DAY
        windows[str(days)] = _window(index, start, now, feedback)
        windows[str(days)]['previous'] = _window(index, start - days * DAY, start, feedback)['totals']

    return {
        'built_at': now,
        'log_since': index.first_event_at,
        'devices_since': index.first_device_at,
        'daily': series(day_starts, DAY),
        'weekly': series(week_starts, 7 * DAY),
        'windows': windows,
    }


if __name__ == '__main__':
    # Print the report for a copy of the log: python -m assets.dashboard_report path/to/gameplay-events.jsonl
    import sys
    report = EventLogIndex(sys.argv[1]).report(force=True)
    print(json.dumps(report, indent=1, default=list))

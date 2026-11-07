import json
import os
import shutil
import sys
import tempfile
import unittest
from pathlib import Path
from threading import Lock
from types import SimpleNamespace
from unittest.mock import Mock

SERVER_DIR = Path(__file__).resolve().parents[1]
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

from assets.dashboard_report import EventLogIndex, build_report  # noqa: E402
from assets.game_manager import GameManager, LIVE_ACTIVITY_SECONDS  # noqa: E402

NOW = 1_794_052_800.0  # Sat 2026-11-07 12:00 UTC
HOUR = 3600


class LogWriter:
    def __init__(self, path):
        self.path = path
        self.count = 0

    def write(self, event, ts, **fields):
        self.count += 1
        with open(self.path, 'a') as handle:
            handle.write(json.dumps({'event': event, 'timestamp': ts, 'event_id': str(self.count), **fields}) + '\n')

    def room(self, rs, ts, device='mobile', source='google', offset=60, anon=None):
        self.write('room_created', ts, room_session_id=rs, room_code=rs[:4].upper(),
                   acquisition={'source': source, 'landing_page': '/play'})
        self.write('host_entered', ts, room_session_id=rs, device_class=device, browser_family='chrome',
                   device_lang='en-US', utc_offset_minutes=offset, **({'anon_device_id': anon} if anon else {}))

    def join(self, rs, ts, participant, browser='safari', lang='nb-NO', anon=None):
        self.write('player_joined', ts, room_session_id=rs, participant_id=participant, device_class='mobile',
                   browser_family=browser, device_lang=lang, **({'anon_device_id': anon} if anon else {}))

    def round(self, rs, rid, ts, players, end_state='victory', win='intruders_voted_out', outcome='completed', anon=()):
        self.write('round_started', ts, room_session_id=rs, round_id=rid, started_at=ts,
                   player_count_at_start=players, task_source='generator', anon_device_ids=list(anon))
        if outcome:
            self.write('round_ended', ts + 600, room_session_id=rs, round_id=rid, outcome=outcome,
                       ended_at=ts + 600, end_state=end_state, win_condition=win, duration_seconds=600)


class DashboardReportTests(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp()
        self.path = os.path.join(self.dir, 'gameplay-events.jsonl')
        self.log = LogWriter(self.path)

    def tearDown(self):
        shutil.rmtree(self.dir)

    def report(self, index=None):
        index = index or EventLogIndex(self.path)
        index.refresh()
        return build_report(index, NOW)

    def test_counts_rounds_rooms_endings_and_hosts_for_the_last_seven_days(self):
        day = NOW - 2 * 86400
        self.log.room('room-a', day, device='mobile')
        for n in range(4):
            self.log.join('room-a', day + 10 + n, f'p{n}', browser='facebook_app' if n == 0 else 'safari')
        self.log.round('room-a', 'r1', day + 100, 4)
        self.log.round('room-a', 'r2', day + 900, 4, end_state='victory', win='tasks')
        self.log.round('room-a', 'r3', day + 1700, 4, end_state='sus_victory', win='last_stand_kill')
        self.log.round('room-a', 'r4', day + 2500, 4, outcome='abandoned', end_state=None, win=None)
        self.log.room('room-b', day + 50, device='desktop', source='direct')   # never played
        self.log.room('room-old', NOW - 10 * 86400)                             # previous week
        self.log.round('room-old', 'r0', NOW - 10 * 86400 + 60, 3)

        report = self.report()
        week = report['windows']['7']
        self.assertEqual(4, week['totals']['rounds'])
        self.assertEqual(1, week['totals']['rooms_played'])
        self.assertEqual(2, week['totals']['rooms_created'])
        self.assertEqual(4, week['totals']['seats'])
        self.assertEqual(1, week['previous']['rounds'])
        endings = {row['key']: row['count'] for row in week['endings']}
        self.assertEqual((1, 1, 1, 1), (endings['crew_vote'], endings['crew_tasks'], endings['intruders'], endings['abandoned']))
        hosts = {row['key']: (row['created'], row['played']) for row in week['hosts']}
        self.assertEqual({'phone': (1, 1), 'desktop': (1, 0)}, hosts)
        self.assertEqual({'phones': 1, 'of': 4}, week['in_app'])
        self.assertEqual([{'key': 'no', 'count': 4}], week['languages'])   # nb counts as Norwegian
        self.assertEqual([2, 0, 1, 1], [row['count'] for row in week['funnel']])
        # Rounds start at 12:00 UTC + 100 s on a UTC+1 host clock: the 13:00 hour.
        self.assertEqual(4, week['local_hours'][13])
        self.assertEqual(4, report['daily'][-3]['rounds'])
        self.assertEqual('2026-11-05', report['daily'][-3]['label'])
        room = week['recent_rooms'][0]
        self.assertEqual((4, 4, 2, 1, 1), (room['rounds'], room['max_players'], room['crew_wins'], room['intruder_wins'], room['unfinished']))

    def test_rooms_sharing_devices_join_one_session_and_returning_devices_count(self):
        day = NOW - 86400
        self.log.round('earlier', 'r0', NOW - 9 * 86400, 3, anon=['d1', 'x'])
        self.log.room('room-a', day)
        self.log.round('room-a', 'r1', day + 60, 3, anon=['d1', 'd2', 'd3'])
        self.log.room('room-b', day + 1800)
        self.log.round('room-b', 'r2', day + 1900, 3, anon=['d1', 'd2', 'd4'])
        self.log.room('room-c', day + 1800)
        self.log.round('room-c', 'r3', day + 1900, 3, anon=['d1', 'd9', 'd8'])  # only 1 shared phone

        week = self.report()['windows']['7']
        self.assertEqual(2, week['totals']['sessions'])
        self.assertEqual(1.5, week['session_stats']['median_rounds'])
        self.assertEqual(6, week['totals']['devices'])
        self.assertEqual(1, week['totals']['returning_devices'])

    def test_without_devices_a_quick_new_room_on_the_same_clock_and_language_continues_the_session(self):
        day = NOW - 86400
        self.log.room('room-a', day, offset=60)
        for n in range(3):
            self.log.join('room-a', day + n, f'a{n}', lang='nb-NO')
        self.log.round('room-a', 'r1', day + 60, 3)                 # ends at +660
        self.log.room('room-b', day + 900, offset=60)
        for n in range(3):
            self.log.join('room-b', day + 900 + n, f'b{n}', lang='nb-NO')
        self.log.round('room-b', 'r2', day + 1000, 3)               # 340 s after room-a's last round
        self.log.room('room-c', day + 900, offset=-300)             # another group, another clock
        self.log.round('room-c', 'r3', day + 1000, 3)
        week = self.report()['windows']['7']
        self.assertEqual(2, week['totals']['sessions'])

    def test_reads_only_new_lines_and_follows_rotation(self):
        self.log.room('room-a', NOW - HOUR)
        self.log.round('room-a', 'r1', NOW - HOUR + 60, 5)
        index = EventLogIndex(self.path)
        self.assertEqual(1, self.report(index)['windows']['7']['totals']['rounds'])

        # A half-written line waits for its newline.
        with open(self.path, 'a') as handle:
            handle.write('{"event":"round_started","timestamp":')
        self.assertEqual(1, self.report(index)['windows']['7']['totals']['rounds'])
        with open(self.path, 'a') as handle:
            handle.write(f'{NOW - 600},"room_session_id":"room-a","round_id":"r2","player_count_at_start":5}}\n')
        self.assertEqual(2, self.report(index)['windows']['7']['totals']['rounds'])

        # The handler renames the full file to .1 and starts a new one.
        os.rename(self.path, self.path + '.1')
        self.log.round('room-a', 'r3', NOW - 300, 5, outcome=None)
        week = self.report(index)['windows']['7']
        self.assertEqual(3, week['totals']['rounds'])
        self.assertEqual(2, week['totals']['in_progress'])  # r2 and r3 have no end yet

    def test_bad_lines_are_skipped(self):
        with open(self.path, 'w') as handle:
            handle.write('not json "event":"round_started"\n{"event":"round_started"}\n')
        self.log.room('room-a', NOW - HOUR)
        self.log.round('room-a', 'r1', NOW - HOUR + 60, 3)
        self.assertEqual(1, self.report()['windows']['7']['totals']['rounds'])


class LiveRoomTests(unittest.TestCase):
    def setUp(self):
        self.manager = GameManager.__new__(GameManager)
        self.manager.lock = Lock()
        self.manager.games = {}
        self.manager.sid_to_game = {}
        self.manager.stats_tracker = Mock()

    def add(self, code, running=False, connected=0, players=0, idle=0, sockets=0, ended=False, synthetic=False):
        self.manager.games[code] = SimpleNamespace(
            players=[SimpleNamespace(active=i < connected) for i in range(players)],
            game_running=running, end_state='victory' if ended else None, last_activity=NOW - idle,
            created_at=NOW - idle - 60, meeting=None, reactor_sids=[], round_number=1, synthetic=synthetic)
        for n in range(sockets):
            self.manager.sid_to_game[f'{code}-{n}'] = code

    def test_only_rounds_and_recent_lobbies_count_as_in_use(self):
        self.add('PLAY', running=True, connected=5, players=6, idle=1200, sockets=5)
        self.add('LOBB', connected=3, players=3, idle=60, sockets=3)
        self.add('OLDL', connected=1, players=4, idle=LIVE_ACTIVITY_SECONDS + 1, sockets=1)  # left open
        self.add('GONE', running=True, players=8, idle=3600)                                 # phones gone
        self.add('DONE', ended=True, players=5, idle=7200)
        self.add('TEST', running=True, connected=3, players=3, sockets=3, synthetic=True)
        rooms = {room['room_code']: room['status'] for room in self.manager.live_rooms(NOW)}
        self.assertEqual({'PLAY': 'playing', 'LOBB': 'lobby', 'OLDL': 'idle', 'GONE': 'idle', 'DONE': 'idle'}, rooms)


if __name__ == '__main__':
    unittest.main()

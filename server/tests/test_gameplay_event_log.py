"""The gameplay event log covers what happens inside a round, not only its start and end (2026-10-31)."""
import json
import tempfile
import time
import unittest
from pathlib import Path
from threading import RLock
from types import SimpleNamespace

from server.tests.integration_helpers import SocketGameTestCase, NoopStatsTracker, server_app
from server.assets import client_info
from server.assets.meltdown import Meltdown
from server.assets.stats_tracker import StatsTracker


QUIET = {'starting_cards': 0, 'card_draw_probability': 0}


class RecordingStatsTracker(NoopStatsTracker):
    def __init__(self):
        self.events = []

    def record_event(self, event, game=None, player_id=None, connection_id=None, flush=False, **fields):
        self.events.append({'event': event, 'player_id': player_id, **fields})

    def named(self, event):
        return [row for row in self.events if row['event'] == event]


class EventLogTestCase(SocketGameTestCase):
    def setUp(self):
        super().setUp()
        self.tracker = RecordingStatsTracker()
        server_app.game_manager.stats_tracker = self.tracker

    def call_meeting(self, clients, ids, game):
        caller = next(p for p in game.players if not p.sus and p.player_id != ids[0])
        self.client_for_player(clients, ids, caller).emit('meeting', {'player_id': caller.player_id})
        self.drain_all(clients)
        return caller


class MeetingEventTests(EventLogTestCase):
    def test_a_voted_meeting_logs_how_it_opened_and_who_went_out(self):
        clients, room, ids, game = self.setup_started_game(5, config=QUIET)
        self.call_meeting(clients, ids, game)
        for player in self.living(game):
            self.client_for_player(clients, ids, player).emit('ready', {'player_id': player.player_id})
        target = self.crew(game)[0]
        for client, pid in zip(clients, ids):
            client.emit('vote', {'player_id': pid, 'votedFor': target.player_id})
        self.drain_all(clients)

        ended = self.tracker.named('meeting_ended')
        self.assertEqual(1, len(ended))
        row = ended[0]
        self.assertEqual(('button', 'votes', 'voted_out', 'crew'),
                         (row['trigger'], row['end_reason'], row['outcome'], row['voted_out_role']))
        self.assertEqual('all_ready', row['voting_opened_by'])
        self.assertEqual(5, row['ready_at_vote_open']['ready'])
        self.assertEqual(5, row['votes_cast'])
        self.assertIsNotNone(row['voting_seconds'])
        died = self.tracker.named('player_died')
        self.assertEqual(['voted_out_innocent'], [row['cause'] for row in died])
        self.assertEqual('meeting', died[0]['during'])
        self.assertEqual(target.player_id, died[0]['player_id'])

    def test_a_stuck_meeting_logs_who_it_waits_for_and_closes_with_the_room_reset(self):
        clients, room, ids, game = self.setup_started_game(6, config=QUIET)
        self.call_meeting(clients, ids, game)
        for client, pid in list(zip(clients, ids))[:2]:
            client.emit('ready', {'player_id': pid})
        clients[5].disconnect()
        self.drain_all(clients[:5])
        game.meeting.log_if_stalled()

        stalled = self.tracker.named('meeting_stalled')[-1]
        self.assertEqual(2, stalled['ready'])
        self.assertEqual(3, stalled['not_ready_connected'])
        self.assertEqual(1, stalled['not_ready_offline'])
        self.assertTrue(stalled['host_connected'])

        game.reset_game_state(reason='host_reset')
        row = self.tracker.named('meeting_ended')[-1]
        self.assertEqual('host_reset', row['end_reason'])
        self.assertIsNone(row['voting_opened_by'])
        self.assertEqual(2, row['ready_at_end']['ready'])

    def test_a_host_override_and_a_veto_are_named(self):
        clients, room, ids, game = self.setup_started_game(5, config=QUIET)
        self.call_meeting(clients, ids, game)
        clients[1].emit('ready', {'player_id': ids[1]})
        game.meeting.opened_at -= game.meeting.HOST_OVERRIDE_AFTER_SECONDS + 1
        clients[0].emit('host_start_voting', {'player_id': ids[0], 'round_id': game.round_id,
                                              'meeting_id': game.meeting.id})
        for client, pid in zip(clients, ids):
            client.emit('veto', {'player_id': pid})
        row = self.tracker.named('meeting_ended')[-1]
        self.assertEqual(('host', 'veto', 'veto'), (row['voting_opened_by'], row['end_reason'], row['outcome']))
        self.assertGreaterEqual(row['vetoes'], 3)

    def test_a_meeting_is_logged_once_however_many_paths_end_it(self):
        clients, room, ids, game = self.setup_started_game(5, config=QUIET)
        self.call_meeting(clients, ids, game)
        meeting = game.meeting
        meeting.log_end('room_closed')
        meeting.log_end('round_ended')
        self.assertEqual(1, len(self.tracker.named('meeting_ended')))


class FakeMeltdownGame:
    def __init__(self, players):
        self.players = players
        self.state_lock = RLock()
        self.round_id = 'r1'
        self.game_running = True
        self.end_state = None
        self.revision = 0
        self.active_meltdown = None
        self.events = []

    def log_event(self, event, player_id=None, **fields):
        self.events.append({'event': event, **fields})

    def round_seconds(self):
        return 42.0

    def living_counts(self):
        return {'living_crew': 3, 'living_intruders': 1}

    def emit_to_room(self, event, data=None):
        pass

    def meltdown(self, meltdown=None):
        self.end_state = 'meltdown_fail'


class MeltdownEventTests(unittest.TestCase):
    def make(self):
        players = [SimpleNamespace(alive=True, absent=False, sid=None, meltdown_code=None) for _ in range(4)]
        meltdown = Meltdown(players, 60, SimpleNamespace(emit=lambda *a, **k: None),
                            SimpleNamespace(stop=lambda: None, play_sound=lambda *_: None), 0.6)
        game = FakeMeltdownGame(players)
        meltdown.game, meltdown.round_id, game.active_meltdown = game, 'r1', meltdown
        meltdown.started_at = time.monotonic() - 12
        return meltdown, game

    def test_a_lost_meltdown_logs_codes_needed_entered_and_wrong_tries(self):
        meltdown, game = self.make()
        meltdown.check_pin('0000')
        meltdown.check_pin('abc')
        meltdown.check_pin(meltdown.valid_pins[0])
        meltdown.end_meltdown(success=False)
        row = game.events[-1]
        self.assertEqual('meltdown_ended', row['event'])
        self.assertEqual('time_ran_out', row['end_reason'])
        self.assertEqual((meltdown.codes_needed, 1, 2), (row['codes_needed'], row['codes_entered'], row['wrong_pins']))
        self.assertEqual(4, row['codes_handed_out'])
        self.assertGreaterEqual(row['seconds_used'], 12)

    def test_a_won_meltdown_logs_once(self):
        meltdown, game = self.make()
        for pin in list(meltdown.valid_pins)[:meltdown.codes_needed]:
            meltdown.check_pin(pin)
        meltdown.log_end('room_closed')
        rows = [row for row in game.events if row['event'] == 'meltdown_ended']
        self.assertEqual(['codes_entered'], [row['end_reason'] for row in rows])


class JoinAndConnectionEventTests(EventLogTestCase):
    def test_joins_record_how_the_phone_arrived(self):
        host = self.make_client()
        room = self.create_open_room(host)
        for method in ('qr', 'share_link', 'typed', 'invite_link'):
            guest = self.make_client()
            guest.emit('join_game', {'room_code': room, 'entry_method': method})
        guest = self.make_client()
        guest.emit('join_game', {'room_code': room, 'entry_method': 'made-up'})
        methods = [row['entry_method'] for row in self.tracker.named('room_entered') if not row.get('is_creator')]
        self.assertEqual(['qr', 'share_link', 'typed', 'invite_link', 'unknown'], methods)

    def test_a_phone_that_gives_up_after_bad_codes_is_counted(self):
        host = self.make_client()
        self.create_open_room(host)
        guest = self.make_client()
        guest.emit('join_game', {'room_code': 'ZZZZ', 'entry_method': 'typed'})
        guest.emit('join_game', {'room_code': 'ZZZY', 'entry_method': 'typed'})
        rejected = self.tracker.named('join_rejected')
        self.assertEqual([1, 2], [row['attempt'] for row in rejected])
        guest.disconnect()
        abandoned = self.tracker.named('join_abandoned')
        self.assertEqual(1, len(abandoned))
        self.assertEqual((2, 2, 'room_not_found'),
                         (abandoned[0]['attempts'], abandoned[0]['errors'], abandoned[0]['last_reason']))

    def test_a_successful_join_after_errors_is_not_abandoned(self):
        host = self.make_client()
        room = self.create_open_room(host)
        guest = self.make_client()
        guest.emit('join_game', {'room_code': 'ZZZZ'})
        guest.emit('join_game', {'room_code': room})
        entered = self.tracker.named('room_entered')[-1]
        self.assertEqual((1, ['room_not_found']), (entered['errors_before'], entered['error_reasons_before']))
        guest.disconnect()
        self.assertEqual([], self.tracker.named('join_abandoned'))

    def test_a_corrected_room_code_is_flagged(self):
        host = self.make_client()
        room = self.create_open_room(host)
        lookalike = {'A': '4', 'E': '3', 'T': '7'}
        typed = ''.join(lookalike.get(ch, ch) for ch in room)
        if typed == room:
            self.skipTest('room code has no look-alike letters')
        guest = self.make_client()
        guest.emit('join_game', {'room_code': typed.lower()})
        self.assertTrue(self.tracker.named('room_entered')[-1]['code_corrected'])

    def test_a_reconnect_reports_whether_the_phone_was_locked(self):
        client = self.socketio.test_client(self.flask_app, auth={'last_drop': {
            'page_hidden': True, 'hidden_seconds': 31.5, 'browser_offline': False,
            'seconds_since_drop': 33, 'extra': 'dropped'}})
        row = self.tracker.named('connection_opened')[-1]
        self.assertEqual({'page_hidden': True, 'hidden_seconds': 31.5, 'browser_offline': False,
                          'seconds_since_drop': 33.0}, row['last_drop'])
        client.disconnect()

    def test_connections_carry_browser_and_os_family(self):
        ua = ('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 '
              '(KHTML, like Gecko) Mobile/15E148 Instagram 300.0')
        self.socketio.test_client(self.flask_app, headers={'User-Agent': ua})
        row = self.tracker.named('connection_opened')[-1]
        self.assertEqual(('mobile', 'ios', 'instagram'), (row['device_class'], row['os_family'], row['browser_family']))


class SetupAndClientMetricTests(EventLogTestCase):
    def test_settings_changes_are_logged_without_location_names(self):
        host = self.make_client()
        host.emit('create_game')
        room = self.first_event(self.drain(host), 'game_created')['room_code']
        host.emit('update_game_config', {'room_code': room, 'config': {
            'vote_time': 90, 'meeting_quorum': False, 'locations': ['Grandmas room', 'Attic']}})
        row = self.tracker.named('settings_changed')[-1]
        self.assertEqual({'vote_time': 90, 'meeting_quorum': False}, row['changed'])
        self.assertTrue(row['locations_changed'])
        self.assertNotIn('Grandmas room', json.dumps(row))

    def test_a_room_closed_in_setup_says_how_far_the_host_got(self):
        host = self.make_client()
        host.emit('create_game', {'setup': 'generated'})
        room = self.first_event(self.drain(host), 'game_created')['room_code']
        host.emit('client_metric', {'kind': 'setup_step', 'step': 'settings'})
        game = server_app.game_manager.get_game(room)
        self.assertEqual(('settings', 'generator'), (game.last_setup_step, game.setup_origin))
        self.assertEqual('settings', self.tracker.named('setup_step')[-1]['step'])
        self.assertEqual('generator', self.tracker.named('host_entered')[-1]['setup_origin'])

    def test_client_errors_keep_only_labels(self):
        client = self.make_client()
        client.emit('client_metric', {'kind': 'client_error', 'error_type': 'TypeError',
                                      'screen': '/play', 'where': 'main.1a2b.js:2:14523',
                                      'message': 'Cannot read secret name Bob'})
        client.emit('client_metric', {'kind': 'client_error', 'error_type': 'Bad name with spaces'})
        client.emit('client_metric', {'kind': 'something_else'})
        rows = self.tracker.named('client_error')
        self.assertEqual(['TypeError', 'unknown'], [row['error_type'] for row in rows])
        self.assertEqual('main.1a2b.js:2:14523', rows[0]['where'])
        self.assertNotIn('Bob', json.dumps(rows))
        self.assertEqual(2, len([row for row in self.tracker.events if row['event'].startswith('client')
                                 and row['event'] != 'connection_opened']))

    def test_client_metrics_are_capped_per_socket(self):
        client = self.make_client()
        for _ in range(server_app.CLIENT_METRICS_PER_SOCKET + 5):
            client.emit('client_metric', {'kind': 'client_error', 'error_type': 'TypeError'})
        self.assertEqual(server_app.CLIENT_METRICS_PER_SOCKET, len(self.tracker.named('client_error')))


class TaskTimingTests(EventLogTestCase):
    def test_completed_tasks_carry_their_time_and_a_stable_key(self):
        clients, room, ids, game = self.setup_started_game(4, config=QUIET)
        crew = self.crew(game)[0]
        task = dict(crew.task)
        crew.task_assigned_monotonic -= 40
        self.client_for_player(clients, ids, crew).emit('complete_task', {'player_id': crew.player_id})
        row = self.tracker.named('task_completed')[-1]
        self.assertGreaterEqual(row['task_seconds'], 40)
        self.assertEqual(StatsTracker.task_key(task), row['task_key'])
        self.assertNotIn(task['task'], json.dumps(row))
        self.assertEqual([row['task_seconds']], game.task_seconds)
        self.assertEqual(row['task_seconds'], game.task_summary()['median_task_seconds'])


class PureHelperTests(unittest.TestCase):
    def test_task_key_ignores_case_and_spacing_but_not_the_place(self):
        a = StatsTracker.task_key({'task': 'Fold  the towels', 'location': 'Laundry'})
        self.assertEqual(a, StatsTracker.task_key({'task': 'fold the towels', 'location': 'laundry '}))
        self.assertNotEqual(a, StatsTracker.task_key({'task': 'fold the towels', 'location': 'Kitchen'}))
        self.assertIsNone(StatsTracker.task_key({'task': 'x', 'location': 'y', 'is_fake': True}))

    def test_visit_details_are_clamped_and_allowlisted(self):
        self.assertEqual({'seconds_since_landing': 95.0, 'pages_viewed': 3, 'tools_used': ['task_generator']},
                         StatsTracker.normalize_visit({'seconds_since_landing': 95, 'pages_viewed': 3,
                                                       'tools_used': ['task_generator', 'https://evil']}))
        self.assertEqual({'seconds_since_landing': None, 'pages_viewed': None, 'tools_used': []},
                         StatsTracker.normalize_visit({'seconds_since_landing': -1, 'pages_viewed': 'x'}))

    def test_browser_families(self):
        cases = {
            'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/24.0 Chrome/117 Mobile Safari/537.36': ('android', 'samsung'),
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1': ('ios', 'safari'),
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/119 Mobile/15E148 Safari/604.1': ('ios', 'chrome'),
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119 Safari/537.36 Edg/119': ('windows', 'edge'),
            '': ('unknown', 'unknown'),
        }
        for ua, expected in cases.items():
            self.assertEqual(expected, (client_info.os_family(ua), client_info.browser_family(ua)), ua)

    def test_round_summary_includes_task_source_and_settings(self):
        with tempfile.TemporaryDirectory() as folder:
            tracker = StatsTracker(str(Path(folder) / 'stats.json'))
            game = SimpleNamespace(players=[1, 2, 3], acquisition={}, meeting_quorum=True, auto_intruders=True,
                                   setup_origin='generator', task_source=lambda: 'generator')
            tracker.record_game_started(game)
            row = tracker.snapshot()['round_history'][-1]
            self.assertEqual((True, True, 'generator', 'generator'),
                             (row['meeting_quorum'], row['auto_intruders'], row['task_source'], row['setup_origin']))


class WinningVoteTests(EventLogTestCase):
    def test_voting_out_the_last_intruder_is_logged_as_a_vote_not_a_round_end(self):
        clients, room, ids, game = self.setup_started_game(5, config={**QUIET, 'num_intruders': 1})
        self.call_meeting(clients, ids, game)
        for player in self.living(game):
            self.client_for_player(clients, ids, player).emit('ready', {'player_id': player.player_id})
        target = self.intruders(game)[0]
        for client, pid in zip(clients, ids):
            client.emit('vote', {'player_id': pid, 'votedFor': target.player_id})
        self.drain_all(clients)
        self.assertEqual('victory', game.end_state)
        row = self.tracker.named('meeting_ended')[-1]
        self.assertEqual(('votes', 'voted_out', 'intruder'), (row['end_reason'], row['outcome'], row['voted_out_role']))

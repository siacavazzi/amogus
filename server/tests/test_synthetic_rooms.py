import io
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch

from server.tests.integration_helpers import SocketGameTestCase, protocol_client, server_app
from assets.stats_tracker import StatsTracker


class SyntheticRoomTests(SocketGameTestCase):
    """Rooms from the live end-to-end run must not count as real play."""

    def setUp(self):
        super().setUp()
        self.tmp = tempfile.TemporaryDirectory()
        self.tracker = StatsTracker(str(Path(self.tmp.name) / 'stats.json'))
        server_app.game_manager.stats_tracker = self.tracker
        self.baseline = self.tracker.snapshot()

    def tearDown(self):
        self.tmp.cleanup()

    def make_synthetic_client(self):
        return protocol_client(self.socketio.test_client(self.flask_app, auth={'synthetic': True}))

    def play_round(self, make_client):
        clients = [make_client() for _ in range(4)]
        room_code = self.create_open_room(clients[0], config={'num_intruders': 1, 'starting_cards': 0})
        player_ids = [self.join_player(client, room_code, f'P{i}', use_join_game=i > 0)
                      for i, client in enumerate(clients)]
        self.add_tasks(clients[0], room_code, 12)
        self.start_game(clients[0], player_ids[0], clients)
        game = server_app.game_manager.get_game(room_code)
        intruder = self.intruders(game)[0]
        self.start_meeting_and_ready_living_players(clients, player_ids, game, self.crew(game)[0])
        for player in self.living(game):
            self.client_for_player(clients, player_ids, player).emit(
                'vote', {'player_id': player.player_id, 'votedFor': intruder.player_id})
        self.drain_all(clients)
        self.assertEqual('victory', game.end_state)
        clients[0].emit('disband_room', {'player_id': player_ids[0]})
        for client in clients:
            client.disconnect()

    def test_synthetic_round_leaves_usage_stats_unchanged(self):
        self.play_round(self.make_synthetic_client)
        after = self.tracker.snapshot()
        for key in ('total_games_created', 'total_games_completed', 'unique_player_ids_count',
                    'event_counts', 'round_history', 'acquisition'):
            self.assertEqual(self.baseline[key], after[key], key)

    def test_synthetic_round_writes_no_routine_logs_or_prints(self):
        printed = io.StringIO()
        # The server wraps stdout at startup; pytest swaps its own stream in per test.
        with patch.object(sys, 'stdout', server_app.SyntheticQuietStream(printed)):
            with self.assertNoLogs(level='INFO'):
                self.play_round(self.make_synthetic_client)
        self.assertEqual('', printed.getvalue())

    def test_regular_round_still_prints(self):
        printed = io.StringIO()
        with patch.object(sys, 'stdout', server_app.SyntheticQuietStream(printed)):
            self.play_round(self.make_client)
        self.assertNotEqual('', printed.getvalue())

    def test_synthetic_warnings_stay_and_are_tagged(self):
        client = self.make_synthetic_client()
        with self.assertLogs('app_logger', level='WARNING') as logs:
            client.emit('join_game', {'room_code': 'ZZZZ'})
        self.assertTrue(all(line.split(':', 2)[2].startswith('[e2e] ') for line in logs.output), logs.output)

    def test_regular_round_still_logs(self):
        with self.assertLogs('app_logger', level='INFO'):
            self.play_round(self.make_client)

    def test_regular_round_is_still_counted(self):
        self.play_round(self.make_client)
        after = self.tracker.snapshot()
        self.assertEqual(self.baseline['total_games_created'] + 1, after['total_games_created'])
        self.assertEqual(self.baseline['total_games_completed'] + 1, after['total_games_completed'])

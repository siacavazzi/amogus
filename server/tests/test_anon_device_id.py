"""The anonymous device ID: a random UUID the browser keeps, so returning phones and hosts are countable."""
import tempfile
import uuid
from pathlib import Path
from types import SimpleNamespace

from server.tests.integration_helpers import protocol_client, server_app
from server.tests.test_gameplay_event_log import EventLogTestCase
from server.assets.stats_tracker import StatsTracker


def device():
    return str(uuid.uuid4())


class AnonDeviceIdTests(EventLogTestCase):
    def client_with(self, device_id, status='stored'):
        return protocol_client(self.socketio.test_client(
            self.flask_app, auth={'anon_device_id': device_id, 'anon_device_status': status}))

    def test_every_event_from_the_socket_carries_the_device(self):
        host_device = device()
        host = self.client_with(host_device, 'created')
        room = self.create_open_room(host)
        opened = self.tracker.named('connection_opened')[-1]
        self.assertEqual((host_device, 'created'), (opened['anon_device_id'], opened['anon_device_status']))
        self.assertEqual(host_device, self.tracker.named('host_entered')[-1]['anon_device_id'])
        self.join_player(host, room, 'Host')
        joined = self.tracker.named('player_joined')[-1]
        self.assertEqual(host_device, joined['anon_device_id'])

    def test_anything_but_a_random_uuid_is_dropped(self):
        for value in ('Sam', 'device_abc123', str(uuid.uuid1()), device().upper() + 'x', 42, None):
            self.client_with(value)
            row = self.tracker.named('connection_opened')[-1]
            self.assertNotIn('anon_device_id', row, value)
        self.client_with(device(), 'something-else')
        self.assertIsNone(self.tracker.named('connection_opened')[-1]['anon_device_status'])

    def test_old_pages_without_an_id_still_play(self):
        clients, room, ids, game = self.setup_started_game(3)
        self.assertTrue(game.game_running)
        self.assertNotIn('anon_device_id', self.tracker.named('player_joined')[-1])

    def test_players_keep_their_device_and_rejoins_update_it(self):
        devices = [device() for _ in range(3)]
        clients = [self.client_with(d) for d in devices]
        room = self.create_open_room(clients[0])
        ids = [self.join_player(c, room, f'P{i}', use_join_game=i > 0) for i, c in enumerate(clients)]
        game = server_app.game_manager.get_game(room)
        self.assertEqual(devices, [game.getPlayerById(pid).anon_device_id for pid in ids])

        # The same phone comes back on a new socket after its page reloaded.
        clients[2].disconnect()
        again = self.client_with(devices[2])
        again.emit('rejoin', {'player_id': ids[2]})
        self.drain(again)
        self.assertEqual(devices[2], game.getPlayerById(ids[2]).anon_device_id)


class RoundSummaryDeviceTests(EventLogTestCase):
    def test_round_summaries_list_devices_and_the_host(self):
        with tempfile.TemporaryDirectory() as folder:
            tracker = StatsTracker(str(Path(folder) / 'stats.json'))
            a, b = device(), device()
            players = [SimpleNamespace(player_id='p1', anon_device_id=a, active=True),
                       SimpleNamespace(player_id='p2', anon_device_id=b, active=True),
                       SimpleNamespace(player_id='p3', anon_device_id=None, active=True)]
            game = SimpleNamespace(players=players, acquisition={}, creator_player_id='p1')
            tracker.record_game_started(game)
            row = tracker.snapshot()['round_history'][-1]
            self.assertEqual(sorted([a, b]), row['anon_device_ids'])
            self.assertEqual(a, row['host_anon_device_id'])
            self.assertEqual(1, row['players_without_anon_device_id'])

            # A late joiner is added and someone who left is kept.
            late = device()
            game.players = [players[0], SimpleNamespace(player_id='p4', anon_device_id=late, active=True)]
            game.stats = {}
            tracker.record_round_abandoned(game, 'host_reset')
            row = tracker.snapshot()['round_history'][-1]
            self.assertEqual(sorted([a, b, late]), row['anon_device_ids'])
            self.assertEqual(a, row['host_anon_device_id'])

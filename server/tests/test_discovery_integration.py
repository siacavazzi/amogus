import tempfile
from pathlib import Path

from server.tests.integration_helpers import SocketGameTestCase, server_app
from assets.stats_tracker import StatsTracker
from assets.task_list_manager import TaskListManager


class DiscoveryIntegrationTests(SocketGameTestCase):
    def setUp(self):
        super().setUp()
        self.folder = tempfile.TemporaryDirectory()
        self.previous_lists = server_app.task_list_manager
        server_app.task_list_manager = TaskListManager(str(Path(self.folder.name) / 'lists'))
        server_app.game_manager.stats_tracker = StatsTracker(str(Path(self.folder.name) / 'stats.json'))

    def tearDown(self):
        server_app.task_list_manager = self.previous_lists
        self.folder.cleanup()

    def _start_imported_pack(self, finalize=False):
        clients = [self.make_client() for _ in range(8)]
        host = clients[0]
        host.emit('create_game', {'acquisition': {'source': 'google', 'landing_page': '/among-us-irl-task-generator'}})
        room = self.first_event(self.drain(host), 'game_created')['room_code']
        host.emit('create_task_list', {
            'player_id': 'host-device', 'name': 'Imported pack', 'locations': ['Kitchen', 'Hallway'],
            'tasks': [{'task': f'Task {number}', 'location': 'Kitchen' if number % 2 else 'Hallway'} for number in range(24)],
        })
        task_list = self.first_event(self.drain(host), 'task_list_created')['task_list']
        host.emit('apply_task_list_to_game', {'room_code': room, 'task_list_code': task_list['code']})
        self.assertEqual(24, self.first_event(self.drain(host), 'task_list_applied')['task_count'])
        host.emit('open_room', {'room_code': room})
        self.drain(host)
        ids = [self.join_player(client, room, f'Player {number}', use_join_game=number > 0) for number, client in enumerate(clients)]
        self.drain_all(clients)
        event = 'finalize_collaborative_tasks' if finalize else 'start_game'
        host.emit(event, {'room_code': room, 'player_id': ids[0]})
        game = server_app.game_manager.get_game(room)
        self.assertTrue(game.game_running)
        self.assertTrue(self.has_event(self.drain(host), 'game_start'))
        row = server_app.game_manager.get_admin_stats()['acquisition'][0]
        self.assertEqual(('google', '/among-us-irl-task-generator'), (row['source'], row['landing_page']))
        self.assertEqual((1, 1, 1), (row['rooms_created'], row['rooms_started'], row['rounds_started']))

    def test_imported_pack_starts_from_normal_lobby_and_counts_its_source(self):
        self._start_imported_pack()

    def test_imported_pack_starts_from_task_editor_and_counts_its_source(self):
        self._start_imported_pack(finalize=True)

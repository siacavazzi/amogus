import tempfile

from server.tests.integration_helpers import SocketGameTestCase, server_app
from assets.task_list_manager import TaskListManager


class SaveGameLinkTests(SocketGameTestCase):
    """Players rarely come back to host (about 1% did by Nov 2026), and setup is the hard part.
    "Save this game" hands every player a link that carries the room's tasks."""

    def setUp(self):
        super().setUp()
        self.storage = tempfile.TemporaryDirectory()
        self.original_manager = server_app.task_list_manager
        server_app.task_list_manager = TaskListManager(self.storage.name)

    def tearDown(self):
        server_app.task_list_manager = self.original_manager
        self.storage.cleanup()
        super().tearDown()

    def test_any_player_gets_one_code_that_holds_the_room_tasks(self):
        clients, room, ids, game = self.setup_started_game(4)
        first = clients[1].emit('save_game_link', {'room_code': room, 'player_id': ids[1]}, callback=True)
        second = clients[2].emit('save_game_link', {'room_code': room, 'player_id': ids[2]}, callback=True)
        self.assertTrue(first['ok'])
        self.assertEqual(first['code'], second['code'])
        saved = server_app.task_list_manager.get_task_list(first['code'])
        self.assertEqual([task['task'] for task in game.collaborative_tasks], [task['task'] for task in saved['tasks']])
        self.assertIn('Kitchen', saved['locations'])
        self.assertEqual('saved_game', saved['source_template'])

    def test_a_room_playing_a_saved_list_shares_that_list(self):
        clients, room, ids, game = self.setup_started_game(4)
        code = server_app.task_list_manager.create_task_list('device_host', 'Our house', [{'task': 'Sweep', 'location': 'Hall'}], ['Hall', 'Kitchen'])
        game.collaborative_task_list_code = code
        result = clients[3].emit('save_game_link', {'room_code': room, 'player_id': ids[3]}, callback=True)
        self.assertEqual(code, result['code'])

    def test_new_tasks_get_a_new_code(self):
        clients, room, ids, game = self.setup_started_game(4)
        first = clients[0].emit('save_game_link', {'room_code': room, 'player_id': ids[0]}, callback=True)['code']
        game.collaborative_tasks.append({'task': 'Juggle', 'location': 'Kitchen', 'task_id': 'x'})
        second = clients[0].emit('save_game_link', {'room_code': room, 'player_id': ids[0]}, callback=True)['code']
        self.assertNotEqual(first, second)

    def test_built_in_tasks_have_no_code(self):
        clients, room, ids, game = self.setup_lobby(3)
        result = clients[0].emit('save_game_link', {'room_code': room, 'player_id': ids[0]}, callback=True)
        self.assertEqual({'ok': True, 'code': None}, result)

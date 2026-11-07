from server.tests.integration_helpers import SocketGameTestCase


class ExampleTasksInLobbyTests(SocketGameTestCase):
    """A 14-person lobby never started and a 10-person one stalled 14 min on Halloween 2026:
    "Create tasks with group" left them writing 42 tasks by hand. One tap fixes it."""

    def test_a_big_lobby_with_no_tasks_can_start_after_one_tap(self):
        clients, room, ids, game = self.setup_lobby(14)
        self.assertEqual([], game.collaborative_tasks)
        clients[0].emit('start_game', {'player_id': ids[0]})
        self.assertFalse(game.game_running)

        result = clients[0].emit('add_example_tasks', {'room_code': room, 'player_id': ids[0]}, callback=True)
        self.assertTrue(result['ok'])
        self.assertGreaterEqual(len(game.collaborative_tasks), 42)
        self.assertEqual('Other', game.locations[-1])
        self.assertTrue(all(task['location'] in game.locations for task in game.collaborative_tasks))
        lobby = self.event_payloads(self.drain(clients[1]), 'lobby_state')[-1]
        self.assertTrue(lobby['can_start'])

        clients[0].emit('start_game', {'player_id': ids[0]})
        self.assertTrue(game.game_running)

    def test_tasks_the_room_already_wrote_are_kept(self):
        clients, room, ids, game = self.setup_lobby(5)
        self.add_tasks(clients[0], room, 3, locations=('Garage',))
        clients[0].emit('add_example_tasks', {'room_code': room, 'player_id': ids[0]})
        self.assertEqual(['Garage task 0', 'Garage task 1', 'Garage task 2'],
                         [task['task'] for task in game.collaborative_tasks[:3]])
        self.assertEqual('Garage', game.locations[0])

    def test_only_the_host_can_add_them_and_not_mid_round(self):
        clients, room, ids, game = self.setup_lobby(4)
        result = clients[1].emit('add_example_tasks', {'room_code': room, 'player_id': ids[1]}, callback=True)
        self.assertFalse(result['ok'])
        self.assertEqual([], game.collaborative_tasks)

        clients, room, ids, game = self.setup_started_game(4)
        before = list(game.collaborative_tasks)
        result = clients[0].emit('add_example_tasks', {'room_code': room, 'player_id': ids[0]}, callback=True)
        self.assertFalse(result['ok'])
        self.assertEqual(before, game.collaborative_tasks)

    def test_a_french_phone_gets_the_french_example_list(self):
        clients, room, ids, game = self.setup_lobby(5)
        clients[0].emit('add_example_tasks', {'room_code': room, 'player_id': ids[0], 'lang': 'fr'})
        self.assertIn('Cuisine', game.locations)
        self.assertEqual("Ouvre le frigo et trouve le truc le plus vieux à l'intérieur", game.collaborative_tasks[0]['task'])
        self.assertEqual('Other', game.locations[-1])

    def test_a_language_without_a_list_gets_english(self):
        clients, room, ids, game = self.setup_lobby(5)
        clients[0].emit('add_example_tasks', {'room_code': room, 'player_id': ids[0], 'lang': 'ja'})
        self.assertIn('Kitchen', game.locations)


class TranslatedExampleListTests(SocketGameTestCase):
    def test_every_translation_matches_the_english_list(self):
        import json
        from pathlib import Path
        from server.assets.task_list_manager import STARTER_LANGUAGES, TaskListManager
        root = Path(__file__).resolve().parents[1]
        english = json.loads((root / 'tasks.json').read_text())
        for lang in STARTER_LANGUAGES:
            tasks = json.loads((root / f'tasks.{lang}.json').read_text(encoding='utf-8'))
            self.assertEqual(len(english), len(tasks), lang)
            self.assertEqual(len(tasks), len({task['task'] for task in tasks}), lang)
            # "Other" is a key the game treats specially, so it stays in English.
            self.assertEqual([t['location'] == 'Other' for t in english], [t['location'] == 'Other' for t in tasks], lang)
            self.assertEqual(4, len({task['location'] for task in tasks}), lang)
        import tempfile
        with tempfile.TemporaryDirectory() as storage:
            template = TaskListManager(storage).get_default_task_list_template('ro-RO')
        self.assertEqual('Listă de exemplu', template['name'])
        self.assertEqual('starter_house', template['template_key'])

import json
from pathlib import Path

from tests.integration_helpers import SocketGameTestCase, server_app
from assets.game_manager import BLOCKED_ROOM_WORDS
from assets.room_protocol import lobby_state, minimum_tasks


class LobbyNamesAndTasksTests(SocketGameTestCase):
    def test_repeated_names_are_numbered_and_names_are_tidied(self):
        clients = [self.make_client() for _ in range(4)]
        room_code = self.create_open_room(clients[0])
        self.join_player(clients[0], room_code, "Sam")
        self.join_player(clients[1], room_code, "  sam ", use_join_game=True)
        self.join_player(clients[2], room_code, "Sam", use_join_game=True)
        self.join_player(clients[3], room_code, "A" * 100, use_join_game=True)
        names = [player.username for player in server_app.game_manager.get_game(room_code).players]
        self.assertEqual(names[:3], ["Sam", "sam 2", "Sam 3"])
        self.assertEqual(len(names[3]), 24)

    def test_a_name_of_only_spaces_is_refused(self):
        host = self.make_client()
        room_code = self.create_open_room(host)
        host.emit("join", {"room_code": room_code, "username": "   "})
        self.assertFalse(self.has_event(self.drain(host), "player_id"))
        self.assertEqual(server_app.game_manager.get_game(room_code).players, [])

    def test_a_player_who_rejoins_keeps_their_own_name(self):
        clients, room_code, player_ids, game = self.setup_lobby(2)
        clients[1].emit("join", {"room_code": room_code, "username": "P1", "player_id": player_ids[1]})
        self.assertEqual(game.getPlayerById(player_ids[1]).username, "P1")

    def test_room_codes_skip_rude_words(self):
        manager = server_app.game_manager
        rolls = iter(["F", "U", "C", "K", "B", "E", "A", "R"])
        import assets.game_manager as module
        real_choices = module.random.choices
        module.random.choices = lambda population, k: [next(rolls) for _ in range(k)]
        try:
            self.assertEqual(manager._generate_room_code(), "BEAR")
        finally:
            module.random.choices = real_choices
        self.assertIn("FUCK", BLOCKED_ROOM_WORDS)

    def test_a_room_short_on_tasks_says_how_many_to_add(self):
        clients, room_code, player_ids, game = self.setup_lobby(12)
        self.add_tasks(clients[0], room_code, 30)
        self.drain_all(clients)
        state = lobby_state(game)
        self.assertEqual(state["start_reason"], "too_few_tasks")
        self.assertEqual(state["tasks_missing"], 6)
        self.assertEqual(state["start_error"], "Add 6 more tasks to start. 12 players need 36; the room has 30.")
        self.add_tasks(clients[0], room_code, 6)
        state = lobby_state(game)
        self.assertIsNone(state["start_reason"])
        self.assertEqual(state["tasks_missing"], 0)

    def test_the_example_list_can_start_a_room_of_thirty(self):
        tasks = json.loads((Path(server_app.__file__).parent / "tasks.json").read_text())
        clients, room_code, player_ids, game = self.setup_lobby(30)
        self.assertGreaterEqual(len(tasks), minimum_tasks(game))
        self.assertEqual(len({task["task"] for task in tasks}), len(tasks))

    def test_the_example_list_spreads_doable_tasks_across_its_four_rooms(self):
        tasks = json.loads((Path(server_app.__file__).parent / "tasks.json").read_text())
        rooms = {}
        for task in tasks:
            rooms.setdefault(task["location"], []).append(task["task"])
        self.assertEqual(list(rooms), ["Kitchen", "Living Room", "Bedroom", "Other"])
        self.assertTrue(all(len(room_tasks) >= 20 for room_tasks in rooms.values()))
        # Hosts' own lists are mostly actions; keep "find something X" scavenger items a minority.
        finds = [task["task"] for task in tasks if task["task"].startswith("Find something")]
        self.assertLess(len(finds), len(tasks) // 8)

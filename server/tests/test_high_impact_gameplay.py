import sys
import unittest
from pathlib import Path


SERVER_DIR = Path(__file__).resolve().parents[1]
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

import app as server_app  # noqa: E402
from server.tests.integration_helpers import protocol_client


class NoopStatsTracker:
    def record_game_created(self, room_code, acquisition=None, game=None):
        pass

    def record_game_started(self, game):
        pass

    def record_player_seen(self, player_id):
        pass

    def record_game_ended(self, game):
        pass

    def record_event(self, *args, **kwargs):
        pass

    def record_round_abandoned(self, game, reason):
        pass

    def record_room_closed(self, game, reason):
        pass


class HighImpactGameplayTests(unittest.TestCase):
    def setUp(self):
        self.socketio = server_app.socketio
        self.flask_app = server_app.app
        server_app.game_manager.games.clear()
        server_app.game_manager.player_to_game.clear()
        server_app.game_manager.sid_to_game.clear()
        server_app.game_manager.stats_tracker = NoopStatsTracker()

    def make_client(self):
        return protocol_client(self.socketio.test_client(self.flask_app))

    def drain(self, client):
        return client.get_received()

    def first_event(self, events, name):
        for event in events:
            if event["name"] == name:
                return event["args"][0] if event["args"] else None
        return None

    def create_open_room(self, host, config=None):
        host.emit("create_game")
        room_code = self.first_event(self.drain(host), "game_created")["room_code"]
        if config:
            host.emit("update_game_config", {"room_code": room_code, "config": config})
            self.drain(host)
        host.emit("open_room", {"room_code": room_code})
        self.drain(host)
        return room_code

    def join_player(self, client, room_code, username):
        client.emit("join", {"room_code": room_code, "username": username})
        player_id = self.first_event(self.drain(client), "player_id")["player_id"]
        return player_id

    def add_tasks(self, host, room_code, host_id, count, locations=("Kitchen", "Yard")):
        for index in range(count):
            location = locations[index % len(locations)]
            host.emit(
                "add_collaborative_task",
                {
                    "room_code": room_code,
                    "player_id": host_id,
                    "task": {"task": f"{location} task {index}", "location": location},
                },
            )

    def start_game(self, host, host_id, clients):
        host.emit("start_game", {"player_id": host_id})
        for client in clients:
            self.drain(client)

    def setup_started_game(self, player_count, config=None, task_count=None):
        clients = [self.make_client() for _ in range(player_count)]
        host = clients[0]
        room_code = self.create_open_room(host, config=config)
        player_ids = []
        for index, client in enumerate(clients):
            player_ids.append(self.join_player(client, room_code, f"P{index}"))
            for other in clients:
                if other is not client:
                    self.drain(other)
        task_count = task_count if task_count is not None else max(player_count * 3, 10)
        self.add_tasks(clients[0], room_code, player_ids[0], task_count)
        for client in clients:
            self.drain(client)
        self.start_game(clients[0], player_ids[0], clients)
        return clients, room_code, player_ids, server_app.game_manager.get_game(room_code)

    def vote_out(self, clients, player_ids, game, target_player):
        client_by_player_id = {
            player_id: clients[index] for index, player_id in enumerate(player_ids)
        }
        caller = next(player for player in game.players if player.alive and player.player_id != target_player.player_id)
        client_by_player_id[caller.player_id].emit("meeting", {"player_id": caller.player_id})
        for client in clients:
            self.drain(client)

        living_players = [player for player in game.players if player.alive]
        for player in living_players:
            client_by_player_id[player.player_id].emit("ready", {"player_id": player.player_id})
        for client in clients:
            self.drain(client)

        for player in living_players:
            if player.player_id == target_player.player_id:
                client_by_player_id[player.player_id].emit("veto", {"player_id": player.player_id})
            else:
                client_by_player_id[player.player_id].emit(
                    "vote",
                    {"player_id": player.player_id, "votedFor": target_player.player_id},
                )
        for client in clients:
            self.drain(client)

    def test_room_creator_remains_host_when_guest_logs_in_first(self):
        host = self.make_client()
        guest = self.make_client()
        room_code = self.create_open_room(host)

        guest.emit("join_game", {"room_code": room_code})
        self.drain(guest)
        guest.emit("join", {"room_code": room_code, "username": "Guest"})
        guest_player_event = self.first_event(self.drain(guest), "player_id")

        host.emit("join", {"room_code": room_code, "username": "Host"})
        host_player_event = self.first_event(self.drain(host), "player_id")

        self.assertFalse(guest_player_event["is_creator"])
        self.assertTrue(host_player_event["is_creator"])

    def test_room_creator_can_refresh_before_logging_in(self):
        host = self.make_client()
        room_code = self.create_open_room(host)
        host.disconnect()

        refreshed_host = self.make_client()
        refreshed_host.emit("join_game", {"room_code": room_code})
        join_event = self.first_event(self.drain(refreshed_host), "game_joined")
        refreshed_host.emit("join", {"room_code": room_code, "username": "Host"})
        player_event = self.first_event(self.drain(refreshed_host), "player_id")

        self.assertTrue(join_event["is_creator"])
        self.assertTrue(player_event["is_creator"])

    def test_start_rejects_round_without_crew_majority(self):
        clients, room_code, player_ids, game = self.setup_started_game(
            2,
            config={"num_intruders": 2},
            task_count=10,
        )

        self.assertFalse(game.game_running)
        self.assertIsNone(game.end_state)
        events = []
        for client in clients:
            events.extend(self.drain(client))
        self.assertEqual([], [event for event in events if event["name"] == "game_start"])

    def test_default_four_player_room_can_start(self):
        clients, room_code, player_ids, game = self.setup_started_game(4, task_count=12)

        self.assertTrue(game.game_running)
        self.assertEqual(1, game.numIntruders)
        self.assertEqual(3, game.numCrew)

    def test_intruders_win_once_living_crew_does_not_outnumber_intruders(self):
        clients, room_code, player_ids, game = self.setup_started_game(5, config={"num_intruders": 2})
        self.assertEqual(3, game.numCrew)
        self.assertEqual(2, game.numIntruders)

        crew_player = next(player for player in game.players if not player.sus)
        crew_client = clients[player_ids.index(crew_player.player_id)]
        crew_client.emit("meeting", {"player_id": crew_player.player_id})
        for client in clients:
            self.drain(client)
        crew_client.emit("player_dead", {"player_id": crew_player.player_id})
        for client in clients:
            self.drain(client)

        self.assertEqual(2, game.numCrew)
        self.assertEqual(2, game.numIntruders)
        self.assertEqual("sus_victory", game.end_state)

    def test_play_again_ignores_player_who_left_after_game_end(self):
        clients, room_code, player_ids, game = self.setup_started_game(
            3,
            config={"num_intruders": 1},
        )
        intruder = next(player for player in game.players if player.sus)
        self.vote_out(clients, player_ids, game, intruder)
        self.assertEqual("victory", game.end_state)

        alive_leaver = next(player for player in game.players if player.alive)
        clients[player_ids.index(alive_leaver.player_id)].emit(
            "leave_room",
            {"player_id": alive_leaver.player_id, "room_code": room_code},
        )
        for client in clients:
            self.drain(client)

        remaining_player_ids = [
            player.player_id
            for player in game.players
            if player.player_id != alive_leaver.player_id
        ]
        for player_id in remaining_player_ids:
            clients[player_ids.index(player_id)].emit(
                "reset",
                {"player_id": player_id, "room_code": room_code},
            )
        for client in clients:
            self.drain(client)

        self.assertFalse(game.game_running)
        self.assertIsNone(game.end_state)
        self.assertEqual(set(), game.reset_votes)

    def test_play_again_reassigns_host_when_creator_leaves_after_game_end(self):
        clients, room_code, player_ids, game = self.setup_started_game(
            3,
            config={"num_intruders": 1},
        )
        host_id = player_ids[0]
        intruder = next(player for player in game.players if player.sus)
        self.vote_out(clients, player_ids, game, intruder)
        self.assertEqual("victory", game.end_state)

        clients[0].emit("leave_room", {"player_id": host_id, "room_code": room_code})
        transfer_events = []
        for client in clients[1:]:
            transfer_events.extend(self.drain(client))

        host_transfer_events = [
            event["args"][0]
            for event in transfer_events
            if event["name"] == "player_id" and event["args"][0].get("is_creator")
        ]
        self.assertEqual(1, len(host_transfer_events))
        new_host_id = host_transfer_events[0]["player_id"]
        self.assertNotEqual(host_id, new_host_id)
        self.assertEqual(new_host_id, game.creator_player_id)

        remaining_player_ids = [player.player_id for player in game.players]
        for player_id in remaining_player_ids:
            clients[player_ids.index(player_id)].emit(
                "reset",
                {"player_id": player_id, "room_code": room_code},
            )
        for client in clients:
            self.drain(client)

        self.assertFalse(game.game_running)
        self.assertEqual(new_host_id, game.creator_player_id)

    def test_fake_task_stays_queued_through_rejoin_and_does_not_score(self):
        clients, room_code, player_ids, game = self.setup_started_game(
            3,
            config={
                "num_intruders": 1,
                "starting_cards": 1,
                "card_deck_preset": "fake_task_chaos",
            },
        )
        intruder = next(player for player in game.players if player.sus)
        target = next(player for player in game.players if not player.sus)
        original_task = target.task.copy()
        fake_card = next(card for card in intruder.cards if card.action == "Fake Task")

        clients[player_ids.index(intruder.player_id)].emit(
            "play_card",
            {
                "player_id": intruder.player_id,
                "card_id": fake_card.id,
                "extra_data": {
                    "target_player_id": target.player_id,
                    "task_text": "fake after reconnect",
                    "task_location": "Kitchen",
                },
            },
        )
        for client in clients:
            self.drain(client)

        rejoin_client = self.make_client()
        rejoin_client.emit("rejoin", {"player_id": target.player_id})
        rejoin_events = self.drain(rejoin_client)
        shown_task = self.first_event(rejoin_events, "task")["task"]

        self.assertEqual(original_task, shown_task)
        self.assertEqual(0, game.crew_score)

        rejoin_client.emit("complete_task", {"player_id": target.player_id})
        task_after_real_completion = self.first_event(self.drain(rejoin_client), "task")["task"]
        self.assertEqual("fake after reconnect", task_after_real_completion["task"])
        self.assertTrue(task_after_real_completion["is_fake"])
        self.assertEqual(1, game.crew_score)

        rejoin_client.emit("complete_task", {"player_id": target.player_id})
        self.drain(rejoin_client)
        self.assertEqual(1, game.crew_score)


if __name__ == "__main__":
    unittest.main()

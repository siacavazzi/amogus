import json
import sys
import unittest
from pathlib import Path


SERVER_DIR = Path(__file__).resolve().parents[1]
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

import app as server_app  # noqa: E402
from assets.card import Card  # noqa: E402


class NoopStatsTracker:
    def record_game_created(self, room_code):
        pass

    def record_player_seen(self, player_id):
        pass

    def record_game_ended(self, game):
        pass


class SocketGameTestCase(unittest.TestCase):
    def setUp(self):
        self.socketio = server_app.socketio
        self.flask_app = server_app.app
        server_app.game_manager.games.clear()
        server_app.game_manager.player_to_game.clear()
        server_app.game_manager.sid_to_game.clear()
        server_app.game_manager.stats_tracker = NoopStatsTracker()

    def make_client(self):
        return self.socketio.test_client(self.flask_app)

    def drain(self, client):
        return client.get_received()

    def drain_all(self, clients):
        return {client: self.drain(client) for client in clients}

    def first_event(self, events, name):
        for event in events:
            if event["name"] == name:
                return event["args"][0] if event["args"] else None
        return None

    def has_event(self, events, name):
        return any(event["name"] == name for event in events)

    def event_payloads(self, events, name):
        return [event["args"][0] if event["args"] else None for event in events if event["name"] == name]

    def parse_json_payload(self, payload):
        return json.loads(payload) if isinstance(payload, str) else payload

    def create_open_room(self, host, config=None):
        host.emit("create_game")
        room_code = self.first_event(self.drain(host), "game_created")["room_code"]
        if config:
            host.emit("update_game_config", {"room_code": room_code, "config": config})
            self.drain(host)
        host.emit("open_room", {"room_code": room_code})
        self.drain(host)
        return room_code

    def join_player(self, client, room_code, username, use_join_game=False):
        if use_join_game:
            client.emit("join_game", {"room_code": room_code})
            self.drain(client)

        client.emit("join", {"room_code": room_code, "username": username})
        player_event = self.first_event(self.drain(client), "player_id")
        return player_event["player_id"]

    def setup_lobby(self, player_count, config=None, use_join_game_for_guests=True):
        clients = [self.make_client() for _ in range(player_count)]
        room_code = self.create_open_room(clients[0], config=config)
        player_ids = []
        for index, client in enumerate(clients):
            player_ids.append(
                self.join_player(
                    client,
                    room_code,
                    f"P{index}",
                    use_join_game=use_join_game_for_guests and index > 0,
                )
            )
            self.drain_all([other for other in clients if other is not client])
        return clients, room_code, player_ids, server_app.game_manager.get_game(room_code)

    def add_tasks(self, host, room_code, count, locations=("Kitchen", "Yard")):
        for index in range(count):
            location = locations[index % len(locations)]
            host.emit(
                "add_collaborative_task",
                {
                    "room_code": room_code,
                    "task": {"task": f"{location} task {index}", "location": location},
                },
            )

    def start_game(self, host, host_id, clients, drain=True):
        host.emit("start_game", {"player_id": host_id})
        return self.drain_all(clients) if drain else None

    def setup_started_game(self, player_count, config=None, task_count=None, locations=("Kitchen", "Yard")):
        clients, room_code, player_ids, game = self.setup_lobby(player_count, config=config)
        task_count = task_count if task_count is not None else max(player_count * 3, 10)
        self.add_tasks(clients[0], room_code, task_count, locations=locations)
        self.drain_all(clients)
        self.start_game(clients[0], player_ids[0], clients)
        return clients, room_code, player_ids, game

    def client_for_player(self, clients, player_ids, player):
        return clients[player_ids.index(player.player_id)]

    def intruders(self, game):
        return [player for player in game.players if player.sus]

    def crew(self, game):
        return [player for player in game.players if not player.sus]

    def living(self, game):
        return [player for player in game.players if player.alive]

    def inject_card(self, game, player, action, **kwargs):
        card = Card(
            action,
            kwargs.pop("text", action),
            game.card_deck,
            location=kwargs.pop("location", None),
            duration=kwargs.pop("duration", None),
            sound=kwargs.pop("sound", None),
            countdown=kwargs.pop("countdown", False),
            requires_input=kwargs.pop("requires_input", False),
        )
        player.cards.append(card)
        return card

    def start_meeting_and_ready_living_players(self, clients, player_ids, game, caller):
        self.client_for_player(clients, player_ids, caller).emit("meeting", {"player_id": caller.player_id})
        self.drain_all(clients)

        for player in self.living(game):
            self.client_for_player(clients, player_ids, player).emit("ready", {"player_id": player.player_id})
        return self.drain_all(clients)

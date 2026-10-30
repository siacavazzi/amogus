"""/health tells a deploy whether real people are mid-round, so it doesn't restart under them."""
from server.tests.integration_helpers import SocketGameTestCase, protocol_client, server_app


class HealthTests(SocketGameTestCase):
    def health(self):
        return self.flask_app.test_client().get('/health').get_json()

    def test_empty_server_has_nothing_in_use(self):
        body = self.health()
        self.assertEqual('healthy', body['status'])
        self.assertEqual(0, body['rooms_in_use'])
        self.assertEqual(0, body['rounds_running'])

    def test_lobby_and_round_with_real_players_count(self):
        clients, room, ids, game = self.setup_lobby(4)
        self.assertEqual((1, 0), (self.health()['rooms_in_use'], self.health()['rounds_running']))
        self.add_tasks(clients[0], room, 12)
        clients[0].emit('start_game', {'player_id': ids[0]})
        self.assertTrue(game.game_running)
        self.assertEqual(1, self.health()['rounds_running'])

    def test_room_whose_phones_are_all_gone_is_not_in_use(self):
        clients, room, ids, game = self.setup_lobby(3)
        for player in game.players:
            player.active = False
        self.assertEqual(0, self.health()['rooms_in_use'])
        self.assertEqual(1, self.health()['games'])

    def test_test_rooms_are_left_out(self):
        client = protocol_client(self.socketio.test_client(self.flask_app, auth={'synthetic': True}))
        room = self.create_open_room(client, config={'num_intruders': 1})
        self.join_player(client, room, 'Bot')
        self.assertEqual(0, self.health()['rooms_in_use'])

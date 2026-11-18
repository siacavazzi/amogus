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

    def test_finished_round_on_win_screen_does_not_count(self):
        # Prod 2026-11-13: a group sat on the win screen with phones still connected and held a
        # promote for 20 minutes, because game_running stays on until Play Again.
        clients, room, ids, game = self.setup_started_game(4, config={'num_intruders': 1})
        for crewmate in self.crew(game)[:2]:
            game.kill_player(crewmate.player_id)
        self.assertEqual('sus_victory', game.end_state)
        self.assertTrue(game.game_running)
        body = self.health()
        self.assertEqual((1, 0), (body['rooms_in_use'], body['rounds_running']))
        self.assertEqual([], body['live_rounds'])

    def test_live_round_says_what_it_is_doing(self):
        clients, room, ids, game = self.setup_started_game(5, config={'num_intruders': 1})
        [live] = self.health()['live_rounds']
        self.assertEqual('tasks', live['state'])
        self.assertEqual(5, live['players_connected'])
        self.assertNotIn(room, str(self.health()))

    def test_meeting_and_vote_still_count(self):
        clients, room, ids, game = self.setup_started_game(5, config={'num_intruders': 1})
        caller = self.crew(game)[0]
        self.client_for_player(clients, ids, caller).emit('meeting', {'player_id': caller.player_id})
        self.drain_all(clients)
        self.assertTrue(game.meeting)
        body = self.health()
        self.assertEqual(1, body['rounds_running'])
        self.assertEqual('meeting', body['live_rounds'][0]['state'])

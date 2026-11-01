from server.tests.integration_helpers import SocketGameTestCase, server_app


def events(received, name):
    return [message['args'][0] for message in received if message['name'] == name]


class HostSetupReconnectTests(SocketGameTestCase):
    """A phone host has no player until the room is open, so their socket is all that marks
    them as host. A reconnect or reload during setup comes back with the room's host token."""

    def create_room(self):
        host = self.make_client()
        host.emit('create_game', {})
        created = events(host.get_received(), 'game_created')[0]
        return host, created['room_code'], created['host_token']

    def test_host_comes_back_to_setup_with_the_token_and_opens_the_room(self):
        host, room, token = self.create_room()
        self.assertTrue(token)
        host.disconnect()

        back = self.make_client()
        back.emit('join_game', {'room_code': room, 'host_token': token})
        joined = events(back.get_received(), 'game_joined')[0]
        self.assertEqual({'room_code': room, 'is_creator': True, 'is_open': False,
                          'round_running': False, 'waiting_count': 0}, joined)

        back.emit('open_room', {'room_code': room})
        self.assertTrue(server_app.game_manager.get_game(room).is_open)
        back.emit('join', {'username': 'Sam', 'room_code': room})
        player_ids = events(back.get_received(), 'player_id')
        self.assertTrue(player_ids[-1]['is_creator'])

    def test_a_wrong_token_or_a_guest_cannot_take_an_unopened_room(self):
        host, room, token = self.create_room()
        host.disconnect()
        for payload in ({'room_code': room}, {'room_code': room, 'host_token': 'not-it'}):
            guest = self.make_client()
            guest.emit('join_game', payload)
            received = guest.get_received()
            self.assertEqual([], events(received, 'game_joined'))
            self.assertEqual('room_not_open', events(received, 'error')[0]['code'])

    def test_the_token_is_spent_once_the_host_has_a_player(self):
        host, room, token = self.create_room()
        host.emit('open_room', {'room_code': room})
        host.emit('join', {'username': 'Sam', 'room_code': room})
        host.get_received()
        stranger = self.make_client()
        stranger.emit('join_game', {'room_code': room, 'host_token': token})
        self.assertFalse(events(stranger.get_received(), 'game_joined')[0]['is_creator'])

from server.tests.integration_helpers import SocketGameTestCase, server_app


def events(received, name):
    return [message['args'][0] for message in received if message['name'] == name]


class WaitingForOpenTests(SocketGameTestCase):
    """Friends type the code while the host is still on the setup screen (31 phones bounced
    over Halloween 2026). They wait, and hear the moment the host presses Open."""

    def create_room(self):
        host = self.make_client()
        host.emit('create_game', {})
        return host, events(host.get_received(), 'game_created')[0]['room_code']

    def test_an_early_phone_is_told_to_wait_and_hears_when_the_room_opens(self):
        host, room = self.create_room()
        early = self.make_client()
        early.emit('join_game', {'room_code': room, 'entry_method': 'qr'})
        error = events(early.get_received(), 'error')[0]
        self.assertEqual('room_not_open', error['code'])
        self.assertTrue(error['waiting'])
        self.assertEqual('qr', error['entry_method'])

        bystander = self.make_client()  # never tried this room
        host.emit('open_room', {'room_code': room})
        self.assertEqual([{'room_code': room}], events(early.get_received(), 'room_now_open'))
        self.assertEqual([], events(bystander.get_received(), 'room_now_open'))

        early.emit('join_game', {'room_code': room, 'entry_method': 'qr'})
        self.assertEqual(1, len(events(early.get_received(), 'game_joined')))

    def test_a_mistyped_lookalike_code_waits_for_the_real_room(self):
        host, room = self.create_room()
        early = self.make_client()
        early.emit('join_game', {'room_code': room.replace('A', '4').replace('E', '3').lower()})
        early.get_received()
        host.emit('open_room', {'room_code': room})
        self.assertEqual([{'room_code': room}], events(early.get_received(), 'room_now_open'))

    def test_waiting_ends_once_the_room_opened(self):
        host, room = self.create_room()
        early = self.make_client()
        early.emit('join_game', {'room_code': room})
        host.emit('open_room', {'room_code': room})
        early.get_received()
        host.emit('open_room', {'room_code': room})  # a second tap on Open
        self.assertEqual([], events(early.get_received(), 'room_now_open'))
        self.assertTrue(server_app.game_manager.get_game(room).is_open)

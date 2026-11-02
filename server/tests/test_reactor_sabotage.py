"""SABOTAGE CORE on the big screen must start a meltdown, whatever else touched the room.

On prod (room XHXH, 2026-11-02) a second desktop joined the room, registered as the reactor and
left. That cleared reactor_sid, so the first screen, still showing SABOTAGE CORE, was refused
every time: the countdown ran and nothing happened.
"""
from unittest.mock import patch

from server.tests.integration_helpers import SocketGameTestCase


class ReactorSabotageTests(SocketGameTestCase):
    def start_round(self):
        return self.setup_started_game(4, config={'starting_cards': 0, 'card_draw_probability': 0})

    def screen(self, room):
        client = self.make_client()
        client.emit('register_reactor', {'room_code': room})
        self.drain(client)
        return client

    def sabotage(self, client, payload):
        with patch('assets.meltdown.eventlet.spawn'):
            return client.emit('meltdown', payload, callback=True)

    def test_reactor_sabotage_starts_a_meltdown(self):
        clients, room, ids, game = self.start_round()
        reactor = self.screen(room)
        self.assertEqual({'ok': True}, self.sabotage(reactor, {'room_code': room}))
        self.assertIsNotNone(game.active_meltdown)

    def test_a_second_screen_that_opens_and_leaves_does_not_orphan_the_first(self):
        clients, room, ids, game = self.start_round()
        reactor = self.screen(room)
        second = self.screen(room)
        second.emit('leave_room', {'room_code': room})
        self.assertTrue(game.has_reactor)
        self.assertEqual({'ok': True}, self.sabotage(reactor, {'room_code': room}))
        self.assertIsNotNone(game.active_meltdown)

    def test_a_second_screen_that_drops_hands_back_to_the_first(self):
        clients, room, ids, game = self.start_round()
        reactor = self.screen(room)
        second = self.screen(room)
        second.disconnect()
        self.assertIsNotNone(game.reactor_sid)
        self.assertEqual({'ok': True}, self.sabotage(reactor, {'room_code': room}))

    def test_remote_sabotage_card_still_works_after_a_second_screen_leaves(self):
        clients, room, ids, game = self.start_round()
        self.screen(room)
        second = self.screen(room)
        second.emit('leave_room', {'room_code': room})
        with patch('assets.meltdown.eventlet.spawn'):
            self.assertTrue(game.start_meltdown(trigger='card'))

    def test_screen_whose_browser_also_played_as_a_phone(self):
        # Same browser for a phone tab and the big screen: localStorage holds the phone's id.
        clients, room, ids, game = self.start_round()
        reactor = self.screen(room)
        result = self.sabotage(reactor, {'room_code': room, 'player_id': ids[0]})
        self.assertEqual({'ok': True}, result)
        self.assertIsNotNone(game.active_meltdown)

    def test_refused_sabotage_says_why(self):
        clients, room, ids, game = self.start_round()
        reactor = self.screen(room)
        self.sabotage(reactor, {'room_code': room})
        again = self.sabotage(reactor, {'room_code': room})
        self.assertFalse(again['ok'])
        self.assertIn('already', again['error'])

    def test_a_stranger_socket_cannot_sabotage(self):
        clients, room, ids, game = self.start_round()
        self.screen(room)
        stranger = self.make_client()
        result = self.sabotage(stranger, {'room_code': room})
        self.assertFalse(result and result.get('ok'))
        self.assertIsNone(game.active_meltdown)

    def test_the_last_screen_leaving_still_marks_the_room_screenless(self):
        clients, room, ids, game = self.start_round()
        only = self.screen(room)
        only.emit('leave_room', {'room_code': room})
        self.assertFalse(game.has_reactor)
        self.assertIsNone(game.reactor_sid)

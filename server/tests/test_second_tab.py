"""A second tab of the game on one phone (QR scanned again, invite tapped twice) shares the saved
player. Bug hunt 2026-11-11: the newest tab took the seat silently, the old tab kept showing the game
while the server refused its taps, and background reconnects passed the seat back and forth
(prod room TMEX: one player's taps refused for 23 minutes)."""
import uuid
from server.tests.integration_helpers import SocketGameTestCase


class SecondTabTests(SocketGameTestCase):
    def start_round(self):
        return self.setup_started_game(4, config={'num_intruders': 1, 'starting_cards': 0, 'card_draw_probability': 0})

    def task_command(self, game, player):
        return {'player_id': player.player_id, 'request_id': str(uuid.uuid4()),
                'round_id': game.round_id, 'assignment_id': player.task.get('assignment_id')}

    def test_new_tab_takes_the_seat_and_the_old_tab_is_told(self):
        clients, room, ids, game = self.start_round()
        player = self.crew(game)[0]
        first = self.client_for_player(clients, ids, player)
        self.drain_all(clients)
        second = self.make_client()
        result = second.emit('rejoin', {'player_id': player.player_id, 'tab_id': 'tab-b', 'hidden': False}, callback=True)
        self.assertTrue(result['ok'])
        self.assertTrue(self.has_event(self.drain(first), 'session_moved'))
        # The new tab plays; the old one is refused, and it said why.
        refused = first.emit('complete_task', self.task_command(game, player), callback=True)
        self.assertEqual('obsolete_session', refused['reason'])
        self.assertTrue(second.emit('complete_task', self.task_command(game, player), callback=True)['ok'])
        self.assertEqual(1, game.crew_score)

    def test_a_background_tab_does_not_take_a_seat_another_tab_is_using(self):
        clients, room, ids, game = self.start_round()
        player = self.crew(game)[0]
        first = self.client_for_player(clients, ids, player)
        first.emit('rejoin', {'player_id': player.player_id, 'tab_id': 'tab-a', 'hidden': False}, callback=True)
        self.drain_all(clients)
        background = self.make_client()
        result = background.emit('rejoin', {'player_id': player.player_id, 'tab_id': 'tab-b', 'hidden': True}, callback=True)
        self.assertFalse(result['ok'])
        self.assertEqual('open_elsewhere', result['reason'])
        self.assertTrue(self.has_event(self.drain(background), 'session_moved'))
        self.assertFalse(self.has_event(self.drain(first), 'session_moved'))
        self.assertTrue(first.emit('complete_task', self.task_command(game, player), callback=True)['ok'])
        # Brought to the front, it takes the seat.
        self.assertTrue(background.emit('rejoin', {'player_id': player.player_id, 'tab_id': 'tab-b', 'hidden': False}, callback=True)['ok'])
        self.assertTrue(self.has_event(self.drain(first), 'session_moved'))

    def test_the_same_tab_reconnecting_in_the_background_keeps_its_seat(self):
        clients, room, ids, game = self.start_round()
        player = self.crew(game)[0]
        first = self.client_for_player(clients, ids, player)
        first.emit('rejoin', {'player_id': player.player_id, 'tab_id': 'tab-a', 'hidden': False}, callback=True)
        self.drain_all(clients)
        # Its new socket arrives before the server noticed the old one drop (a locked phone waking).
        same_tab = self.make_client()
        result = same_tab.emit('rejoin', {'player_id': player.player_id, 'tab_id': 'tab-a', 'hidden': True}, callback=True)
        self.assertTrue(result['ok'])
        self.assertFalse(self.has_event(self.drain(first), 'session_moved'))

    def test_a_background_tab_takes_the_seat_when_nobody_holds_it(self):
        clients, room, ids, game = self.start_round()
        player = self.crew(game)[0]
        first = self.client_for_player(clients, ids, player)
        first.disconnect()
        background = self.make_client()
        result = background.emit('rejoin', {'player_id': player.player_id, 'tab_id': 'tab-b', 'hidden': True}, callback=True)
        self.assertTrue(result['ok'])
        self.assertEqual(player.player_id, game.getPlayerById(player.player_id).player_id)
        self.assertTrue(game.getPlayerById(player.player_id).active)

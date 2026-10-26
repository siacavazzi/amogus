"""Bug hunt (2026-10-26): reconnects, room isolation, state that survives Play Again, bad input.

Tests marked expectedFailure reproduce a bug that is not fixed yet. They pass while the bug is
there; once it is fixed, unittest reports an unexpected success, so drop the marker with the fix.
"""
import unittest

import eventlet

from server.tests.integration_helpers import SocketGameTestCase, server_app
from assets.room_protocol import room_state


QUIET = {'starting_cards': 0, 'card_draw_probability': 0}


class ServerRobustnessTests(SocketGameTestCase):
    def crewmate(self, game, exclude=()):
        return next(p for p in game.players if not p.sus and p not in exclude)

    def end_round_and_play_again(self, clients, room, ids, game):
        """Finish the round as crew victory and have every connected phone tap Play Again."""
        with game.state_lock:
            game.end_state = 'victory'
        for client, pid in zip(clients, ids):
            if client.is_connected():
                client.emit('reset', {'player_id': pid, 'room_code': room})
        self.drain_all([c for c in clients if c.is_connected()])
        self.assertFalse(game.game_running, 'Play Again returns the room to the lobby')

    def start_next_round(self, host, host_id, room, game):
        self.add_tasks(host, room, max(len(game.players) * 3, 10))
        host.emit('start_game', {'player_id': host_id})
        self.assertTrue(game.game_running)

    # ---- state that survives Play Again ----

    def test_player_who_left_mid_round_is_not_dealt_into_the_next_round(self):
        clients, room, ids, game = self.setup_started_game(5, config=QUIET)
        clients[-1].emit('leave_room', {'player_id': ids[-1], 'room_code': room})
        self.end_round_and_play_again(clients[:-1], room, ids[:-1], game)
        self.start_next_round(clients[0], ids[0], room, game)
        self.assertNotIn(ids[-1], [p.player_id for p in game.players])

    def test_meeting_in_the_next_round_is_not_blocked_by_someone_who_left(self):
        clients, room, ids, game = self.setup_started_game(5, config=QUIET)
        clients[-1].emit('leave_room', {'player_id': ids[-1], 'room_code': room})
        clients, ids = clients[:-1], ids[:-1]
        self.end_round_and_play_again(clients, room, ids, game)
        self.start_next_round(clients[0], ids[0], room, game)
        caller = self.crewmate(game, exclude=[p for p in game.players if p.player_id not in ids])
        self.client_for_player(clients, ids, caller).emit('meeting', {'player_id': caller.player_id})
        for client, pid in zip(clients, ids):
            client.emit('ready', {'player_id': pid})
        # Everyone still in the room slid ready; the person who left never can.
        self.assertEqual('voting', game.meeting.stage)

    def test_meltdown_code_for_a_player_with_no_socket_is_not_sent_to_every_room(self):
        clients, room, ids, game = self.setup_started_game(5, config=QUIET)
        clients[-1].emit('leave_room', {'player_id': ids[-1], 'room_code': room})
        self.end_round_and_play_again(clients[:-1], room, ids[:-1], game)
        self.start_next_round(clients[0], ids[0], room, game)
        stranger = self.make_client()
        self.create_open_room(stranger)
        self.drain(stranger)
        with game.state_lock:
            game.start_meltdown()
            game.active_meltdown.distribute_codes()
        # sid None makes socketio.emit(..., to=None) a server-wide broadcast.
        self.assertFalse(self.has_event(stranger.get_received(), 'meltdown_code'))

    # ---- room isolation ----

    def test_card_messages_stay_in_their_room(self):
        clients, room, ids, game = self.setup_started_game(5, config=QUIET)
        stranger = self.make_client()
        self.create_open_room(stranger)
        self.drain(stranger)
        game.card_draw_probability = 1
        game.drawCards(probability=1)
        # send_message_to_player emits 'message' with no room, so every socket on the server gets it.
        self.assertFalse(self.has_event(stranger.get_received(), 'message'))

    @unittest.expectedFailure
    def test_crewmate_snapshot_does_not_reveal_who_the_intruders_are(self):
        clients, room, ids, game = self.setup_started_game(5, config={'starting_cards': 2, 'card_draw_probability': 0})
        crew = self.crewmate(game)
        players = room_state(game, crew, crew.sid)['players']
        others = [p for p in players if p['player_id'] != crew.player_id]
        self.assertFalse(any(p['sus'] for p in others), 'a crewmate can read every role from the wire')
        self.assertFalse(any(p['cards'] for p in others), 'a crewmate can read the intruders\' cards')

    # ---- reconnects ----

    def test_reactor_that_reconnects_mid_round_before_its_old_socket_times_out_gets_back_in(self):
        clients, room, ids, game = self.setup_started_game(5, config=QUIET)
        old = self.make_client()
        old.emit('register_reactor', {'room_code': room})
        self.drain(old)
        # The big screen's wifi blinks: a new socket arrives while the server still holds the old one
        # (the server only notices a silent drop after the ping timeout, up to ~45 seconds).
        new = self.make_client()
        new.emit('register_reactor', {'room_code': room})
        self.assertTrue(self.has_event(new.get_received(), 'reactor_registered'))

    def test_reactor_refresh_mid_round_after_a_clean_disconnect_restores_the_round(self):
        clients, room, ids, game = self.setup_started_game(5, config=QUIET)
        old = self.make_client()
        old.emit('register_reactor', {'room_code': room})
        self.drain(old)
        old.disconnect()
        new = self.make_client()
        new.emit('register_reactor', {'room_code': room})
        events = new.get_received()
        self.assertTrue(self.has_event(events, 'reactor_registered'))
        self.assertTrue(self.has_event(events, 'game_start'))
        self.assertTrue(self.first_event(events, 'room_state')['running'])

    @unittest.expectedFailure
    def test_ready_player_whose_phone_blinks_stays_ready(self):
        clients, room, ids, game = self.setup_started_game(5, config=QUIET)
        caller = self.crewmate(game)
        self.client_for_player(clients, ids, caller).emit('meeting', {'player_id': caller.player_id})
        sleeper = next(p for p in game.players if p is not caller)
        client = self.client_for_player(clients, ids, sleeper)
        client.emit('ready', {'player_id': sleeper.player_id})
        self.assertTrue(sleeper.ready)
        # Slide ready, pocket the phone, the screen locks and the socket drops, then it comes back.
        client.disconnect()
        self.make_client().emit('rejoin', {'player_id': sleeper.player_id})
        self.assertTrue(sleeper.ready)

    def test_old_socket_closing_after_a_rejoin_does_not_mark_the_player_offline(self):
        clients, room, ids, game = self.setup_started_game(5, config=QUIET)
        player = game.getPlayerById(ids[1])
        replacement = self.make_client()
        replacement.emit('rejoin', {'player_id': player.player_id})
        self.drain(replacement)
        clients[1].disconnect()  # the old socket's ping timeout lands after the rejoin
        self.assertTrue(player.active)
        result = replacement.emit('get_room_state', {'player_id': player.player_id}, callback=True)
        self.assertTrue(result['ok'], 'the new socket still speaks for the player')

    def test_taps_flushed_before_the_rejoin_are_rejected_without_changing_the_room(self):
        # socket.io-client queues emits made while offline and sends them on reconnect BEFORE the
        # page's connect handler sends rejoin. They arrive from a socket the server doesn't know yet.
        clients, room, ids, game = self.setup_started_game(5, config=QUIET)
        caller = self.crewmate(game)
        index = ids.index(caller.player_id)
        clients[index].disconnect()
        new = self.make_client()
        burst = [new.emit('meeting', {'player_id': caller.player_id, 'round_id': game.round_id}, callback=True)
                 for _ in range(10)]
        burst += [new.emit('reset', {'player_id': caller.player_id, 'room_code': room}, callback=True)
                  for _ in range(10)]
        self.assertTrue(all(result and result['ok'] is False for result in burst))
        self.assertFalse(game.meeting)
        self.assertTrue(game.game_running)
        self.assertEqual(20, len(self.event_payloads(new.get_received(), 'error')),
                         'each queued tap comes back as its own error dialog')
        new.emit('rejoin', {'player_id': caller.player_id})
        new.emit('meeting', {'player_id': caller.player_id})
        self.assertTrue(game.meeting)

    @unittest.expectedFailure
    def test_phone_with_an_id_from_an_earlier_room_can_join_a_new_room(self):
        clients, room, ids, game = self.setup_lobby(3)
        other_host = self.make_client()
        new_room = self.create_open_room(other_host)
        phone = clients[2]
        phone.emit('join_game', {'room_code': new_room})
        self.drain(phone)
        # Login.js sends whatever player_id localStorage still holds along with the new room code.
        phone.emit('join', {'player_id': ids[2], 'username': 'Kai', 'room_code': new_room})
        self.assertTrue(self.has_event(phone.get_received(), 'player_id'))

    # ---- players who stay offline (the room stops waiting after a grace period) ----

    def go_offline(self, clients, ids, player):
        self.client_for_player(clients, ids, player).disconnect()
        return player.disconnected_at

    def grace_period_passes(self, room, player, disconnected_at):
        return server_app.mark_absent_if_still_gone(room, player.player_id, disconnected_at)

    def test_meeting_goes_on_without_a_phone_that_stays_offline(self):
        clients, room, ids, game = self.setup_started_game(5, config=QUIET)
        caller = self.crewmate(game)
        gone = next(p for p in game.players if p is not caller and p.player_id != ids[0])
        self.client_for_player(clients, ids, caller).emit('meeting', {'player_id': caller.player_id})
        stamp = self.go_offline(clients, ids, gone)
        here = [(c, pid) for c, pid in zip(clients, ids) if pid != gone.player_id]
        for client, pid in here:
            client.emit('ready', {'player_id': pid})
        self.assertEqual('waiting', game.meeting.stage, 'a short drop is still waited for')
        self.assertTrue(self.grace_period_passes(room, gone, stamp))
        self.assertTrue(gone.absent)
        self.assertEqual('voting', game.meeting.stage)
        for client, pid in here:
            client.emit('veto', {'player_id': pid})
        self.assertFalse(game.meeting, 'everyone present voted, so the meeting ends')

    def test_vote_finishes_when_the_last_voter_stays_offline(self):
        clients, room, ids, game = self.setup_started_game(5, config=QUIET)
        self.start_meeting_and_ready_living_players(clients, ids, game, self.crewmate(game))
        self.assertEqual('voting', game.meeting.stage)
        gone = game.getPlayerById(ids[-1])
        stamp = self.go_offline(clients, ids, gone)
        for client, pid in zip(clients[:-1], ids[:-1]):
            client.emit('veto', {'player_id': pid})
        self.assertTrue(self.grace_period_passes(room, gone, stamp))
        self.assertFalse(game.meeting)

    def test_a_phone_back_within_the_grace_period_is_still_waited_for(self):
        clients, room, ids, game = self.setup_started_game(5, config=QUIET)
        blinker = game.getPlayerById(ids[2])
        stamp = self.go_offline(clients, ids, blinker)
        replacement = self.make_client()
        replacement.emit('rejoin', {'player_id': blinker.player_id})
        self.assertFalse(self.grace_period_passes(room, blinker, stamp))
        self.assertFalse(blinker.absent)

    def test_a_player_who_comes_back_after_the_grace_period_plays_on(self):
        clients, room, ids, game = self.setup_started_game(5, config=QUIET)
        gone = game.getPlayerById(ids[2])
        stamp = self.go_offline(clients, ids, gone)
        self.grace_period_passes(room, gone, stamp)
        replacement = self.make_client()
        replacement.emit('rejoin', {'player_id': gone.player_id})
        self.assertFalse(gone.absent)
        self.assertTrue(gone.active)
        self.assertTrue(gone.alive)

    def test_host_passes_on_when_the_host_phone_stays_offline_in_the_lobby(self):
        clients, room, ids, game = self.setup_lobby(4)
        host = game.getPlayerById(ids[0])
        stamp = self.go_offline(clients, ids, host)
        self.assertEqual(ids[0], game.creator_player_id, 'a short drop keeps the host')
        self.drain_all(clients[1:])
        self.assertTrue(self.grace_period_passes(room, host, stamp))
        self.assertNotEqual(ids[0], game.creator_player_id)
        new_host = clients[ids.index(game.creator_player_id)]
        notice = self.first_event(self.drain(new_host), 'player_id')
        self.assertTrue(notice['is_creator'])
        self.add_tasks(new_host, room, 12)
        new_host.emit('start_game', {'player_id': game.creator_player_id})
        self.assertTrue(game.game_running)

    def test_phone_gone_from_the_lobby_is_not_dealt_into_the_round(self):
        clients, room, ids, game = self.setup_lobby(5)
        gone = game.getPlayerById(ids[-1])
        stamp = self.go_offline(clients, ids, gone)
        self.grace_period_passes(room, gone, stamp)
        self.add_tasks(clients[0], room, 15)
        clients[0].emit('start_game', {'player_id': ids[0]})
        self.assertTrue(game.game_running)
        self.assertNotIn(gone, game.players)
        self.assertEqual(4, len(game.players))
        returning = self.make_client()
        returning.emit('rejoin', {'player_id': gone.player_id})
        self.assertTrue(self.has_event(returning.get_received(), 'rejoin_failed'),
                        'their old session is gone; they join again from the invite')

    def test_play_again_goes_through_when_the_last_phone_to_tap_goes_offline(self):
        clients, room, ids, game = self.setup_started_game(4, config=QUIET)
        with game.state_lock:
            game.end_state = 'victory'
        for client, pid in zip(clients[:-1], ids[:-1]):
            client.emit('reset', {'player_id': pid, 'room_code': room})
        self.assertTrue(game.game_running, 'still waiting on the fourth phone')
        clients[-1].disconnect()
        self.assertFalse(game.game_running)

    def test_a_phone_leaving_the_results_screen_before_anyone_taps_does_not_reset(self):
        clients, room, ids, game = self.setup_started_game(4, config=QUIET)
        with game.state_lock:
            game.end_state = 'victory'
        clients[-1].disconnect()
        self.assertTrue(game.game_running)

    # ---- timers across Play Again ----

    def test_vote_countdown_from_an_old_round_does_not_tick_the_next_rounds_meeting(self):
        clients, room, ids, game = self.setup_started_game(5, config=dict(QUIET, vote_time=30))
        first = self.start_meeting_and_ready_living_players(clients, ids, game, self.crewmate(game))
        self.assertEqual('voting', game.meeting.stage)
        clients[0].emit('reset', {'player_id': ids[0], 'force': True})
        self.drain_all(clients)
        self.start_next_round(clients[0], ids[0], room, game)
        self.start_meeting_and_ready_living_players(clients, ids, game, self.crewmate(game))
        meeting = game.meeting
        self.assertEqual('voting', meeting.stage)
        eventlet.sleep(2.5)  # let both countdown threads run
        self.assertLess(meeting.time_left, 30, 'the countdown ran')
        self.assertGreaterEqual(meeting.time_left, 27, 'only the current countdown ticks this meeting')
        with game.state_lock:
            game.meeting = None
        self.assertIsNotNone(first)

    # ---- bad input ----

    def test_malformed_events_never_break_the_room_for_everyone_else(self):
        clients, room, ids, game = self.setup_started_game(5, config={'starting_cards': 2})
        junk = [None, [], 'x', 5, {'room_code': None}, {'room_code': 5}, {'player_id': ['a']},
                {'player_id': ids[0], 'room_code': room, 'task': 'not a dict', 'locations': 'abc',
                 'config': 'x', 'pin': {'a': 1}, 'extra_data': 'x', 'votedFor': ['x'], 'card_id': []}]
        skip = {'connect', 'disconnect', 'leave_room', 'disband_room', 'reset'}
        round_id = game.round_id
        for event in server_app.socketio.server.handlers['/']:
            if event in skip:
                continue
            for payload in junk:
                clients[0].raw_emit(event) if payload is None else clients[0].raw_emit(event, payload)
        self.drain_all(clients)
        self.assertIs(game, server_app.game_manager.get_game(room))
        self.assertEqual(round_id, game.round_id)
        self.assertTrue(game.game_running)
        caller = self.crewmate(game)
        self.client_for_player(clients, ids, caller).emit('meeting', {'player_id': caller.player_id})
        self.assertTrue(game.meeting, 'the room still plays after the junk')


if __name__ == '__main__':
    unittest.main()

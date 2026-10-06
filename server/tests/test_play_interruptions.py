from unittest.mock import patch

from server.tests.integration_helpers import SocketGameTestCase


class PlayInterruptionTests(SocketGameTestCase):
    def start_round(self):
        return self.setup_started_game(5, config={
            'starting_cards': 0, 'card_draw_probability': 0, 'meltdown_time': 1,
        })

    def test_disconnect_blocks_meeting_until_rejoin_and_ready_and_keeps_role(self):
        for disconnect_first in (True, False):
            with self.subTest(disconnect_first=disconnect_first):
                clients, room, ids, game = self.start_round()
                absent = game.getPlayerById(ids[-1])
                role = absent.sus
                if disconnect_first:
                    clients[-1].disconnect()
                clients[0].emit('meeting', {'player_id': ids[0]})
                for client, pid in zip(clients[:-1], ids[:-1]):
                    client.emit('ready', {'player_id': pid})
                if not disconnect_first:
                    self.assertEqual('waiting', game.meeting.stage)
                    clients[-1].disconnect()
                self.assertEqual('waiting', game.meeting.stage)
                self.assertTrue(absent.alive)
                replacement = self.make_client()
                replacement.emit('rejoin', {'player_id': absent.player_id})
                self.assertTrue(absent.active)
                self.assertEqual(role, absent.sus)
                meeting = self.first_event(self.drain(replacement), 'meeting')
                self.assertEqual('waiting', self.parse_json_payload(meeting)['stage'])
                replacement.emit('ready', {'player_id': absent.player_id})
                self.assertEqual('voting', game.meeting.stage)

    def start_manual_meltdown(self, client, pid, game):
        # Drive the real countdown synchronously with a controlled sleep boundary.
        with patch('assets.meltdown.eventlet.spawn'):
            client.emit('meltdown', {'player_id': pid})
        return game.active_meltdown

    def test_reset_preserves_disconnect_until_player_joins_again(self):
        clients, room, ids, game = self.start_round()
        absent = game.getPlayerById(ids[-1])
        clients[-1].disconnect()
        clients[0].emit('reset', {'player_id': ids[0], 'force': True})
        self.assertFalse(absent.active)
        replacement = self.make_client()
        replacement.emit('join', {
            'room_code': room, 'player_id': absent.player_id, 'username': absent.username,
        })
        self.assertTrue(absent.active)

    def test_all_codes_in_final_second_rescue_reactor(self):
        clients, room, ids, game = self.start_round()
        meltdown = self.start_manual_meltdown(clients[0], ids[0], game)
        self.drain_all(clients)

        def enter_codes(_):
            self.assertEqual(1, meltdown.time_left)
            for pin in meltdown.valid_pins[:meltdown.codes_needed]:
                clients[0].emit('pin_entry', {'player_id': ids[0], 'pin': pin})

        with patch('assets.meltdown.eventlet.sleep', side_effect=enter_codes):
            meltdown._countdown_loop()
        events = self.drain(clients[0])
        self.assertIsNone(game.end_state)
        self.assertIsNone(game.active_meltdown)
        self.assertEqual(1, len(self.event_payloads(events, 'meltdown_end')))
        self.assertFalse(self.has_event(events, 'end_game'))

    def test_missing_codes_still_lose_at_deadline(self):
        clients, room, ids, game = self.start_round()
        meltdown = self.start_manual_meltdown(clients[0], ids[0], game)
        with patch('assets.meltdown.eventlet.sleep'):
            meltdown._countdown_loop()
        self.assertEqual('meltdown_fail', game.end_state)

    def test_old_meltdown_cannot_override_replay_or_reset(self):
        for finish_round in (True, False):
            with self.subTest(finish_round=finish_round):
                clients, room, ids, game = self.start_round()
                meltdown = self.start_manual_meltdown(clients[0], ids[0], game)

                def reset_during_sleep(_):
                    if finish_round:
                        intruder = self.intruders(game)[0]
                        self.client_for_player(clients, ids, intruder).emit(
                            'leave_room', {'player_id': intruder.player_id, 'room_code': room})
                        self.assertEqual('victory', game.end_state)
                        for client, pid in zip(clients, ids):
                            if pid != intruder.player_id:
                                client.emit('reset', {'player_id': pid, 'room_code': room})
                    else:
                        clients[0].emit('reset', {'player_id': ids[0], 'force': True})
                    self.assertFalse(game.game_running)
                    self.drain_all(clients)

                with patch('assets.meltdown.eventlet.sleep', side_effect=reset_during_sleep):
                    meltdown._countdown_loop()
                self.assertIsNone(game.end_state)
                self.assertFalse(meltdown.meltdown_active)
                for events in self.drain_all(clients).values():
                    self.assertFalse(self.has_event(events, 'end_game'))
                    self.assertFalse(self.has_event(events, 'meltdown_update'))

    def test_reactor_and_card_cannot_interrupt_meeting(self):
        clients, room, ids, game = self.start_round()
        reactor = self.make_client()
        reactor.emit('register_reactor', {'room_code': room})
        self.start_meeting_and_ready_living_players(clients, ids, game, game.players[0])
        intruder = self.intruders(game)[0]
        card = self.inject_card(game, intruder, 'Remote Sabotage')
        with patch('assets.meltdown.eventlet.spawn'):
            reactor.emit('meltdown', {'room_code': room})
            self.client_for_player(clients, ids, intruder).emit(
                'play_card', {'player_id': intruder.player_id, 'card_id': card.id})
        self.assertIsNone(game.active_meltdown)
        self.assertEqual(0, game.stats['meltdowns_triggered'])
        self.assertIn(card, intruder.cards)
        self.assertEqual('voting', game.meeting.stage)

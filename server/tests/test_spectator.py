"""Spectator screen: players who are out watch a live feed of the round on their phones.

Only out players get it, and by default (the 'secret' view) it never names who played a card or
finished a task, so an out player can't give the intruders away at a meeting.
"""
import json

from server.tests.integration_helpers import SocketGameTestCase


class SpectatorTests(SocketGameTestCase):
    def start(self, count=6, **config):
        clients, room, ids, game = self.setup_started_game(count, config={
            'num_intruders': 1, 'starting_cards': 0, 'card_draw_probability': 0, **config,
        })
        self.drain_all(clients)
        return clients, ids, game

    def kill(self, clients, ids, game, player):
        self.client_for_player(clients, ids, player).emit('player_dead', {'player_id': player.player_id})

    def spectator_events(self, client):
        return self.event_payloads(self.drain(client), 'spectator')

    def test_only_out_players_get_the_feed(self):
        clients, ids, game = self.start()
        dead, doer = self.crew(game)[:2]
        self.kill(clients, ids, game, dead)
        dead_client = self.client_for_player(clients, ids, dead)
        first = self.spectator_events(dead_client)
        self.assertTrue(first, 'the player who just went out gets the feed at once')
        self.assertEqual('out', first[-1]['feed'][-1]['kind'])
        self.drain_all(clients)

        self.client_for_player(clients, ids, doer).emit('complete_task', {'player_id': doer.player_id})
        received = self.drain_all(clients)
        for client, events in received.items():
            got = self.event_payloads(events, 'spectator')
            if client is dead_client:
                self.assertTrue(got)
            else:
                self.assertFalse(got, 'a living phone must never get the spectator feed')

    def test_room_state_carries_the_feed_for_out_players_only(self):
        clients, ids, game = self.start()
        dead, alive = self.crew(game)[:2]
        self.kill(clients, ids, game, dead)
        from assets.room_protocol import room_state
        self.assertIsNotNone(room_state(game, dead)['spectator'])
        self.assertIsNone(room_state(game, alive)['spectator'])
        self.assertIsNone(room_state(game, None)['spectator'])

    def test_secret_view_hides_who_did_what(self):
        clients, ids, game = self.start()
        dead, doer = self.crew(game)[:2]
        intruder = self.intruders(game)[0]
        self.kill(clients, ids, game, dead)
        dead_client = self.client_for_player(clients, ids, dead)

        self.client_for_player(clients, ids, doer).emit('complete_task', {'player_id': doer.player_id})
        card = self.inject_card(game, intruder, 'Taunt', sound='taunt')
        self.client_for_player(clients, ids, intruder).emit('play_card', {'player_id': intruder.player_id, 'card_id': card.id})

        view = self.spectator_events(dead_client)[-1]
        self.assertEqual('secret', view['view'])
        self.assertFalse(view['open_book'])
        text = json.dumps(view["feed"])
        self.assertNotIn(intruder.player_id, text)
        self.assertNotIn(doer.player_id, text)
        kinds = [entry['kind'] for entry in view['feed']]
        self.assertIn('task', kinds)
        self.assertIn('card', kinds)
        card_line = next(entry for entry in view['feed'] if entry['kind'] == 'card')
        self.assertEqual('Taunt', card_line['card'])
        for row in view['living']:
            self.assertEqual({'player_id'}, set(row))

    def test_secret_view_skips_the_card_line_for_an_emergency_meeting_card(self):
        clients, ids, game = self.start()
        dead = self.crew(game)[0]
        intruder = self.intruders(game)[0]
        self.kill(clients, ids, game, dead)
        card = self.inject_card(game, intruder, 'Self Report')
        self.client_for_player(clients, ids, intruder).emit('play_card', {'player_id': intruder.player_id, 'card_id': card.id})
        view = game.spectator.view_for(dead)
        self.assertNotIn('card', [entry['kind'] for entry in view['feed']])
        meeting = next(entry for entry in view['feed'] if entry['kind'] == 'meeting')
        self.assertEqual(intruder.username, meeting['name'])  # the whole room sees who called it
        self.assertNotIn('sus', meeting)

    def test_area_denial_area_stays_secret(self):
        clients, ids, game = self.start()
        dead = self.crew(game)[0]
        intruder = self.intruders(game)[0]
        self.kill(clients, ids, game, dead)
        card = self.inject_card(game, intruder, 'Area Denial', location='Kitchen', duration=30)
        self.client_for_player(clients, ids, intruder).emit('play_card', {'player_id': intruder.player_id, 'card_id': card.id})
        line = next(entry for entry in game.spectator.view_for(dead)['feed'] if entry['kind'] == 'card')
        self.assertNotIn('card_location', line)

    def test_full_view_names_everything(self):
        clients, ids, game = self.start(spectator_view='full')
        dead, doer = self.crew(game)[:2]
        intruder = self.intruders(game)[0]
        self.kill(clients, ids, game, dead)
        self.client_for_player(clients, ids, doer).emit('complete_task', {'player_id': doer.player_id})
        card = self.inject_card(game, intruder, 'Taunt', sound='taunt')
        self.client_for_player(clients, ids, intruder).emit('play_card', {'player_id': intruder.player_id, 'card_id': card.id})
        view = game.spectator.view_for(dead)
        self.assertTrue(view['open_book'])
        card_line = next(entry for entry in view['feed'] if entry['kind'] == 'card')
        self.assertEqual(intruder.player_id, card_line['player_id'])
        rows = {row['player_id']: row for row in view['living']}
        self.assertTrue(rows[intruder.player_id]['sus'])
        self.assertEqual(1, rows[doer.player_id]['tasks_done'])
        self.assertIn('location', rows[doer.player_id])

    def test_unknown_view_setting_falls_back_to_secret(self):
        clients, ids, game = self.start(spectator_view='everything')
        self.assertEqual('secret', game.spectator_view)

    def test_new_round_starts_with_an_empty_feed(self):
        clients, ids, game = self.start()
        dead = self.crew(game)[0]
        self.kill(clients, ids, game, dead)
        self.assertTrue(game.spectator.entries)
        game.begin_round()
        self.assertEqual([], game.spectator.entries)

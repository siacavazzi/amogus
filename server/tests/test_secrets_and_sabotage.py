import json

from server.tests.integration_helpers import SocketGameTestCase


class SecretsAndSabotageTests(SocketGameTestCase):

    def player_lists(self, events):
        return [[json.loads(p) for p in payload['list']]
                for payload in self.event_payloads(events, 'game_data')
                if isinstance(payload, dict) and 'list' in payload]

    def test_phones_only_learn_roles_they_are_meant_to_know(self):
        clients, room, ids, game = self.setup_started_game(6, config={'num_intruders': 2})
        first, second = self.intruders(game)
        crewmate = self.crew(game)[0]
        self.inject_card(game, first, 'EMP', duration=30)
        game.emit_player_list()

        crew_view = self.player_lists(self.drain(self.client_for_player(clients, ids, crewmate)))[-1]
        self.assertEqual([], [p['username'] for p in crew_view if p['sus']])
        self.assertTrue(all(p['cards'] == [] and p['meltdown_code'] is None for p in crew_view))

        intruder_view = {p['player_id']: p for p in self.player_lists(self.drain(self.client_for_player(clients, ids, first)))[-1]}
        self.assertTrue(intruder_view[second.player_id]['sus'])
        self.assertEqual([], intruder_view[second.player_id]['cards'])
        self.assertTrue(intruder_view[first.player_id]['cards'])

    def test_rejoin_and_room_state_keep_roles_hidden_mid_round(self):
        clients, room, ids, game = self.setup_started_game(4)
        game.stats['fake_tasks_sent'].append({'sender_name': self.intruders(game)[0].username})
        crewmate = self.crew(game)[0]
        client = self.client_for_player(clients, ids, crewmate)
        self.drain(client)
        client.emit('rejoin', {'player_id': crewmate.player_id})
        events = self.drain(client)
        for players in self.player_lists(events):
            self.assertFalse(any(p['sus'] for p in players))
        state = self.event_payloads(events, 'room_state')[-1]
        self.assertFalse(any(p['sus'] for p in state['players']))
        self.assertIsNone(state['stats'])

    def test_the_dead_and_the_end_screen_show_roles(self):
        clients, room, ids, game = self.setup_started_game(5)
        intruder = self.intruders(game)[0]
        crew = self.crew(game)
        game.kill_player(crew[0].player_id, 'murdered')
        view = self.player_lists(self.drain(self.client_for_player(clients, ids, crew[1])))[-1]
        self.assertEqual({p['player_id']: p['sus'] for p in view}[intruder.player_id], False)
        game.kill_player(intruder.player_id, 'voted_out_intruder')
        view = self.player_lists(self.drain(self.client_for_player(clients, ids, crew[1])))[-1]
        self.assertTrue({p['player_id']: p['sus'] for p in view}[intruder.player_id])

    def test_card_messages_go_only_to_the_intruder(self):
        clients, room, ids, game = self.setup_started_game(4)
        intruder = self.intruders(game)[0]
        card = self.inject_card(game, intruder, 'Area Denial', location='Kitchen', duration=60, countdown=True)
        self.drain_all(clients)
        self.client_for_player(clients, ids, intruder).emit('play_card', {'player_id': intruder.player_id, 'card_id': card.id})
        game.drawCards()
        for player in self.crew(game):
            self.assertFalse(self.has_event(self.drain(self.client_for_player(clients, ids, player)), 'message'))
        self.assertTrue(self.has_event(self.drain(self.client_for_player(clients, ids, intruder)), 'message'))

    def test_remote_sabotage_is_refused_without_a_reactor_and_the_card_is_kept(self):
        clients, room, ids, game = self.setup_started_game(4)
        intruder = self.intruders(game)[0]
        card = self.inject_card(game, intruder, 'Remote Sabotage')
        client = self.client_for_player(clients, ids, intruder)
        self.drain(client)
        client.emit('play_card', {'player_id': intruder.player_id, 'card_id': card.id})
        self.assertIsNone(game.active_meltdown)
        self.assertIn(card, intruder.cards)
        self.assertTrue(self.has_event(self.drain(client), 'message'))

        reactor = self.make_client()
        reactor.emit('register_reactor', {'room_code': room})
        client.emit('play_card', {'player_id': intruder.player_id, 'card_id': card.id})
        self.assertIsNotNone(game.active_meltdown)
        self.assertNotIn(card, intruder.cards)
        game.cancel_meltdown()

    def test_stacked_shorten_meltdown_leaves_half_the_time(self):
        clients, room, ids, game = self.setup_started_game(4, config={'meltdown_time': 30})
        reactor = self.make_client()
        reactor.emit('register_reactor', {'room_code': room})
        intruder = self.intruders(game)[0]
        client = self.client_for_player(clients, ids, intruder)
        for duration in (10, 12, 15):
            card = self.inject_card(game, intruder, 'Shorten Meltdown', duration=duration)
            client.emit('play_card', {'player_id': intruder.player_id, 'card_id': card.id})
        self.assertTrue(game.start_meltdown())
        self.assertEqual(15, game.active_meltdown.time_left)
        game.cancel_meltdown()

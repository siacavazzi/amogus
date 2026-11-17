"""A crewmate's hand of three tasks, timed Priority tasks, swaps, and the cards that use them."""
from unittest.mock import patch

from server.tests.integration_helpers import SocketGameTestCase
from assets import task_hand


class TaskHandTests(SocketGameTestCase):
    QUIET = {'starting_cards': 0, 'card_draw_probability': 0}

    def start(self, players=5, **kwargs):
        clients, room, ids, game = self.setup_started_game(players, config={**self.QUIET, **kwargs})
        return clients, room, ids, game

    def emit_as(self, clients, ids, player, event, data=None):
        client = self.client_for_player(clients, ids, player)
        client.emit(event, {'player_id': player.player_id, 'round_id': None, **(data or {})})
        return self.drain(client)

    def complete(self, clients, ids, game, player, assignment_id):
        client = self.client_for_player(clients, ids, player)
        client.emit('complete_task', {'player_id': player.player_id, 'assignment_id': assignment_id})
        return self.drain(client)

    def test_every_crewmate_gets_a_hand_of_three_and_intruders_none(self):
        clients, room, ids, game = self.start()
        for player in self.crew(game):
            self.assertEqual(task_hand.HAND_SIZE, len(player.hand))
            self.assertEqual(len(player.hand), len({task['assignment_id'] for task in player.hand}))
            self.assertIsNone(player.priority)
        for player in self.intruders(game):
            self.assertEqual([], player.hand)

    def test_any_task_in_the_hand_can_be_done_and_its_slot_refills(self):
        clients, room, ids, game = self.start()
        crew = self.crew(game)[0]
        last = crew.hand[2]
        kept = [task['assignment_id'] for task in crew.hand[:2]]
        events = self.complete(clients, ids, game, crew, last['assignment_id'])
        self.assertEqual(1, game.crew_score)
        self.assertEqual(1, crew.round_tasks_done)
        self.assertEqual(kept, [task['assignment_id'] for task in crew.hand[:2]])
        self.assertNotEqual(last['assignment_id'], crew.hand[2]['assignment_id'])
        shown = self.first_event(events, 'task')
        self.assertEqual(3, len(shown['hand']))
        self.assertEqual(1, shown['tasks_done'])

    def test_a_swap_needs_a_finished_priority_task(self):
        clients, room, ids, game = self.start()
        crew = self.crew(game)[0]
        first = crew.hand[0]['assignment_id']
        client = self.client_for_player(clients, ids, crew)
        refused = client.emit('swap_task', {'player_id': crew.player_id, 'round_id': game.round_id,
                                             'assignment_id': first}, callback=True)
        self.assertEqual('no_swaps', refused.get('reason'))
        self.assertEqual(first, crew.hand[0]['assignment_id'])

        task_hand.give_priority(game, crew, {'task': 'Priority job', 'location': 'Kitchen'})
        self.complete(clients, ids, game, crew, crew.priority['assignment_id'])
        self.assertEqual(1, crew.swaps)
        self.assertEqual(1, game.crew_score)
        self.assertIsNone(crew.priority)
        self.assertIsNotNone(crew.next_priority_in)

        ok = client.emit('swap_task', {'player_id': crew.player_id, 'round_id': game.round_id,
                                        'assignment_id': first}, callback=True)
        self.assertTrue(ok.get('ok'))
        self.assertEqual(0, crew.swaps)
        self.assertNotEqual(first, crew.hand[0]['assignment_id'])

    def test_priority_clock_deals_one_then_expires_it_and_pauses_in_meetings(self):
        clients, room, ids, game = self.start()
        crew = self.crew(game)[0]
        crew.next_priority_in = 1
        with game.state_lock:
            changed = task_hand.priority_tick(game)
        self.assertIn(crew, changed)
        self.assertEqual(task_hand.PRIORITY_SECONDS, crew.priority['time_left'])

        game.meeting = True  # any meeting stops the clock
        with game.state_lock:
            task_hand.priority_tick(game)
        self.assertEqual(task_hand.PRIORITY_SECONDS, crew.priority['time_left'])
        game.meeting = None
        with game.state_lock:
            resumed = task_hand.priority_tick(game)
        self.assertIn(crew, resumed)  # phones get the true time left after a meeting

        crew.priority['time_left'] = 1
        with game.state_lock:
            task_hand.priority_tick(game)
        self.assertIsNone(crew.priority)
        self.assertGreaterEqual(crew.next_priority_in, task_hand.NEXT_PRIORITY_SECONDS[0])

    def test_area_denial_locks_tasks_already_in_hand(self):
        clients, room, ids, game = self.start()
        crew = self.crew(game)[0]
        blocked = crew.hand[0]
        game.denied_location = blocked['location']
        events = self.complete(clients, ids, game, crew, blocked['assignment_id'])
        self.assertEqual(0, game.crew_score)
        self.assertEqual(blocked['assignment_id'], crew.hand[0]['assignment_id'])

    def test_fake_task_goes_to_the_crewmate_most_due_a_priority(self):
        clients, room, ids, game = self.start()
        intruder = self.intruders(game)[0]
        crew = self.crew(game)
        for player in crew:
            player.priority_idle = 5
        crew[1].priority_idle = 90
        card = self.inject_card(game, intruder, 'Fake Task', requires_input=True)
        self.emit_as(clients, ids, intruder, 'play_card', {
            'card_id': card.id, 'extra_data': {'task_text': 'Count the spoons', 'task_location': 'Kitchen'}})
        self.assertNotIn(card, intruder.cards)
        self.assertTrue(crew[1].priority['is_fake'])
        self.assertEqual('Count the spoons', crew[1].priority['task'])
        self.assertEqual(crew[1].username, game.stats['fake_tasks_sent'][0]['target_name'])
        self.assertTrue(all(player.priority is None for player in crew if player is not crew[1]))

    def test_steal_tasks_shows_the_hand_to_the_intruder_and_redeals_the_victim(self):
        clients, room, ids, game = self.start()
        intruder, victim = self.intruders(game)[0], self.crew(game)[0]
        before = [(task['task'], task['location']) for task in victim.hand]
        before_ids = [task['assignment_id'] for task in victim.hand]
        card = self.inject_card(game, intruder, 'Steal Tasks', requires_input=True)
        self.emit_as(clients, ids, intruder, 'play_card', {
            'card_id': card.id, 'extra_data': {'target_player_id': victim.player_id}})
        self.assertEqual(victim.username, intruder.stolen['from'])
        self.assertEqual(before, [(task['task'], task['location']) for task in intruder.stolen['tasks']])
        self.assertTrue(set(before_ids).isdisjoint(task['assignment_id'] for task in victim.hand))
        self.assertEqual(task_hand.HAND_SIZE, len(victim.hand))
        events = self.drain(self.client_for_player(clients, ids, victim))
        self.assertTrue(any(event['name'] == 'tasks_stolen' for event in events))

        caller = self.crew(game)[1]
        game.start_meeting(caller)
        self.assertIsNone(intruder.stolen)

    def test_reshuffle_redeals_every_crew_hand(self):
        clients, room, ids, game = self.start()
        intruder = self.intruders(game)[0]
        before = {player.player_id: {task['assignment_id'] for task in player.hand} for player in self.crew(game)}
        card = self.inject_card(game, intruder, 'Reshuffle')
        self.emit_as(clients, ids, intruder, 'play_card', {'card_id': card.id})
        for player in self.crew(game):
            self.assertTrue(before[player.player_id].isdisjoint(task['assignment_id'] for task in player.hand))

    def test_rally_gives_every_crewmate_a_real_priority_in_one_area_after_the_first_minute(self):
        clients, room, ids, game = self.start()
        intruder = self.intruders(game)[0]
        card = self.inject_card(game, intruder, 'Rally', requires_input=True)
        play = {'card_id': card.id, 'extra_data': {'location': 'Yard'}}
        with patch.object(game, 'round_seconds', return_value=20):
            self.emit_as(clients, ids, intruder, 'play_card', play)
        self.assertIn(card, intruder.cards)
        with patch.object(game, 'round_seconds', return_value=90):
            self.emit_as(clients, ids, intruder, 'play_card', play)
        self.assertNotIn(card, intruder.cards)
        for player in self.crew(game):
            self.assertEqual('Yard', player.priority['location'])
            self.assertFalse(player.priority.get('is_fake'))

    def test_rally_is_dealt_only_with_a_lone_intruder(self):
        clients, room, ids, game = self.start()
        game.round_intruder_count = 1
        game.card_deck._build_deck()
        self.assertEqual(1, sum(1 for card in game.card_deck.cards if card.action == 'Rally'))
        game.round_intruder_count = 2
        game.card_deck._build_deck()
        self.assertEqual(0, sum(1 for card in game.card_deck.cards if card.action == 'Rally'))

    def test_intruders_left_is_hidden_after_a_late_join(self):
        clients, room, ids, game = self.start()
        self.assertEqual(1, game.intruders_left())
        game.late_joins = 1
        self.assertIsNone(game.intruders_left())

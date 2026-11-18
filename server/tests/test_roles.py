"""The Hacker and the Detective (assets/roles.py)."""
import json
from unittest.mock import patch

from server.tests.integration_helpers import SocketGameTestCase
from assets import roles
from assets.meltdown import Meltdown


class RolesTests(SocketGameTestCase):
    QUIET = {'starting_cards': 0, 'card_draw_probability': 0}

    def start(self, players, intruders=1, roles_mode='auto', **kwargs):
        config = {**self.QUIET, 'num_intruders': intruders, **kwargs}
        if roles_mode:
            config['roles'] = roles_mode
        return self.setup_started_game(players, config=config)

    def client(self, clients, ids, player):
        return self.client_for_player(clients, ids, player)

    def hacker(self, game):
        return next(player for player in game.players if player.is_hacker)

    def detective(self, game):
        return next(player for player in game.players if player.is_detective)

    def drain_each(self, clients, ids):
        """Each player's events, by player id."""
        return {player_id: self.drain(client) for player_id, client in zip(ids, clients)}

    def payloads(self, events, name):
        out = []
        for event in events:
            if event['name'] != name:
                continue
            args = event.get('args')
            out.append(args[0] if isinstance(args, list) and args else args)
        return out

    def messages(self, events):
        return [payload['message'] for payload in self.payloads(events, 'message')]

    def complete(self, clients, ids, player, task=None):
        task = task or player.hand[0]
        return self.client(clients, ids, player).emit('complete_task', {
            'player_id': player.player_id, 'assignment_id': task['assignment_id'],
            'request_id': task['assignment_id'][:20], 'round_id': player.task['round_id'] if player.task else None,
        }, callback=True)

    # ------------------------------------------------------------ dealing

    def test_roles_are_off_unless_the_host_turns_them_on(self):
        clients, room, ids, game = self.start(7, roles_mode=None)
        self.assertEqual('off', game.roles_mode)
        self.assertFalse(any(p.is_hacker or p.is_detective for p in game.players))

    def test_the_table_by_player_count(self):
        self.assertEqual((False, False), roles.roles_for(5))
        self.assertEqual((True, False), roles.roles_for(6))
        self.assertEqual((True, False), roles.roles_for(9))
        self.assertEqual((False, True), roles.roles_for(10))
        self.assertEqual((False, True), roles.roles_for(14))
        self.assertEqual((True, True), roles.roles_for(15))

    def test_a_hacker_at_seven_players_is_not_crew(self):
        clients, room, ids, game = self.start(7)
        hacker = self.hacker(game)
        self.assertFalse(hacker.sus)
        self.assertEqual(5, game.numCrew)
        self.assertEqual(5 * game.tasks_per_crewmate(), game.taskGoal)
        self.assertEqual(3, len(hacker.hand), 'the Hacker has tasks like a crewmate')
        self.assertEqual(roles.HACKER_START_CARDS, len(hacker.cards))
        self.assertTrue(all(card.action in roles.HACKER_CARDS + roles.HACKER_REACTOR_CARDS for card in hacker.cards))
        self.assertEqual({'intruders': 1, 'hackers': 1, 'detectives': 0}, roles.among_you(game))

    def test_the_hacker_is_secret_from_intruders_and_everyone_else(self):
        clients, room, ids, game = self.start(7)
        hacker = self.hacker(game)
        intruder = self.intruders(game)[0]
        seen_by_intruder = {p['player_id']: p for p in map(json.loads, game.player_view(intruder))}
        self.assertIsNone(seen_by_intruder[hacker.player_id]['role'])
        self.assertFalse(seen_by_intruder[hacker.player_id]['sus'])
        seen_by_hacker = {p['player_id']: p for p in map(json.loads, game.player_view(hacker))}
        self.assertFalse(seen_by_hacker[intruder.player_id]['sus'])
        self.assertEqual('hacker', seen_by_hacker[hacker.player_id]['role'])

    def test_a_detective_at_ten_and_both_at_fifteen(self):
        clients, room, ids, game = self.start(10, intruders=2)
        self.assertEqual(1, sum(p.is_detective for p in game.players))
        self.assertEqual(0, sum(p.is_hacker for p in game.players))
        self.assertEqual(8, game.numCrew, 'the Detective is crew')

        clients, room, ids, game = self.start(15, intruders=3)
        self.assertEqual(1, sum(p.is_detective for p in game.players))
        self.assertEqual(1, sum(p.is_hacker for p in game.players))

    # ------------------------------------------------------------ Hacker

    def test_hacker_tasks_earn_a_pick_of_two_cards_and_never_fill_the_bar(self):
        clients, room, ids, game = self.start(7)
        hacker = self.hacker(game)
        for _ in range(roles.HACKER_TASKS_PER_CARD):
            self.assertTrue(self.complete(clients, ids, hacker).get('ok'))
        self.assertEqual(0, game.crew_score)
        self.assertEqual(2, hacker.round_tasks_done)
        self.assertEqual(roles.HACKER_OFFER, len(hacker.card_offer))
        pick = hacker.card_offer[1]
        refused = self.client(clients, ids, hacker).emit('pick_card', {'player_id': hacker.player_id, 'card_id': 'nope'}, callback=True)
        self.assertFalse(refused.get('ok'))
        ok = self.client(clients, ids, hacker).emit('pick_card', {'player_id': hacker.player_id, 'card_id': pick.id}, callback=True)
        self.assertTrue(ok.get('ok'))
        self.assertIn(pick, hacker.cards)
        self.assertEqual([], hacker.card_offer)

    def test_a_full_hand_gets_no_offer(self):
        clients, room, ids, game = self.start(7)
        hacker = self.hacker(game)
        while len(hacker.cards) < roles.HACKER_HAND:
            hacker.cards.append(roles.new_card(game))
        for _ in range(roles.HACKER_TASKS_PER_CARD):
            self.complete(clients, ids, hacker)
        self.assertEqual([], hacker.card_offer)

    def test_a_hacker_card_glitches_their_phone_pings_intruders_unnamed_and_leaves_a_trail(self):
        clients, room, ids, game = self.start(7)
        hacker, intruder = self.hacker(game), self.intruders(game)[0]
        hacker.cards = []
        emp = self.inject_card(game, hacker, 'EMP', duration=30)
        self.drain_all(clients)
        self.client(clients, ids, hacker).emit('play_card', {'player_id': hacker.player_id, 'card_id': emp.id})
        events = self.drain_each(clients, ids)
        self.assertEqual(30, game.active_hack)
        self.assertTrue(self.has_event(events[hacker.player_id], 'hacker_glitch'))
        pings = self.messages(events[intruder.player_id])
        self.assertEqual(['The Hacker set off an EMP for 30 seconds.'], pings)
        self.assertNotIn(hacker.username, pings[0])
        self.assertEqual([{'card': 'EMP', 'area': roles.hacker_area(hacker)}], game.hacker_trail)
        for player in self.crew(game):
            if player is not hacker:
                self.assertFalse(self.has_event(events[player.player_id], 'hacker_glitch'))

    def test_the_hacker_waits_between_cards(self):
        clients, room, ids, game = self.start(7)
        hacker = self.hacker(game)
        hacker.cards = []
        first = self.inject_card(game, hacker, 'Shorten Meltdown', duration=10)
        second = self.inject_card(game, hacker, 'Shorten Meltdown', duration=10)
        self.client(clients, ids, hacker).emit('play_card', {'player_id': hacker.player_id, 'card_id': first.id})
        refused = self.client(clients, ids, hacker).emit('play_card', {'player_id': hacker.player_id, 'card_id': second.id}, callback=True)
        self.assertEqual('hacker_wait', refused.get('reason'))
        self.assertIn(second, hacker.cards)
        hacker.hacker_last_play -= roles.HACKER_PLAY_GAP_SECONDS
        self.client(clients, ids, hacker).emit('play_card', {'player_id': hacker.player_id, 'card_id': second.id})
        self.assertNotIn(second, hacker.cards)

    def test_a_taunt_between_hacker_and_intruder_lands_and_tells_the_sender(self):
        clients, room, ids, game = self.start(7)
        hacker, intruder = self.hacker(game), self.intruders(game)[0]
        hacker.cards = []
        taunt = self.inject_card(game, hacker, 'Taunt Message', requires_input=True)
        self.drain_all(clients)
        self.client(clients, ids, hacker).emit('play_card', {'player_id': hacker.player_id, 'card_id': taunt.id,
                                                             'extra_data': {'target_player_id': intruder.player_id, 'message': 'boo'}})
        events = self.drain_each(clients, ids)
        self.assertIn(f'{intruder.username} is on your side.', self.messages(events[hacker.player_id]))
        intruder_events = events[intruder.player_id]
        self.assertEqual('boo', self.payloads(intruder_events, 'taunt_received')[0]['message'])
        self.assertNotIn(hacker.username, ' '.join(self.messages(intruder_events)))

        back = self.inject_card(game, intruder, 'Taunt Message', requires_input=True)
        self.client(clients, ids, intruder).emit('play_card', {'player_id': intruder.player_id, 'card_id': back.id,
                                                               'extra_data': {'target_player_id': hacker.player_id, 'message': 'hi'}})
        events = self.drain_each(clients, ids)
        self.assertIn(f'{hacker.username} is the Hacker.', self.messages(events[intruder.player_id]))
        self.assertEqual('hi', self.payloads(events[hacker.player_id], 'taunt_received')[0]['message'])

    def test_a_hacker_cannot_taunt_themselves(self):
        clients, room, ids, game = self.start(7)
        hacker = self.hacker(game)
        hacker.cards = []
        taunt = self.inject_card(game, hacker, 'Taunt Message', requires_input=True)
        self.client(clients, ids, hacker).emit('play_card', {'player_id': hacker.player_id, 'card_id': taunt.id,
                                                             'extra_data': {'target_player_id': hacker.player_id, 'message': 'me'}})
        self.assertIn(taunt, hacker.cards)

    def test_fake_tasks_never_land_on_the_hacker(self):
        clients, room, ids, game = self.start(7)
        hacker = self.hacker(game)
        intruder = self.intruders(game)[0]
        for player in game.players:
            if player.is_crew:
                player.priority = {'task': 'busy', 'location': 'Kitchen', 'assignment_id': 'x'}
        card = self.inject_card(game, intruder, 'Fake Task', requires_input=True)
        self.client(clients, ids, intruder).emit('play_card', {'player_id': intruder.player_id, 'card_id': card.id,
                                                               'extra_data': {'task_text': 'Go', 'task_location': 'Kitchen'}})
        self.assertIsNone(hacker.priority)
        self.assertIn(card, intruder.cards, 'nobody left to send it to, so the card is kept')

    def test_the_hacker_fake_task_names_the_target_to_intruders(self):
        clients, room, ids, game = self.start(7)
        hacker, intruder = self.hacker(game), self.intruders(game)[0]
        hacker.cards = []
        card = self.inject_card(game, hacker, 'Fake Task', requires_input=True)
        self.drain_all(clients)
        self.client(clients, ids, hacker).emit('play_card', {'player_id': hacker.player_id, 'card_id': card.id,
                                                             'extra_data': {'task_text': 'Count spoons', 'task_location': 'Kitchen'}})
        target = next(p for p in game.players if p.priority and p.priority.get('is_fake'))
        self.assertTrue(target.is_crew)
        events = self.drain_each(clients, ids)
        self.assertIn(f'The Hacker sent {target.username} to Kitchen.', self.messages(events[intruder.player_id]))

    def test_meetings_list_the_hacker_trail_and_start_a_fresh_one(self):
        clients, room, ids, game = self.start(7)
        game.hacker_trail = [{'card': 'EMP', 'area': 'Kitchen'}]
        caller = next(p for p in game.players if p.is_crew)
        self.client(clients, ids, caller).emit('meeting', {'player_id': caller.player_id, 'round_id': game.round_id})
        self.assertEqual([{'card': 'EMP', 'area': 'Kitchen'}], json.loads(game.meeting.to_json())['hacker_trail'])
        self.assertEqual([], game.hacker_trail)

    def test_tagging_or_voting_out_the_hacker_does_not_end_the_round(self):
        clients, room, ids, game = self.start(7)
        hacker = self.hacker(game)
        game.kill_player(hacker.player_id, death_cause='murdered_during_task')
        self.assertIsNone(game.end_state)
        self.assertEqual(5, game.numCrew)
        self.assertEqual(1, game.numIntruders)
        self.assertEqual(0, roles.hackers_left(game))
        shown = {p['player_id']: p for p in map(json.loads, game.player_view(self.intruders(game)[0]))}
        self.assertEqual('hacker', shown[hacker.player_id]['role'], 'an out player shows their role')

    def test_crew_outnumbered_does_not_count_the_hacker(self):
        clients, room, ids, game = self.start(6)
        crew = [p for p in game.players if p.is_crew]
        self.assertEqual(4, len(crew))
        for player in crew[:2]:
            game.kill_player(player.player_id, death_cause='murdered')
            self.assertIsNone(game.end_state)
        game.kill_player(crew[2].player_id, death_cause='murdered')
        self.assertEqual('sus_victory', game.end_state)

    def test_voted_out_hacker_gets_their_own_death_cause(self):
        clients, room, ids, game = self.start(7)
        hacker = self.hacker(game)
        caller = next(p for p in game.players if p.is_crew)
        self.start_meeting_and_ready_living_players(clients, ids, game, caller)
        for player in self.living(game):
            self.client(clients, ids, player).emit('vote', {'player_id': player.player_id, 'round_id': game.round_id,
                                                            'meeting_id': game.meeting.id, 'votedFor': hacker.player_id})
        self.drain_all(clients)
        self.assertEqual('voted_out_hacker', hacker.death_cause)
        self.assertIsNone(game.end_state)

    # ------------------------------------------------------------ Detective

    def test_detective_checks_once_after_each_meeting(self):
        clients, room, ids, game = self.start(10, intruders=2)
        detective = self.detective(game)
        intruder = self.intruders(game)[0]
        client = self.client(clients, ids, detective)

        def check(target):
            return client.emit('detective_check', {'player_id': detective.player_id, 'round_id': game.round_id,
                                                   'target_id': target.player_id}, callback=True)

        self.assertFalse(check(intruder).get('ok'), 'no check before the first meeting')
        caller = next(p for p in game.players if p.is_crew and p is not detective)
        self.start_meeting_and_ready_living_players(clients, ids, game, caller)
        game.meeting.end_meeting(early=False)
        self.assertTrue(detective.check_ready)
        result = check(intruder)
        self.assertEqual(('intruder', intruder.username), (result['result'], result['name']))
        self.assertFalse(check(caller).get('ok'), 'one check per meeting')
        self.assertEqual(1, len(detective.checks))

    def test_a_check_on_the_hacker_reads_hacker(self):
        clients, room, ids, game = self.start(15, intruders=3)
        hacker = self.hacker(game)
        crewmate = next(p for p in game.players if p.is_crew and not p.is_detective)
        self.assertEqual('hacker', roles.check_result(hacker))
        self.assertEqual('not_intruder', roles.check_result(crewmate))

    def test_vote_history_is_the_detectives_alone_and_votes_never_leak_raw(self):
        clients, room, ids, game = self.start(10, intruders=2)
        detective = self.detective(game)
        caller = next(p for p in game.players if p.is_crew and p is not detective)
        target = self.intruders(game)[0]
        self.start_meeting_and_ready_living_players(clients, ids, game, caller)
        voter = self.living(game)[0]
        self.client(clients, ids, voter).emit('vote', {'player_id': voter.player_id, 'round_id': game.round_id,
                                                       'meeting_id': game.meeting.id, 'votedFor': target.player_id})
        shown = json.loads(game.meeting.to_json())['votes']
        self.assertTrue(all(isinstance(count, int) for count in shown.values()), 'mid-vote, only the tally goes out')
        self.assertEqual(1, shown[target.player_id])
        # A veto ends it with the ballots still raw: the meeting screen must still get a tally.
        for player in self.living(game):
            if not game.meeting:
                break
            self.client(clients, ids, player).emit('veto', {'player_id': player.player_id, 'round_id': game.round_id,
                                                            'meeting_id': game.meeting.id})
        events = self.drain_each(clients, ids)
        for payload in self.payloads(events[ids[0]], 'meeting'):
            self.assertTrue(all(isinstance(count, int) for count in json.loads(payload)['votes'].values()))
        history = game.vote_history
        self.assertEqual(1, len(history))
        self.assertEqual('veto', history[0]['outcome'])
        state = (self.payloads(events[detective.player_id], 'detective_state') or [None])[-1]
        self.assertEqual(history, state['vote_history'])
        self.assertTrue(state['check_ready'])
        for player in game.players:
            if player is not detective:
                self.assertEqual([], self.payloads(events[player.player_id], 'detective_state'))

    # ------------------------------------------------------------ meltdown

    def test_the_hacker_code_undoes_a_code_and_costs_ten_seconds(self):
        clients, room, ids, game = self.start(7)
        hacker = self.hacker(game)
        meltdown = Meltdown(game.players, 60, game.socket, game.speaker, 1.0)
        meltdown.game = game
        meltdown.round_id = game.round_id
        game.active_meltdown = meltdown
        meltdown.distribute_codes()
        self.assertIsNotNone(hacker.hacker_code)
        self.assertNotIn(hacker.hacker_code, meltdown.valid_pins)
        first = meltdown.valid_pins[0]
        self.assertTrue(meltdown.check_pin(first))
        self.assertEqual(1, meltdown.codes_entered)
        self.drain_all(clients)
        self.assertFalse(meltdown.check_pin(hacker.hacker_code))
        self.assertEqual(0, meltdown.codes_entered)
        self.assertIn(first, meltdown.valid_pins, 'the undone code can be typed again')
        self.assertEqual(50, meltdown.time_left)
        self.assertTrue(self.has_event(self.drain(clients[0]), 'code_corrupted'))
        used = next(pin for pin in range(1000, 10000) if pin not in meltdown.valid_pins)
        self.assertFalse(meltdown.check_pin(used))
        self.assertEqual(50, meltdown.time_left, 'a wrong code costs no time')

"""Latecomers join a running round with a secret role, when it is safe (Sam, 2026-11-01)."""
import unittest
from unittest.mock import patch

from server.tests.integration_helpers import SocketGameTestCase, server_app
from assets.scaling import auto_intruder_count, late_intruder_odds, late_task_goal_increase

CREW_ROLL = 0.99      # above any odds: dealt crew
INTRUDER_ROLL = 0.0   # below any odds: dealt intruder


class LateIntruderOddsTests(unittest.TestCase):
    def test_odds_follow_how_the_round_is_going(self):
        # The room's target is what Auto deals for the living players plus the newcomer.
        for living, intruders in ((10, 2), (9, 1), (7, 2), (16, 2), (4, 3), (21, 4)):
            with self.subTest(living=living, intruders=intruders):
                missing = auto_intruder_count(living + 1) - intruders
                expected = min(max(0.20 + 0.20 * missing, 0.10), 0.40)
                self.assertAlmostEqual(expected, late_intruder_odds(living, intruders))

    def test_odds_rise_when_crew_vote_intruders_out_and_fall_when_crew_die(self):
        start = late_intruder_odds(10, 2)
        self.assertGreater(late_intruder_odds(9, 1), start)     # an intruder voted out
        self.assertLessEqual(late_intruder_odds(6, 2), start)   # four crew killed
        self.assertLess(late_intruder_odds(6, 2), late_intruder_odds(9, 1))

    def test_door_stays_open_and_late_never_means_probably_intruder(self):
        for living in range(3, 60):
            for intruders in range(0, living):
                odds = late_intruder_odds(living, intruders)
                self.assertGreaterEqual(odds, 0.10)
                self.assertLessEqual(odds, 0.40)

    def test_task_goal_grows_by_a_crewmate_share_times_the_crew_odds(self):
        self.assertEqual(8, late_task_goal_increase(10))
        self.assertEqual(5, late_task_goal_increase(6))


class LiveJoinTests(SocketGameTestCase):
    def start_round(self, players=10, **config):
        settings = {'starting_cards': 1, 'card_draw_probability': 0, 'num_intruders': 2, **config}
        return self.setup_started_game(players, config=settings)

    def join_late(self, room, name='Late', roll=CREW_ROLL):
        late = self.make_client()
        late.emit('join_game', {'room_code': room})
        joined = self.first_event(self.drain(late), 'game_joined')
        with patch('assets.game.random.random', return_value=roll):
            late.emit('join', {'room_code': room, 'username': name})
        events = self.drain(late)
        late_id = self.first_event(events, 'player_id')['player_id']
        return late, late_id, events, joined

    def test_latecomer_joins_the_round_as_crew(self):
        clients, room, ids, game = self.start_round()
        crew, intruders, goal = game.numCrew, game.numIntruders, game.taskGoal
        self.drain_all(clients)
        late, late_id, events, joined = self.join_late(room, roll=CREW_ROLL)

        self.assertTrue(joined['late_join_live'])
        player = game.getPlayerById(late_id)
        self.assertIsNotNone(player)
        self.assertFalse(player.sus)
        self.assertEqual([], game.waiting_players)
        bump = late_task_goal_increase(game.tasks_per_crewmate())
        self.assertEqual((crew + 1, intruders, goal + bump), (game.numCrew, game.numIntruders, game.taskGoal))
        self.assertIsNotNone(player.task)

        joined_round = [e for e in self.event_payloads(events, 'player_id') if e.get('joined_round')]
        self.assertEqual(1, len(joined_round))
        start = [e for e in self.event_payloads(events, 'game_data') if e.get('action') == 'start_game']
        self.assertTrue(start and start[-1]['late_join'])
        self.assertTrue(self.has_event(events, 'task'))
        self.assertFalse(self.first_event(events, 'room_state')['waiting'] and
                         self.event_payloads(events, 'room_state')[-1]['waiting'])

        for client in clients:
            room_events = self.drain(client)
            self.assertIn(goal + bump, self.event_payloads(room_events, 'task_goal'))

    def test_latecomer_joins_as_intruder_with_cards_and_teammates(self):
        clients, room, ids, game = self.start_round()
        crew, intruders, goal = game.numCrew, game.numIntruders, game.taskGoal
        old_intruders = [p for p in game.players if p.sus]
        self.drain_all(clients)
        late, late_id, events, _ = self.join_late(room, name='Morgan', roll=INTRUDER_ROLL)

        player = game.getPlayerById(late_id)
        self.assertTrue(player.sus)
        self.assertEqual((crew, intruders + 1), (game.numCrew, game.numIntruders))
        # The bar moves the same as for a crewmate.
        self.assertEqual(goal + late_task_goal_increase(game.tasks_per_crewmate()), game.taskGoal)
        self.assertIsNone(player.task)
        self.assertEqual(1, len(player.cards))

        # The late intruder sees their teammates; the teammates are told who joined them.
        start = [e for e in self.event_payloads(events, 'game_data') if e.get('action') == 'start_game'][-1]
        seen = {self.parse_json_payload(p)['player_id']: self.parse_json_payload(p)['sus'] for p in start['list']}
        for other in old_intruders:
            self.assertTrue(seen[other.player_id])
            # Socket.IO hands 'message' events over as the bare payload, not an argument list.
            received = self.client_for_player(clients, ids, other).get_received()
            messages = [e['args'] for e in received if e['name'] == 'message']
            self.assertTrue(any('Morgan just joined the round as an intruder' in str(m) for m in messages))

        # Crew phones don't learn the late role.
        crew_client = self.client_for_player(clients, ids, next(p for p in game.players if not p.sus and p.player_id in ids))
        lists = [e for e in self.event_payloads(crew_client.get_received(), 'game_data') if e.get('list')]
        late_seen = [self.parse_json_payload(p) for p in lists[-1]['list'] if self.parse_json_payload(p)['player_id'] == late_id]
        self.assertFalse(late_seen[0]['sus'])

    def test_meeting_results_stop_counting_intruders_after_a_late_join(self):
        clients, room, ids, game = self.start_round()
        self.join_late(room, roll=INTRUDER_ROLL)
        caller = next(i for i, pid in enumerate(ids) if not game.getPlayerById(pid).sus)
        clients[caller].emit('meeting', {'player_id': ids[caller]})
        for player in list(game.players):
            client = (self.client_for_player(clients, ids, player) if player.player_id in ids else None)
            if client:
                client.emit('ready', {'player_id': player.player_id})
        meeting = game.meeting
        self.assertIsNotNone(meeting)
        meeting.start_voting() if meeting.stage == 'waiting' else None
        meeting.end_meeting()
        result = self.parse_json_payload(meeting.to_json())
        self.assertIsNone(result['intruders_left'])
        self.assertTrue(result['intruders_hidden'])

    def test_phone_arriving_during_a_meeting_joins_when_it_ends(self):
        clients, room, ids, game = self.start_round()
        caller = next(i for i, pid in enumerate(ids) if not game.getPlayerById(pid).sus)
        clients[caller].emit('meeting', {'player_id': ids[caller]})
        late, late_id, events, _ = self.join_late(room)
        self.assertIsNotNone(game.get_waiting_player(late_id))
        self.assertEqual('meeting', self.first_event(events, 'player_id')['joins_when'])

        with patch('assets.game.random.random', return_value=CREW_ROLL):
            game.meeting.end_meeting(early=True)
        self.assertIsNone(game.get_waiting_player(late_id))
        self.assertIsNotNone(game.getPlayerById(late_id))

    def test_phone_arriving_during_a_meltdown_joins_when_it_is_averted(self):
        clients, room, ids, game = self.start_round()
        reactor = self.make_client()
        reactor.emit('register_reactor', {'room_code': room})
        with patch('assets.meltdown.eventlet.spawn'):
            game.start_meltdown()
        meltdown = game.active_meltdown
        self.assertIsNotNone(meltdown)
        late, late_id, events, _ = self.join_late(room)
        self.assertEqual('meltdown', self.first_event(events, 'player_id')['joins_when'])
        meltdown.end_meltdown(success=True)
        self.assertIsNotNone(game.getPlayerById(late_id))

    def test_no_live_join_when_a_late_intruder_could_tip_the_round(self):
        # 5 players, 1 intruder: 4 crew vs 2 with a late intruder is too close. Wait for next round.
        clients, room, ids, game = self.start_round(players=5, num_intruders=1, starting_cards=0)
        late, late_id, events, _ = self.join_late(room, roll=INTRUDER_ROLL)
        self.assertIsNotNone(game.get_waiting_player(late_id))
        self.assertEqual(1, game.numIntruders)
        # The phone hears "next round", the same as with the setting off: nothing about the score.
        self.assertEqual('next_round', self.first_event(events, 'player_id')['joins_when'])

    def test_the_guard_counts_living_players_only(self):
        clients, room, ids, game = self.start_round()
        crew = [p for p in game.players if not p.sus]
        # 2 intruders vs 4 living crew: 4 - 3 = 1, too close.
        for victim in crew[:4]:
            game.kill_player(victim.player_id, death_cause='murdered')
        self.assertFalse(game.end_state)
        late, late_id, _, _ = self.join_late(room)
        self.assertIsNotNone(game.get_waiting_player(late_id))

    def test_no_live_join_once_tasks_are_done_and_intruders_named(self):
        clients, room, ids, game = self.start_round()
        with game.state_lock:
            game.reveal_intruders()
        late, late_id, events, _ = self.join_late(room, roll=INTRUDER_ROLL)
        self.assertIsNotNone(game.get_waiting_player(late_id))
        self.assertEqual('next_round', self.first_event(events, 'player_id')['joins_when'])

    def test_live_join_works_on_auto_tasks_per_crewmate(self):
        clients, room, ids, game = self.start_round(task_ratio='auto')
        goal = game.taskGoal
        late, late_id, _, _ = self.join_late(room, roll=CREW_ROLL)
        self.assertIsNotNone(game.getPlayerById(late_id))
        self.assertEqual(goal + late_task_goal_increase(game.tasks_per_crewmate()), game.taskGoal)

    def test_setting_off_keeps_latecomers_for_the_next_round(self):
        clients, room, ids, game = self.start_round(late_join_live=False)
        late, late_id, events, joined = self.join_late(room)
        self.assertFalse(joined['late_join_live'])
        self.assertIsNotNone(game.get_waiting_player(late_id))
        self.assertEqual('next_round', self.first_event(events, 'player_id')['joins_when'])

    def test_offline_waiting_phone_joins_when_it_comes_back(self):
        clients, room, ids, game = self.start_round()
        caller = next(i for i, pid in enumerate(ids) if not game.getPlayerById(pid).sus)
        clients[caller].emit('meeting', {'player_id': ids[caller]})
        late, late_id, _, _ = self.join_late(room)
        late.disconnect()
        game.meeting.end_meeting(early=True)
        self.assertIsNotNone(game.get_waiting_player(late_id), 'an offline phone is not dealt in')

        back = self.make_client()
        with patch('assets.game.random.random', return_value=CREW_ROLL):
            back.emit('rejoin', {'player_id': late_id})
        self.assertIsNotNone(game.getPlayerById(late_id))
        self.assertIsNotNone(game.getPlayerById(late_id).task)

    def test_late_crew_count_in_the_win_check(self):
        clients, room, ids, game = self.start_round()
        late, late_id, _, _ = self.join_late(room, roll=CREW_ROLL)
        intruders = [p for p in game.players if p.sus]
        crew = [p for p in game.players if not p.sus]
        self.assertEqual(9, len(crew))
        # Crew lose only when living crew fall to the intruder count, latecomer included.
        for victim in crew[:6]:
            game.kill_player(victim.player_id, death_cause='murdered')
        self.assertFalse(game.end_state)
        game.kill_player(crew[6].player_id, death_cause='murdered')
        self.assertEqual('sus_victory', game.end_state)
        self.assertEqual(2, len(intruders))

    def test_late_joiners_are_ordinary_players_next_round(self):
        clients, room, ids, game = self.start_round()
        late, late_id, _, _ = self.join_late(room, roll=INTRUDER_ROLL)
        clients[0].emit('reset', {'player_id': ids[0], 'force': True})
        player = game.getPlayerById(late_id)
        self.assertFalse(player.late_join)
        self.assertFalse(player.sus)
        self.assertEqual(0, game.late_joins)
        self.assertEqual(11, len(game.players))

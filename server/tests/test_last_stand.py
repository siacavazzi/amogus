import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from server.assets.stats_tracker import StatsTracker
from server.tests.integration_helpers import SocketGameTestCase

CONFIG = {'num_intruders': 1, 'starting_cards': 0, 'card_draw_probability': 0, 'task_ratio': 2}


class LastStandTests(SocketGameTestCase):
    def start(self, player_count=3, config=None):
        return self.setup_started_game(player_count, config={**CONFIG, **(config or {})})

    def die(self, clients, ids, player):
        self.client_for_player(clients, ids, player).emit('player_dead', {'player_id': player.player_id})

    def finish_tasks(self, clients, ids, game):
        while game.crew_score < game.taskGoal and not game.end_state:
            player = next(p for p in self.crew(game) if p.alive)
            self.client_for_player(clients, ids, player).emit(
                'complete_task', {'player_id': player.player_id})

    def test_ruleset_depends_on_player_count(self):
        _, _, _, three = self.start(3)
        self.assertEqual('last_stand', three.ruleset)
        _, _, _, four = self.start(4)
        self.assertEqual('standard', four.ruleset)

    def test_crew_death_at_one_v_one_starts_last_stand_instead_of_ending(self):
        clients, _, ids, game = self.start()
        self.die(clients, ids, self.crew(game)[0])

        self.assertIsNone(game.end_state)
        self.assertTrue(game.last_stand)
        for events in self.drain_all(clients).values():
            notice = self.first_event(events, 'last_stand')
            self.assertIsNotNone(notice)
            self.assertEqual('Last stand', notice['title'])
            self.assertFalse(self.has_event(events, 'end_game'))

        state = clients[0].emit('get_room_state', {'room_code': game.room_code, 'player_id': ids[0]}, callback=True)
        self.assertTrue(state['state']['last_stand'])
        self.assertEqual('last_stand', state['state']['ruleset'])

    def test_meetings_are_blocked_during_last_stand(self):
        clients, _, ids, game = self.start()
        self.die(clients, ids, self.crew(game)[0])
        survivor = next(p for p in self.crew(game) if p.alive)

        result = self.client_for_player(clients, ids, survivor).emit(
            'meeting', {'player_id': survivor.player_id}, callback=True)

        self.assertFalse(result['ok'])
        self.assertFalse(game.meeting)
        self.assertEqual(0, game.stats['meetings_called'])

    def test_intruder_wins_by_eliminating_the_last_crewmate(self):
        clients, _, ids, game = self.start()
        first, last = self.crew(game)
        self.die(clients, ids, first)
        self.die(clients, ids, last)

        self.assertEqual('sus_victory', game.end_state)
        self.assertEqual('last_stand_kill', game.stats['win_condition'])

    def test_finishing_tasks_in_last_stand_wins_for_crew(self):
        clients, _, ids, game = self.start()
        self.die(clients, ids, self.crew(game)[0])
        self.drain_all(clients)

        self.finish_tasks(clients, ids, game)

        self.assertEqual('victory', game.end_state)
        self.assertEqual('tasks', game.stats['win_condition'])
        self.assertFalse(game.intruders_revealed)
        for events in self.drain_all(clients).values():
            self.assertTrue(self.has_event(events, 'end_game'))
            self.assertFalse(self.has_event(events, 'intruders_revealed'))

    def test_finishing_tasks_wins_in_three_player_rounds_before_last_stand(self):
        clients, _, ids, game = self.start()
        self.finish_tasks(clients, ids, game)

        self.assertEqual('victory', game.end_state)
        self.assertFalse(game.last_stand)

    def test_finishing_tasks_still_only_reveals_in_standard_rounds(self):
        clients, _, ids, game = self.start(4)
        self.finish_tasks(clients, ids, game)

        self.assertIsNone(game.end_state)
        self.assertTrue(game.intruders_revealed)

    def test_innocent_voted_out_starts_last_stand_after_meeting_results(self):
        clients, _, ids, game = self.start(config={'vote_threshold': 0.5})
        intruder = self.intruders(game)[0]
        target, other = self.crew(game)
        with patch('assets.meeting.Thread'):
            self.start_meeting_and_ready_living_players(clients, ids, game, other)
        self.assertEqual('voting', game.meeting.stage)

        for voter, choice in ((intruder, target), (other, target), (target, intruder)):
            self.client_for_player(clients, ids, voter).emit(
                'vote', {'player_id': voter.player_id, 'votedFor': choice.player_id})

        self.assertFalse(target.alive)
        self.assertTrue(game.last_stand)
        self.assertIsNone(game.end_state)
        self.assertFalse(game.meeting)
        events = self.drain(self.client_for_player(clients, ids, other))
        names = [e['name'] for e in events]
        self.assertIn('last_stand', names)
        self.assertNotIn('round_notice', names)
        results = [i for i, e in enumerate(events) if e['name'] == 'meeting'
                   and self.parse_json_payload(e['args'][0]).get('reason') == 'votes']
        self.assertTrue(results)
        self.assertLess(results[-1], names.index('last_stand'))

    def test_death_during_open_meeting_closes_it(self):
        clients, _, ids, game = self.start()
        caller, victim = self.crew(game)
        self.client_for_player(clients, ids, caller).emit('meeting', {'player_id': caller.player_id})
        self.assertEqual('waiting', game.meeting.stage)

        self.die(clients, ids, victim)

        self.assertTrue(game.last_stand)
        self.assertFalse(game.meeting)
        self.assertIsNone(game.end_state)

    def test_reset_returns_to_standard_ruleset(self):
        clients, _, ids, game = self.start()
        self.die(clients, ids, self.crew(game)[0])
        game.reset_game_state()
        self.assertEqual('standard', game.ruleset)
        self.assertFalse(game.last_stand)
        self.assertIsNone(game.stats['win_condition'])


class LastStandStatsTests(unittest.TestCase):
    def setUp(self):
        folder = tempfile.TemporaryDirectory()
        self.addCleanup(folder.cleanup)
        self.tracker = StatsTracker(str(Path(folder.name) / 'stats.json'))
        self.addCleanup(lambda: [h.close() for h in self.tracker.event_logger.handlers])

    def test_round_records_ruleset_and_how_it_was_won(self):
        game = SimpleNamespace(
            players=[SimpleNamespace(active=True, alive=True, sus=False) for _ in range(3)],
            lobby_started_monotonic=None, ruleset='last_stand', last_stand=True, end_state='victory',
            stats={'win_condition': 'tasks'},
        )
        self.tracker.record_game_started(game)
        self.tracker.record_game_ended(game)

        record = self.tracker.data['completed_games'][-1]
        self.assertEqual('last_stand', record['ruleset'])
        self.assertEqual('tasks', record['win_condition'])
        self.assertTrue(record['last_stand_reached'])
        history = self.tracker.data['round_history'][-1]
        self.assertEqual('last_stand', history['ruleset'])
        self.assertEqual('tasks', history['win_condition'])


if __name__ == '__main__':
    unittest.main()

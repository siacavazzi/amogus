"""Round awards: medals from what really happened, never mid-round, never for a zero."""

import unittest
from types import SimpleNamespace

from assets import awards
from assets.player import Player
from assets.player_stats import medals_for_round, summarize_medals


def player(name, sus=False, alive=True, account_id=None, **tally):
    p = Player(sid=f'sid-{name}', player_id=f'id-{name}', username=name, pic=0)
    p.sus, p.account_id = sus, account_id
    if not alive:
        p.set_death('murdered')
    p.round_tally = dict(tally)
    return p


def game_with(players, **extra):
    g = SimpleNamespace(players=players, test_mode=False, stats={}, **extra)
    g.getPlayerById = lambda pid: next((p for p in players if p.player_id == pid), None)
    return g


def medals(game):
    return [(a['medal'], a['name']) for a in awards.compute(game)]


class ComputeTests(unittest.TestCase):
    def test_busy_round_gets_at_most_four_medals_one_each(self):
        crew = [player('Maya', tasks=9, sharp_votes=1, votes=1), player('Alex', tasks=4, caught=1),
                player('Theo', tasks=3, sharp_votes=3, votes=3), player('Nora', tasks=1, codes=1)]
        intruders = [player('Jules', sus=True, cards=5, pranks=1), player('Kai', sus=True, cards=1)]
        game = game_with(crew + intruders)
        got = medals(game)
        self.assertEqual(4, len(got))
        self.assertEqual(len(got), len({name for _, name in got}))
        self.assertEqual(('called_it', 'Alex'), got[0])
        self.assertIn(('prankster', 'Jules'), got)
        self.assertIn(('task_machine', 'Maya'), got)

    def test_nothing_for_zero_or_ties_or_practice(self):
        game = game_with([player('A', tasks=1), player('B', tasks=1), player('C', sus=True)])
        self.assertEqual([], medals(game))
        tie = game_with([player('A', tasks=3), player('B', tasks=3), player('C', sus=True)])
        self.assertNotIn('task_machine', [m for m, _ in medals(tie)])
        practice = game_with([player('A', tasks=5), player('B'), player('C', sus=True)], )
        practice.test_mode = True
        self.assertEqual([], medals(practice))
        tiny = game_with([player('A', tasks=5), player('B', sus=True)])
        self.assertEqual([], medals(tiny))

    def test_a_tie_stays_a_tie_even_when_one_of_them_already_has_a_medal(self):
        # Everyone found the intruder once: nobody is the sharp eye, not even the one left over.
        game = game_with([player('A', caught=1, sharp_votes=2), player('B', sharp_votes=2), player('C', sharp_votes=2),
                          player('S', sus=True)])
        got = [m for m, _ in medals(game)]
        self.assertIn('called_it', got)
        self.assertNotIn('sharp_eye', got)

    def test_the_leader_with_a_medal_already_doesnt_pass_it_down(self):
        game = game_with([player('A', caught=1, tasks=6), player('B', tasks=2), player('C'), player('S', sus=True)])
        self.assertEqual([('called_it', 'A')], medals(game))

    def test_crew_medals_never_go_to_intruders(self):
        game = game_with([player('A'), player('B'), player('C', sus=True, tasks=0, sharp_votes=3)])
        self.assertNotIn(('sharp_eye', 'C'), medals(game))

    def test_undercover_needs_a_vote_held_and_no_votes_against(self):
        a, b, c = player('A'), player('B'), player('C')
        sus = player('S', sus=True)
        game = game_with([a, b, c, sus])
        self.assertNotIn('undercover', [m for m, _ in medals(game)])  # no vote held yet
        game._award_votes_held = 2
        self.assertIn(('undercover', 'S'), medals(game))
        sus.round_tally['votes_received'] = 1
        self.assertNotIn('undercover', [m for m, _ in medals(game)])

    def test_last_one_standing(self):
        game = game_with([player('A', tasks=1), player('B', alive=False), player('C', alive=False),
                          player('S', sus=True)])
        self.assertIn(('last_standing', 'A'), medals(game))


class HookTests(unittest.TestCase):
    def test_prank_credit_goes_to_the_sender_and_names_the_task(self):
        sender, target = player('Jules', sus=True), player('Nora')
        game = game_with([sender, target, player('X')])
        awards.note_prank_sent(game, sender, target)
        awards.note_prank_done(game, target, 'hop on one foot to the door')
        self.assertEqual(1, sender.round_tally['pranks'])
        got = awards.compute(game)
        prank = next(a for a in got if a['medal'] == 'prankster')
        self.assertEqual({'target': 'Nora', 'task': 'hop on one foot to the door'}, prank['detail'])

    def test_vote_result_counts_votes_and_the_catch(self):
        caller, voter, sus = player('Alex'), player('Maya'), player('Jules', sus=True)
        game = game_with([caller, voter, sus])
        meeting = SimpleNamespace(game=game, player_who_started_it=caller)
        awards.note_vote_result(meeting, {caller.player_id: sus.player_id, voter.player_id: sus.player_id}, sus.player_id)
        self.assertEqual(2, sus.round_tally['votes_received'])
        self.assertEqual(1, caller.round_tally['caught'])
        self.assertEqual({'caught': 'Jules'}, next(a for a in awards.compute(game) if a['medal'] == 'called_it')['detail'])

    def test_reset_clears_the_round(self):
        a = player('A', tasks=4)
        game = game_with([a])
        game._award_votes_held = 3
        awards.reset_round(game)
        self.assertEqual({}, a.round_tally)
        self.assertNotIn('_award_votes_held', game.__dict__)


class MeltdownTests(unittest.TestCase):
    def test_whoever_brought_an_entered_code_saved_the_core(self):
        from unittest.mock import MagicMock
        from assets.meltdown import Meltdown
        ps = [player(f'P{i}') for i in range(4)]
        meltdown = Meltdown(ps, 30, MagicMock(), MagicMock(), 50)
        meltdown.distribute_codes()
        self.assertTrue(meltdown.check_pin(ps[2].meltdown_code))
        meltdown.end_meltdown(success=True)
        self.assertEqual(1, ps[2].round_tally.get('codes'))
        self.assertNotIn('codes', ps[1].round_tally)

    def test_a_failed_meltdown_saves_nobody(self):
        from unittest.mock import MagicMock
        from assets.meltdown import Meltdown
        ps = [player(f'P{i}') for i in range(4)]
        meltdown = Meltdown(ps, 30, MagicMock(), MagicMock(), 100)
        meltdown.distribute_codes()
        meltdown.check_pin(ps[0].meltdown_code)
        meltdown.end_meltdown(success=False)
        self.assertNotIn('codes', ps[0].round_tally)


class AccountMedalTests(unittest.TestCase):
    def test_only_signed_in_players_keep_their_medal_and_only_its_name(self):
        game = game_with([player('A', account_id='acc'), player('B')])
        game.stats['awards'] = [{'medal': 'task_machine', 'player_id': 'id-A', 'name': 'A', 'value': 4},
                                {'medal': 'prankster', 'player_id': 'id-B', 'name': 'B', 'value': 1,
                                 'detail': {'target': 'A', 'task': 'x'}}]
        rows = medals_for_round(game, 100.0)
        self.assertEqual([{'account_id': 'acc', 'ended_at': 100.0, 'medal': 'task_machine'}], rows)
        summary = summarize_medals(rows + [{'account_id': 'acc', 'ended_at': 200.0, 'medal': 'task_machine'}])
        self.assertEqual(2, summary['total'])
        self.assertEqual({'task_machine': 2}, summary['counts'])
        self.assertEqual(200.0, summary['recent'][0]['at'])


if __name__ == '__main__':
    unittest.main()

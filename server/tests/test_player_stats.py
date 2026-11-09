"""My stats: game stats for signed-in accounts only, and gone with the account."""

import os
import shutil
import tempfile
import time
import unittest
from types import SimpleNamespace

from server.tests.integration_helpers import SocketGameTestCase, protocol_client, server_app
from assets.accounts import AccountStore
from assets.player import Player
from assets.player_stats import PlayerStatsStore, rows_for_round, summarize


def player(name, account_id=None, sus=False, alive=True, cause=None, tally=None):
    p = Player(sid=f'sid-{name}', player_id=f'id-{name}', username=name, pic=0)
    p.account_id, p.sus = account_id, sus
    if not alive:
        p.set_death(cause or 'murdered')
    p.stat_tally = dict(tally or {})
    return p


def finished_round(players, end_state, **extra):
    now = time.time()
    fields = dict(players=players, end_state=end_state, test_mode=False, synthetic=False,
                  _stats_start_recorded=True, round_started_at=now - 600, end_time=now, round_id='r1')
    fields.update(extra)
    return SimpleNamespace(**fields)


class RowsForRoundTests(unittest.TestCase):
    def test_only_signed_in_players_get_a_row(self):
        game = finished_round([
            player('Sam', 'a_sam', tally={'tasks': 4, 'votes': 1, 'sharp_votes': 1, 'meetings': 1}),
            player('Kid'), player('Alex'),
            player('Riley', sus=True),
        ], 'victory')
        rows = rows_for_round(game)
        self.assertEqual(1, len(rows))
        row = rows[0]
        self.assertEqual(('a_sam', 'crew', 1, 1), (row['account_id'], row['role'], row['won'], row['survived']))
        self.assertEqual((4, 1, 1, 1), (row['tasks'], row['votes'], row['sharp_votes'], row['meetings']))
        self.assertEqual(4, row['players'])
        self.assertAlmostEqual(10.0, row['minutes'], places=0)
        # Nothing about anyone else, the room or the device.
        self.assertNotIn('room_code', row)
        self.assertFalse(any('Kid' in str(value) or 'Alex' in str(value) for value in row.values()))

    def test_intruders_share_the_teams_takedowns_and_win_on_meltdown(self):
        game = finished_round([
            player('Sam', 'a_sam', sus=True, tally={'cards': 2}),
            player('Jo', 'a_jo', sus=True),
            player('A', alive=False, cause='murdered'),
            player('B', alive=False, cause='murdered_during_task'),
            player('C', alive=False, cause='voted_out_innocent'),
            player('D'),
        ], 'meltdown_fail')
        rows = {row['account_id']: row for row in rows_for_round(game)}
        self.assertEqual((1, 2, 2), (rows['a_sam']['won'], rows['a_sam']['takedowns'], rows['a_sam']['cards']))
        self.assertEqual((1, 2, 0), (rows['a_jo']['won'], rows['a_jo']['takedowns'], rows['a_jo']['cards']))

    def test_voted_out_crew_lost_and_did_not_survive(self):
        game = finished_round([player('Sam', 'a_sam', alive=False, cause='voted_out_innocent'),
                               player('X', sus=True), player('Y')], 'sus_victory')
        row = rows_for_round(game)[0]
        self.assertEqual((0, 0, 1), (row['won'], row['survived'], row['voted_out']))

    def test_practice_tiny_and_unfinished_rounds_dont_count(self):
        players = [player('Sam', 'a_sam'), player('X', sus=True), player('Y')]
        self.assertEqual([], rows_for_round(finished_round(players, 'victory', test_mode=True)))
        self.assertEqual([], rows_for_round(finished_round(players, 'victory', synthetic=True)))
        unstarted = finished_round(players, 'victory')
        unstarted._stats_start_recorded = False
        self.assertEqual([], rows_for_round(unstarted))
        self.assertEqual([], rows_for_round(finished_round(players, None)))

    def test_one_row_per_account_even_on_two_phones(self):
        game = finished_round([player('Sam', 'a_sam'), player('Sam 2', 'a_sam'), player('X', sus=True)], 'victory')
        self.assertEqual(1, len(rows_for_round(game)))

    def test_waiting_players_sat_the_round_out(self):
        late = player('Late', 'a_late')
        late.waiting = True
        game = finished_round([player('X', sus=True), player('Y'), player('Z'), late], 'victory')
        self.assertEqual([], rows_for_round(game))


class SummaryTests(unittest.TestCase):
    def row(self, at, role='crew', won=1, **counts):
        base = {'ended_at': at, 'role': role, 'won': won, 'survived': 1, 'voted_out': 0, 'players': 6,
                'minutes': 12.0, 'tasks': 0, 'cards': 0, 'takedowns': 0, 'meetings': 0, 'votes': 0, 'sharp_votes': 0}
        base.update(counts)
        return base

    def test_totals_win_rates_and_streaks(self):
        now = time.time()
        rows = [self.row(now - 5000, won=1, tasks=3), self.row(now - 4000, won=1, tasks=2, players=12),
                self.row(now - 3000, role='intruder', won=0, cards=2, takedowns=1),
                self.row(now - 2000, role='intruder', won=1, takedowns=3),
                self.row(now - 1000, won=1)]
        stats = summarize(rows, now=now)
        self.assertEqual((5, 4), (stats['games'], stats['wins']))
        self.assertEqual({'games': 3, 'wins': 3}, stats['crew'])
        self.assertEqual({'games': 2, 'wins': 1}, stats['intruder'])
        self.assertEqual((5, 2, 4), (stats['tasks'], stats['cards'], stats['takedowns']))
        self.assertEqual((2, 2), (stats['best_streak'], stats['current_streak']))
        self.assertEqual(12, stats['biggest_party'])
        self.assertEqual(5 + 5 + 5 + 5 + 11, stats['players_met'])
        self.assertEqual(12, len(stats['weeks']))
        self.assertEqual(5, stats['weeks'][-1]['games'])
        self.assertEqual(5, len(stats['recent']))

    def test_no_games_yet(self):
        stats = summarize([])
        self.assertEqual((0, 0, 0, None), (stats['games'], stats['best_streak'], stats['biggest_party'], stats['first_played']))
        self.assertEqual([0] * 12, [week['games'] for week in stats['weeks']])


class StoreTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, True)
        self.store = PlayerStatsStore(self.tmp)

    def test_a_round_is_recorded_once_and_deleted_with_the_account(self):
        game = finished_round([player('Sam', 'a_sam'), player('Jo', 'a_jo', sus=True), player('X')], 'victory')
        self.assertEqual(2, self.store.record_round(game))
        self.assertEqual(0, self.store.record_round(game))  # end_game fired twice
        self.assertEqual(1, self.store.summary('a_sam')['games'])
        self.store.delete('a_sam')
        self.assertEqual(0, self.store.summary('a_sam')['games'])
        self.assertEqual(1, self.store.summary('a_jo')['games'])


class SignedInPlayerPlaysARoundTests(SocketGameTestCase):
    """A signed-in phone joins as a player (not the host), plays, and only it gets stats."""

    def setUp(self):
        super().setUp()
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, True)
        self.accounts = AccountStore(os.path.join(self.tmp, 'data'))
        self.stats = PlayerStatsStore(os.path.join(self.tmp, 'data'))
        routes = server_app.auth_routes
        saved = (server_app.account_store, routes.store, routes.player_stats, list(server_app.game_manager.round_end_listeners))
        server_app.account_store = self.accounts
        routes.store = self.accounts
        routes.player_stats = self.stats
        server_app.game_manager.round_end_listeners[:] = [self.stats.record_round]

        def restore():
            server_app.account_store, routes.store, routes.player_stats, listeners = saved
            server_app.game_manager.round_end_listeners[:] = listeners
            server_app.account_by_sid.clear()
        self.addCleanup(restore)

    def signed_in_client(self, email):
        http = self.flask_app.test_client()
        account = self.accounts.account_for_email(email)
        http.set_cookie(server_app.auth_routes.cookie_name, self.accounts.start_session(account['id']))
        return http, account, protocol_client(self.socketio.test_client(self.flask_app, flask_test_client=http))

    def test_signed_in_player_gets_the_round_and_nobody_else_does(self):
        http, account, signed_in = self.signed_in_client('player@susparty.test')
        clients = [self.make_client(), signed_in, self.make_client(), self.make_client()]
        room_code = self.create_open_room(clients[0])
        ids = [self.join_player(client, room_code, f'P{i}') for i, client in enumerate(clients)]
        self.drain_all(clients)
        game = server_app.game_manager.get_game(room_code)
        me = game.getPlayerById(ids[1])
        self.assertEqual(account['id'], me.account_id)
        self.assertTrue(all(p.account_id is None for p in game.players if p is not me))

        self.add_tasks(clients[0], room_code, 12)
        self.drain_all(clients)
        self.start_game(clients[0], ids[0], clients)
        game._stats_start_recorded = True  # the test stats tracker doesn't log rounds
        for p in game.players:
            p.sus = p is not me and p.player_id == ids[0]
        game.numIntruders, game.numCrew = 1, 3

        # Sam does a task and calls a meeting; the signed-out phones' work is never counted.
        task = me.task
        signed_in.emit('complete_task', {'player_id': me.player_id, 'assignment_id': task['assignment_id'],
                                         'round_id': game.round_id, 'request_id': 'r1'})
        other = game.getPlayerById(ids[2])
        clients[2].emit('complete_task', {'player_id': other.player_id, 'assignment_id': other.task['assignment_id'],
                                          'round_id': game.round_id, 'request_id': 'r2'})
        self.drain_all(clients)
        self.assertEqual({'tasks': 1}, me.stat_tally)
        self.assertEqual({}, other.stat_tally)

        # The crew votes the intruder out and wins.
        signed_in.emit('meeting', {'player_id': me.player_id, 'round_id': game.round_id})
        self.drain_all(clients)
        for client, pid in zip(clients, ids):
            client.emit('ready', {'player_id': pid})
        self.drain_all(clients)
        for client, pid in zip(clients, ids):
            client.emit('vote', {'player_id': pid, 'votedFor': ids[0], 'meeting_id': game.meeting.id if game.meeting else None,
                                 'round_id': game.round_id})
        self.drain_all(clients)
        if game.meeting:
            game.meeting.end_meeting()
        self.assertEqual('victory', game.end_state)

        reply = http.get('/api/account/stats').get_json()
        stats = reply['stats']
        self.assertEqual((1, 1), (stats['games'], stats['wins']))
        self.assertEqual({'games': 1, 'wins': 1}, stats['crew'])
        self.assertEqual((1, 1, 1, 1), (stats['tasks'], stats['meetings'], stats['votes'], stats['sharp_votes']))
        self.assertEqual(3, stats['players_met'])
        # Only one account exists in the stats file: nobody signed out was recorded.
        self.assertEqual(1, self.stats.db.execute('SELECT COUNT(*) FROM rounds').fetchone()[0])

        # Delete the account: its stats go with it.
        self.assertTrue(http.post('/api/account/delete').get_json()['ok'])
        self.assertEqual(0, self.stats.db.execute('SELECT COUNT(*) FROM rounds').fetchone()[0])
        self.assertIsNone(me.account_id)

    def test_signed_out_requests_get_no_stats(self):
        self.assertEqual(401, self.flask_app.test_client().get('/api/account/stats').status_code)


if __name__ == '__main__':
    unittest.main()

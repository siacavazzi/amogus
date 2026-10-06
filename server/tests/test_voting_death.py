import json
import threading
import unittest
from unittest.mock import patch

from server.tests.integration_helpers import SocketGameTestCase
from server.tests.test_game_state_model import make_game


class VotingDeathTests(SocketGameTestCase):
    def start_vote(self, count=13):
        clients, room, ids, game = self.setup_started_game(count, config={
            'num_intruders': 1, 'starting_cards': 0, 'card_draw_probability': 0,
        })
        clients[0].emit('meeting', {'player_id': ids[0]})
        with patch('assets.meeting.Thread'):
            for client, pid in zip(clients, ids):
                client.emit('ready', {'player_id': pid})
        self.assertEqual('voting', game.meeting.stage)
        self.drain_all(clients)
        return clients, ids, game, game.meeting

    def test_death_clears_voter_and_target_ballots_and_rejects_late_votes(self):
        clients, ids, game, meeting = self.start_vote()
        dead, voter, target = self.crew(game)[:3]
        dead_client = self.client_for_player(clients, ids, dead)
        voter_client = self.client_for_player(clients, ids, voter)
        dead_client.emit('vote', {'player_id': dead.player_id, 'votedFor': target.player_id})
        voter_client.emit('vote', {'player_id': voter.player_id, 'votedFor': dead.player_id})

        result = dead_client.emit('player_dead', {'player_id': dead.player_id}, callback=True)

        self.assertTrue(result['ok'])
        self.assertFalse(dead.alive)
        self.assertEqual({}, meeting.votes)
        self.assertEqual(12, game.get_num_living_players())
        update = self.event_payloads(self.drain(voter_client), 'vote_update')[-1]
        self.assertEqual(0, update['votes'][target.player_id])
        self.assertEqual(0, update['votes'][dead.player_id])
        self.assertFalse(dead_client.emit('vote', {
            'player_id': dead.player_id, 'votedFor': target.player_id,
        }, callback=True)['ok'])
        self.assertFalse(voter_client.emit('vote', {
            'player_id': voter.player_id, 'votedFor': dead.player_id,
        }, callback=True)['ok'])
        self.assertTrue(voter_client.emit('vote', {
            'player_id': voter.player_id, 'votedFor': target.player_id,
        }, callback=True)['ok'])

    def test_duplicate_death_removes_veto_and_changes_crew_count_once(self):
        clients, ids, game, meeting = self.start_vote()
        dead = self.crew(game)[0]
        client = self.client_for_player(clients, ids, dead)
        client.emit('veto', {'player_id': dead.player_id})
        crew_before = game.numCrew

        self.assertTrue(client.emit('player_dead', {'player_id': dead.player_id}, callback=True)['ok'])
        self.assertFalse(client.emit('player_dead', {'player_id': dead.player_id}, callback=True)['ok'])

        self.assertEqual(set(), meeting.veto_votes)
        self.assertEqual(crew_before - 1, game.numCrew)
        self.assertIs(meeting, game.meeting)

    def test_death_of_last_unvoted_player_finishes_remaining_votes_once(self):
        clients, ids, game, meeting = self.start_vote(6)
        dead = self.crew(game)[0]
        remaining = [p for p in game.players if p is not dead]
        for index, voter in enumerate(remaining):
            self.client_for_player(clients, ids, voter).emit('vote', {
                'player_id': voter.player_id, 'votedFor': remaining[(index + 1) % 5].player_id,
            })
        self.assertIs(meeting, game.meeting)
        self.drain_all(clients)

        self.client_for_player(clients, ids, dead).emit('player_dead', {'player_id': dead.player_id})

        self.assertIsNone(game.meeting)
        self.assertEqual('over', meeting.stage)
        self.assertIsNone(meeting.voted_out)
        results = self.event_payloads(self.drain(clients[0]), 'meeting')
        self.assertEqual(1, len(results))

    def test_death_rechecks_veto_majority_for_remaining_living_players(self):
        clients, ids, game, meeting = self.start_vote(6)
        dead = self.crew(game)[0]
        remaining = [p for p in game.players if p is not dead]
        for voter in remaining[:3]:
            self.client_for_player(clients, ids, voter).emit('veto', {'player_id': voter.player_id})
        self.assertEqual('voting', meeting.stage)

        self.client_for_player(clients, ids, dead).emit('player_dead', {'player_id': dead.player_id})

        self.assertIsNone(game.meeting)
        self.assertEqual('veto', meeting.reason)
        self.assertIsNone(meeting.voted_out)

    def test_game_ending_death_clears_ballot_without_extra_ejection(self):
        clients, ids, game, meeting = self.start_vote(3)
        dead = self.crew(game)[0]
        intruder = self.intruders(game)[0]
        client = self.client_for_player(clients, ids, dead)
        client.emit('vote', {'player_id': dead.player_id, 'votedFor': intruder.player_id})

        client.emit('player_dead', {'player_id': dead.player_id})

        self.assertEqual('sus_victory', game.end_state)
        self.assertEqual({}, meeting.votes)
        self.assertEqual(0, game.stats['players_voted_out'])
        self.assertTrue(intruder.alive)

    def test_death_after_vote_deadline_cannot_change_closed_meeting(self):
        clients, ids, game, meeting = self.start_vote()
        dead = self.crew(game)[0]
        command = {'player_id': dead.player_id, 'round_id': game.round_id, 'meeting_id': meeting.id}
        meeting.end_meeting()

        result = self.client_for_player(clients, ids, dead).raw_emit('player_dead', command, callback=True)

        self.assertFalse(result['ok'])
        self.assertTrue(dead.alive)
        self.assertEqual(0, game.stats['players_voted_out'])


class ConcurrentVotingDeathTests(unittest.TestCase):
    def make_vote(self):
        game, socket = make_game(13)
        game.game_running = True
        game.numCrew = 12
        game.numIntruders = 1
        game.players[-1].sus = True
        game.start_meeting(game.players[0])
        game.meeting.stage = 'voting'
        return game, socket, game.meeting

    def race(self, *commands):
        barrier = threading.Barrier(len(commands))
        errors = []

        def run(command):
            try:
                barrier.wait(timeout=2)
                command()
            except Exception as error:
                errors.append(error)

        threads = [threading.Thread(target=run, args=(command,)) for command in commands]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(timeout=2)
        self.assertFalse(any(thread.is_alive() for thread in threads))
        self.assertEqual([], errors)

    def test_concurrent_vote_and_death_never_leave_a_dead_voter_ballot(self):
        for _ in range(25):
            game, socket, meeting = self.make_vote()
            dead, target = game.players[:2]
            self.race(lambda: meeting.register_vote(dead, target),
                      lambda: game.kill_player(dead.player_id))
            self.assertFalse(dead.alive)
            self.assertNotIn(dead.player_id, meeting.votes)
            self.assertEqual(11, game.numCrew)
            self.assertIs(meeting, game.meeting)

    def test_concurrent_final_vote_and_death_end_meeting_once(self):
        for _ in range(25):
            game, socket, meeting = self.make_vote()
            dead = game.players[0]
            remaining = game.players[1:]
            for index, voter in enumerate(remaining[:-1]):
                meeting.register_vote(voter, remaining[(index + 1) % 12])
            self.race(lambda: meeting.register_vote(remaining[-1], remaining[0]),
                      lambda: game.kill_player(dead.player_id))
            self.assertIsNone(game.meeting)
            self.assertEqual('over', meeting.stage)
            self.assertIsNone(meeting.voted_out)
            results = [json.loads(args[0]) for event, args, _kwargs in socket.events
                       if event == 'meeting' and json.loads(args[0])['stage'] == 'over']
            self.assertEqual(1, len(results))

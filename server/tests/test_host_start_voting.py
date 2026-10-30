"""The host's override for a meeting stuck at "slide ready" (a ~40-player room froze twice on 2026-10-30)."""
import json

from server.tests.integration_helpers import SocketGameTestCase


QUIET = {'starting_cards': 0, 'card_draw_probability': 0}


class HostStartVotingTests(SocketGameTestCase):
    def call_meeting(self, clients, ids, game):
        caller = next(p for p in game.players if not p.sus and p.player_id != ids[0])
        self.client_for_player(clients, ids, caller).emit('meeting', {'player_id': caller.player_id})
        self.drain_all(clients)
        return caller

    def let_time_pass(self, game, seconds=None):
        game.meeting.opened_at -= seconds if seconds is not None else game.meeting.HOST_OVERRIDE_AFTER_SECONDS + 1

    def host_starts_voting(self, client, player_id, game):
        return client.emit('host_start_voting', {
            'player_id': player_id, 'round_id': game.round_id, 'meeting_id': game.meeting.id,
        }, callback=True)

    def test_host_opens_voting_when_some_phones_never_slide_ready(self):
        clients, room, ids, game = self.setup_started_game(6, config=QUIET)
        self.call_meeting(clients, ids, game)
        for client, pid in list(zip(clients, ids))[:3]:
            client.emit('ready', {'player_id': pid})
        self.assertEqual('waiting', game.meeting.stage)
        self.let_time_pass(game)

        result = self.host_starts_voting(clients[0], ids[0], game)

        self.assertTrue(result['ok'], result)
        self.assertEqual('voting', game.meeting.stage)
        meeting = json.loads(self.event_payloads(self.drain(clients[3]), 'meeting')[-1])
        self.assertTrue(meeting['started_by_host'])
        # Stragglers who never slid can still vote, and the vote ends as normal.
        for client, pid in zip(clients, ids):
            client.emit('veto', {'player_id': pid})
        self.assertFalse(game.meeting)

    def test_a_player_who_is_not_the_host_cannot_open_voting(self):
        clients, room, ids, game = self.setup_started_game(5, config=QUIET)
        self.call_meeting(clients, ids, game)
        self.let_time_pass(game)
        for index in range(1, 5):
            result = self.host_starts_voting(clients[index], ids[index], game)
            self.assertFalse(result['ok'])
        self.assertEqual('waiting', game.meeting.stage)

    def test_someone_reusing_the_hosts_player_id_from_another_phone_cannot_open_voting(self):
        clients, room, ids, game = self.setup_started_game(5, config=QUIET)
        self.call_meeting(clients, ids, game)
        self.let_time_pass(game)
        result = self.host_starts_voting(clients[1], ids[0], game)
        self.assertFalse(result['ok'])
        self.assertEqual('waiting', game.meeting.stage)

    def test_host_must_give_people_time_to_reach_the_meeting_spot(self):
        clients, room, ids, game = self.setup_started_game(5, config=QUIET)
        self.call_meeting(clients, ids, game)
        result = self.host_starts_voting(clients[0], ids[0], game)
        self.assertFalse(result['ok'])
        self.assertIn('more seconds', result['error'])
        self.assertEqual('waiting', game.meeting.stage)
        self.let_time_pass(game)
        self.assertTrue(self.host_starts_voting(clients[0], ids[0], game)['ok'])

    def test_meeting_tells_phones_who_the_host_is_and_when_the_override_opens(self):
        clients, room, ids, game = self.setup_started_game(5, config=QUIET)
        caller = next(p for p in game.players if not p.sus and p.player_id != ids[0])
        self.client_for_player(clients, ids, caller).emit('meeting', {'player_id': caller.player_id})
        meeting = json.loads(self.event_payloads(self.drain(clients[2]), 'meeting')[-1])
        self.assertEqual('P0', meeting['host_name'])
        self.assertEqual(game.meeting.HOST_OVERRIDE_AFTER_SECONDS, meeting['host_override_in'])
        self.assertFalse(meeting['started_by_host'])

    def test_a_dead_host_can_still_open_voting(self):
        clients, room, ids, game = self.setup_started_game(6, config=QUIET)
        host = game.getPlayerById(ids[0])
        with game.state_lock:
            host.alive = False
        self.call_meeting(clients, ids, game)
        self.let_time_pass(game)
        self.assertTrue(self.host_starts_voting(clients[0], ids[0], game)['ok'])
        self.assertEqual('voting', game.meeting.stage)

    def test_an_old_meeting_id_is_refused(self):
        clients, room, ids, game = self.setup_started_game(5, config=QUIET)
        self.call_meeting(clients, ids, game)
        self.let_time_pass(game)
        result = clients[0].emit('host_start_voting', {
            'player_id': ids[0], 'round_id': game.round_id, 'meeting_id': 'an-earlier-meeting',
        }, callback=True)
        self.assertFalse(result['ok'])
        self.assertEqual('waiting', game.meeting.stage)

    def test_once_voting_is_open_the_override_does_nothing(self):
        clients, room, ids, game = self.setup_started_game(5, config=QUIET)
        caller = next(p for p in game.players if not p.sus and p.player_id != ids[0])
        self.start_meeting_and_ready_living_players(clients, ids, game, caller)
        self.assertEqual('voting', game.meeting.stage)
        self.let_time_pass(game)
        result = self.host_starts_voting(clients[0], ids[0], game)
        self.assertFalse(result['ok'])
        self.assertFalse(game.meeting.started_by_host)

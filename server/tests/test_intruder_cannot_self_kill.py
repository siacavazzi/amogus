"""Intruders can't be killed, so the server refuses an intruder's own death report.

In prod room TREM (2026-11-03) the intruder tapped I've Been Killed on the meeting screen by
mistake, the server accepted it, and the crew won before voting opened. The button is now hidden
for intruders; this guards against an old phone that still shows it.
"""
from unittest.mock import patch

from server.tests.integration_helpers import SocketGameTestCase


class IntruderCannotSelfKillTests(SocketGameTestCase):
    def start(self, count=6):
        clients, room, ids, game = self.setup_started_game(count, config={
            'num_intruders': 1, 'starting_cards': 0, 'card_draw_probability': 0,
        })
        return clients, ids, game

    def test_intruder_death_report_in_a_meeting_is_refused(self):
        clients, ids, game = self.start()
        caller = self.crew(game)[0]
        self.client_for_player(clients, ids, caller).emit('meeting', {'player_id': caller.player_id})
        intruder = next(p for p in game.players if p.sus)
        result = self.client_for_player(clients, ids, intruder).emit('player_dead', {
            'player_id': intruder.player_id, 'round_id': game.round_id, 'meeting_id': game.meeting.id,
        }, callback=True)
        self.assertFalse(result['ok'])
        self.assertTrue(intruder.alive)
        self.assertIsNone(game.end_state)
        self.assertTrue(game.game_running)

    def test_intruder_death_report_in_voting_is_refused(self):
        clients, ids, game = self.start()
        caller = self.crew(game)[0]
        self.client_for_player(clients, ids, caller).emit('meeting', {'player_id': caller.player_id})
        with patch('assets.meeting.Thread'):
            for client, pid in zip(clients, ids):
                client.emit('ready', {'player_id': pid})
        self.assertEqual('voting', game.meeting.stage)
        intruder = next(p for p in game.players if p.sus)
        result = self.client_for_player(clients, ids, intruder).emit('player_dead', {
            'player_id': intruder.player_id, 'round_id': game.round_id, 'meeting_id': game.meeting.id,
        }, callback=True)
        self.assertFalse(result['ok'])
        self.assertTrue(intruder.alive)
        self.assertIsNone(game.end_state)

    def test_intruder_death_report_mid_round_is_refused_but_crew_still_works(self):
        clients, ids, game = self.start()
        intruder = next(p for p in game.players if p.sus)
        self.assertFalse(self.client_for_player(clients, ids, intruder).emit('player_dead', {
            'player_id': intruder.player_id, 'round_id': game.round_id,
        }, callback=True)['ok'])
        self.assertTrue(intruder.alive)
        crew = self.crew(game)[0]
        self.assertTrue(self.client_for_player(clients, ids, crew).emit('player_dead', {
            'player_id': crew.player_id, 'round_id': game.round_id,
        }, callback=True)['ok'])
        self.assertFalse(crew.alive)

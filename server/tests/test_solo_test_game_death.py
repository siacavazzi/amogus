"""A one-tester test game is crew only. When that crewmate dies the round must end.

On beta (2026-11-02) Sam called a meeting in a solo test game and tapped I've Been Killed:
nobody was left alive, there were no intruders to win, and the room sat in limbo.
"""
from server.tests.integration_helpers import SocketGameTestCase


class SoloTestGameDeathTests(SocketGameTestCase):
    def start_solo(self):
        clients, room, ids, game = self.setup_lobby(1)
        self.add_tasks(clients[0], room, 10, locations=("Kitchen", "Yard"))
        clients[0].emit("start_game", {"player_id": ids[0], "test_mode": True})
        self.drain(clients[0])
        self.assertTrue(game.game_running and game.test_mode)
        self.assertEqual(0, game.numIntruders)
        return clients[0], room, ids[0], game

    def test_dying_in_a_meeting_ends_the_solo_round(self):
        client, room, pid, game = self.start_solo()
        client.emit("meeting", {"player_id": pid})
        self.assertIsNotNone(game.meeting)
        client.emit("player_dead", {"player_id": pid, "round_id": game.round_id, "meeting_id": game.meeting.id})
        self.assertEqual('sus_victory', game.end_state)
        self.assertEqual('crew_eliminated', game.stats['win_condition'])
        self.assertTrue(self.has_event(self.drain(client), 'end_game'))

    def test_dying_mid_round_ends_the_solo_round(self):
        client, room, pid, game = self.start_solo()
        game.kill_player(pid, death_cause='murdered')
        self.assertEqual('sus_victory', game.end_state)

    def test_two_tester_game_still_ends_the_usual_way(self):
        clients, room, ids, game = self.setup_lobby(2)
        self.add_tasks(clients[0], room, 10, locations=("Kitchen", "Yard"))
        clients[0].emit("start_game", {"player_id": ids[0], "test_mode": True})
        crew = next(p for p in game.players if not p.sus)
        game.kill_player(crew.player_id, death_cause='murdered')
        self.assertEqual('sus_victory', game.end_state)
        self.assertEqual('crew_outnumbered', game.stats['win_condition'])

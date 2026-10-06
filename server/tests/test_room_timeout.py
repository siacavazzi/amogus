import sys
import unittest
from pathlib import Path
from threading import Lock, RLock
from types import SimpleNamespace
from unittest.mock import Mock, patch


SERVER_DIR = Path(__file__).resolve().parents[1]
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

from assets.game_manager import GameManager  # noqa: E402


class RoomTimeoutTests(unittest.TestCase):
    def setUp(self):
        # Keep the test independent of disk storage and the cleanup thread.
        self.manager = GameManager.__new__(GameManager)
        self.manager.lock = Lock()
        self.manager.socketio = Mock()
        self.manager.games = {}
        self.manager.player_to_game = {}
        self.manager.sid_to_game = {}
        self.now = 1_000_000

    def add_room(self, code, age, ended=False):
        self.manager.games[code] = SimpleNamespace(
            state_lock=RLock(),
            last_activity=self.now - age,
            end_state='crew_win' if ended else None,
            end_time=self.now - age if ended else None,
        )

    def clean_rooms(self):
        with patch('assets.game_manager.time.time', return_value=self.now):
            self.manager._cleanup_inactive_games()

    def test_room_survives_a_long_party_break(self):
        self.add_room('LIVE', 23 * 60 * 60)
        self.clean_rooms()
        self.assertIn('LIVE', self.manager.games)
        self.manager.socketio.emit.assert_not_called()

    def test_ended_room_survives_a_break_before_replay(self):
        self.add_room('DONE', 40 * 60, ended=True)
        self.clean_rooms()
        self.assertIn('DONE', self.manager.games)
        self.manager.socketio.emit.assert_not_called()

    def test_room_survives_the_exact_day_boundary(self):
        self.add_room('LIVE', 24 * 60 * 60)
        self.clean_rooms()
        self.assertIn('LIVE', self.manager.games)

    def test_activity_before_cleanup_acquires_room_lock_keeps_room(self):
        self.add_room('LIVE', 24 * 60 * 60 + 1)
        game = self.manager.games['LIVE']

        class ResumeBeforeLock:
            def __enter__(inner):
                game.last_activity = self.now

            def __exit__(inner, *args):
                pass

        game.state_lock = ResumeBeforeLock()
        self.clean_rooms()
        self.assertIn('LIVE', self.manager.games)

    def test_rooms_expire_after_a_day_and_remove_player_mappings(self):
        self.add_room('LIVE', 24 * 60 * 60 + 1)
        self.add_room('DONE', 24 * 60 * 60 + 1, ended=True)
        self.manager.games['DONE'].last_activity = self.now
        self.manager.player_to_game = {'player': 'LIVE'}
        self.manager.sid_to_game = {'socket': 'LIVE'}
        self.clean_rooms()
        self.assertEqual({}, self.manager.games)
        self.assertEqual({}, self.manager.player_to_game)
        self.assertEqual({}, self.manager.sid_to_game)
        self.assertEqual(2, self.manager.socketio.emit.call_count)
        self.manager.socketio.emit.assert_any_call(
            'room_disbanded', {'message': 'Room closed due to inactivity'}, room='LIVE'
        )

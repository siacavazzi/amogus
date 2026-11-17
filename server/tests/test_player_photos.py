"""Player photos are deleted as soon as no live room needs them."""
import base64
import os
import shutil
import sys
import tempfile
import unittest
from pathlib import Path
from threading import Lock, RLock
from types import SimpleNamespace
from unittest.mock import Mock


SERVER_DIR = Path(__file__).resolve().parents[1]
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

from assets.game_manager import GameManager  # noqa: E402
from assets.selfie_store import (  # noqa: E402
    ORPHAN_GRACE_SECONDS, SELFIE_RETENTION_SECONDS, SelfieStore,
)

JPEG = 'data:image/jpeg;base64,' + base64.b64encode(b'\xff\xd8\xff\xe0' + b'0' * 64 + b'\xff\xd9').decode()


class PhotoStoreTests(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp()
        self.store = SelfieStore(self.dir)

    def tearDown(self):
        shutil.rmtree(self.dir, ignore_errors=True)

    def age(self, name, seconds):
        path = self.store.path(name)
        stamp = path.stat().st_mtime - seconds
        os.utime(path, (stamp, stamp))

    def exists(self, name):
        return self.store.path(name).exists()

    def test_retention_cap_is_twelve_hours(self):
        self.assertEqual(SELFIE_RETENTION_SECONDS, 12 * 60 * 60)

    def test_photo_files_are_private_to_the_server(self):
        name = self.store.save(JPEG)
        self.assertEqual(self.store.path(name).stat().st_mode & 0o777, 0o600)

    def test_start_up_deletes_every_photo(self):
        names = [self.store.save(JPEG) for _ in range(3)]
        Path(self.dir, 'notes.txt').write_text('not a photo')
        self.assertEqual(self.store.delete_all(), 3)
        self.assertFalse(any(self.exists(name) for name in names))
        self.assertTrue(Path(self.dir, 'notes.txt').exists())

    def test_sweep_deletes_photos_no_player_points_to(self):
        kept, orphan = self.store.save(JPEG), self.store.save(JPEG)
        self.age(kept, ORPHAN_GRACE_SECONDS + 1)
        self.age(orphan, ORPHAN_GRACE_SECONDS + 1)
        self.store.sweep({kept})
        self.assertTrue(self.exists(kept))
        self.assertFalse(self.exists(orphan))

    def test_sweep_leaves_a_photo_whose_join_is_still_being_handled(self):
        fresh = self.store.save(JPEG)
        self.store.sweep(set())
        self.assertTrue(self.exists(fresh))

    def test_sweep_deletes_a_photo_past_the_cap_even_while_in_use(self):
        old = self.store.save(JPEG)
        self.age(old, SELFIE_RETENTION_SECONDS + 1)
        self.store.sweep({old})
        self.assertFalse(self.exists(old))


class PhotosInUseTests(unittest.TestCase):
    def manager(self, games):
        manager = GameManager.__new__(GameManager)
        manager.lock = Lock()
        manager.socketio = Mock()
        manager.games = games
        return manager

    def test_counts_players_and_waiting_phones_in_live_rooms(self):
        player = lambda selfie: SimpleNamespace(selfie=selfie)  # noqa: E731
        games = {
            'ABCD': SimpleNamespace(state_lock=RLock(), players=[player('a.jpg'), player(None)],
                                    waiting_players=[player('b.jpg')]),
            'EFGH': SimpleNamespace(state_lock=RLock(), players=[player('c.jpg')], waiting_players=[]),
        }
        self.assertEqual(self.manager(games).photos_in_use(), {'a.jpg', 'b.jpg', 'c.jpg'})


if __name__ == '__main__':
    unittest.main()

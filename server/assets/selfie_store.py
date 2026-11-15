"""Store temporary player photos and delete them as soon as no room needs them.

A photo lives only as long as its player is in a live room. It is deleted when the player
leaves or is dropped, when the room closes, at every server start (rooms live in memory, so
none survive a restart), and by the cleanup sweep for any file no live player points to.
SELFIE_RETENTION_SECONDS is a hard cap on top of that, for a room that stays open very long.
"""
import base64
import logging
import os
import re
import time
from pathlib import Path
from uuid import uuid4


SELFIE_RETENTION_SECONDS = 12 * 60 * 60
# A photo saved by a join that is still being handled has no player yet; the sweep leaves it alone.
ORPHAN_GRACE_SECONDS = 60
MAX_SELFIE_BYTES = 256 * 1024
SELFIE_NAME = re.compile(r'[0-9a-f]{32}\.jpg')
logger = logging.getLogger('app_logger')


class SelfieStore:
    def __init__(self, directory):
        self.directory = Path(directory)
        self.directory.mkdir(mode=0o700, parents=True, exist_ok=True)

    def path(self, filename):
        if not isinstance(filename, str) or not SELFIE_NAME.fullmatch(filename):
            return None
        return self.directory / filename

    def save(self, encoded):
        if not isinstance(encoded, str) or len(encoded) > MAX_SELFIE_BYTES * 4 // 3 + 100:
            raise ValueError('Photo exceeds the upload limit.')
        if encoded.startswith('data:'):
            prefix, encoded = encoded.split(',', 1)
            if prefix != 'data:image/jpeg;base64':
                raise ValueError('Photo must use JPEG format.')
        content = base64.b64decode(encoded, validate=True)
        if (len(content) > MAX_SELFIE_BYTES or not content.startswith(b'\xff\xd8\xff')
                or not content.endswith(b'\xff\xd9')):
            raise ValueError('Photo must contain a JPEG image within the upload limit.')
        filename = f'{uuid4().hex}.jpg'
        path = self.path(filename)
        descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        try:
            with os.fdopen(descriptor, 'wb') as photo:
                photo.write(content)
        except OSError:
            self.delete(filename)
            raise
        return filename

    def delete(self, filename):
        path = self.path(filename)
        if path is None:
            return
        try:
            path.unlink(missing_ok=True)
        except OSError:
            logger.exception('Selfie deletion failed')

    def expired(self, filename, now=None):
        path = self.path(filename)
        if path is None or path.is_symlink():
            return True
        try:
            modified = path.stat().st_mtime
        except OSError:
            return True
        return (time.time() if now is None else now) - modified >= SELFIE_RETENTION_SECONDS

    def _photo_names(self):
        try:
            return [path.name for path in self.directory.iterdir() if self.path(path.name) is not None]
        except OSError:
            logger.exception('Selfie listing failed')
            return []

    def _age(self, filename, now):
        path = self.path(filename)
        try:
            return now - path.lstat().st_mtime
        except OSError:
            return None

    def cleanup_expired(self):
        now = time.time()
        for name in self._photo_names():
            if self.expired(name, now):
                self.delete(name)

    def delete_all(self):
        """Delete every photo. Used at start-up, when no room (and so no player) exists yet."""
        names = self._photo_names()
        for name in names:
            self.delete(name)
        return len(names)

    def sweep(self, in_use, now=None):
        """Delete expired photos and photos no live player points to. Returns how many went."""
        now = time.time() if now is None else now
        in_use = set(in_use)
        deleted = 0
        for name in self._photo_names():
            age = self._age(name, now)
            orphan = name not in in_use and (age is None or age >= ORPHAN_GRACE_SECONDS)
            if orphan or self.expired(name, now):
                self.delete(name)
                deleted += 1
        return deleted

"""Store temporary player photos and remove expired files."""
import base64
import logging
import os
import re
import time
from pathlib import Path
from uuid import uuid4


SELFIE_RETENTION_SECONDS = 24 * 60 * 60
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

    def cleanup_expired(self):
        now = time.time()
        try:
            for path in self.directory.iterdir():
                if self.path(path.name) is not None and self.expired(path.name, now):
                    self.delete(path.name)
        except OSError:
            logger.exception('Selfie cleanup failed')

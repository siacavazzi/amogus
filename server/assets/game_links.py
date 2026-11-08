"""Old invite links that start the next game.

Groups come back weeks later by reopening the invite link still sitting in their group chat,
long after the room is gone. Room codes are short and get reused, so the link also carries
the game's own random token, and only that token finds the tasks the game played.
"""
import json
import os
import secrets
import time
from threading import Lock

MAX_AGE_SECONDS = 90 * 24 * 60 * 60
TOKEN_BYTES = 9  # 12 URL-safe characters


def new_link_token():
    return secrets.token_urlsafe(TOKEN_BYTES)


def clean_link_token(value):
    """A token as it can appear in a link, or '' for anything else."""
    if not isinstance(value, str):
        return ''
    value = value.strip()
    return value if 8 <= len(value) <= 32 and all(c.isalnum() or c in '-_' for c in value) else ''


class GameLinks:
    """What each game played, by link token, kept for 90 days after its last round started."""

    def __init__(self, path):
        self.path = path
        self.lock = Lock()
        self.links = {}
        try:
            with open(path, encoding='utf-8') as f:
                loaded = json.load(f)
            if isinstance(loaded, dict):
                self.links = loaded
        except (OSError, ValueError):
            pass

    def remember(self, token, tasks, locations, player_count, now=None):
        """Called when a round starts: the room's tasks, so the link can bring them back later."""
        token = clean_link_token(token)
        tasks = [{'task': task.get('task'), 'location': task.get('location')}
                 for task in tasks or [] if isinstance(task, dict) and task.get('task')]
        if not token or not tasks:
            return
        now = time.time() if now is None else now
        with self.lock:
            previous = self.links.get(token) or {}
            entry = {'played_at': now, 'tasks': tasks, 'locations': list(locations or []),
                     'player_count': max(player_count, previous.get('player_count', 0))}
            # A list made from these same tasks can be handed out again.
            if previous.get('tasks') == tasks and previous.get('list_code'):
                entry['list_code'] = previous['list_code']
            self.links[token] = entry
            self._prune_locked(now)
            self._save_locked()

    def lookup(self, token, now=None):
        token = clean_link_token(token)
        now = time.time() if now is None else now
        with self.lock:
            entry = self.links.get(token)
            if not entry or now - entry.get('played_at', 0) > MAX_AGE_SECONDS:
                return None
            return dict(entry)

    def set_list_code(self, token, code):
        with self.lock:
            entry = self.links.get(clean_link_token(token))
            if entry is not None:
                entry['list_code'] = code
                self._save_locked()

    def _prune_locked(self, now):
        for token in [t for t, entry in self.links.items() if now - entry.get('played_at', 0) > MAX_AGE_SECONDS]:
            del self.links[token]

    def _save_locked(self):
        try:
            os.makedirs(os.path.dirname(self.path) or '.', exist_ok=True)
            tmp = f'{self.path}.tmp'
            with open(tmp, 'w', encoding='utf-8') as f:
                json.dump(self.links, f)
            os.replace(tmp, self.path)
        except OSError:
            pass

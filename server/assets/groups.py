"""Groups that come back: the same friends playing again from a link in their group chat.

A group is a chain of rooms started from each other's links (an old invite link, a saved game
link, or the welcome back card). It is keyed by the first game's random link token, belongs
to no person or phone, and holds only counts: rooms, rounds, and who won. Nothing here is
sent with an IP address, and a group is forgotten 90 days after its last round.

The gameplay log only ever sees a one-way hash of the group key, so a log line can say
"this group came back after 6 days" without carrying the token that unlocks the group's tasks.
The hash is salted with a random value kept only in the group's entry here. When the group is
forgotten, so is the salt: from then on nobody, even with the old link, can tell which log
lines were that group's.
"""
import hashlib
import json
import os
import secrets
import time
from threading import Lock

from assets.game_links import clean_link_token

MAX_AGE_SECONDS = 90 * 24 * 60 * 60
# A room started this soon after the group's last one is the same evening, not a return.
SAME_VISIT_SECONDS = 12 * 60 * 60
GROUP_VIA = ('old_link', 'saved_link', 'welcome_back')
CREW_WINS = ('victory',)
INTRUDER_WINS = ('sus_victory', 'meltdown_fail')


def group_log_id(group, salt):
    """What the gameplay log keeps instead of the group key."""
    group = clean_link_token(group)
    return hashlib.sha256(f'{salt}:{group}'.encode()).hexdigest()[:12] if group and salt else None


class GroupBook:
    def __init__(self, path):
        self.path = path
        self.lock = Lock()
        self.groups = {}
        try:
            with open(path, encoding='utf-8') as f:
                loaded = json.load(f)
            if isinstance(loaded, dict):
                self.groups = loaded
        except (OSError, ValueError):
            pass

    def room_started(self, group, now=None):
        """A room's first round. Says whether the group played before and how long ago."""
        group = clean_link_token(group)
        if not group:
            return None
        now = time.time() if now is None else now
        with self.lock:
            self._prune_locked(now)
            entry = self.groups.get(group)
            before = dict(entry) if entry else None
            entry = entry or {'first_played': now, 'rooms': 0, 'rounds': 0, 'crew_wins': 0, 'intruder_wins': 0}
            entry.setdefault('salt', secrets.token_hex(16))
            entry['rooms'] += 1
            entry['last_room_at'] = entry['last_played'] = now
            self.groups[group] = entry
            self._save_locked()
        if not before:
            return {'rooms_before': 0, 'hours_since_last': None, 'returning': False}
        since = max(0, now - before.get('last_played', now))
        return {'rooms_before': before.get('rooms', 0), 'hours_since_last': round(since / 3600, 1),
                'returning': since >= SAME_VISIT_SECONDS}

    def log_id(self, group):
        """The group's id for the gameplay log, or None for a group this book doesn't hold."""
        group = clean_link_token(group)
        with self.lock:
            entry = self.groups.get(group)
            return group_log_id(group, entry.get('salt')) if entry else None

    def round_ended(self, group, end_state, now=None):
        group = clean_link_token(group)
        now = time.time() if now is None else now
        with self.lock:
            entry = self.groups.get(group)
            if entry is None:
                return
            entry['rounds'] += 1
            entry['last_played'] = now
            if end_state in CREW_WINS:
                entry['crew_wins'] += 1
            elif end_state in INTRUDER_WINS:
                entry['intruder_wins'] += 1
            self._save_locked()

    def recap(self, group, now=None):
        """The group's score so far, for the welcome back card and the ended-game page."""
        group = clean_link_token(group)
        now = time.time() if now is None else now
        with self.lock:
            entry = self.groups.get(group)
            if not entry or now - entry.get('last_played', 0) > MAX_AGE_SECONDS or not entry.get('rounds'):
                return None
            return {**{key: entry.get(key, 0) for key in ('rooms', 'rounds', 'crew_wins', 'intruder_wins')},
                    'first_played': entry.get('first_played'), 'last_played': entry.get('last_played')}

    def _prune_locked(self, now):
        for group in [g for g, entry in self.groups.items() if now - entry.get('last_played', 0) > MAX_AGE_SECONDS]:
            del self.groups[group]

    def _save_locked(self):
        try:
            os.makedirs(os.path.dirname(self.path) or '.', exist_ok=True)
            tmp = f'{self.path}.tmp'
            with open(tmp, 'w', encoding='utf-8') as f:
                json.dump(self.groups, f)
            os.replace(tmp, self.path)
        except OSError:
            pass

"""The spectator screen: what a player who is out watches for the rest of the round.

Out players get a live feed (tasks done, cards played, meetings, who went out) and the list of
who is still in. Only they get it: the server sends it to their phones alone and room_state adds
it only for them, so a living player can't read it from the page or the socket.

Two views (Game.spectator_view, a room setting):
- 'secret' (default): the feed never names who played a card or finished a task, and no living
  player's role is shown, until the intruders are revealed for everyone. Out players stay in the
  venue and at meetings, and many players are kids: one who knows the intruder gives it away.
- 'full': names everything, marks the living intruders, and shows what each crewmate is on.
"""
import copy
import time

SPECTATOR_VIEWS = ('secret', 'full')
DEFAULT_SPECTATOR_VIEW = 'secret'
FEED_LIMIT = 40

# Feed kinds whose player is an intruder acting in secret, or a crewmate whose tasks would clear
# them: anonymous in the secret view until the intruders are revealed.
ANONYMOUS_KINDS = {'task', 'card'}
# Shown only in the full view (or once intruders are revealed): they name an intruder's target or
# give away that a task was fake, which only the intruders know.
FULL_ONLY_KINDS = {'fake_done'}
# Cards whose effect already names the player to the whole room (Self Report calls a meeting in
# the player's name), so the secret view skips the card line and keeps the meeting line.
CARDS_NAMING_PLAYER = {'Self Report'}


def sanitize_spectator_view(value):
    return value if value in SPECTATOR_VIEWS else DEFAULT_SPECTATOR_VIEW


class SpectatorFeed:
    def __init__(self, game):
        self.game = game
        self.entries = []
        self.next_id = 1
        self.tasks_done = {}
        self.started = time.monotonic()

    def reset(self):
        """A new round: empty feed, and the feed's clock starts again."""
        self.entries = []
        self.tasks_done = {}
        self.started = time.monotonic()

    # ---- recording ----

    def add(self, kind, player=None, **fields):
        """Record one moment of the round and send the new view to every out player."""
        game = self.game
        with game.state_lock:
            if not game.game_running:
                return None
            entry = {'id': self.next_id, 'kind': kind, 'at': round(time.monotonic() - self.started)}
            self.next_id += 1
            if player is not None:
                entry['player_id'] = player.player_id
                entry['name'] = player.username
                entry['sus'] = bool(player.sus)
            entry.update({key: value for key, value in fields.items() if value is not None})
            if kind == 'task' and player is not None:
                self.tasks_done[player.player_id] = self.tasks_done.get(player.player_id, 0) + 1
            self.entries.append(entry)
            del self.entries[:-FEED_LIMIT]
            self.broadcast()
            return entry

    def broadcast(self):
        game = self.game
        with game.state_lock:
            for player in list(game.players):
                if player.sid and self.can_watch(player):
                    game.socket.emit('spectator', self.view_for(player), to=player.sid)

    # ---- reading ----

    def can_watch(self, player):
        game = self.game
        return bool(player is not None and player in game.players and not player.alive
                    and not getattr(player, 'waiting', False)
                    and game.game_running and not game.end_state)

    def view_for(self, player):
        """The spectator payload for `player`, or None when they are not out in a live round."""
        game = self.game
        with game.state_lock:
            if not self.can_watch(player):
                return None
            view = sanitize_spectator_view(getattr(game, 'spectator_view', DEFAULT_SPECTATOR_VIEW))
            open_book = view == 'full' or bool(game.intruders_revealed)
            feed = [shown for shown in (self._shown(entry, open_book) for entry in self.entries) if shown]
            living = []
            for other in game.players:
                if not other.alive or getattr(other, 'waiting', False):
                    continue
                row = {'player_id': other.player_id}
                if open_book:
                    row['sus'] = bool(other.sus)
                    row['tasks_done'] = self.tasks_done.get(other.player_id, 0)
                    if other.sus:
                        row['cards'] = len(other.cards)
                    elif other.task:
                        row['location'] = other.task.get('location')
                living.append(row)
            return copy.deepcopy({
                'room_code': game.room_code, 'revision': game.revision, 'round_id': game.round_id,
                'view': view, 'open_book': open_book, 'feed': feed, 'living': living,
            })

    @staticmethod
    def _shown(entry, open_book):
        kind = entry['kind']
        if kind in FULL_ONLY_KINDS and not open_book:
            return None
        if open_book:
            return entry
        if kind == 'card' and entry.get('card') in CARDS_NAMING_PLAYER:
            return None
        shown = dict(entry)
        if kind in ANONYMOUS_KINDS:
            # The card's area (Area Denial) and target are intruder-only knowledge too.
            for key in ('player_id', 'name', 'sus', 'target_id', 'target_name', 'card_location'):
                shown.pop(key, None)
        elif kind != 'out':
            # Only a player who is out has a public role; nobody else's is shown.
            shown.pop('sus', None)
        return shown


def record(game, kind, player=None, **fields):
    """Add a feed line for `game`, if it keeps one (test doubles and bare games may not)."""
    feed = getattr(game, 'spectator', None) if game is not None else None
    if isinstance(feed, SpectatorFeed):
        return feed.add(kind, player, **fields)
    return None

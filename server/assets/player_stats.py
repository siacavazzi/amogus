"""Game stats for signed-in accounts: the "My stats" page.

Only a phone signed in to an account gets stats. When a round ends, each signed-in player's
round becomes one row keyed by their account id: their role, whether their side won, whether
they made it to the end, and their own counts (tasks done, cards played, meetings called,
votes). Nothing is kept for anyone who isn't signed in, and a row never holds another player's
name, the room code or anything about the device. Deleting the account deletes its rows.

Storage is one SQLite file beside the accounts database (data/player_stats.db), so beta and
prod keep separate stats the way they keep separate accounts.
"""

import os
import sqlite3
import time
from threading import Lock

# How a round ended -> which side won.
CREW_WINS = {'victory'}
INTRUDER_WINS = {'sus_victory', 'meltdown_fail'}
TAKEDOWN_CAUSES = {'murdered', 'murdered_during_task'}
WEEK = 7 * 24 * 3600
MIN_PLAYERS = 3
WEEKS_SHOWN = 12
RECENT_SHOWN = 20
# Plenty for anyone, and a cap so one account can't grow the file without end.
ROWS_KEPT_PER_ACCOUNT = 5000

COUNTS = ('tasks', 'cards', 'takedowns', 'meetings', 'votes', 'sharp_votes')


def winner_of(end_state):
    if end_state in CREW_WINS:
        return 'crew'
    if end_state in INTRUDER_WINS:
        return 'intruder'
    return None


def rows_for_round(game, ended_at=None):
    """One row per signed-in player for a round that just ended, or [] when it doesn't count.

    Practice games (test mode) and rounds under 3 players don't count, same as the game's own
    records. Rooms marked as test traffic still count here: only a signed-in account gets a row,
    and the browser tests need to see their own rounds.
    """
    if getattr(game, 'test_mode', False):
        return []
    winner = winner_of(getattr(game, 'end_state', None))
    if not winner:
        return []
    players = [player for player in getattr(game, 'players', []) if not getattr(player, 'waiting', False)]
    if len(players) < MIN_PLAYERS:
        return []
    # Intruders win together, so the crew they took down is the team's, shared by every intruder.
    takedowns = sum(1 for player in players if not player.sus and player.death_cause in TAKEDOWN_CAUSES)
    started = getattr(game, 'round_started_at', None)
    ended_at = ended_at or getattr(game, 'end_time', None) or time.time()
    minutes = round(max(0.0, ended_at - started) / 60, 1) if started else None
    rows, seen = [], set()
    for player in players:
        account_id = getattr(player, 'account_id', None)
        if not account_id or account_id in seen:
            continue  # One row per account, even if it's signed in on two phones in the room.
        seen.add(account_id)
        role = 'intruder' if player.sus else 'crew'
        tally = getattr(player, 'stat_tally', {}) or {}
        rows.append({
            'account_id': account_id,
            'ended_at': ended_at,
            'role': role,
            'won': int(role == winner),
            'survived': int(bool(player.alive)),
            'voted_out': int(str(player.death_cause or '').startswith('voted_out')),
            'players': len(players),
            'minutes': minutes,
            'tasks': int(tally.get('tasks', 0)),
            'cards': int(tally.get('cards', 0)),
            'takedowns': takedowns if role == 'intruder' else 0,
            'meetings': int(tally.get('meetings', 0)),
            'votes': int(tally.get('votes', 0)),
            'sharp_votes': int(tally.get('sharp_votes', 0)),
        })
    return rows


def summarize(rows, now=None):
    """The stats page's numbers from an account's rows, oldest first."""
    now = now or time.time()
    total = len(rows)
    out = {
        'games': total,
        'wins': sum(r['won'] for r in rows),
        'crew': {'games': 0, 'wins': 0},
        'intruder': {'games': 0, 'wins': 0},
        'survived': sum(r['survived'] for r in rows),
        'voted_out': sum(r['voted_out'] for r in rows),
        # Everyone else in the room, added up over every game (the same friend counts each game).
        'players_met': sum(max(0, r['players'] - 1) for r in rows),
        'biggest_party': max((r['players'] for r in rows), default=0),
        'minutes': round(sum(r['minutes'] or 0 for r in rows)),
        'best_streak': 0,
        'current_streak': 0,
        'first_played': rows[0]['ended_at'] if rows else None,
        'weeks': [],
        'recent': [],
    }
    for key in COUNTS:
        out[key] = sum(r[key] for r in rows)
    streak = 0
    for r in rows:
        side = out[r['role']]
        side['games'] += 1
        side['wins'] += r['won']
        streak = streak + 1 if r['won'] else 0
        out['best_streak'] = max(out['best_streak'], streak)
    out['current_streak'] = streak
    # Games per week for the last 12 weeks, the current week last.
    week_start = now - WEEK
    for i in range(WEEKS_SHOWN):
        start = week_start - (WEEKS_SHOWN - 1 - i) * WEEK
        in_week = [r for r in rows if start < r['ended_at'] <= start + WEEK]
        out['weeks'].append({'end': start + WEEK, 'games': len(in_week), 'wins': sum(r['won'] for r in in_week)})
    out['recent'] = [{'role': r['role'], 'won': bool(r['won']), 'at': r['ended_at']} for r in rows[-RECENT_SHOWN:]]
    return out


class PlayerStatsStore:
    def __init__(self, data_dir):
        os.makedirs(data_dir, exist_ok=True)
        self.lock = Lock()
        self.db = sqlite3.connect(os.path.join(data_dir, 'player_stats.db'), check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        with self.lock:
            self.db.executescript('''
                CREATE TABLE IF NOT EXISTS rounds (
                    account_id TEXT NOT NULL,
                    ended_at REAL NOT NULL,
                    role TEXT NOT NULL,
                    won INTEGER NOT NULL,
                    survived INTEGER NOT NULL,
                    voted_out INTEGER NOT NULL,
                    players INTEGER NOT NULL,
                    minutes REAL,
                    tasks INTEGER NOT NULL,
                    cards INTEGER NOT NULL,
                    takedowns INTEGER NOT NULL,
                    meetings INTEGER NOT NULL,
                    votes INTEGER NOT NULL,
                    sharp_votes INTEGER NOT NULL
                );
                CREATE INDEX IF NOT EXISTS rounds_account ON rounds(account_id, ended_at);
            ''')
            self.db.commit()

    COLUMNS = ('account_id', 'ended_at', 'role', 'won', 'survived', 'voted_out', 'players', 'minutes') + COUNTS

    def add_rounds(self, rows):
        if not rows:
            return
        with self.lock:
            self.db.executemany(
                f'INSERT INTO rounds ({", ".join(self.COLUMNS)}) VALUES ({", ".join("?" for _ in self.COLUMNS)})',
                [tuple(row[c] for c in self.COLUMNS) for row in rows])
            for account_id in {row['account_id'] for row in rows}:
                self.db.execute(
                    'DELETE FROM rounds WHERE account_id = ? AND rowid NOT IN '
                    '(SELECT rowid FROM rounds WHERE account_id = ? ORDER BY ended_at DESC LIMIT ?)',
                    (account_id, account_id, ROWS_KEPT_PER_ACCOUNT))
            self.db.commit()

    def record_round(self, game):
        """Called once when a round ends. Returns how many accounts got the round."""
        round_id = getattr(game, 'round_id', None)
        if getattr(game, '_player_stats_round', None) == round_id:
            return 0
        game._player_stats_round = round_id
        rows = rows_for_round(game)
        self.add_rounds(rows)
        return len(rows)

    def rows(self, account_id):
        with self.lock:
            found = self.db.execute('SELECT * FROM rounds WHERE account_id = ? ORDER BY ended_at', (account_id,)).fetchall()
        return [dict(row) for row in found]

    def summary(self, account_id, now=None):
        return summarize(self.rows(account_id), now=now)

    def delete(self, account_id):
        with self.lock:
            self.db.execute('DELETE FROM rounds WHERE account_id = ?', (account_id,))
            self.db.commit()

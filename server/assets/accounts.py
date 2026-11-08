"""Optional host accounts: sign in with Google or a 4-digit email code, no passwords.

Players never need an account. A host signs in so their saved task lists follow them to any
phone or browser, instead of living in one browser's storage.

What we keep about a person: their email, the Google account id when they used Google, a
display name, and when the account was made and last used. Nothing else.

Storage is one SQLite file next to the server's other data (data/accounts.db), so beta and
prod, which live in different folders, never share accounts or sessions.
"""

import hashlib
import hmac
import os
import re
import secrets
import sqlite3
import time
from threading import Lock

SESSION_DAYS = 90
SESSION_SECONDS = SESSION_DAYS * 24 * 3600
# A session's 90 days restart when it is used, at most once a day so every request isn't a write.
SESSION_RENEW_AFTER = 24 * 3600

# 4-digit codes (Sam, 2026-11-08), so the limits do the work a longer code would:
CODE_DIGITS = 4
CODE_TTL = 10 * 60            # a code works for 10 minutes
CODE_TRIES = 3                # and allows 3 guesses
CODE_RESEND_GAP = 30          # one new code per email every 30 seconds
CODES_PER_EMAIL_PER_DAY = 10  # at most 10 codes an email a day
FAILURES_BEFORE_PAUSE = 9     # 9 wrong guesses in a day pauses that email for a day
CODES_PER_IP_PER_HOUR = 30    # one network can't spray codes at many addresses
DAY = 24 * 3600

TICKET_TTL = 60

EMAIL_RE = re.compile(r'^[^@\s]{1,64}@[^@\s]{1,255}\.[^@\s]{2,63}$')


def normalize_email(email):
    """Lower-cased and trimmed, or None when it doesn't look like an email address."""
    if not isinstance(email, str):
        return None
    email = email.strip().lower()
    if len(email) > 254 or not EMAIL_RE.match(email):
        return None
    return email


def owner_key(account_id):
    """The owner id task lists use for an account (devices use their device_id)."""
    return f'acct:{account_id}'


class AccountStore:
    def __init__(self, data_dir):
        os.makedirs(data_dir, exist_ok=True)
        self.lock = Lock()
        self.db = sqlite3.connect(os.path.join(data_dir, 'accounts.db'), check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self.secret = self._load_secret(os.path.join(data_dir, 'auth_secret'))
        self.tickets = {}
        with self.lock:
            self.db.executescript('''
                CREATE TABLE IF NOT EXISTS accounts (
                    id TEXT PRIMARY KEY,
                    email TEXT UNIQUE,
                    google_sub TEXT UNIQUE,
                    display_name TEXT,
                    created_at REAL NOT NULL,
                    last_seen_at REAL NOT NULL
                );
                CREATE TABLE IF NOT EXISTS sessions (
                    token_hash TEXT PRIMARY KEY,
                    account_id TEXT NOT NULL,
                    created_at REAL NOT NULL,
                    renewed_at REAL NOT NULL,
                    expires_at REAL NOT NULL
                );
                CREATE INDEX IF NOT EXISTS sessions_account ON sessions(account_id);
                CREATE TABLE IF NOT EXISTS email_codes (
                    email TEXT PRIMARY KEY,
                    code_hash TEXT NOT NULL,
                    expires_at REAL NOT NULL,
                    tries_left INTEGER NOT NULL
                );
                CREATE TABLE IF NOT EXISTS code_events (
                    email TEXT NOT NULL,
                    ip TEXT,
                    kind TEXT NOT NULL,
                    at REAL NOT NULL
                );
                CREATE INDEX IF NOT EXISTS code_events_email ON code_events(email, kind, at);
                CREATE INDEX IF NOT EXISTS code_events_ip ON code_events(ip, kind, at);
            ''')
            self.db.commit()

    @staticmethod
    def _load_secret(path):
        """A random server secret made on first run, kept beside the database."""
        try:
            with open(path, 'rb') as f:
                secret = f.read().strip()
            if len(secret) >= 32:
                return secret
        except OSError:
            pass
        secret = secrets.token_hex(32).encode()
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, 'wb') as f:
            f.write(secret)
        return secret

    def _hash(self, value):
        return hmac.new(self.secret, value.encode(), hashlib.sha256).hexdigest()

    # ---------- accounts ----------

    @staticmethod
    def public(row):
        if not row:
            return None
        return {
            'id': row['id'],
            'email': row['email'],
            'name': row['display_name'] or '',
            'google': bool(row['google_sub']),
        }

    def get(self, account_id):
        with self.lock:
            return self.db.execute('SELECT * FROM accounts WHERE id = ?', (account_id,)).fetchone()

    def _create(self, email=None, google_sub=None, name=None):
        now = time.time()
        account_id = 'a_' + secrets.token_hex(8)
        self.db.execute(
            'INSERT INTO accounts (id, email, google_sub, display_name, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)',
            (account_id, email, google_sub, name, now, now))
        self.db.commit()
        return self.db.execute('SELECT * FROM accounts WHERE id = ?', (account_id,)).fetchone()

    def account_for_email(self, email):
        """The account for an email someone just proved they own, made on first sign-in."""
        with self.lock:
            row = self.db.execute('SELECT * FROM accounts WHERE email = ?', (email,)).fetchone()
            return row or self._create(email=email)

    def account_for_google(self, sub, email, email_verified, name=None):
        """The account for a Google sign-in. A verified Google email that already has an account
        (made with an email code) lands in that same account, so nobody ends up with two."""
        email = normalize_email(email) if email_verified else None
        name = (name or '').strip()[:60] or None
        with self.lock:
            row = self.db.execute('SELECT * FROM accounts WHERE google_sub = ?', (sub,)).fetchone()
            if row:
                return row
            if email:
                row = self.db.execute('SELECT * FROM accounts WHERE email = ?', (email,)).fetchone()
                if row:
                    self.db.execute('UPDATE accounts SET google_sub = ?, display_name = COALESCE(display_name, ?) WHERE id = ?',
                                    (sub, name, row['id']))
                    self.db.commit()
                    return self.db.execute('SELECT * FROM accounts WHERE id = ?', (row['id'],)).fetchone()
            return self._create(email=email, google_sub=sub, name=name)

    def delete(self, account_id):
        with self.lock:
            self.db.execute('DELETE FROM sessions WHERE account_id = ?', (account_id,))
            row = self.db.execute('SELECT email FROM accounts WHERE id = ?', (account_id,)).fetchone()
            if row and row['email']:
                self.db.execute('DELETE FROM email_codes WHERE email = ?', (row['email'],))
                self.db.execute('DELETE FROM code_events WHERE email = ?', (row['email'],))
            self.db.execute('DELETE FROM accounts WHERE id = ?', (account_id,))
            self.db.commit()
        self.tickets = {k: v for k, v in self.tickets.items() if v[0] != account_id}

    # ---------- sessions ----------

    def start_session(self, account_id):
        token = secrets.token_urlsafe(32)
        now = time.time()
        with self.lock:
            self.db.execute(
                'INSERT INTO sessions (token_hash, account_id, created_at, renewed_at, expires_at) VALUES (?, ?, ?, ?, ?)',
                (self._hash(token), account_id, now, now, now + SESSION_SECONDS))
            self.db.execute('UPDATE accounts SET last_seen_at = ? WHERE id = ?', (now, account_id))
            self.db.commit()
        return token

    def session_account(self, token, renew=False):
        """(account row, renewed) for a live session token, else (None, False)."""
        if not token or not isinstance(token, str) or len(token) > 200:
            return None, False
        now = time.time()
        token_hash = self._hash(token)
        with self.lock:
            session = self.db.execute('SELECT * FROM sessions WHERE token_hash = ?', (token_hash,)).fetchone()
            if not session:
                return None, False
            if session['expires_at'] <= now:
                self.db.execute('DELETE FROM sessions WHERE token_hash = ?', (token_hash,))
                self.db.commit()
                return None, False
            account = self.db.execute('SELECT * FROM accounts WHERE id = ?', (session['account_id'],)).fetchone()
            renewed = False
            if account and renew and now - session['renewed_at'] >= SESSION_RENEW_AFTER:
                self.db.execute('UPDATE sessions SET renewed_at = ?, expires_at = ? WHERE token_hash = ?',
                                (now, now + SESSION_SECONDS, token_hash))
                self.db.execute('UPDATE accounts SET last_seen_at = ? WHERE id = ?', (now, account['id']))
                self.db.commit()
                renewed = True
            return account, renewed

    def end_session(self, token):
        if not token or not isinstance(token, str):
            return
        with self.lock:
            self.db.execute('DELETE FROM sessions WHERE token_hash = ?', (self._hash(token),))
            self.db.commit()

    # ---------- socket tickets ----------
    # The socket only sees cookies when it first connects. After signing in, the page trades its
    # new cookie for a one-minute ticket and hands that to the socket it already has open, so the
    # host's room connection never has to drop.

    def make_ticket(self, account_id):
        now = time.time()
        self.tickets = {k: v for k, v in self.tickets.items() if v[1] > now}
        ticket = secrets.token_urlsafe(24)
        self.tickets[ticket] = (account_id, now + TICKET_TTL)
        return ticket

    def redeem_ticket(self, ticket):
        entry = self.tickets.pop(ticket, None) if isinstance(ticket, str) else None
        if not entry or entry[1] <= time.time():
            return None
        return entry[0]

    # ---------- email codes ----------

    def _count(self, column, value, kind, since):
        return self.db.execute(
            f'SELECT COUNT(*) FROM code_events WHERE {column} = ? AND kind = ? AND at > ?',
            (value, kind, since)).fetchone()[0]

    def request_code(self, email, ip=None):
        """(code, None) when a new code may be sent, else (None, reason).

        reason: 'invalid_email', 'wait' (asked again within 30 s), 'too_many' (daily or
        network limit), 'paused' (too many wrong guesses today).
        """
        email = normalize_email(email)
        if not email:
            return None, 'invalid_email'
        now = time.time()
        with self.lock:
            if self._count('email', email, 'fail', now - DAY) >= FAILURES_BEFORE_PAUSE:
                return None, 'paused'
            last = self.db.execute("SELECT MAX(at) FROM code_events WHERE email = ? AND kind = 'sent'", (email,)).fetchone()[0]
            if last and now - last < CODE_RESEND_GAP:
                return None, 'wait'
            if self._count('email', email, 'sent', now - DAY) >= CODES_PER_EMAIL_PER_DAY:
                return None, 'too_many'
            if ip and self._count('ip', ip, 'sent', now - 3600) >= CODES_PER_IP_PER_HOUR:
                return None, 'too_many'
            code = ''.join(secrets.choice('0123456789') for _ in range(CODE_DIGITS))
            self.db.execute(
                'INSERT OR REPLACE INTO email_codes (email, code_hash, expires_at, tries_left) VALUES (?, ?, ?, ?)',
                (email, self._hash(f'{email}:{code}'), now + CODE_TTL, CODE_TRIES))
            self.db.execute("INSERT INTO code_events (email, ip, kind, at) VALUES (?, ?, 'sent', ?)", (email, ip, now))
            # Old rows are only needed for the last day's limits.
            self.db.execute('DELETE FROM code_events WHERE at < ?', (now - 2 * DAY,))
            self.db.commit()
        return code, None

    def forget_code(self, email):
        """The email couldn't be sent: drop the code and don't count it against the limits."""
        email = normalize_email(email)
        with self.lock:
            self.db.execute('DELETE FROM email_codes WHERE email = ?', (email,))
            self.db.execute(
                "DELETE FROM code_events WHERE rowid = (SELECT MAX(rowid) FROM code_events WHERE email = ? AND kind = 'sent')",
                (email,))
            self.db.commit()

    def check_code(self, email, code, ip=None):
        """(account row, None) when the code is right, else (None, reason).

        reason: 'invalid_email', 'no_code' (none sent or it expired), 'wrong' (tries left),
        'used_up' (that was the last try; ask for a new code), 'paused'.
        """
        email = normalize_email(email)
        if not email:
            return None, 'invalid_email'
        code = re.sub(r'\D', '', code) if isinstance(code, str) else ''
        now = time.time()
        with self.lock:
            if self._count('email', email, 'fail', now - DAY) >= FAILURES_BEFORE_PAUSE:
                return None, 'paused'
            row = self.db.execute('SELECT * FROM email_codes WHERE email = ?', (email,)).fetchone()
            if not row or row['expires_at'] <= now or row['tries_left'] <= 0:
                return None, 'no_code'
            if len(code) == CODE_DIGITS and hmac.compare_digest(row['code_hash'], self._hash(f'{email}:{code}')):
                self.db.execute('DELETE FROM email_codes WHERE email = ?', (email,))
                self.db.commit()
                ok = True
            else:
                tries_left = row['tries_left'] - 1
                self.db.execute('UPDATE email_codes SET tries_left = ? WHERE email = ?', (tries_left, email))
                self.db.execute("INSERT INTO code_events (email, ip, kind, at) VALUES (?, ?, 'fail', ?)", (email, ip, now))
                self.db.commit()
                ok = False
        if not ok:
            if self._count('email', email, 'fail', now - DAY) >= FAILURES_BEFORE_PAUSE:
                return None, 'paused'
            return None, 'wrong' if tries_left > 0 else 'used_up'
        return self.account_for_email(email), None

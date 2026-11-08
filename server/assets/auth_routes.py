"""HTTP routes for optional host accounts (see assets/accounts.py).

Sign-in happens over plain HTTP so the server can set an HttpOnly cookie. That cookie lasts 90
days and renews when used, and unlike the storage page scripts write, Safari doesn't wipe it
after a week away.

  GET  /api/account                  who is signed in, and which ways to sign in work here
  POST /api/auth/email/start         {email, lang}: email a 4-digit code
  POST /api/auth/email/verify        {email, code}: sign in
  GET  /api/auth/google/start        open Google (in a pop-up, so the host's room stays connected)
  GET  /api/auth/google/callback     Google sends the host back here
  POST /api/account/adopt            {device_id}: move this browser's saved lists into the account
  POST /api/account/ticket           a one-minute ticket that signs in the already-open socket
  POST /api/auth/sign-out
  POST /api/account/delete

Google sign-in turns on when GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set, email codes
when RESEND_API_KEY is set. Off prod (beta, a laptop), addresses at example.com get their code
back in the response, never by email, so tests can sign in without an inbox.
"""

import base64
import hashlib
import html
import json
import logging
import os
import re
import secrets
import time
import urllib.parse
import urllib.request

from flask import jsonify, make_response, redirect, request

from assets import sign_in_email
from assets.accounts import SESSION_SECONDS, AccountStore, normalize_email, owner_key

logger = logging.getLogger('app_logger')

GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
GOOGLE_ISSUERS = {'accounts.google.com', 'https://accounts.google.com'}
GOOGLE_STATE_TTL = 15 * 60
DEVICE_ID_RE = re.compile(r'^device_[a-z0-9]{4,40}$')
TEST_EMAIL_DOMAIN = '@example.com'


def google_configured():
    return bool(os.environ.get('GOOGLE_CLIENT_ID') and os.environ.get('GOOGLE_CLIENT_SECRET'))


class AuthRoutes:
    def __init__(self, app, store: AccountStore, task_list_manager, channel='prod', on_account_deleted=None):
        self.app = app
        self.store = store
        self.lists = task_list_manager
        self.channel = channel or 'prod'
        # Prod and beta share susparty.com, so each keeps its own cookie.
        suffix = '' if self.channel == 'prod' else f'_{re.sub(r"[^a-z0-9]", "", self.channel.lower())}'
        self.cookie_name = f'sp_session{suffix}'
        self.google_cookie = f'sp_google{suffix}'
        self.on_account_deleted = on_account_deleted
        # Swapped out in tests.
        self.send_code = sign_in_email.send_code
        self.fetch_google_token = self._fetch_google_token
        self._register()

    # ---------- helpers ----------

    def dev_codes(self):
        return self.channel != 'prod' and not sign_in_email.email_configured()

    def email_available(self):
        return sign_in_email.email_configured() or self.channel != 'prod'

    def client_ip(self):
        forwarded = request.headers.get('X-Real-IP') or (request.headers.get('X-Forwarded-For') or '').split(',')[0]
        return (forwarded or request.remote_addr or '').strip()[:64] or None

    def secure_cookies(self):
        return request.headers.get('X-Forwarded-Proto', request.scheme) == 'https'

    def current_account(self, renew=False):
        token = request.cookies.get(self.cookie_name)
        account, renewed = self.store.session_account(token, renew=renew)
        return account, token, renewed

    def account_from_cookie_header(self, cookies):
        """For the socket's connect handler, which sees the handshake's cookies."""
        account, _ = self.store.session_account(cookies.get(self.cookie_name))
        return account

    def set_session_cookie(self, response, token):
        response.set_cookie(self.cookie_name, token, max_age=SESSION_SECONDS, httponly=True,
                            secure=self.secure_cookies(), samesite='Lax', path='/')
        return response

    def same_origin(self):
        """Refuse state-changing requests made from another site's page."""
        origin = request.headers.get('Origin')
        if not origin:
            return True
        return urllib.parse.urlparse(origin).netloc == request.host

    def body(self):
        data = request.get_json(silent=True)
        return data if isinstance(data, dict) else {}

    def account_reply(self, account):
        return {
            'account': AccountStore.public(account),
            'google': google_configured(),
            'email': self.email_available(),
        }

    def redirect_uri(self):
        base = os.environ.get('AUTH_PUBLIC_URL') or request.host_url
        return base.rstrip('/') + '/api/auth/google/callback'

    def _sign(self, payload):
        raw = base64.urlsafe_b64encode(json.dumps(payload, separators=(',', ':')).encode()).decode().rstrip('=')
        return f'{raw}.{self.store._hash("google-state:" + raw)}'

    def _unsign(self, value):
        try:
            raw, mac = value.rsplit('.', 1)
        except (AttributeError, ValueError):
            return None
        if not secrets.compare_digest(mac.encode(), self.store._hash('google-state:' + raw).encode()):
            return None
        try:
            return json.loads(base64.urlsafe_b64decode(raw + '=' * (-len(raw) % 4)))
        except ValueError:
            return None

    @staticmethod
    def safe_return(path):
        """Only paths on this site, never another host."""
        if not isinstance(path, str) or not path.startswith('/') or path.startswith('//') or '\\' in path:
            return '/account'
        return path[:300]

    def _fetch_google_token(self, code, verifier):
        form = urllib.parse.urlencode({
            'code': code,
            'client_id': os.environ.get('GOOGLE_CLIENT_ID'),
            'client_secret': os.environ.get('GOOGLE_CLIENT_SECRET'),
            'redirect_uri': self.redirect_uri(),
            'grant_type': 'authorization_code',
            'code_verifier': verifier,
        }).encode()
        req = urllib.request.Request(GOOGLE_TOKEN_URL, data=form, method='POST',
                                     headers={'Content-Type': 'application/x-www-form-urlencoded'})
        with urllib.request.urlopen(req, timeout=10) as response:
            return json.loads(response.read())

    @staticmethod
    def id_token_claims(id_token):
        # The token came straight from Google's token endpoint over TLS, so (OpenID Connect
        # Core 3.1.3.7) we check its claims and skip the signature.
        try:
            part = id_token.split('.')[1]
            return json.loads(base64.urlsafe_b64decode(part + '=' * (-len(part) % 4)))
        except (AttributeError, IndexError, ValueError):
            return None

    def finish_page(self, ok, return_to, popup):
        """The page the Google pop-up lands on: tell the setup screen and close."""
        message = json.dumps({'type': 'sus-sign-in', 'ok': bool(ok)})
        target = json.dumps(return_to)
        text = 'Signed in. You can close this window.' if ok else 'Sign-in did not finish. You can close this window and try again.'
        page = f'''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sus Party</title><meta name="robots" content="noindex"></head>
<body style="font-family:-apple-system,Segoe UI,Arial,sans-serif;padding:32px;text-align:center">
<p>{html.escape(text)}</p>
<script>
(function () {{
  var popup = {json.dumps(bool(popup))};
  try {{
    if (popup && window.opener && !window.opener.closed) {{
      window.opener.postMessage({message}, window.location.origin);
      window.close();
      return;
    }}
  }} catch (e) {{}}
  window.location.replace({target});
}})();
</script></body></html>'''
        response = make_response(page)
        response.headers['Cache-Control'] = 'no-store'
        response.headers['Content-Security-Policy'] = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'"
        return response

    # ---------- routes ----------

    def _register(self):
        app = self.app

        @app.route('/api/account', methods=['GET'])
        def account_me():
            account, token, renewed = self.current_account(renew=True)
            response = make_response(jsonify(self.account_reply(account)))
            response.headers['Cache-Control'] = 'no-store'
            if account and renewed:
                self.set_session_cookie(response, token)
            return response

        @app.route('/api/auth/email/start', methods=['POST'])
        def email_start():
            if not self.same_origin():
                return jsonify({'ok': False, 'reason': 'forbidden'}), 403
            data = self.body()
            email = normalize_email(data.get('email'))
            if not email:
                return jsonify({'ok': False, 'reason': 'invalid_email'}), 400
            if not self.email_available():
                return jsonify({'ok': False, 'reason': 'unavailable'}), 503
            code, reason = self.store.request_code(email, ip=self.client_ip())
            if not code:
                return jsonify({'ok': False, 'reason': reason}), 429 if reason in ('wait', 'too_many', 'paused') else 400
            if self.channel != 'prod' and email.endswith(TEST_EMAIL_DOMAIN):
                # Beta and laptops: test addresses get the code back instead of an email.
                return jsonify({'ok': True, 'dev_code': code})
            if self.dev_codes():
                self.store.forget_code(email)
                return jsonify({'ok': False, 'reason': 'unavailable'}), 503
            if not self.send_code(email, code, data.get('lang') or 'en'):
                self.store.forget_code(email)
                return jsonify({'ok': False, 'reason': 'send_failed'}), 502
            logger.info('Sign-in code emailed')
            return jsonify({'ok': True})

        @app.route('/api/auth/email/verify', methods=['POST'])
        def email_verify():
            if not self.same_origin():
                return jsonify({'ok': False, 'reason': 'forbidden'}), 403
            data = self.body()
            account, reason = self.store.check_code(data.get('email'), data.get('code'), ip=self.client_ip())
            if not account:
                return jsonify({'ok': False, 'reason': reason}), 429 if reason == 'paused' else 400
            token = self.store.start_session(account['id'])
            logger.info('Host signed in with an email code')
            response = make_response(jsonify({'ok': True, **self.account_reply(account)}))
            return self.set_session_cookie(response, token)

        @app.route('/api/auth/google/start', methods=['GET'])
        def google_start():
            popup = request.args.get('popup') == '1'
            return_to = self.safe_return(request.args.get('return'))
            if not google_configured():
                return self.finish_page(False, return_to, popup)
            verifier = secrets.token_urlsafe(48)
            state = secrets.token_urlsafe(24)
            nonce = secrets.token_urlsafe(24)
            challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip('=')
            params = urllib.parse.urlencode({
                'client_id': os.environ.get('GOOGLE_CLIENT_ID'),
                'redirect_uri': self.redirect_uri(),
                'response_type': 'code',
                'scope': 'openid email profile',
                'state': state,
                'nonce': nonce,
                'code_challenge': challenge,
                'code_challenge_method': 'S256',
                'prompt': 'select_account',
            })
            response = redirect(f'{GOOGLE_AUTH_URL}?{params}')
            response.set_cookie(self.google_cookie, self._sign({
                'state': state, 'nonce': nonce, 'verifier': verifier, 'popup': popup,
                'return': return_to, 'at': time.time(),
            }), max_age=GOOGLE_STATE_TTL, httponly=True, secure=self.secure_cookies(), samesite='Lax', path='/api/auth/google')
            return response

        @app.route('/api/auth/google/callback', methods=['GET'])
        def google_callback():
            saved = self._unsign(request.cookies.get(self.google_cookie, '')) or {}
            popup, return_to = bool(saved.get('popup')), self.safe_return(saved.get('return'))

            def fail(why):
                logger.info(f'Google sign-in did not finish: {why}')
                response = self.finish_page(False, return_to, popup)
                response.delete_cookie(self.google_cookie, path='/api/auth/google')
                return response

            if not saved or time.time() - saved.get('at', 0) > GOOGLE_STATE_TTL:
                return fail('no saved state')
            if not secrets.compare_digest(str(request.args.get('state', '')).encode(), str(saved.get('state', '')).encode()):
                return fail('state mismatch')
            if request.args.get('error') or not request.args.get('code'):
                return fail(request.args.get('error') or 'no code')
            try:
                tokens = self.fetch_google_token(request.args['code'], saved['verifier'])
            except Exception as exc:
                return fail(f'token exchange {type(exc).__name__}')
            claims = self.id_token_claims(tokens.get('id_token')) if isinstance(tokens, dict) else None
            if not claims:
                return fail('no id token')
            if (claims.get('iss') not in GOOGLE_ISSUERS
                    or claims.get('aud') != os.environ.get('GOOGLE_CLIENT_ID')
                    or float(claims.get('exp', 0)) < time.time()
                    or claims.get('nonce') != saved.get('nonce')
                    or not claims.get('sub')):
                return fail('claims rejected')
            account = self.store.account_for_google(
                str(claims['sub']), claims.get('email'), claims.get('email_verified') is True, claims.get('given_name'))
            token = self.store.start_session(account['id'])
            logger.info('Host signed in with Google')
            response = self.finish_page(True, return_to, popup)
            response.delete_cookie(self.google_cookie, path='/api/auth/google')
            return self.set_session_cookie(response, token)

        @app.route('/api/account/adopt', methods=['POST'])
        def account_adopt():
            if not self.same_origin():
                return jsonify({'ok': False, 'reason': 'forbidden'}), 403
            account, _, _ = self.current_account()
            if not account:
                return jsonify({'ok': False, 'reason': 'signed_out'}), 401
            device_id = self.body().get('device_id')
            moved = 0
            if isinstance(device_id, str) and DEVICE_ID_RE.match(device_id):
                moved = self.lists.adopt_lists(device_id, owner_key(account['id']))
            if moved:
                logger.info(f'Moved {moved} saved list(s) from a browser into an account')
            return jsonify({'ok': True, 'moved': moved})

        @app.route('/api/account/lists', methods=['GET'])
        def account_lists():
            account, _, _ = self.current_account()
            if not account:
                return jsonify({'ok': False, 'reason': 'signed_out'}), 401
            response = make_response(jsonify({'ok': True, 'lists': self.lists.get_player_task_lists(owner_key(account['id']))}))
            response.headers['Cache-Control'] = 'no-store'
            return response

        @app.route('/api/account/ticket', methods=['POST'])
        def account_ticket():
            if not self.same_origin():
                return jsonify({'ok': False, 'reason': 'forbidden'}), 403
            account, _, _ = self.current_account()
            if not account:
                return jsonify({'ok': False, 'reason': 'signed_out'}), 401
            return jsonify({'ok': True, 'ticket': self.store.make_ticket(account['id'])})

        @app.route('/api/auth/sign-out', methods=['POST'])
        def sign_out():
            if not self.same_origin():
                return jsonify({'ok': False, 'reason': 'forbidden'}), 403
            self.store.end_session(request.cookies.get(self.cookie_name))
            response = make_response(jsonify({'ok': True}))
            response.delete_cookie(self.cookie_name, path='/')
            return response

        @app.route('/api/account/delete', methods=['POST'])
        def account_delete():
            if not self.same_origin():
                return jsonify({'ok': False, 'reason': 'forbidden'}), 403
            account, _, _ = self.current_account()
            if not account:
                return jsonify({'ok': False, 'reason': 'signed_out'}), 401
            self.lists.release_owner(owner_key(account['id']))
            self.store.delete(account['id'])
            if self.on_account_deleted:
                self.on_account_deleted(account['id'])
            logger.info('An account was deleted')
            response = make_response(jsonify({'ok': True}))
            response.delete_cookie(self.cookie_name, path='/')
            return response

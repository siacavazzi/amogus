"""Optional host accounts: email codes, Google, the 90-day cookie, and lists that follow the host."""

import base64
import json
import os
import shutil
import tempfile
import time
import unittest
from unittest import mock

from server.tests.integration_helpers import server_app
from assets import accounts as accounts_module
from assets.accounts import AccountStore, owner_key
from assets.task_list_manager import TaskListManager


def fake_id_token(claims):
    def part(data):
        return base64.urlsafe_b64encode(json.dumps(data).encode()).decode().rstrip('=')
    return f"{part({'alg': 'RS256'})}.{part(claims)}.sig"


class AccountTestCase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.store = AccountStore(os.path.join(self.tmp, 'data'))
        self.lists = TaskListManager(os.path.join(self.tmp, 'task_lists'))
        self.routes = server_app.auth_routes
        self.saved = (server_app.account_store, server_app.task_list_manager, self.routes.store,
                      self.routes.lists, self.routes.send_code, self.routes.fetch_google_token, self.routes.channel)
        server_app.account_store = self.store
        server_app.task_list_manager = self.lists
        self.routes.store = self.store
        self.routes.lists = self.lists
        self.sent = []
        self.routes.send_code = lambda to, code, lang='en': self.sent.append((to, code, lang)) or True
        self.routes.channel = 'prod'
        self.env = mock.patch.dict(os.environ, {'RESEND_API_KEY': 'test', 'GOOGLE_CLIENT_ID': 'gid', 'GOOGLE_CLIENT_SECRET': 'gsecret'})
        self.env.start()
        server_app.account_by_sid.clear()
        self.http = server_app.app.test_client()

    def tearDown(self):
        self.env.stop()
        (server_app.account_store, server_app.task_list_manager, self.routes.store,
         self.routes.lists, self.routes.send_code, self.routes.fetch_google_token, self.routes.channel) = self.saved
        server_app.account_by_sid.clear()
        shutil.rmtree(self.tmp, ignore_errors=True)

    def sign_in(self, http, email='host@susparty.test'):
        http.post('/api/auth/email/start', json={'email': email})
        code = self.sent[-1][1]
        return http.post('/api/auth/email/verify', json={'email': email, 'code': code})

    def sign_in_again(self, http, email='host@susparty.test'):
        """A second browser signing in to the same account (skips the 30 s gap between codes)."""
        account = self.store.account_for_email(email)
        http.set_cookie('sp_session', self.store.start_session(account['id']))

    def socket(self, http=None):
        return server_app.socketio.test_client(server_app.app, flask_test_client=http)

    def my_lists(self, client, player_id):
        client.get_received()
        client.emit('get_my_task_lists', {'player_id': player_id})
        events = [e for e in client.get_received() if e['name'] == 'my_task_lists']
        if not events:
            return None
        return [item['code'] for item in events[-1]['args'][0]['lists']]

    def make_list(self, client, player_id, name='Party'):
        client.get_received()
        client.emit('create_task_list', {'player_id': player_id, 'name': name,
                                         'tasks': [{'task': 'Water the plant', 'location': 'Kitchen'}],
                                         'locations': ['Kitchen', 'Garden']})
        created = [e for e in client.get_received() if e['name'] == 'task_list_created']
        return created[-1]['args'][0]['task_list']['code']


class EmailCodeTests(AccountTestCase):
    def test_a_host_signs_in_with_a_four_digit_code_and_stays_signed_in(self):
        start = self.http.post('/api/auth/email/start', json={'email': ' Host@Example.org ', 'lang': 'sv'})
        self.assertEqual(200, start.status_code)
        to, code, lang = self.sent[-1]
        self.assertEqual(('host@example.org', 'sv'), (to, lang))
        self.assertRegex(code, r'^\d{4}$')
        self.assertNotIn('dev_code', start.get_json())

        verify = self.http.post('/api/auth/email/verify', json={'email': 'host@example.org', 'code': code})
        self.assertTrue(verify.get_json()['ok'])
        cookie = verify.headers['Set-Cookie']
        self.assertIn('sp_session=', cookie)
        self.assertIn('HttpOnly', cookie)
        self.assertIn('Max-Age=7776000', cookie)  # 90 days
        self.assertIn('SameSite=Lax', cookie)

        me = self.http.get('/api/account').get_json()
        self.assertEqual('host@example.org', me['account']['email'])
        self.assertTrue(me['google'] and me['email'])

        # A code works once.
        again = self.http.post('/api/auth/email/verify', json={'email': 'host@example.org', 'code': code})
        self.assertEqual('no_code', again.get_json()['reason'])

    def test_three_tries_per_code(self):
        self.http.post('/api/auth/email/start', json={'email': 'a@b.co'})
        code = self.sent[-1][1]
        wrong = '0000' if code != '0000' else '1111'
        reasons = [self.http.post('/api/auth/email/verify', json={'email': 'a@b.co', 'code': wrong}).get_json()['reason']
                   for _ in range(3)]
        self.assertEqual(['wrong', 'wrong', 'used_up'], reasons)
        late = self.http.post('/api/auth/email/verify', json={'email': 'a@b.co', 'code': code}).get_json()
        self.assertEqual('no_code', late['reason'])

    def test_limits_on_new_codes_and_wrong_guesses(self):
        now = [1000.0]
        with mock.patch.object(accounts_module.time, 'time', lambda: now[0]):
            self.assertIsNotNone(self.store.request_code('x@y.co')[0])
            self.assertEqual('wait', self.store.request_code('x@y.co')[1])
            for _ in range(9):
                now[0] += 31
                self.assertIsNotNone(self.store.request_code('x@y.co')[0])
            now[0] += 31
            self.assertEqual('too_many', self.store.request_code('x@y.co')[1])  # 10 a day
            now[0] += 24 * 3600
            self.assertIsNotNone(self.store.request_code('x@y.co')[0])

            # Nine wrong guesses in a day pause the address, even with the right code.
            for _ in range(3):
                for _ in range(3):
                    self.store.check_code('x@y.co', 'abcd')
                now[0] += 31
                code, reason = self.store.request_code('x@y.co')
            self.assertEqual('paused', reason)
            self.assertEqual('paused', self.store.check_code('x@y.co', '1234')[1])

    def test_codes_expire_after_ten_minutes(self):
        now = [5000.0]
        with mock.patch.object(accounts_module.time, 'time', lambda: now[0]):
            code, _ = self.store.request_code('late@y.co')
            now[0] += 601
            self.assertEqual('no_code', self.store.check_code('late@y.co', code)[1])

    def test_a_failed_send_does_not_use_up_the_limits(self):
        self.routes.send_code = lambda *args, **kwargs: False
        reply = self.http.post('/api/auth/email/start', json={'email': 'a@b.co'})
        self.assertEqual('send_failed', reply.get_json()['reason'])
        self.routes.send_code = lambda to, code, lang='en': self.sent.append((to, code, lang)) or True
        self.assertEqual(200, self.http.post('/api/auth/email/start', json={'email': 'a@b.co'}).status_code)

    def test_other_sites_cannot_post(self):
        reply = self.http.post('/api/auth/email/start', json={'email': 'a@b.co'}, headers={'Origin': 'https://evil.example'})
        self.assertEqual(403, reply.status_code)
        self.assertEqual([], self.sent)

    def test_off_prod_test_addresses_get_their_code_back_without_email(self):
        self.routes.channel = 'beta'
        with mock.patch.dict(os.environ, {'RESEND_API_KEY': ''}):
            ok = self.http.post('/api/auth/email/start', json={'email': 'e2e-1@example.com'}).get_json()
            self.assertRegex(ok['dev_code'], r'^\d{4}$')
            real = self.http.post('/api/auth/email/start', json={'email': 'someone@gmail.com'})
            self.assertEqual(503, real.status_code)
            self.routes.channel = 'prod'
            self.assertFalse(self.http.get('/api/account').get_json()['email'])
        self.assertEqual([], self.sent)

    def test_sign_out_ends_the_session(self):
        self.sign_in(self.http)
        self.http.post('/api/auth/sign-out')
        self.assertIsNone(self.http.get('/api/account').get_json()['account'])

    def test_sessions_last_ninety_days_and_renew_when_used(self):
        now = [10_000.0]
        with mock.patch.object(accounts_module.time, 'time', lambda: now[0]):
            account = self.store.account_for_email('a@b.co')
            token = self.store.start_session(account['id'])
            now[0] += 80 * 24 * 3600
            self.assertTrue(self.store.session_account(token, renew=True)[1])
            now[0] += 80 * 24 * 3600
            self.assertIsNotNone(self.store.session_account(token)[0])
            now[0] += 91 * 24 * 3600
            self.assertIsNone(self.store.session_account(token)[0])


class GoogleTests(AccountTestCase):
    def google_sign_in(self, http, claims):
        start = http.get('/api/auth/google/start?popup=1&return=/play')
        self.assertEqual(302, start.status_code)
        location = start.headers['Location']
        self.assertIn('accounts.google.com', location)
        self.assertIn('code_challenge_method=S256', location)
        from urllib.parse import parse_qs, urlparse
        query = parse_qs(urlparse(location).query)
        state, nonce = query['state'][0], query['nonce'][0]
        self.routes.fetch_google_token = lambda code, verifier: {'id_token': fake_id_token({
            'iss': 'https://accounts.google.com', 'aud': 'gid', 'exp': time.time() + 300, 'nonce': nonce, **claims})}
        return http.get(f'/api/auth/google/callback?state={state}&code=abc')

    def test_google_signs_in_and_merges_with_the_same_email(self):
        self.sign_in(self.http, 'pat@gmail.com')
        email_account = self.http.get('/api/account').get_json()['account']

        browser = server_app.app.test_client()
        page = self.google_sign_in(browser, {'sub': 'g-1', 'email': 'pat@gmail.com', 'email_verified': True, 'given_name': 'Pat'})
        self.assertIn(b'sus-sign-in', page.data)
        account = browser.get('/api/account').get_json()['account']
        self.assertEqual(email_account['id'], account['id'])
        self.assertTrue(account['google'])
        self.assertEqual('Pat', account['name'])

    def test_bad_state_or_wrong_audience_is_refused(self):
        browser = server_app.app.test_client()
        start = browser.get('/api/auth/google/start')
        refused = browser.get('/api/auth/google/callback?state=nope&code=abc')
        self.assertIn(b'did not finish', refused.data)
        self.assertIsNone(browser.get('/api/account').get_json()['account'])

        page = self.google_sign_in(browser, {'sub': 'g-2', 'email': 'x@gmail.com', 'email_verified': True, 'aud': 'someone-else'})
        self.assertIn(b'did not finish', page.data)
        self.assertIsNone(browser.get('/api/account').get_json()['account'])
        self.assertEqual(302, start.status_code)

    def test_unverified_google_email_never_joins_an_email_account(self):
        self.sign_in(self.http, 'pat@gmail.com')
        browser = server_app.app.test_client()
        self.google_sign_in(browser, {'sub': 'g-3', 'email': 'pat@gmail.com', 'email_verified': False})
        account = browser.get('/api/account').get_json()['account']
        self.assertNotEqual(self.http.get('/api/account').get_json()['account']['id'], account['id'])

    def test_return_path_stays_on_this_site(self):
        self.assertEqual('/account', self.routes.safe_return('https://evil.example'))
        self.assertEqual('/account', self.routes.safe_return('//evil.example'))
        self.assertEqual('/play?x=1', self.routes.safe_return('/play?x=1'))
        self.assertEqual('/account', self.routes.safe_return('/</script><script>alert(1)</script>'))
        self.assertEqual('/account', self.routes.safe_return('/play"onload'))

    def test_the_return_page_cannot_be_broken_out_of(self):
        browser = server_app.app.test_client()
        browser.get('/api/auth/google/start?return=/%3C/script%3E%3Cscript%3Ealert(1)%3C/script%3E')
        page = browser.get('/api/auth/google/callback?state=nope&code=abc')
        self.assertNotIn(b'<script>alert', page.data)
        self.assertIn(b'"/account"', page.data)


class ListOwnershipTests(AccountTestCase):
    def test_signing_in_moves_this_browsers_lists_into_the_account(self):
        phone = self.socket()
        code = self.make_list(phone, 'device_phone123')
        self.assertEqual([code], self.my_lists(phone, 'device_phone123'))

        self.sign_in(self.http)
        moved = self.http.post('/api/account/adopt', json={'device_id': 'device_phone123'}).get_json()
        self.assertEqual(1, moved['moved'])

        # A laptop signed in to the same account sees the list, whatever id its page sends.
        laptop_http = server_app.app.test_client()
        self.sign_in_again(laptop_http)
        laptop = self.socket(laptop_http)
        self.assertEqual([code], self.my_lists(laptop, 'device_laptop999'))
        # and can edit it, because the account now owns it.
        laptop.emit('update_task_list', {'code': code, 'updates': {'name': 'Renamed'}})
        self.assertEqual('Renamed', self.lists.get_task_list(code)['name'])
        # The old browser id no longer owns it.
        self.assertEqual([], self.my_lists(phone, 'device_phone123'))

    def test_an_open_socket_signs_in_with_a_ticket(self):
        phone = self.socket()
        code = self.make_list(phone, 'device_abc1234')
        self.sign_in(self.http)
        self.http.post('/api/account/adopt', json={'device_id': 'device_abc1234'})
        ticket = self.http.post('/api/account/ticket').get_json()['ticket']
        self.assertTrue(phone.emit('bind_account', {'ticket': ticket}, callback=True)['ok'])
        self.assertEqual([code], self.my_lists(phone, 'device_other'))
        # Tickets work once.
        other = self.socket()
        self.assertFalse(other.emit('bind_account', {'ticket': ticket}, callback=True)['ok'])
        # Signing out on this page gives the socket back to the browser.
        phone.emit('unbind_account', {}, callback=True)
        self.assertEqual([], self.my_lists(phone, 'device_abc1234'))

    def test_a_signed_out_page_cannot_pose_as_an_account(self):
        self.sign_in(self.http)
        account = self.http.get('/api/account').get_json()['account']
        signed_in = self.socket(self.http)
        code = self.make_list(signed_in, 'ignored')
        stranger = self.socket()
        self.assertIsNone(self.my_lists(stranger, owner_key(account['id'])))
        stranger.emit('update_task_list', {'code': code, 'updates': {'name': 'Hacked'}, 'player_id': owner_key(account['id'])})
        stranger.emit('update_task_list', {'code': code, 'updates': {'name': 'Hacked'}})
        self.assertEqual('Party', self.lists.get_task_list(code)['name'])

    def test_deleting_the_account_forgets_it_but_lists_still_load_by_code(self):
        self.sign_in(self.http)
        host = self.socket(self.http)
        code = self.make_list(host, 'ignored')
        self.assertTrue(self.http.post('/api/account/delete').get_json()['ok'])
        self.assertIsNone(self.http.get('/api/account').get_json()['account'])
        self.assertIsNone(self.lists.get_task_list(code)['creator_id'])
        self.assertNotIn(code, json.dumps(self.lists.index['player_lists']))
        # A new sign-in with the same email starts a fresh, empty account.
        self.sign_in_again(self.http)
        fresh = self.socket(self.http)
        self.assertEqual([], self.my_lists(fresh, 'ignored'))



class StarAndDeleteListTests(AccountTestCase):
    def test_my_lists_stars_a_list_to_the_top_and_deletes_another(self):
        self.sign_in(self.http)
        host = self.socket(self.http)
        old = self.make_list(host, 'ignored', name='Old one')
        new = self.make_list(host, 'ignored', name='New one')
        self.lists.update_task_list(new, {'name': 'New one'})  # newest first by default
        lists = self.http.get('/api/account/lists').get_json()['lists']
        self.assertEqual([new, old], [item['code'] for item in lists])
        self.assertEqual([False, False], [item['starred'] for item in lists])

        self.assertTrue(self.http.post('/api/account/lists/star', json={'code': old.lower(), 'starred': True}).get_json()['ok'])
        lists = self.http.get('/api/account/lists').get_json()['lists']
        self.assertEqual([(old, True), (new, False)], [(item['code'], item['starred']) for item in lists])
        # The game setup screen sees the same order.
        self.assertEqual([old, new], self.my_lists(host, 'ignored'))

        self.assertTrue(self.http.post('/api/account/lists/remove', json={'code': old}).get_json()['ok'])
        self.assertEqual([new], [item['code'] for item in self.http.get('/api/account/lists').get_json()['lists']])
        self.assertNotIn(old, json.dumps(self.lists.index.get('starred', {})))
        # The code still loads for anyone who has it.
        self.assertIsNotNone(self.lists.get_task_list(old))

    def test_only_your_own_lists_and_only_signed_in(self):
        stranger_list = self.make_list(self.socket(), 'device_someone1')
        self.assertEqual(401, self.http.post('/api/account/lists/star', json={'code': stranger_list, 'starred': True}).status_code)
        self.sign_in(self.http)
        self.assertEqual(404, self.http.post('/api/account/lists/star', json={'code': stranger_list, 'starred': True}).status_code)
        self.assertEqual(404, self.http.post('/api/account/lists/remove', json={'code': stranger_list}).status_code)
        self.assertEqual(400, self.http.post('/api/account/lists/remove', json={'code': 5}).status_code)
        self.assertIn(stranger_list, self.lists.index['player_lists']['device_someone1'])

    def test_a_signed_out_browser_stars_at_setup_and_the_star_follows_it_into_the_account(self):
        phone = self.socket()
        first = self.make_list(phone, 'device_phone123', name='First')
        second = self.make_list(phone, 'device_phone123', name='Second')
        phone.get_received()
        phone.emit('star_task_list', {'player_id': 'device_phone123', 'code': first, 'starred': True})
        reply = [e for e in phone.get_received() if e['name'] == 'my_task_lists'][-1]['args'][0]
        self.assertEqual([first, second], [item['code'] for item in reply['lists']])
        self.assertTrue(reply['lists'][0]['starred'])

        self.sign_in(self.http)
        self.http.post('/api/account/adopt', json={'device_id': 'device_phone123'})
        lists = self.http.get('/api/account/lists').get_json()['lists']
        self.assertEqual([(first, True), (second, False)], [(item['code'], item['starred']) for item in lists])

        # Unstarring puts it back in date order.
        self.http.post('/api/account/lists/star', json={'code': first, 'starred': False})
        lists = self.http.get('/api/account/lists').get_json()['lists']
        self.assertEqual([False, False], [item['starred'] for item in lists])

if __name__ == '__main__':
    unittest.main()

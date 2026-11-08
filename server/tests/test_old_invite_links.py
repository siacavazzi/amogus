import tempfile
import time

from server.tests.integration_helpers import SocketGameTestCase, server_app
from assets.game_links import GameLinks, MAX_AGE_SECONDS
from assets.task_list_manager import TaskListManager


class OldInviteLinkTests(SocketGameTestCase):
    """Groups come back by reopening the invite link in their group chat, weeks after the room
    closed. Room codes are 4 letters from 9 (6,561 codes) and get reused, so only the game's own
    token, which rides on its links, brings back its tasks."""

    def setUp(self):
        super().setUp()
        self.storage = tempfile.TemporaryDirectory()
        self.original_manager = server_app.task_list_manager
        server_app.task_list_manager = TaskListManager(self.storage.name)

    def tearDown(self):
        server_app.task_list_manager = self.original_manager
        self.storage.cleanup()
        super().tearDown()

    def entry_error(self, client):
        errors = [e for e in self.event_payloads(self.drain(client), 'error') if e.get('scope') == 'room_entry']
        self.assertEqual(1, len(errors))
        return errors[0]

    def play_and_close(self, player_count=4):
        clients, room, ids, game = self.setup_started_game(player_count)
        token, tasks = game.link_token, [task['task'] for task in game.collaborative_tasks]
        server_app.game_manager.delete_game(room)
        return room, token, tasks

    def test_lobby_state_hands_out_the_token_for_links(self):
        clients, room, ids, game = self.setup_lobby(3)
        self.assertTrue(game.link_token)
        self.assertEqual(game.link_token, server_app.lobby_state(game)['link_token'])

    def test_an_old_link_brings_back_the_games_tasks(self):
        room, token, tasks = self.play_and_close()
        phone = self.make_client()
        phone.emit('join_game', {'room_code': room, 'entry_method': 'share_link', 'link_token': token})
        error = self.entry_error(phone)
        self.assertEqual('game_ended', error['code'])
        saved = server_app.task_list_manager.get_task_list(error['saved_game']['code'])
        self.assertEqual(tasks, [task['task'] for task in saved['tasks']])
        self.assertEqual(len(tasks), error['saved_game']['task_count'])

        # The second friend who opens it gets the same list, not another copy.
        again = self.make_client()
        again.emit('join_game', {'room_code': room, 'entry_method': 'share_link', 'link_token': token})
        self.assertEqual(error['saved_game']['code'], self.entry_error(again)['saved_game']['code'])

    def test_a_reused_code_never_joins_another_groups_room(self):
        room, token, _ = self.play_and_close()
        clients, new_room, ids, game = self.setup_lobby(3)
        phone = self.make_client()
        phone.emit('join_game', {'room_code': new_room, 'entry_method': 'share_link', 'link_token': token})
        self.assertEqual('game_ended', self.entry_error(phone)['code'])
        self.assertEqual(3, len(game.players))

    def test_a_live_link_with_its_token_joins_as_usual(self):
        clients, room, ids, game = self.setup_lobby(3)
        phone = self.make_client()
        phone.emit('join_game', {'room_code': room, 'entry_method': 'share_link', 'link_token': game.link_token})
        self.assertTrue(self.has_event(self.drain(phone), 'game_joined'))

    def test_a_guessed_code_gets_nothing(self):
        room, token, _ = self.play_and_close()
        typed = self.make_client()
        typed.emit('join_game', {'room_code': room, 'entry_method': 'typed'})
        self.assertEqual('room_not_found', self.entry_error(typed)['code'])
        guessed = self.make_client()
        guessed.emit('join_game', {'room_code': room, 'entry_method': 'share_link', 'link_token': 'notTheToken123'})
        error = self.entry_error(guessed)
        self.assertEqual('game_ended', error['code'])
        self.assertIsNone(error['saved_game'])

    def test_a_link_from_before_tokens_offers_a_new_game(self):
        phone = self.make_client()
        phone.emit('join_game', {'room_code': 'RSJO', 'entry_method': 'invite_link'})
        error = self.entry_error(phone)
        self.assertEqual('game_ended', error['code'])
        self.assertIsNone(error['saved_game'])

    def test_test_rounds_are_not_kept(self):
        clients, room, ids, game = self.setup_lobby(2)
        self.add_tasks(clients[0], room, 10)
        self.drain_all(clients)
        clients[0].emit('start_game', {'player_id': ids[0], 'test_mode': True})
        self.assertTrue(game.game_running and game.test_mode)
        self.drain_all(clients)
        self.assertIsNone(server_app.game_links.lookup(game.link_token))


class GameLinksStoreTests(SocketGameTestCase):
    def test_records_survive_a_restart_and_expire_after_90_days(self):
        with tempfile.TemporaryDirectory() as folder:
            path = f'{folder}/links.json'
            now = time.time()
            GameLinks(path).remember('tokenAAAAAAA', [{'task': 'Sweep', 'location': 'Hall'}], ['Hall'], 5, now=now)
            reloaded = GameLinks(path)
            self.assertEqual('Sweep', reloaded.lookup('tokenAAAAAAA', now=now)['tasks'][0]['task'])
            self.assertIsNone(reloaded.lookup('tokenAAAAAAA', now=now + MAX_AGE_SECONDS + 1))

    def test_bad_tokens_are_ignored(self):
        with tempfile.TemporaryDirectory() as folder:
            links = GameLinks(f'{folder}/links.json')
            links.remember('../etc', [{'task': 'Sweep', 'location': 'Hall'}], ['Hall'], 5)
            self.assertEqual({}, links.links)
            self.assertIsNone(links.lookup(None))

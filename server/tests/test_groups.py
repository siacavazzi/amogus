import json
import tempfile
import time

from server.tests.integration_helpers import SocketGameTestCase, server_app
from assets.groups import GroupBook, MAX_AGE_SECONDS
from assets.stats_tracker import StatsTracker


class GroupLinkTests(SocketGameTestCase):
    """Groups come back from links in their group chat. Each room started from a group's link
    joins that group, so the group's score carries on and the log can count returning groups,
    with no ID for any person or phone."""

    def lobby_from_link(self, player_count, token, via='old_link'):
        clients = [self.make_client() for _ in range(player_count)]
        clients[0].emit('create_game', {'group_link': token, 'group_via': via})
        room = self.first_event(self.drain(clients[0]), 'game_created')['room_code']
        clients[0].emit('open_room', {'room_code': room})
        self.drain(clients[0])
        ids = []
        for index, client in enumerate(clients):
            ids.append(self.join_player(client, room, f'P{index}', use_join_game=index > 0))
            self.drain_all([other for other in clients if other is not client])
        return clients, room, ids, server_app.game_manager.get_game(room)

    def start(self, clients, room, ids):
        self.add_tasks(clients[0], room, 12)
        self.drain_all(clients)
        self.start_game(clients[0], ids[0], clients)

    def end_round(self, game, result='victory'):
        game.end_state = result
        game.end_time = time.time()
        game.emit_to_room('end_game', {'result': result, 'stats': game.stats})

    def entry_error(self, client):
        errors = [e for e in self.event_payloads(self.drain(client), 'error') if e.get('scope') == 'room_entry']
        self.assertEqual(1, len(errors))
        return errors[0]

    def test_a_room_started_from_a_link_joins_that_group_and_keeps_its_score(self):
        clients, room, ids, first = self.setup_started_game(4)
        group = first.group_id
        self.end_round(first, 'victory')
        server_app.game_manager.delete_game(room)
        self.assertEqual({'rooms': 1, 'rounds': 1, 'crew_wins': 1, 'intruder_wins': 0},
                         {k: v for k, v in server_app.group_book.recap(group).items() if k in ('rooms', 'rounds', 'crew_wins', 'intruder_wins')})
        self.assertIsNone(first.group_return['hours_since_last'])

        # Two days later anyone in the group opens the old link and starts the next game.
        server_app.group_book.groups[group]['last_played'] -= 2 * 24 * 3600
        clients, room, ids, second = self.lobby_from_link(3, first.link_token)
        self.assertEqual(group, second.group_id)
        self.assertEqual('old_link', second.group_via)
        self.start(clients, room, ids)
        self.assertTrue(second.group_return['returning'])
        self.assertEqual(1, second.group_return['rooms_before'])
        self.end_round(second, 'sus_victory')
        recap = server_app.group_book.recap(group)
        self.assertEqual((2, 2, 1, 1), (recap['rooms'], recap['rounds'], recap['crew_wins'], recap['intruder_wins']))

        # The second room's own link still belongs to the same group.
        self.assertEqual(group, server_app.game_links.group_of(second.link_token))

    def test_a_same_evening_new_room_is_not_a_return(self):
        clients, room, ids, first = self.setup_started_game(3)
        self.end_round(first)
        server_app.game_manager.delete_game(room)
        clients, room, ids, second = self.lobby_from_link(3, first.link_token, via='saved_link')
        self.start(clients, room, ids)
        self.assertFalse(second.group_return['returning'])

    def test_an_unknown_token_starts_a_new_group(self):
        clients = [self.make_client()]
        clients[0].emit('create_game', {'group_link': 'notAToken1234', 'group_via': 'old_link'})
        room = self.first_event(self.drain(clients[0]), 'game_created')['room_code']
        game = server_app.game_manager.get_game(room)
        self.assertEqual(game.link_token, game.group_id)
        self.assertIsNone(game.group_via)

    def test_test_games_do_not_count(self):
        clients, room, ids, game = self.setup_lobby(2)
        self.add_tasks(clients[0], room, 10)
        self.drain_all(clients)
        clients[0].emit('start_game', {'player_id': ids[0], 'test_mode': True})
        self.drain_all(clients)
        self.assertTrue(game.test_mode)
        self.end_round(game)
        self.assertIsNone(server_app.group_book.recap(game.group_id))

    def test_an_old_link_shows_the_score_and_joins_the_room_a_friend_started(self):
        clients, room, ids, first = self.setup_started_game(4)
        self.end_round(first, 'sus_victory')
        server_app.game_manager.delete_game(room)

        phone = self.make_client()
        phone.emit('join_game', {'room_code': room, 'entry_method': 'share_link', 'link_token': first.link_token})
        error = self.entry_error(phone)
        self.assertEqual(first.link_token, error['group_link'])
        self.assertEqual(1, error['group_recap']['intruder_wins'])
        self.assertIsNone(error['group_room'])

        # A friend starts the next game from the link. The next friend's link goes to that room.
        clients, new_room, ids, second = self.lobby_from_link(3, first.link_token)
        late = self.make_client()
        late.emit('join_game', {'room_code': room, 'entry_method': 'share_link', 'link_token': first.link_token})
        error = self.entry_error(late)
        self.assertEqual({'room_code': new_room, 'link_token': second.link_token}, error['group_room'])

        response = self.flask_app.test_client().post('/api/group', json={'g': first.link_token})
        body = response.get_json()
        self.assertEqual(new_room, body['room']['room_code'])
        self.assertEqual(1, body['recap']['rounds'])
        self.assertEqual('no-store', response.headers['Cache-Control'])

    def test_the_group_api_knows_nothing_without_a_real_token(self):
        client = self.flask_app.test_client()
        self.assertEqual({'recap': None, 'room': None}, client.post('/api/group', json={'g': 'nope'}).get_json())
        self.assertEqual({'recap': None, 'room': None}, client.post('/api/group', data='x').get_json())
        # Never in the address, which the web server logs with the IP.
        self.assertIn(client.get('/api/group?g=tokenAAAAAAA').status_code, (404, 405))

    def test_save_link_hands_out_the_games_token(self):
        clients, room, ids, game = self.setup_started_game(3)
        response = clients[0].emit('save_game_link', {'room_code': room, 'player_id': ids[0]}, callback=True)
        self.assertEqual(game.link_token, response['link_token'])


class GroupLogTests(SocketGameTestCase):
    def test_the_log_keeps_a_hash_of_the_group_never_the_token(self):
        with tempfile.TemporaryDirectory() as folder:
            tracker = StatsTracker(f'{folder}/stats.json')
            server_app.game_manager.stats_tracker = tracker
            clients, room, ids, game = self.setup_started_game(3)
            with open(tracker.events_path, encoding='utf-8') as f:
                text = f.read()
            started = [json.loads(line) for line in text.splitlines() if '"round_started"' in line][-1]
            self.assertEqual(server_app.group_book.log_id(game.group_id), started['group'])
            self.assertRegex(started['group'], r'^[0-9a-f]{12}$')
            self.assertFalse(started['group_return'])
            self.assertNotIn(game.link_token, text)
            self.assertNotIn(game.group_id, text)


class GroupBookStoreTests(SocketGameTestCase):
    def test_groups_survive_a_restart_and_are_forgotten_after_90_days(self):
        with tempfile.TemporaryDirectory() as folder:
            path = f'{folder}/groups.json'
            now = time.time()
            book = GroupBook(path)
            book.room_started('groupAAAAAAA', now=now)
            book.round_ended('groupAAAAAAA', 'meltdown_fail', now=now)
            reloaded = GroupBook(path)
            self.assertEqual(1, reloaded.recap('groupAAAAAAA', now=now)['intruder_wins'])
            self.assertIsNone(reloaded.recap('groupAAAAAAA', now=now + MAX_AGE_SECONDS + 1))
            old_log_id = reloaded.log_id('groupAAAAAAA')
            reloaded.room_started('groupBBBBBBB', now=now + MAX_AGE_SECONDS + 1)
            self.assertNotIn('groupAAAAAAA', reloaded.groups)
            # The salt went with it: the same link starts a new group whose log id doesn't match.
            self.assertIsNone(reloaded.log_id('groupAAAAAAA'))
            reloaded.room_started('groupAAAAAAA', now=now + MAX_AGE_SECONDS + 2)
            self.assertNotEqual(old_log_id, reloaded.log_id('groupAAAAAAA'))

    def test_bad_keys_are_ignored(self):
        with tempfile.TemporaryDirectory() as folder:
            book = GroupBook(f'{folder}/groups.json')
            self.assertIsNone(book.room_started('../etc'))
            self.assertIsNone(book.recap(None))
            self.assertEqual({}, book.groups)


class SavedGameLinkOpensRoomTests(SocketGameTestCase):
    """A "Save this game" link in the group chat: the first friend to open it hosts a new room
    with that game's tasks and settings, everyone after joins that room, and once that room is
    over the next tap opens a fresh one again."""

    def played_game(self):
        clients, room, ids, game = self.setup_started_game(4)
        game.end_state = 'victory'
        game.emit_to_room('end_game', {'result': 'victory', 'stats': game.stats})
        server_app.game_manager.delete_game(room)
        return game

    def open_link(self, client, token, create=True):
        return client.emit('open_saved_game', {'group_link': token, 'create': create}, callback=True)

    def test_first_tap_hosts_the_next_tap_joins_and_the_link_works_again_later(self):
        first = self.played_game()
        host = self.make_client()
        self.assertEqual({'action': 'created'}, self.open_link(host, first.link_token))
        room = self.first_event(self.drain(host), 'game_created')['room_code']
        game = server_app.game_manager.get_game(room)
        self.assertEqual(first.group_id, game.group_id)
        self.assertEqual('saved_link', game.group_via)

        # A friend taps while the host is still in setup: same room (they wait for it to open).
        friend = self.make_client()
        self.assertEqual({'action': 'join', 'room_code': room, 'link_token': game.link_token},
                         self.open_link(friend, first.link_token))
        self.assertEqual(1, len(server_app.game_manager.games))

        # The host closes the page in setup: the next tap opens a fresh room instead of a dead one.
        host.disconnect()
        later = self.make_client()
        self.assertEqual({'action': 'created'}, self.open_link(later, first.link_token))
        self.drain(later)

    def test_an_open_room_with_players_is_joined(self):
        first = self.played_game()
        clients, room, ids, game = GroupLinkTests.lobby_from_link(self, 3, first.link_token, via='saved_link')
        phone = self.make_client()
        self.assertEqual('join', self.open_link(phone, first.link_token)['action'])
        phone.emit('join_game', {'room_code': room, 'entry_method': 'saved_link', 'link_token': game.link_token})
        self.assertIsNotNone(self.first_event(self.drain(phone), 'game_joined'))

    def test_a_laptop_asks_first_and_creates_nothing(self):
        first = self.played_game()
        laptop = self.make_client()
        self.assertEqual({'action': 'none'}, self.open_link(laptop, first.link_token, create=False))
        self.assertEqual({}, server_app.game_manager.games)

    def test_a_page_already_back_in_a_room_stays_there(self):
        first = self.played_game()
        clients, room, ids, game = self.setup_lobby(3)
        self.assertEqual({'action': 'busy'}, self.open_link(clients[1], first.link_token))
        self.assertEqual(1, len(server_app.game_manager.games))

    def test_the_new_room_starts_with_the_saved_settings(self):
        clients, room, ids, game = self.setup_lobby(4)
        clients[0].emit('update_game_config', {'room_code': room, 'config': {'vote_time': 45, 'meltdown_time': 75, 'num_intruders': 1}})
        self.drain_all(clients)
        self.add_tasks(clients[0], room, 12)
        self.drain_all(clients)
        self.start_game(clients[0], ids[0], clients)
        token = game.link_token
        server_app.game_manager.delete_game(room)

        host = self.make_client()
        self.open_link(host, token)
        config = self.first_event(self.drain(host), 'game_config')
        self.assertEqual((45, 75, 1), (config['vote_time'], config['meltdown_time'], config['num_intruders']))

    def test_a_link_without_a_known_group_still_hosts(self):
        host = self.make_client()
        self.assertEqual({'action': 'created'}, self.open_link(host, None))
        room = self.first_event(self.drain(host), 'game_created')['room_code']
        game = server_app.game_manager.get_game(room)
        self.assertEqual(game.link_token, game.group_id)

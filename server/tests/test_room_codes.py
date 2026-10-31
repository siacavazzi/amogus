import random
import unittest
from unittest import mock

from tests.integration_helpers import SocketGameTestCase, server_app
from assets.room_codes import (
    ROOM_CODE_ALPHABET, LOOKALIKES, random_room_code, canonical_room_code, has_unused_letters,
)


# Letter groups people mix up on a screen or keyboard. Prod logs: EJOR/EJGR/EHQR/WJQR for EJQR, BAIT/BAJD for BAJT.
LOOKALIKE_GROUPS = ('OQGCD0', 'IJL1T7', 'B8RP', 'S5', 'Z2', 'UVW', 'VY', 'MN', 'HN', 'EF3', 'A4', 'KX')


class RoomCodeAlphabetTest(unittest.TestCase):
    def test_alphabet_has_at_most_one_letter_from_each_lookalike_group(self):
        for group in LOOKALIKE_GROUPS:
            used = [ch for ch in group if ch in ROOM_CODE_ALPHABET]
            self.assertLessEqual(len(used), 1, f'{group} has {used} in the alphabet')

    def test_codes_never_use_letters_from_the_prod_typos(self):
        for ch in 'OQGIJLBDS':
            self.assertNotIn(ch, ROOM_CODE_ALPHABET)

    def test_generated_codes_use_only_the_alphabet(self):
        random.seed(7)
        for _ in range(2000):
            code = random_room_code()
            self.assertEqual(len(code), 4)
            self.assertTrue(set(code) <= set(ROOM_CODE_ALPHABET), code)
            self.assertNotIn('TWAT', code)

    def test_generated_code_skips_codes_in_use(self):
        with mock.patch('assets.room_codes.random.choices', side_effect=[list('HEAR'), list('HEAR'), list('MYTH')]):
            self.assertEqual(random_room_code(taken={'HEAR'}), 'MYTH')

    def test_lookalikes_only_point_into_the_alphabet(self):
        for typed, meant in LOOKALIKES.items():
            self.assertNotIn(typed, ROOM_CODE_ALPHABET)
            self.assertIn(meant, ROOM_CODE_ALPHABET)

    def test_canonical_code_fixes_case_spacing_and_lookalikes(self):
        self.assertEqual(canonical_room_code('hear'), 'HEAR')
        self.assertEqual(canonical_room_code(' h-e a r '), 'HEAR')
        self.assertEqual(canonical_room_code('hf4p'), 'HEAR')
        self.assertEqual(canonical_room_code('7vme'), 'TYME')
        self.assertEqual(canonical_room_code(None), '')

    def test_unused_letters_are_spotted(self):
        self.assertTrue(has_unused_letters('EJQR'))
        self.assertFalse(has_unused_letters('hf4p'))


class RoomCodeJoinTest(SocketGameTestCase):
    def create_room_with_code(self, host, code):
        with mock.patch.object(server_app.game_manager, '_generate_room_code', return_value=code):
            return self.create_open_room(host)

    def test_new_rooms_get_codes_from_the_alphabet(self):
        host = self.make_client()
        room_code = self.create_open_room(host)
        self.assertTrue(set(room_code) <= set(ROOM_CODE_ALPHABET), room_code)

    def test_lowercase_and_lookalike_codes_join_the_right_room(self):
        host = self.make_client()
        room_code = self.create_room_with_code(host, 'HEAR')
        self.join_player(host, room_code, 'Host')

        for typed in ('hear', 'HFAR', 'h3ap', 'HE4R'):
            guest = self.make_client()
            guest.emit('join_game', {'room_code': typed})
            joined = self.first_event(self.drain(guest), 'game_joined')
            self.assertEqual(joined['room_code'], 'HEAR', typed)

            guest.emit('join', {'room_code': typed, 'username': f'Guest {typed}'})
            self.assertIsNotNone(self.first_event(self.drain(guest), 'player_id'), typed)

        game = server_app.game_manager.get_game('HEAR')
        self.assertEqual(len(game.players), 5)
        # The host's phone hears about guests who typed the code differently
        self.assertTrue(self.has_event(self.drain(host), 'game_data'))

    def test_exact_code_wins_over_lookalike(self):
        exact = self.make_client()
        self.create_room_with_code(exact, 'PEAR')
        other = self.make_client()
        self.create_room_with_code(other, 'REAR')

        guest = self.make_client()
        guest.emit('join_game', {'room_code': 'pear'})
        self.assertEqual(self.first_event(self.drain(guest), 'game_joined')['room_code'], 'PEAR')

    def test_unknown_code_with_unused_letters_says_which_letters_codes_use(self):
        guest = self.make_client()
        guest.emit('join_game', {'room_code': 'EJQR'})
        error = self.first_event(self.drain(guest), 'error')
        self.assertEqual(error['code'], 'room_not_found')
        self.assertIn('A E H M R T W X Y', error['message'])

    def test_unknown_code_from_the_alphabet_keeps_the_plain_message(self):
        guest = self.make_client()
        guest.emit('join_game', {'room_code': 'MYTH'})
        error = self.first_event(self.drain(guest), 'error')
        self.assertEqual(error['code'], 'room_not_found')
        self.assertNotIn('only use the letters', error['message'])


if __name__ == '__main__':
    unittest.main()

import unittest

from server.assets.card import DEFAULT_CARD_DECK_COUNTS, CardDeck
from server.assets.meltdown import Meltdown
from server.assets.player import Player
from server.assets.scaling import auto_intruder_count, meltdown_codes_needed, minimum_tasks
from server.tests.integration_helpers import SocketGameTestCase


def players(count, absent=0):
    made = [Player(sid=f's{i}', player_id=f'p{i}', username=f'P{i}', pic=0) for i in range(count)]
    for player in made[:absent]:
        player.absent = True
    return made


class ScalingRuleTests(unittest.TestCase):

    def test_auto_picks_one_intruder_per_five_players_with_no_upper_limit(self):
        expected = {3: 1, 7: 1, 8: 2, 12: 2, 13: 3, 20: 4, 40: 8, 100: 20}
        self.assertEqual(expected, {n: auto_intruder_count(n) for n in expected})

    def test_auto_always_leaves_enough_crew_to_start(self):
        for n in range(3, 200):
            self.assertGreaterEqual(n, auto_intruder_count(n) * 2 + 1, n)

    def test_meltdown_needs_at_most_eight_codes(self):
        self.assertEqual(1, meltdown_codes_needed(1, 0.6))
        self.assertEqual(6, meltdown_codes_needed(10, 0.6))
        self.assertEqual(8, meltdown_codes_needed(40, 0.6))
        self.assertEqual(8, meltdown_codes_needed(40, 1.0))

    def test_task_list_minimum_stops_at_sixty(self):
        self.assertEqual(10, minimum_tasks(2))
        self.assertEqual(30, minimum_tasks(10))
        self.assertEqual(60, minimum_tasks(20))
        self.assertEqual(60, minimum_tasks(40))

    def test_meltdown_for_forty_players_asks_for_eight_codes(self):
        meltdown = Meltdown(players(40), 60, None, None, 0.6)
        self.assertEqual(8, meltdown.codes_needed)

    def test_meltdown_leaves_out_phones_that_are_offline(self):
        # 10 living, 5 of them offline long enough to be absent: 60% of the 5 present.
        meltdown = Meltdown(players(10, absent=5), 60, None, None, 0.6)
        self.assertEqual(3, meltdown.codes_needed)
        # Everyone still gets a code, so a phone that comes back can still help.
        self.assertEqual(10, len(meltdown.valid_pins))


class FakeGame:
    # A custom deck has fixed counts; the default deck adds a random extra Area Denial per room.
    card_deck_preset = 'custom'
    card_deck_counts = DEFAULT_CARD_DECK_COUNTS

    def __init__(self, intruders=1):
        self.has_reactor = True
        self.numIntruders = intruders
        self.players = []


class CardDeckScalingTests(unittest.TestCase):

    def test_deck_grows_with_intruders(self):
        one = len(CardDeck(['Kitchen', 'Yard'], None, FakeGame(1)).cards)
        self.assertEqual(one, len(CardDeck(['Kitchen', 'Yard'], None, FakeGame(3)).cards))
        self.assertEqual(one * 3, len(CardDeck(['Kitchen', 'Yard'], None, FakeGame(8)).cards))

    def test_a_card_in_a_hand_is_never_dealt_again(self):
        game = FakeGame(1)
        game.players = players(2)
        deck = CardDeck(['Kitchen', 'Yard'], None, game)
        while deck.cards:
            card = deck.draw_card()
            game.players[0].cards.append(card)
        self.assertIsNone(deck.draw_card(), 'every card is in a hand')

        played = game.players[0].cards.pop()
        redrawn = deck.draw_card()
        self.assertIs(played, redrawn, 'only the played card comes back')
        game.players[1].cards.append(redrawn)
        self.assertIsNone(deck.draw_card())


class PlayerCountRoomTests(SocketGameTestCase):

    def test_new_rooms_are_on_auto(self):
        host = self.make_client()
        room = self.create_open_room(host)
        host.emit('get_game_config', {'room_code': room})
        self.assertEqual('auto', self.first_event(self.drain(host), 'game_config')['num_intruders'])

    def test_auto_deals_two_intruders_to_eight_players(self):
        clients, room, ids, game = self.setup_started_game(8)
        self.assertTrue(game.game_running)
        self.assertEqual(2, len(self.intruders(game)))

    def test_forty_players_start_with_eight_intruders_on_sixty_tasks(self):
        clients, room, ids, game = self.setup_started_game(40, task_count=60)
        self.assertTrue(game.game_running)
        self.assertEqual(8, len(self.intruders(game)))
        self.assertEqual(32, game.numCrew)
        # Every intruder was dealt a full starting hand from the bigger deck.
        self.assertTrue(all(len(intruder.cards) == game.starting_cards for intruder in self.intruders(game)))

    def test_lobby_shows_the_auto_count_as_people_join(self):
        clients, room, ids, game = self.setup_lobby(12)
        late = self.make_client()
        self.join_player(late, room, 'Late')
        lobby = self.event_payloads(self.drain(clients[0]), 'lobby_state')[-1]
        self.assertEqual(3, lobby['intruder_count'])
        self.assertTrue(lobby['auto_intruders'])

    def test_host_can_still_pick_a_number(self):
        clients, room, ids, game = self.setup_started_game(8, config={'num_intruders': 1})
        self.assertEqual(1, len(self.intruders(game)))
        clients[0].emit('get_game_config', {'room_code': room})
        self.assertEqual(1, self.first_event(self.drain(clients[0]), 'game_config')['num_intruders'])

    def test_switching_back_to_auto(self):
        host = self.make_client()
        room = self.create_open_room(host, config={'num_intruders': 4})
        host.emit('update_game_config', {'room_code': room, 'config': {'num_intruders': 'auto'}})
        self.assertEqual('auto', self.first_event(self.drain(host), 'game_config')['num_intruders'])

    def test_only_three_intruders_draw_after_a_meeting(self):
        clients, room, ids, game = self.setup_started_game(40, task_count=60)
        before = {intruder.player_id: len(intruder.cards) for intruder in self.intruders(game)}
        with game.state_lock:
            game.drawCards()
        drew = [i for i in self.intruders(game) if len(i.cards) > before[i.player_id]]
        self.assertEqual(3, len(drew))


if __name__ == '__main__':
    unittest.main()

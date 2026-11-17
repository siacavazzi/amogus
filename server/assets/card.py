import random

from assets.scaling import deck_copies
import json
import uuid
import time
from threading import Thread
from assets.utils import *
from assets import task_hand

RALLY_EARLIEST_SECONDS = 60  # Rally can't open a round: the crew hasn't spread out yet

CARD_DECK_PRESET_DEFAULT = 'default'
CARD_DECK_PRESET_CUSTOM = 'custom'
CARD_COUNT_MAX = 30

CARD_DECK_COUNT_KEYS = [
    'self_report',
    'emp',
    'fake_task',
    'taunt_message',
    'remote_sabotage',
    'shorten_meltdown',
    'area_denial_per_location',
    'steal_tasks',
    'reshuffle',
    'rally',
]

DEFAULT_CARD_DECK_COUNTS = {
    'self_report': 4,
    'emp': 4,
    'fake_task': 6,
    'taunt_message': 6,
    'remote_sabotage': 3,
    'shorten_meltdown': 3,
    'area_denial_per_location': 2,
    'steal_tasks': 3,
    'reshuffle': 1,
    'rally': 1,
}

CARD_DECK_PRESETS = {
    CARD_DECK_PRESET_DEFAULT: DEFAULT_CARD_DECK_COUNTS,
    'fake_task_chaos': {
        'self_report': 0,
        'emp': 0,
        'fake_task': 24,
        'taunt_message': 0,
        'remote_sabotage': 0,
        'shorten_meltdown': 0,
        'area_denial_per_location': 0,
        'steal_tasks': 0,
        'reshuffle': 0,
        'rally': 0,
    },
    'sabotage_heavy': {
        'self_report': 0,
        'emp': 8,
        'fake_task': 0,
        'taunt_message': 0,
        'remote_sabotage': 6,
        'shorten_meltdown': 6,
        'area_denial_per_location': 3,
        'steal_tasks': 0,
        'reshuffle': 2,
        'rally': 0,
    },
    'no_reactor_cards': {
        'self_report': 4,
        'emp': 4,
        'fake_task': 6,
        'taunt_message': 6,
        'remote_sabotage': 0,
        'shorten_meltdown': 0,
        'area_denial_per_location': 2,
        'steal_tasks': 3,
        'reshuffle': 1,
        'rally': 1,
    },
}


def sanitize_card_deck_preset(preset):
    if preset in CARD_DECK_PRESETS or preset == CARD_DECK_PRESET_CUSTOM:
        return preset
    return CARD_DECK_PRESET_DEFAULT


def sanitize_card_deck_counts(counts):
    sanitized = DEFAULT_CARD_DECK_COUNTS.copy()
    if not isinstance(counts, dict):
        return sanitized

    for key in CARD_DECK_COUNT_KEYS:
        if key not in counts:
            continue
        try:
            value = int(counts.get(key, 0))
        except (TypeError, ValueError):
            value = 0
        sanitized[key] = max(0, min(CARD_COUNT_MAX, value))
    return sanitized


def get_card_deck_counts_for_preset(preset, custom_counts=None):
    preset = sanitize_card_deck_preset(preset)
    if preset == CARD_DECK_PRESET_CUSTOM:
        return sanitize_card_deck_counts(custom_counts)
    return sanitize_card_deck_counts(CARD_DECK_PRESETS.get(preset, DEFAULT_CARD_DECK_COUNTS))


def get_available_card_deck_presets():
    return list(CARD_DECK_PRESETS.keys()) + [CARD_DECK_PRESET_CUSTOM]

class Card:

    def __init__(self, action, text, card_deck, location=None, duration=None, sound=None, countdown=False, requires_input=False):
        self.action = action
        self.location = location
        self.duration = duration
        self.countdown = countdown
        self.time_left = duration
        self.sound = sound
        self.text = text
        self.card_deck = card_deck
        self.game = card_deck.game
        self.socket = card_deck.socket
        self.id = str(uuid.uuid4())
        self.requires_input = requires_input  # Whether this card needs additional player input
    
    def __repr__(self):
        return f"{self.id}, {self.action}, {self.location}, {self.sound}, {self.duration}"
    
    def _handle_card_countdown(self):
        round_id = getattr(self, '_active_round_id', self.game.round_id)
        while True:
            with self.game.state_lock:
                if (round_id != self.game.round_id
                        or self.game.card_deck is not self.card_deck
                        or self not in self.card_deck.active_cards):
                    return
                if self.time_left <= 0:
                    if self.action == 'Area Denial' and self.game.denied_location == self.location:
                        self.game.denied_location = None
                    self.card_deck.active_cards.remove(self)
                    self.game.revision += 1
                    self.card_deck.emit_active_cards()
                    return

            time.sleep(1)

            with self.game.state_lock:
                if (round_id != self.game.round_id
                        or self.game.card_deck is not self.card_deck
                        or self not in self.card_deck.active_cards):
                    return
                self.time_left -= 1
                self.game.revision += 1
                if self.time_left <= 0:
                    if self.action == 'Area Denial' and self.game.denied_location == self.location:
                        self.game.denied_location = None
                    self.card_deck.active_cards.remove(self)
                    self.card_deck.emit_active_cards()
                    return
    
    def notify_intruders(self, player):
        for other_player in self.game.players:
            if (other_player is not player) and other_player.sus and other_player.alive:
                send_message_to_player(self.socket, other_player, f"{player.username} played {self.action}")


    def play_card(self, player, extra_data=None):
        with self.game.state_lock:
            return self._play_card_locked(player, extra_data)

    def _play_card_locked(self, player, extra_data=None):
        """
        Play the card while the room lock is held.
        extra_data: Optional dict with additional data for cards that require input (e.g., fake task details)
        """
        remove_card = True
        discarded = False
        
        if self.action == 'EMP':
            remove_card = self.game.start_hack(self.duration)
        elif self.action == 'Self Report':
            remove_card = self.game.start_meeting(player, trigger='card')
        elif self.action == 'Taunt':
            self.game.speaker.play_sound(self.sound)
        elif self.action == 'Remote Sabotage':
            remove_card = self.game.start_meltdown(trigger='card')
            if not remove_card and not self.game.reactor_sid:
                send_message_to_player(self.socket, player, "Remote Sabotage needs the reactor screen, and it's not connected. Keep the card for later.")
    # active cards
        elif self.action == 'Area Denial':
            if not self.game.denied_location:
                self.game.speaker.play_sound('sus')
                self.game.denied_location = self.location
                self.card_deck.active_cards.append(self)
                self.notify_intruders(player)
            else:
                remove_card = False
        elif self.action == 'Fake Task':
            remove_card = self._play_fake_task(player, extra_data or {})
        elif self.action == 'Steal Tasks':
            remove_card = self._play_steal_tasks(player, extra_data or {})
        elif self.action == 'Reshuffle':
            remove_card = self._play_reshuffle(player)
        elif self.action == 'Rally':
            remove_card = self._play_rally(player, extra_data or {})
        elif self.action == 'Taunt Message':
            if not extra_data:
                print("Taunt Message card requires extra_data")
                remove_card = False
            else:
                target_player_id = extra_data.get('target_player_id')
                message = (extra_data.get('message') or '').strip()[:200]

                target_player = None
                for p in self.game.players:
                    if p.player_id == target_player_id:
                        target_player = p
                        break

                if target_player and not target_player.sus and target_player.alive and message:
                    if target_player.sid:
                        self.socket.emit('taunt_received', {
                            'message': message
                        }, to=target_player.sid)
                    self.game.stats['taunts_sent'].append({
                        'sender_name': player.username,
                        'target_name': target_player.username,
                        'message': message
                    })
                    self.game.speaker.play_sound('sus')
                    self.notify_intruders(player)
                    send_message_to_player(self.socket, player, f"Taunt sent to {target_player.username}")
                    print(f"Taunt message sent to {target_player.username}: {message}")
                else:
                    send_message_to_player(self.socket, player, "Invalid taunt - choose an alive crewmate and enter a message")
                    remove_card = False
        elif self.action == 'Discard and Draw':
            remove_card = False
            if len(player.cards) > 1:
                discarded = True
                player.remove_card(self)
                player.cards.pop(0)
                card= self.card_deck.draw_card()
                if card:
                    send_message_to_player(self.socket, player, f"You drew: {card.action}")
                    player.cards.append(card)

        elif self.action == 'Shorten Meltdown':
            if self not in self.card_deck.active_cards:
                self.card_deck.active_cards.append(self)
            self.notify_intruders(player)
            self.game.meltdown_time_mod += self.duration
        
        if self.countdown:
            self._active_round_id = self.game.round_id
            Thread(target=self._handle_card_countdown, args=()).start()
        if remove_card:
            player.remove_card(self)
        accepted = remove_card or discarded
        if accepted:
            self.game.stats['cards_played'] += 1
        self.card_deck.emit_active_cards()
        self.game.emit_player_list()
        return accepted

    def _crewmate(self, player_id):
        target = next((p for p in self.game.players if p.player_id == player_id), None)
        if target and not target.sus and target.alive and not getattr(target, 'waiting', False):
            return target
        return None

    def _location(self, extra_data):
        location = str(extra_data.get('task_location') or extra_data.get('location') or '')[:task_hand.LOCATION_MAX_CHARS]
        known = set(self.game.locations or []) | {task.get('location') for task in (self.game.collaborative_tasks or [])}
        return location if location in known else None

    def _play_fake_task(self, player, extra_data):
        """A fake Priority task. The intruder picks where and what; the game hands it to the
        crewmate most due a Priority and tells the intruder who."""
        task_text = str(extra_data.get('task_text') or '').strip()[:task_hand.FAKE_TASK_MAX_CHARS]
        task_location = self._location(extra_data) or 'Other'
        if not task_text:
            send_message_to_player(self.socket, player, "Write the fake task first.")
            return False
        target = task_hand.pick_fake_task_target(self.game, task_location)
        if not target:
            send_message_to_player(self.socket, player, "Every crewmate has a Priority task right now. Keep the card and try again soon.")
            return False
        task_hand.give_priority(self.game, target, {'task': task_text, 'location': task_location}, fake=True)
        task_hand.emit_hand(self.game, target)
        self.game.stats['fake_tasks_sent'].append({
            'sender_name': player.username,
            'target_name': target.username,
            'task_text': task_text,
            'task_location': task_location
        })
        self.game.speaker.play_sound('sus')
        self.notify_intruders(player)
        where = '' if task_location == 'Other' else f" {task_location},"
        send_message_to_player(self.socket, player, f"Fake task sent to {target.username}.{where} {task_hand.PRIORITY_SECONDS} s to get there.")
        return True

    def _play_steal_tasks(self, player, extra_data):
        """See a crewmate's tasks and take them: they get new ones, you keep these as an alibi."""
        target = self._crewmate(extra_data.get('target_player_id'))
        if not target or not target.hand:
            send_message_to_player(self.socket, player, "Choose a living crewmate.")
            return False
        stolen = [{'task': task.get('task'), 'location': task.get('location')} for task in target.hand]
        player.stolen = {'from': target.username, 'tasks': stolen}
        task_hand.redeal_hand(self.game, target)
        if target.sid:
            self.socket.emit('tasks_stolen', self.game._add_state_metadata({}), to=target.sid)
        task_hand.emit_hand(self.game, target)
        task_hand.emit_hand(self.game, player)
        self.game.stats.setdefault('tasks_stolen', []).append({'sender_name': player.username, 'target_name': target.username})
        self.game.speaker.play_sound('sus')
        self.notify_intruders(player)
        return True

    def _play_reshuffle(self, player):
        """Every living crewmate's hand is dealt again. Priority tasks stay."""
        crew = task_hand.eligible_crew(self.game)
        if not crew:
            return False
        for target in crew:
            task_hand.redeal_hand(self.game, target)
            task_hand.emit_hand(self.game, target)
        self.game.emit_to_room('tasks_reshuffled', {})
        self.game.speaker.play_sound('sus')
        self.notify_intruders(player)
        return True

    def _play_rally(self, player, extra_data):
        """Every living crewmate gets a real Priority task in one area, all at once. They are
        real: each crewmate who makes it gets the point and a swap. That is the card's price."""
        location = self._location(extra_data)
        if not location or location == 'Other':
            send_message_to_player(self.socket, player, "Choose an area for the Rally.")
            return False
        seconds = self.game.round_seconds() or 0
        if seconds < RALLY_EARLIEST_SECONDS:
            send_message_to_player(self.socket, player, "Rally works after the first minute. Keep the card for later.")
            return False
        crew = task_hand.eligible_crew(self.game)
        given = set()
        for target in crew:
            task = task_hand.draw_task(self.game, avoid_texts=given, location=location)
            if not task:
                continue
            given.add(task.get('task'))
            task_hand.give_priority(self.game, target, task)
            task_hand.emit_hand(self.game, target)
        if not given:
            send_message_to_player(self.socket, player, f"There are no tasks in {location}. Keep the card.")
            return False
        self.game.speaker.play_sound('sus')
        self.notify_intruders(player)
        return True

    def export(self):
        return json.dumps({
            "action":self.action,
            "text":self.text,
            "location":self.location,
            "duration":self.duration,
            "time_left": self.time_left,
            "id":self.id,
            "countdown":self.countdown,
            "requires_input": self.requires_input
        })

class CardDeck:

    # Cards that require a reactor (desktop) to be present
    REACTOR_CARDS = ['Remote Sabotage', 'Shorten Meltdown']

    def __init__(self, locations, socket, game):
        self.discard = []
        self.active_cards = []
        self.socket = socket
        self.game = game
        self.locations = locations
        self._build_deck()

    def _build_deck(self):
        """Build the card deck, optionally excluding reactor cards."""
        has_reactor = self.game.has_reactor if self.game else True

        preset = sanitize_card_deck_preset(getattr(self.game, 'card_deck_preset', CARD_DECK_PRESET_DEFAULT))
        # A big room's intruders all start with cards, so it gets one more copy of the deck per few intruders.
        copies = deck_copies(getattr(self.game, 'numIntruders', 1) or 1)
        deck = []
        for _ in range(copies):
            if preset != CARD_DECK_PRESET_DEFAULT:
                custom_counts = getattr(self.game, 'card_deck_counts', DEFAULT_CARD_DECK_COUNTS)
                counts = get_card_deck_counts_for_preset(preset, custom_counts)
                self._build_configured_deck(counts, has_reactor)
            else:
                self._build_default_deck(has_reactor)
            deck.extend(self.cards)
        self.cards = deck
        print(f"Card deck built with {len(self.cards)} cards (reactor: {has_reactor}, preset: {preset}, copies: {copies})")

    def _build_default_deck(self, has_reactor):
        self.cards = [
            Card('Self Report', 'Call a body found meeting', self), 
            Card('Self Report', 'Call a body found meeting', self), 
            Card('Self Report', 'Call a body found meeting', self), 
            Card('Self Report', 'Call a body found meeting', self), 

            Card('EMP', 'Disable all devices for the duration', self, duration=30),
            Card('EMP', 'Disable all devices for the duration', self, duration=30),
            Card('EMP', 'Disable all devices for the duration', self, duration=60),
            Card('EMP', 'Disable all devices for the duration', self, duration=60),

            Card('Fake Task', 'Send a fake Priority task', self, requires_input=True),
            Card('Fake Task', 'Send a fake Priority task', self, requires_input=True),
            Card('Fake Task', 'Send a fake Priority task', self, requires_input=True),
            Card('Fake Task', 'Send a fake Priority task', self, requires_input=True),
            Card('Fake Task', 'Send a fake Priority task', self, requires_input=True),
            Card('Fake Task', 'Send a fake Priority task', self, requires_input=True),

            Card('Taunt Message', 'Send a message to a crewmate of your choice', self, requires_input=True),
            Card('Taunt Message', 'Send a message to a crewmate of your choice', self, requires_input=True),
            Card('Taunt Message', 'Send a message to a crewmate of your choice', self, requires_input=True),
            Card('Taunt Message', 'Send a message to a crewmate of your choice', self, requires_input=True),
            Card('Taunt Message', 'Send a message to a crewmate of your choice', self, requires_input=True),
            Card('Taunt Message', 'Send a message to a crewmate of your choice', self, requires_input=True),
            
        ]

        self.cards.extend([
            Card('Steal Tasks', "See a crewmate's tasks and take them", self, requires_input=True),
            Card('Steal Tasks', "See a crewmate's tasks and take them", self, requires_input=True),
            Card('Steal Tasks', "See a crewmate's tasks and take them", self, requires_input=True),
            Card('Reshuffle', "Every crewmate's tasks are dealt again", self),
        ])
        # Rally only where the crew is winning big: rounds with a lone intruder.
        if (getattr(self.game, 'round_intruder_count', None) or getattr(self.game, 'numIntruders', 1) or 1) <= 1 and self._task_areas():
            self.cards.append(Card('Rally', 'Send every crewmate to one area', self, requires_input=True))

        # Only add reactor-dependent cards if a reactor is present
        if has_reactor:
            self.cards.extend([
                Card('Shorten Meltdown', 'Reduce the amount of time players have to stop the next meltdown', self, duration=10),
                Card('Shorten Meltdown', 'Reduce the amount of time players have to stop the next meltdown', self, duration=12),
                Card('Shorten Meltdown', 'Reduce the amount of time players have to stop the next meltdown', self, duration=15),

                Card('Remote Sabotage', 'Trigger a sabotage remotely', self),
                Card('Remote Sabotage', 'Trigger a sabotage remotely', self),
                Card('Remote Sabotage', 'Trigger a sabotage remotely', self),
            ])

        # Location based cards invoked programmatically since locations shouldn't be hardcoded
        for location in self.locations:
            if location != 'Other':
                self.cards.append(Card('Area Denial', "Lock an area: its tasks can't be done", self, duration=120, countdown=True, location=location))
                if random.random() > 0.4:
                    self.cards.append(Card('Area Denial', "Lock an area: its tasks can't be done", self, duration=60, countdown=True, location=location))

    def _build_configured_deck(self, counts, has_reactor):
        self.cards = []

        for _ in range(counts.get('self_report', 0)):
            self.cards.append(Card('Self Report', 'Call a body found meeting', self))

        emp_durations = [30, 30, 60, 60]
        for i in range(counts.get('emp', 0)):
            self.cards.append(Card('EMP', 'Disable all devices for the duration', self, duration=emp_durations[i % len(emp_durations)]))

        for _ in range(counts.get('fake_task', 0)):
            self.cards.append(Card('Fake Task', 'Send a fake Priority task', self, requires_input=True))

        for _ in range(counts.get('taunt_message', 0)):
            self.cards.append(Card('Taunt Message', 'Send a message to a crewmate of your choice', self, requires_input=True))

        for _ in range(counts.get('steal_tasks', 0)):
            self.cards.append(Card('Steal Tasks', "See a crewmate's tasks and take them", self, requires_input=True))
        for _ in range(counts.get('reshuffle', 0)):
            self.cards.append(Card('Reshuffle', "Every crewmate's tasks are dealt again", self))
        if self._task_areas():
            for _ in range(counts.get('rally', 0)):
                self.cards.append(Card('Rally', 'Send every crewmate to one area', self, requires_input=True))

        include_reactor_cards = has_reactor and getattr(self.game, 'card_deck_preset', CARD_DECK_PRESET_DEFAULT) != 'no_reactor_cards'
        if include_reactor_cards:
            shorten_durations = [10, 12, 15]
            for i in range(counts.get('shorten_meltdown', 0)):
                self.cards.append(Card('Shorten Meltdown', 'Reduce the amount of time players have to stop the next meltdown', self, duration=shorten_durations[i % len(shorten_durations)]))

            for _ in range(counts.get('remote_sabotage', 0)):
                self.cards.append(Card('Remote Sabotage', 'Trigger a sabotage remotely', self))

        area_denial_count = counts.get('area_denial_per_location', 0)
        area_denial_durations = [120, 60]
        for location in self.locations:
            if location != 'Other':
                for i in range(area_denial_count):
                    self.cards.append(Card('Area Denial', "Lock an area: its tasks can't be done", self, duration=area_denial_durations[i % len(area_denial_durations)], countdown=True, location=location))

    def _task_areas(self):
        return [location for location in self.locations if location and location != 'Other']

    def draw_card(self, probability=1):
        if random.random() > probability:
            print("No card drawn")
            return None
        
        if not self.cards:
            self.refill_deck()
        if not self.cards:
            return None  # Every card is in someone's hand or in effect
        card = random.choice(self.cards)
        self.cards.remove(card)
        self.discard.append(card)
        return card

    def refill_deck(self):
        """Refill the deck from the discard pile and shuffle.

        Drawn cards go to the discard pile straight away, so cards still in a hand or
        still in effect stay out: otherwise two intruders could hold the same card.
        """
        in_use = {id(card) for card in self.active_cards}
        for player in getattr(self.game, 'players', []):
            in_use.update(id(card) for card in player.cards)
        self.cards = [card for card in self.discard if id(card) not in in_use]
        self.discard = [card for card in self.discard if id(card) in in_use]
        random.shuffle(self.cards)

    def emit_active_cards(self):
        output = []
        for card in self.active_cards:
            output.append(card.export())
        self.game.emit_to_room('active_cards', output)

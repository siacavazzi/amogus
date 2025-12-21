import random
import json
import uuid
import time
from threading import Thread
from assets.utils import *

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
        while self.time_left > 0:
            time.sleep(1)
            self.time_left -= 1
        if self.action == 'Area Denial':
            self.game.denied_location = None
        if self in self.card_deck.active_cards:
            self.card_deck.active_cards.remove(self)
    
    def notify_intruders(self, player):
        for other_player in self.game.players:
            if (other_player is not player) and other_player.sus and other_player.alive:
                send_message_to_player(self.socket, other_player.player_id, f"{player.username} played {self.action}")


    def play_card(self, player, extra_data=None):
        """
        Play the card. 
        extra_data: Optional dict with additional data for cards that require input (e.g., fake task details)
        """
        remove_card = True
        if self.action == 'EMP':
            self.game.start_hack(self.duration)
        elif self.action == 'Self Report':
            self.game.start_meeting(player)
        elif self.action == 'Taunt':
            self.game.speaker.play_sound(self.sound)
        elif self.action == 'Remote Sabotage':
            self.game.start_meltdown()
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
            # Requires extra_data with: target_player_id, task_text, task_location
            if not extra_data:
                print("Fake Task card requires extra_data")
                remove_card = False
            else:
                target_player_id = extra_data.get('target_player_id')
                task_text = extra_data.get('task_text', 'Do something suspicious')
                task_location = extra_data.get('task_location', 'Other')
                
                # Find the target player
                target_player = None
                for p in self.game.players:
                    if p.player_id == target_player_id:
                        target_player = p
                        break
                
                if target_player and not target_player.sus and target_player.alive:
                    # Set the fake task - will be shown after current task is completed
                    target_player.fake_task = {
                        'task': task_text,
                        'location': task_location,
                        'difficulty': 2,
                        'is_fake': True  # Mark as fake for potential future use
                    }
                    # Play the 'sus' sound
                    self.game.speaker.play_sound('sus')
                    # Notify other intruders
                    self.notify_intruders(player)
                    send_message_to_player(self.socket, player.player_id, f"Fake task sent to {target_player.username}")
                    print(f"Fake task '{task_text}' at '{task_location}' queued for {target_player.username}")
                else:
                    send_message_to_player(self.socket, player.player_id, "Invalid target - must be alive crewmate")
                    remove_card = False
        elif self.action == 'Discard and Draw':
            remove_card = False
            if len(player.cards) > 1:
                player.remove_card(self)
                player.cards.pop(0)
                card= self.card_deck.draw_card()
                send_message_to_player(self.socket, player.player_id, f"You drew: {card.action}")
                player.cards.append(card)

        elif self.action == 'Shorten Meltdown':
            self.card_deck.active_cards.append(self)
            self.notify_intruders(player)
            self.game.meltdown_time_mod += self.duration
        
        if self.countdown:
            Thread(target=self._handle_card_countdown, args=()).start()
        if remove_card:
            player.remove_card(self)
        self.card_deck.emit_active_cards()
        self.game.emit_player_list()

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
        
        self.cards = [
            Card('Self Report', 'Call a body found meeting', self), 
            Card('Self Report', 'Call a body found meeting', self), 
            Card('Self Report', 'Call a body found meeting', self), 
            Card('Self Report', 'Call a body found meeting', self), 

            Card('EMP', 'Disable all devices for the duration', self, duration=30),
            Card('EMP', 'Disable all devices for the duration', self, duration=30),
            Card('EMP', 'Disable all devices for the duration', self, duration=60),
            Card('EMP', 'Disable all devices for the duration', self, duration=60),

            Card('Taunt', 'Make crewmates scared', self, sound='fear'),
            Card('Taunt', 'Taunt crewmates with work PTSD', self, sound='annoying_notif'),
            Card('Taunt', 'Make crewmates suspicious', self, sound='sus'),
            Card('Taunt', 'M E O W', self, sound='meow'),

            Card('Fake Task', 'Send a fake task to a crewmate of your choice', self, requires_input=True),
            Card('Fake Task', 'Send a fake task to a crewmate of your choice', self, requires_input=True),
            Card('Fake Task', 'Send a fake task to a crewmate of your choice', self, requires_input=True),
            Card('Fake Task', 'Send a fake task to a crewmate of your choice', self, requires_input=True),
            Card('Fake Task', 'Send a fake task to a crewmate of your choice', self, requires_input=True),
            
        ]

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
                self.cards.append(Card('Area Denial', 'Stop sending tasks to a specific location', self, duration=120, countdown=True, location=location))
                if random.random() > 0.4:
                    self.cards.append(Card('Area Denial', 'Stop sending tasks to a specific location', self, duration=60, countdown=True, location=location))

        print(f"Card deck built with {len(self.cards)} cards (reactor: {has_reactor})")

    def draw_card(self, probability=1):
        if random.random() > probability:
            print("No card drawn")
            return None
        
        if not self.cards:
            if not self.discard:
                return None 
            self.refill_deck()
        card = random.choice(self.cards)
        self.cards.remove(card)
        self.discard.append(card)
        return card

    def refill_deck(self):
        """Refill the deck from the discard pile and shuffle."""
        self.cards = self.discard
        self.discard = []
        random.shuffle(self.cards)

    def emit_active_cards(self):
        output = []
        for card in self.active_cards:
            output.append(card.export())
        print(output)
        self.game.emit_to_room('active_cards', output)




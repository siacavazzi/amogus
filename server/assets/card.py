import random
import json
import uuid
import time
from threading import Thread
from assets.utils import *

class Card:

    def __init__(self, action, text, card_deck, location=None, duration=None, sound=None, countdown=False):
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
    
    def notify_impostors(self, player):
        for other_player in self.game.players:
            if (other_player is not player) and other_player.sus and other_player.alive:
                send_message_to_player(self.socket, other_player.player_id, f"{player.username} played {self.action}")


    def play_card(self, player):
        remove_card = True
        if self.action == 'EMP':
            self.game.start_hack(self.duration)
        elif self.action == 'Self Report':
            self.game.start_meeting(player)
        elif self.action == 'Taunt':
            self.game.speaker.play_sound(self.sound)
    # active cards
        elif self.action == 'Area Denial':
            if not self.game.denied_location:
                self.game.speaker.play_sound('sus')
                self.game.denied_location = self.location
                self.card_deck.active_cards.append(self)
                self.notify_impostors(player)
            else:
                remove_card = False
        elif self.action == 'fake_task':
            print("IMPLEMENT THIS ONE LOL")
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
            self.notify_impostors(player)
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
            "countdown":self.countdown
        })

class CardDeck:

    def __init__(self, locations, socket, game):
        self.discard = []
        self.active_cards = []
        self.socket = socket
        self.game = game

        self.cards = [# CHANGE THESE THEYDONT WORK
            Card('Self Report', 'Call a body found meeting', self), 
            Card('Self Report', 'Call a body found meeting', self), 
            Card('Self Report', 'Call a body found meeting', self), 


            Card('EMP', 'Disable all devices for the duration', self,duration=10),
            Card('EMP', 'Disable all devices for the duration', self, duration=15),
            Card('EMP', 'Disable all devices for the duration', self,duration=30),
            Card('EMP', 'Disable all devices for the duration', self,duration=45),

            Card('Taunt', 'Taunt crewmates with brainrot', self,sound='brainrot'),
            Card('Taunt', 'Taunt crewmates with work PTSD', self,sound='annoying_notif'),
            Card('Taunt', 'Make crewmates suspicious', self,sound='sus'),
            Card('Taunt', 'M E O W', self,sound='meow'),


            Card('Shorten Meltdown', 'Reduce the amount of time players have to stop the next meltdown', self,duration=10),
            Card('Shorten Meltdown', 'Reduce the amount of time players have to stop the next meltdown', self,duration=12),
            Card('Shorten Meltdown', 'Reduce the amount of time players have to stop the next meltdown',self,duration=15),

            Card('Discard and Draw', 'Discard a random card and draw a new card', self),
            Card('Discard and Draw', 'Discard a random card and draw a new card', self),
            Card('Discard and Draw', 'Discard a random card and draw a new card', self),

        ]

        # Location based cards invoked programmatically since locations shouldn't be hardcoded
        for location in locations:
            if location != 'Other':
                self.cards.append(Card('Area Denial', 'Stop sending tasks to a specific location', self,duration=60, countdown=True, location=location))
                #self.cards.append(Card('fake_task', 'Send a fake task at a specific location to a player **NOT IMPLEMENTED**', location=location))
        print(self.cards)

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
        self.socket.emit('active_cards', output)




import random
import json
import uuid

class Card:

    def __init__(self, action, text, location=None, duration=None, sound=None):
        self.action = action
        self.location = location
        self.duration = duration
        self.sound = sound
        self.text = text
        self.id = str(uuid.uuid4())
    
    def __repr__(self):
        return f"{self.id}, {self.action}, {self.location}, {self.sound}, {self.duration}"

    def export(self):
        return json.dumps({
            "action":self.action,
            "text":self.text,
            "location":self.location,
            "duration":self.duration,
            "id":self.id
        })

class CardDeck:

    def __init__(self, locations):
        self.discard = []

        self.cards = [
            Card('meeting', 'Call a meeting'),
            Card('meeting', 'Call a meeting'),
            Card('meeting', 'Call a meeting'),

            Card('hack', 'Block all players from doing anything', duration=15),
            Card('hack', 'Block all players from doing anything', duration=30),
            Card('hack', 'Block all players from doing anything', duration=45),

            Card('taunt', 'Taunt crewmates with brainrot', sound='brainrot'),
            Card('taunt', 'Taunt crewmates with work PTSD', sound='annoying_notif'),
            Card('taunt', 'Make crewmates suspicious', sound='sus'),
            Card('taunt', 'M E O W', sound='meow'),

            ## ADD MORE CARDS but idk which ones
        ]

        for location in locations:
            if location != 'Other':
                self.cards.append(Card('area_denial', 'Stop sending tasks to a specific location', duration=60, location=location))
        print(self.cards)

    def draw_card(self):
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



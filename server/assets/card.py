import random
import json
import uuid

class Card:

    def __init__(self, action, text, location=None, duration=None, sound=None, countdown=False):
        self.action = action
        self.location = location
        self.duration = duration
        self.countdown = countdown
        self.time_left = duration
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
            "time_left": self.time_left,
            "id":self.id,
            "countdown":self.countdown
        })

class CardDeck:

    def __init__(self, locations):
        self.discard = []

        self.cards = [# CHANGE THESE THEYDONT WORK
            # Card('meeting', 'Call a body found meeting'), 
            # Card('meeting', 'Call a body found meeting'), 
            # Card('meeting', 'Call a body found meeting'), 
            # Card('meeting', 'Call a body found meeting'), 
            # Card('meeting', 'Call a body found meeting'), 
            # Card('meeting', 'Call a body found meeting'), 

            # Card('hack', 'Block all players from doing anything', duration=10),
            # Card('hack', 'Block all players from doing anything', duration=15),
            # Card('hack', 'Block all players from doing anything', duration=30),
            # Card('hack', 'Block all players from doing anything', duration=45),

            # Card('taunt', 'Taunt crewmates with brainrot', sound='brainrot'),
            # Card('taunt', 'Taunt crewmates with work PTSD', sound='annoying_notif'),
            # Card('taunt', 'Make crewmates suspicious', sound='sus'),
            # Card('taunt', 'M E O W', sound='meow'),

            Card('reduce_meltdown', 'Reduce the amount of time players have to stop the next meltdown **NOT IMPLEMENTED**',duration=10),
            Card('reduce_meltdown', 'Reduce the amount of time players have to stop the next meltdown **NOT IMPLEMENTED**',duration=15),

            # Card('discard_draw', 'Discard a random card and draw a new card **NOT IMPLEMENTED**'),
            # Card('discard_draw', 'Discard a random card and draw a new card **NOT IMPLEMENTED**'),
            # Card('discard_draw', 'Discard a random card and draw a new card **NOT IMPLEMENTED**')
        ]

        # Location based cards invoked programmatically since locations shouldn't be hardcoded
        for location in locations:
            if location != 'Other':
                self.cards.append(Card('area_denial', 'Stop sending tasks to a specific location', duration=60, countdown=True, location=location))
                #self.cards.append(Card('fake_task', 'Send a fake task at a specific location to a player **NOT IMPLEMENTED**', location=location))
        print(self.cards)

    def draw_card(self, probability=1):
        if random.random() > probability:
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




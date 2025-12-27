import json
import random


# Death causes and their possible messages
# Each cause has a list of funny messages that can be randomly chosen
DEATH_MESSAGES = {
    'voted_out': [
        "was yeeted into the cold vacuum of space by popular demand",
        "got democratically deleted from existence",
        "was voted off the island",
        "learned that democracy sometimes really sucks",
        "was ejected with extreme prejudice",
        "took an unscheduled spacewalk without a suit",
        "found out what happens when you lose a popularity contest in space",
        "was shown the airlock by their former friends",
    ],
    'voted_out_innocent': [
        "has permission to crash out after being voted out for no reason",
        "was ejected despite doing literally nothing wrong",
        "was the victim of a tragic misunderstanding",
    ],
    'voted_out_intruder': [
        "was a little too sus",
        "got caught lacking",
        "got spaced for being an intruder",
        "got killed by a mob of angry crewmates",
    ],
    'murdered': [
        "was brutally eliminated while minding their own business",
        "got absolutely destroyed by an intruder",
        "was deleted from the crew roster permanently",
        "had a fatal encounter with someone suspicious",
        "was removed from the game... and from life",
        "experienced an unexpected case of death",
    ],
    'murdered_during_task': [
        "was assassinated mid-task like a productivity martyr",
        "died doing what they loved (chores)",
        "got merked while trying to be a good crewmate",
        "was killed before they could finish their job",
        "learned the hard way that some tasks are to die for",
    ],
    'meltdown': [
        "was irradiated to a crispy finish",
        "became one with the reactor core",
        "got a lethal dose of 'should have entered the code faster'",
        "experienced rapid unplanned disassembly via nuclear fire",
        "was vaporized by the power of the atom",
        "learned that radiation is not, in fact, good for you",
    ],
    'left_game': [
        "mysteriously vanished into the void",
        "rage quit the game",
        "pulled a tactical retreat",
        "went AFK",
    ],
    'unknown': [
        "died under mysterious circumstances",
        "perished in an unexplained incident",
        "was found dead (cause: ¯\\_(ツ)_/¯)",
        "ceased to exist for reasons unknown",
    ],
}


def get_death_message(cause, task_name=None):
    """Get a random death message for the given cause."""
    messages = DEATH_MESSAGES.get(cause, DEATH_MESSAGES['unknown'])
    message = random.choice(messages)
    
    # If task name is provided and cause is murdered_during_task, personalize it
    if task_name and cause == 'murdered_during_task':
        task_messages = [
            f"was brutally murdered while trying to '{task_name}'",
            f"got killed mid-way through '{task_name}' like a true martyr",
            f"died attempting to complete '{task_name}' - so close, yet so dead",
            f"was assassinated while innocently doing '{task_name}'",
            f"never got to finish '{task_name}' because someone chose violence",
        ]
        message = random.choice(task_messages)
    
    return message


class Player:
    def __init__(self, sid, player_id, username, pic, selfie=None):
        self.sid = sid
        self.username = username
        self.player_id = player_id
        self.pic = pic
        self.selfie = selfie  # Filename of selfie image (e.g., "abc123.jpg")
        self.active = True
        
        self.alive = True
        self.task = None
        self.fake_task = None
        self.meltdown_code = None
        
        # Death tracking
        self.death_cause = None  # e.g., 'voted_out', 'murdered', 'meltdown'
        self.death_message = None  # The funny message describing how they died

        # imposter vars
        self.sus = False
        self.cards = []

        self.ready = False
        
    def disconnect(self):
        self.active = False

    def reset(self):
        """Reset player state for a new game (keeps identity)."""
        self.active = True
        self.sus = False
        self.alive = True
        self.task = None
        self.fake_task = None
        self.meltdown_code = None
        self.death_cause = None
        self.death_message = None
        self.cards = []
        self.ready = False
    
    def set_death(self, cause, task_name=None):
        """Set the death cause and generate a death message."""
        self.alive = False
        self.death_cause = cause
        self.death_message = get_death_message(cause, task_name)
        self.ready = True  # Dead players are always ready
        return self.death_message

    def get_task(self):
        if self.fake_task is not None:
            return self.fake_task
        return self.task
    
    def get_card(self, id):
        print("cards = = =  = = =")
        print(self.cards)
        card = next((card for card in self.cards if card.id == id), None)
        return card
    
    def remove_card(self, card):
        self.cards.remove(card)

    def to_json(self):
        # Convert the object's attributes to a dictionary
        print("Debug - self.cards:", self.cards)
        return json.dumps({
            "sid": self.sid,
            "player_id": self.player_id,
            "username": self.username,
            "active": self.active,
            "sus": self.sus,
            "alive": self.alive,
            "pic": self.pic,
            "selfie": self.selfie,
            "meltdown_code": self.meltdown_code,
            "cards": [card.export() for card in self.cards if hasattr(card, 'export')],
            "ready": self.ready,
            "death_cause": self.death_cause,
            "death_message": self.death_message
        })

    def __str__(self):
        # Return a string representation of the object
        return (f"Player(sid={self.sid}, player_id={self.player_id}, "
                f"username={self.username}, active={self.active}, "
                f"sus={self.sus}, alive={self.alive})")


"""
Game Configuration
==================
Customize these settings to adjust gameplay for your venue and group size.
"""

##### LOCATION SETTINGS #######

# Task locations - customize these to match real places in your venue
# 'Other' will automatically be added as an option
LOCATIONS = [
    'Basement',
    '1st Floor',
    '2nd Floor',
    '3rd Floor',
]

##### MEETING & VOTING SETTINGS #######

# Length of voting phase during meetings (in seconds)
VOTE_TIME = 180

# Fraction of living players needed to vote for someone to eject them
# Example: 0.66 = 2/3 majority required
VOTE_THRESHOLD = 0.66

##### MELTDOWN SETTINGS #######

# Time players have to stop a meltdown (in seconds)
MELTDOWN_TIME = 60

# Fraction of players who need to enter a code to end meltdown
# Example: 0.6 = 60% of players (6 out of 10) need to enter codes
CODE_PERCENT = 0.6

##### INTRUDER SETTINGS #######

# Number of intruders per game
NUMBER_OF_INTRUDERS = 2

# Probability of intruder drawing a card (0.0 to 1.0)
# Reduce this if intruders are too powerful
CARD_DRAW_PROBABILITY = 0.90

# Number of cards intruders start with
STARTING_CARDS = 2

##### TASK SETTINGS #######

# Average number of tasks each player needs to finish for crew to win
TASK_RATIO = 12

##### SOUND SETTINGS #######

# Enable Sonos speaker integration for sound effects
SONOS_ENABLED = False

# Speaker volume percentage (0-100)
SPEAKER_VOLUME = 50

# Skip speakers with 'bed' in the name (to avoid disturbing sleepers)
IGNORE_BEDROOM_SPEAKERS = True

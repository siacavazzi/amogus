"""How the game scales with the number of players.

One intruder per five players keeps each side's job the same size at any
headcount: each intruder needs about three eliminations to win, whether the
room has 6 players or 60. The caps below keep the shared things (the one
reactor keypad, the room-wide card effects, the task list a host must write)
at a size a big group can still manage.
"""
import math

# Players per intruder when the room picks the intruder count itself
PLAYERS_PER_INTRUDER = 5

# One reactor keypad takes about ten codes a minute, so more than this can't be typed in time
MELTDOWN_MAX_CODES = 8

# Intruders who draw a card after a meeting; more would flood the room with EMPs and sabotages
MAX_CARD_DRAWS_PER_MEETING = 3

# Tasks recycle once the pool runs out, so a big room doesn't need 3 written tasks per player
TASKS_PER_PLAYER = 3
MIN_TASKS = 10
MAX_MIN_TASKS = 60


def auto_intruder_count(player_count):
    """1 intruder for 3-7 players, 2 for 8-12, 3 for 13-17, and so on with no upper limit."""
    return max(1, (player_count + 2) // PLAYERS_PER_INTRUDER)


def meltdown_codes_needed(present_players, code_percent):
    return min(max(int(present_players * code_percent), 1), MELTDOWN_MAX_CODES)


def minimum_tasks(player_count):
    return max(MIN_TASKS, min(player_count * TASKS_PER_PLAYER, MAX_MIN_TASKS))


def deck_copies(intruder_count):
    """Copies of the card deck a round needs so every intruder's hand can be dealt."""
    return max(1, math.ceil(intruder_count / MAX_CARD_DRAWS_PER_MEETING))

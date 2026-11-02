"""How the game scales with the number of players.

One intruder per full five players keeps each side's job about the same size at
any headcount: an intruder never needs fewer than three eliminations to win.
(Rounding up instead put the second intruder at 8 players, where each needs only
two kills; crew won 27% of those rounds over Halloween 2026.) The caps below keep the shared things (the one
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


# Tasks per crewmate on Auto. Finishing them reveals the intruders. Over Halloween 2026 crew beat a
# lone intruder 73% of the time but two intruders only 27%, and a 10-per-crewmate goal was rarely
# reached, so the goal comes down only when there are two or more intruders.
SOLO_INTRUDER_TASKS_PER_CREWMATE = 10
TASKS_PER_CREWMATE = 6

# A lone intruder is found fast, so they start with at least this many random cards.
SOLO_INTRUDER_STARTING_CARDS = 3


def auto_intruder_count(player_count):
    """1 intruder for 3-9 players, 2 for 10-14, 3 for 15-19, and so on with no upper limit."""
    return max(1, player_count // PLAYERS_PER_INTRUDER)


def auto_tasks_per_crewmate(intruder_count):
    return SOLO_INTRUDER_TASKS_PER_CREWMATE if intruder_count <= 1 else TASKS_PER_CREWMATE


def meltdown_codes_needed(present_players, code_percent):
    return min(max(int(present_players * code_percent), 1), MELTDOWN_MAX_CODES)


def minimum_tasks(player_count):
    return max(MIN_TASKS, min(player_count * TASKS_PER_PLAYER, MAX_MIN_TASKS))


def deck_copies(intruder_count):
    """Copies of the card deck a round needs so every intruder's hand can be dealt."""
    return max(1, math.ceil(intruder_count / MAX_CARD_DRAWS_PER_MEETING))


# Latecomers who join a round already under way (see Game.admit_latecomers).
# Each rolls for intruder. The odds lean toward 1 intruder per 5 living players: higher when the
# crew has voted intruders out (the room is short of them), lower when intruders have picked off
# crew. A floor keeps the door open in every room; a cap below half keeps arriving late from being
# suspicious on its own.
LATE_INTRUDER_ODDS = 0.20
LATE_INTRUDER_ODDS_PER_MISSING = 0.20
LATE_INTRUDER_ODDS_MIN = 0.10
LATE_INTRUDER_ODDS_MAX = 0.40
# Live joins only while living crew outnumber living intruders by this much with the newcomer
# counted as an intruder, so a late intruder can never tip the round over on arrival.
LATE_JOIN_MIN_CREW_LEAD = 3


def late_intruder_odds(living_players, living_intruders):
    """Chance a latecomer is dealt intruder, from the room as it stands now.

    "Expected" is what Auto would deal a room of the living players plus the newcomer, so the
    odds follow the same rounding as Start does.
    """
    expected = auto_intruder_count(living_players + 1)
    odds = LATE_INTRUDER_ODDS + LATE_INTRUDER_ODDS_PER_MISSING * (expected - living_intruders)
    return min(max(odds, LATE_INTRUDER_ODDS_MIN), LATE_INTRUDER_ODDS_MAX)


def late_task_goal_increase(tasks_per_crewmate):
    """Tasks added to the goal for every latecomer, whatever role they drew, so the bar can't tell:
    one crewmate's share times the chance of being crew."""
    return round(tasks_per_crewmate * (1 - 1 / PLAYERS_PER_INTRUDER))

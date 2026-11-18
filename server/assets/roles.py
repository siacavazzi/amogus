"""The Hacker and the Detective: two secret roles a host can turn on ("Roles: Auto").

Design (Sam, Nov 17 2026, doc "New roles for Sus Party"): both roles are blind. Nobody knows who
the Hacker or the Detective is, and they don't know anyone's side. Only intruders see each other.
At round start every phone and the big screen say what is in play ("Among you: 1 intruder,
1 hacker"). Who gets a role comes from a fixed table by player count:

    3 to 5 players   none
    6 to 9           Hacker      (crew won 78% of these rounds; aim about 65%)
    10 to 14         Detective   (crew won about 33%; aim 40 to 45%)
    15+              both

Hacker (intruders' side, can't tag): does tasks like a crewmate, but they don't fill the bar.
Starts with 1 card and is offered 2 cards to pick from every 2 finished tasks, holding up to 3,
one play every 45 s. Every play leaves a trail: their phone glitches red for 3 s, the intruders
get an unnamed ping ("The Hacker sent Maya to the Garage"), and the next meeting lists the
card and the area of the Hacker's task. A Taunt between the Hacker and an intruder is still
delivered, and the sender learns who they hit. In a meltdown the Hacker also gets a hacker code
that undoes one entered code and takes 10 s off when someone types it.

Detective (crew): after each meeting, one check on a living player: "Intruder", "Hacker" or
"Not an intruder". Also sees who voted for whom in every finished meeting. No cards.

The Hacker isn't crew, so the "crew outnumbered" check doesn't count them; voting them out
doesn't win the round. The Detective is crew in every count.
"""
import random
import time

from assets.utils import send_message_to_player

ROLES_OFF = 'off'
ROLES_AUTO = 'auto'
ROLES_MODES = (ROLES_OFF, ROLES_AUTO)
ROLES_DEFAULT = ROLES_OFF  # Off until it has been played on beta (doc: rollout step 2)

HACKER_PLAYERS = (6, 9)
DETECTIVE_PLAYERS = (10, 14)
BOTH_FROM = 15

HACKER_START_CARDS = 1
HACKER_TASKS_PER_CARD = 2
HACKER_HAND = 3
HACKER_OFFER = 2
HACKER_PLAY_GAP_SECONDS = 45
HACKER_GLITCH_SECONDS = 3
HACKER_CODE_PENALTY_SECONDS = 10
HACKER_CODES_PER_MELTDOWN = 1

HACKER_CARDS = ('EMP', 'Fake Task', 'Taunt Message', 'Area Denial')
HACKER_REACTOR_CARDS = ('Remote Sabotage', 'Shorten Meltdown')

CHECK_INTRUDER = 'intruder'
CHECK_HACKER = 'hacker'
CHECK_CLEAR = 'not_intruder'


def sanitize_mode(mode):
    return mode if mode in ROLES_MODES else ROLES_DEFAULT


def roles_for(player_count):
    """(hacker, detective) for a round with this many players."""
    hacker = HACKER_PLAYERS[0] <= player_count <= HACKER_PLAYERS[1] or player_count >= BOTH_FROM
    detective = player_count >= DETECTIVE_PLAYERS[0]
    return hacker, detective


def next_round_roles(game):
    """['hacker', 'detective'] the next Start would deal at the current headcount."""
    if getattr(game, 'roles_mode', ROLES_DEFAULT) != ROLES_AUTO:
        return []
    hacker, detective = roles_for(len(game.players))
    return [name for name, on in (('hacker', hacker), ('detective', detective)) if on]


def deal(game):
    """Hand out the roles after the intruders are picked. Returns (hackers, detectives) dealt."""
    for player in game.players:
        player.role = 'intruder' if player.sus else 'crew'
    game.round_roles = {'hackers': 0, 'detectives': 0}
    game.hacker_trail = []
    game.vote_history = []
    if (getattr(game, 'roles_mode', ROLES_DEFAULT) != ROLES_AUTO or game.test_mode
            or getattr(game, 'ruleset', 'standard') != 'standard'):
        return 0, 0
    want_hacker, want_detective = roles_for(len(game.players))
    crew = [player for player in game.players if not player.sus]
    random.shuffle(crew)
    # Never leave the crew so small that one tag ends the round at once.
    if want_hacker and len(crew) - 1 > game.numIntruders + 1:
        hacker = crew.pop()
        hacker.role = 'hacker'
        for _ in range(HACKER_START_CARDS):
            card = new_card(game)
            if card:
                hacker.cards.append(card)
        game.round_roles['hackers'] = 1
    if want_detective and crew:
        crew.pop().role = 'detective'
        game.round_roles['detectives'] = 1
    return game.round_roles['hackers'], game.round_roles['detectives']


def among_you(game):
    """What every phone and the big screen are told at round start."""
    roles = getattr(game, 'round_roles', None) or {}
    return {
        'intruders': getattr(game, 'round_intruder_count', None) or game.numIntruders,
        'hackers': roles.get('hackers', 0),
        'detectives': roles.get('detectives', 0),
    }


def hackers_left(game):
    """Hackers still in the round, for the round screen's pill. None when no Hacker was dealt."""
    if not game.game_running or not (getattr(game, 'round_roles', None) or {}).get('hackers'):
        return None
    return sum(1 for player in game.players if player.is_hacker and player.alive)


def player_role(player):
    return getattr(player, 'role', None) or ('intruder' if player.sus else 'crew')


# ---------------------------------------------------------------- Hacker cards

def card_kinds(game):
    kinds = list(HACKER_CARDS)
    if game.has_reactor and getattr(game, 'card_deck_preset', 'default') != 'no_reactor_cards':
        kinds += list(HACKER_REACTOR_CARDS)
    if not [loc for loc in (game.locations or []) if loc and loc != 'Other']:
        kinds.remove('Area Denial')
    return kinds


def new_card(game, avoid=()):
    """A fresh card for the Hacker. The Hacker's cards are their own, so the intruders' deck
    never runs short because of them."""
    from assets.card import Card  # card.py imports this module
    kinds = [kind for kind in card_kinds(game) if kind not in avoid] or card_kinds(game)
    kind = random.choice(kinds)
    deck = game.card_deck
    if kind == 'EMP':
        card = Card('EMP', 'Disable all devices for the duration', deck, duration=random.choice((30, 60)))
    elif kind == 'Fake Task':
        card = Card('Fake Task', 'Send a fake Priority task', deck, requires_input=True)
    elif kind == 'Taunt Message':
        card = Card('Taunt Message', 'Send a message to a player of your choice', deck, requires_input=True)
    elif kind == 'Area Denial':
        areas = [loc for loc in game.locations if loc and loc != 'Other']
        card = Card('Area Denial', "Lock an area: its tasks can't be done", deck,
                    duration=random.choice((60, 120)), countdown=True, location=random.choice(areas))
    elif kind == 'Remote Sabotage':
        card = Card('Remote Sabotage', 'Trigger a sabotage remotely', deck)
    else:
        card = Card('Shorten Meltdown', 'Reduce the amount of time players have to stop the next meltdown',
                    deck, duration=random.choice((10, 12, 15)))
    card.hacker = True
    return card


def offer_cards(game, player):
    """Two cards to pick one from, if the Hacker has room for one."""
    if player.card_offer or len(player.cards) >= HACKER_HAND:
        return False
    first = new_card(game)
    second = new_card(game, avoid=(first.action,))
    player.card_offer = [first, second]
    return True


def pick_offer(game, player, card_id):
    card = next((offered for offered in player.card_offer if offered.id == card_id), None)
    if not card or len(player.cards) >= HACKER_HAND:
        return False
    player.cards.append(card)
    player.card_offer = []
    game.revision += 1
    return True


def on_task_done(game, player):
    """A Hacker finished a task: every HACKER_TASKS_PER_CARD of them earns a pick of 2 cards."""
    if not player.is_hacker:
        return False
    player.hacker_tasks += 1
    if player.hacker_tasks < HACKER_TASKS_PER_CARD:
        return False
    if len(player.cards) >= HACKER_HAND or player.card_offer:
        return False  # A full hand doesn't bank tasks: play a card to earn again.
    player.hacker_tasks = 0
    return offer_cards(game, player)


def play_wait(player, now=None):
    """Seconds until the Hacker may play another card (0 when they can)."""
    if not player.is_hacker or player.hacker_last_play is None:
        return 0
    now = time.monotonic() if now is None else now
    return max(0, int(round(HACKER_PLAY_GAP_SECONDS - (now - player.hacker_last_play))))


def hacker_area(player):
    task = player.task
    location = (task or {}).get('location') if task else None
    return location if location and location != 'Other' else None


def after_play(game, player, card, ping):
    """A Hacker card went off: the glitch on their own phone, the meeting trail, the intruders' ping."""
    player.hacker_last_play = time.monotonic()
    game.hacker_trail.append({'card': card.action, 'area': hacker_area(player)})
    if player.sid:
        game.socket.emit('hacker_glitch', {'seconds': HACKER_GLITCH_SECONDS}, to=player.sid)
    for other in game.players:
        if other.sus and other.alive:
            send_message_to_player(game.socket, other, ping)


def ping_for(card, target=None, location=None):
    """What the intruders are told when the Hacker plays. Never the Hacker's name."""
    if card.action == 'Fake Task' and target:
        if location and location != 'Other':
            return f"The Hacker sent {target.username} to {location}."
        return f"The Hacker sent {target.username} a fake task."
    if card.action == 'Area Denial':
        return f"The Hacker locked {card.location} for {card.duration} seconds."
    if card.action == 'Taunt Message' and target:
        return f"The Hacker sent {target.username} a taunt."
    if card.action == 'EMP':
        return f"The Hacker set off an EMP for {card.duration} seconds."
    if card.action == 'Remote Sabotage':
        return "The Hacker started a meltdown."
    if card.action == 'Shorten Meltdown':
        return f"The Hacker shortened the next meltdown by {card.duration} seconds."
    return f"The Hacker played {card.action}."


def meeting_trail(game):
    """The Hacker's cards since the last meeting, for the meeting screens. Then a fresh list."""
    trail = list(getattr(game, 'hacker_trail', None) or [])
    game.hacker_trail = []
    return trail


# ---------------------------------------------------------------- Meltdown

def hacker_codes(meltdown, used_pins):
    """One look-alike hacker code per living Hacker. Returns {pin: hacker}."""
    codes = {}
    for player in meltdown.living_players:
        if not player.is_hacker:
            continue
        for _ in range(HACKER_CODES_PER_MELTDOWN):
            pin = random.randint(1000, 9999)
            while pin in used_pins or pin in codes:
                pin = random.randint(1000, 9999)
            codes[pin] = player
            player.hacker_code = pin
    return codes


# ---------------------------------------------------------------- Detective

def check_result(target):
    if target.sus:
        return CHECK_INTRUDER
    if target.is_hacker:
        return CHECK_HACKER
    return CHECK_CLEAR


def open_checks(game):
    """A meeting ended: each living Detective gets one check."""
    for player in game.players:
        if player.is_detective and player.alive:
            player.check_ready = True
            emit_detective(game, player)


def run_check(game, detective, target):
    """Returns the result, or None when the check isn't allowed."""
    if (not detective.is_detective or not detective.alive or not detective.check_ready
            or not target or target is detective or not target.alive or target not in game.players):
        return None
    detective.check_ready = False
    result = check_result(target)
    detective.checks.append({'player_id': target.player_id, 'name': target.username, 'result': result,
                             'meeting': game.stats.get('meetings_called', 0)})
    game.revision += 1
    return result


def record_votes(game, meeting, ballots, vetoes):
    """Keep who voted for whom in a finished meeting, for the Detective only. `ballots` is the
    voter id -> target id map as it stood when the meeting ended."""
    names = {player.player_id: player.username for player in game.players}
    history = getattr(game, 'vote_history', None)
    if history is None:
        game.vote_history = history = []
    history.append({
        'meeting': len(history) + 1,
        'votes': [{'voter': names.get(voter, '?'), 'target': names.get(target, '?')}
                  for voter, target in ballots.items()],
        'skipped': [names.get(voter, '?') for voter in vetoes],
        'outcome': 'veto' if meeting.reason == 'veto' else 'voted_out' if meeting.voted_out else 'no_one',
        'voted_out': names.get(meeting.voted_out) if meeting.voted_out else None,
    })


def detective_state(game, player):
    """What a Detective's own phone shows; None for everyone else."""
    if player is None or not player.is_detective:
        return None
    return {
        'check_ready': bool(player.check_ready and player.alive and not game.end_state),
        'checks': list(player.checks),
        'vote_history': list(getattr(game, 'vote_history', None) or []),
    }


def emit_detective(game, player):
    state = detective_state(game, player)
    if state is not None and player.sid:
        game.socket.emit('detective_state', game._add_state_metadata(state), to=player.sid)

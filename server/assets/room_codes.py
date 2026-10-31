"""Room codes people can read off a big screen and type without mistakes.

Prod logs showed players typing EJOR, EJGR or EHQR for EJQR, and BAIT for BAJT,
so codes only use letters that don't look alike. Anything typed that a
player could have meant as one of those letters is read as that letter.
"""
import random
import re

# No O/Q/G/C/D (round letters), I/J/L (sticks), B/P (vs R), S, Z, U/V,
# N (vs M), F (vs E), K (KKK).
ROOM_CODE_ALPHABET = 'AEHMRTWXY'
ROOM_CODE_LENGTH = 4

# Only characters with one clear twin in the alphabet
LOOKALIKES = {
    '4': 'A',
    '3': 'E', 'F': 'E',
    'P': 'R',
    '7': 'T',
    'V': 'Y',
}

# Words a random room code must not contain (kids and youth groups play).
# Same list as the lobby fixes branch, so either can merge first.
BLOCKED_WORDS = (
    'FUCK', 'FUK', 'FCK', 'SHIT', 'CUNT', 'COCK', 'DICK', 'DIK', 'PUSS', 'TWAT', 'SLUT', 'WHOR', 'HOE',
    'FAG', 'NIG', 'NGR', 'KKK', 'CUM', 'JIZ', 'TIT', 'ASS', 'ARSE', 'PISS', 'PORN', 'SEX', 'RAPE', 'NAZI',
    'POO', 'PEE', 'POOP', 'BUTT', 'PENI', 'DAMN', 'HELL', 'BOOB', 'WANK', 'SPIC', 'GOOK', 'DYKE', 'KIKE',
)


def random_room_code(taken=(), length=ROOM_CODE_LENGTH):
    """A code nobody is using that doesn't spell anything rude."""
    while True:
        code = ''.join(random.choices(ROOM_CODE_ALPHABET, k=length))
        if code not in taken and not any(word in code for word in BLOCKED_WORDS):
            return code


def clean_room_code(value):
    """What the player typed: upper case, no spaces or dashes."""
    if not isinstance(value, str):
        return ''
    return re.sub(r'[^A-Z0-9]', '', value.upper())


def canonical_room_code(value):
    """The code the player most likely meant."""
    return ''.join(LOOKALIKES.get(ch, ch) for ch in clean_room_code(value))


def has_unused_letters(value):
    """True when a typed code has letters room codes never use."""
    return any(ch not in ROOM_CODE_ALPHABET for ch in canonical_room_code(value))

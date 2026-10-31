// How many intruders a room gets on Auto. Matches server/assets/scaling.py:
// one per five players, so each intruder needs about three eliminations to win at any size.
export const PLAYERS_PER_INTRUDER = 5;

export function autoIntruderCount(playerCount) {
    return Math.max(1, Math.floor((playerCount + 2) / PLAYERS_PER_INTRUDER));
}

// The headcounts Auto would give this many intruders, e.g. 2 -> [8, 12].
export function playersForIntruders(intruders) {
    if (intruders <= 1) return [3, 7];
    return [intruders * PLAYERS_PER_INTRUDER - 2, intruders * PLAYERS_PER_INTRUDER + 2];
}

export const AUTO_INTRUDERS_SUMMARY = '1 intruder for 3 to 7 players, 2 for 8 to 12, 3 for 13 to 17, and one more for every 5 players after that';

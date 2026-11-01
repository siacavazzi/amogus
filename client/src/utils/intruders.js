// How many intruders a room gets on Auto. Matches server/assets/scaling.py:
// one per full five players, so an intruder never needs fewer than three eliminations to win.
export const PLAYERS_PER_INTRUDER = 5;

export function autoIntruderCount(playerCount) {
    return Math.max(1, Math.floor(playerCount / PLAYERS_PER_INTRUDER));
}

// The headcounts Auto would give this many intruders, e.g. 2 -> [10, 14].
export function playersForIntruders(intruders) {
    if (intruders <= 1) return [3, 9];
    return [intruders * PLAYERS_PER_INTRUDER, intruders * PLAYERS_PER_INTRUDER + 4];
}

export const AUTO_INTRUDERS_SUMMARY = '1 intruder for 3 to 9 players, 2 for 10 to 14, 3 for 15 to 19, and one more for every 5 players after that';

// Tasks per crewmate on Auto, also from scaling.py: a lone intruder is caught fast, so crew need more.
export const TASKS_PER_CREWMATE = 6;
export const AUTO_TASKS_SUMMARY = '10 tasks per crewmate with 1 intruder, 6 with 2 or more. Finishing them reveals the intruders and calls a meeting.';

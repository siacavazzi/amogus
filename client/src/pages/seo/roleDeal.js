// Pure helpers for the role generator, kept apart from the page for tests.
export const MAX_PLAYERS = 20;

export function parseNames(text, count) {
    const names = text.split('\n').map(name => name.trim()).filter(Boolean).slice(0, MAX_PLAYERS);
    if (names.length) return names;
    return Array.from({ length: count }, (_, index) => `Player ${index + 1}`);
}

export function suggestedIntruders(playerCount) {
    if (playerCount >= 15) return 3;
    if (playerCount >= 10) return 2;
    return 1;
}

function randomIndex(limit, random) {
    if (random) return Math.floor(random() * limit);
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    return values[0] % limit;
}

// Returns one { name, role } per player, in the order the names were given.
export function dealRoles(names, intruderCount, specialRoles = [], random) {
    const roles = [
        ...Array(Math.min(intruderCount, names.length - 1)).fill('Intruder'),
        ...specialRoles,
    ].slice(0, names.length);
    while (roles.length < names.length) roles.push('Crew');
    for (let i = roles.length - 1; i > 0; i--) {
        const j = randomIndex(i + 1, random);
        [roles[i], roles[j]] = [roles[j], roles[i]];
    }
    return names.map((name, index) => ({ name, role: roles[index] }));
}

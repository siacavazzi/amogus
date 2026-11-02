// What each intruder card is called on the phone, what it does and when to play it.
// Keys match the `action` strings in server/assets/card.py; the server's own text is the fallback.
const CARD_COPY = {
    'Self Report': {
        name: 'Emergency Meeting',
        does: () => 'Call a meeting right now.',
        when: 'Use it to cover a kill, or to stop a crewmate who is onto you.',
    },
    'EMP': {
        name: 'EMP',
        does: ({ duration }) => `Every phone goes down for ${duration || 30}s. No tasks, no meetings.`,
        when: 'Play it just before you go for a kill.',
    },
    'Area Denial': {
        name: 'Area Denial',
        does: ({ location, duration }) => `No tasks go to ${location || 'one room'} for ${duration ? `${Math.round(duration / 60 * 10) / 10} min` : 'a while'}.`,
        when: 'Keep the crew away from where you plan to strike.',
    },
    'Fake Task': {
        name: 'Fake Task',
        does: () => 'Send a crewmate on a made-up errand.',
        when: 'Send them somewhere quiet, then meet them there.',
    },
    'Taunt Message': {
        name: 'Taunt Message',
        does: () => 'Text one crewmate without your name on it.',
        when: 'Spook them, or point them at someone else.',
    },
    'Remote Sabotage': {
        name: 'Remote Sabotage',
        does: () => 'Start a meltdown from anywhere.',
        when: 'Everyone has to run to the reactor. Pick off a straggler.',
    },
    'Shorten Meltdown': {
        name: 'Shorten Meltdown',
        does: ({ duration }) => `The next meltdown gives the crew ${duration || 10}s less.`,
        when: 'Play it before you start a meltdown.',
    },
};

export function cardName(action) {
    return CARD_COPY[action]?.name || (action || '').replace('_', ' ');
}

// { name, does, when } for a card object from the server ({ action, text, location, duration }).
export function cardCopy(card = {}) {
    const copy = CARD_COPY[card.action];
    if (!copy) return { name: cardName(card.action), does: card.text || '', when: '' };
    return { name: copy.name, does: copy.does(card), when: copy.when };
}

// "Fake Task and EMP" for the role reveal.
export function listCardNames(cards = []) {
    const names = cards.map((card) => cardName(card.action));
    if (names.length <= 1) return names.join('');
    return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

// The player's own cards arrive as JSON strings.
export function parseCards(cards = []) {
    return (cards || [])
        .map((card) => {
            if (card && typeof card === 'object') return card;
            try { return JSON.parse(card); }
            catch (e) { return null; }
        })
        .filter(Boolean);
}

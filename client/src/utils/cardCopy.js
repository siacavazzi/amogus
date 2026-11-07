import { t } from '../i18n';

// What each intruder card is called on the phone, what it does and when to play it.
// Keys match the `action` strings in server/assets/card.py; the server's own text is the fallback.
const CARD_COPY = {
    'Self Report': {
        name: () => t('Emergency Meeting'),
        does: () => t('Call a meeting right now.'),
        when: () => t('Use it to cover a kill, or to stop a crewmate who is onto you.'),
    },
    'EMP': {
        name: () => t('EMP'),
        does: ({ duration }) => t('Every phone goes down for {seconds}s. No tasks, no meetings.', { seconds: duration || 30 }),
        when: () => t('Play it just before you go for a kill.'),
    },
    'Area Denial': {
        name: () => t('Area Denial'),
        does: ({ location, duration }) => (duration
            ? t('No tasks go to {location} for {minutes} min.', { location: location || t('one room'), minutes: Math.round(duration / 60 * 10) / 10 })
            : t('No tasks go to {location} for a while.', { location: location || t('one room') })),
        when: () => t('Keep the crew away from where you plan to strike.'),
    },
    'Fake Task': {
        name: () => t('Fake Task'),
        does: () => t('Send a crewmate on a made-up errand.'),
        when: () => t('Send them somewhere quiet, then meet them there.'),
    },
    'Taunt Message': {
        name: () => t('Taunt Message'),
        does: () => t('Text one crewmate without your name on it.'),
        when: () => t('Spook them, or point them at someone else.'),
    },
    'Remote Sabotage': {
        name: () => t('Remote Sabotage'),
        does: () => t('Start a meltdown from anywhere.'),
        when: () => t('Everyone has to run to the reactor. Pick off a straggler.'),
    },
    'Shorten Meltdown': {
        name: () => t('Shorten Meltdown'),
        does: ({ duration }) => t('The next meltdown gives the crew {seconds}s less.', { seconds: duration || 10 }),
        when: () => t('Play it before you start a meltdown.'),
    },
};

export function cardName(action) {
    return CARD_COPY[action]?.name() || (action || '').replace('_', ' ');
}

// { name, does, when } for a card object from the server ({ action, text, location, duration }).
export function cardCopy(card = {}) {
    const copy = CARD_COPY[card.action];
    if (!copy) return { name: cardName(card.action), does: card.text || '', when: '' };
    return { name: copy.name(), does: copy.does(card), when: copy.when() };
}

// "Fake Task and EMP" for the role reveal.
export function listCardNames(cards = []) {
    const names = cards.map((card) => cardName(card.action));
    if (names.length <= 1) return names.join('');
    return t('{list} and {last}', { list: names.slice(0, -1).join(', '), last: names[names.length - 1] });
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

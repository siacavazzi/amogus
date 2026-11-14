// Short landing pages for broader searches. Each one says what Sus Party is in a sentence
// and sends people to a task pack that suits the search.
const gen = query => `/among-us-irl-task-generator?${query}`;

const QUICK_PAGES = {
    '/sus-games': {
        title: 'Sus Games: A Free "Who\'s Sus?" Party Game | Sus Party',
        description: 'Looking for a sus game to play with friends? Sus Party is a free in-person game like Among Us IRL or Mafia: secret roles on your phones, real tasks, and one big vote.',
        eyebrow: 'Sus games · Play in person',
        h1: 'The sus game you play in real life',
        lead: 'Sus Party is a free party game where one or more friends are secretly the intruder. Everyone else does small real tasks around the house. Then you all argue about who was acting sus.',
        pack: { href: gen('venue=house&players=10&style=75'), label: 'Start with the 10-player house pack' },
        stepsTitle: 'From link to first accusation',
        steps: [
            ['Open the house pack', 'It starts with ten players and short tasks like stacking three cups. Swap in rooms you actually have.'],
            ['Send the room code', 'Friends open susparty.com on their phones and type the four-letter code. Nothing to download.'],
            ['Watch who acts weird', 'Roles appear on each phone. Do your tasks, keep an eye on everyone, and call a meeting when something feels off.'],
        ],
        cta: { title: 'Somebody here is sus.', text: 'Open the house pack, check the rooms, and press \u201cUse this pack\u201d. Your game is created with the tasks loaded.' },
        sections: [
            {
                h2: 'Like Among Us, but the map is your house',
                body: [
                    'If you have played Among Us, you already know the idea. Crew members do tasks. Intruders fake tasks and take people out. When a body turns up, everyone meets and votes.',
                    'In Sus Party it all happens for real. Your kitchen, hallway and living room are the map. The tasks are things like stacking three cups or writing a word on a sticky note. Your phone tells you your role and your next task, and you vote on it too.',
                ],
            },
            {
                h2: 'What makes someone sus',
                body: [
                    'They said they were in the kitchen, but nobody saw them there. They walked away right before the body was found. They are very calm about all of it. That is the whole game: watch people, remember who was where, and decide whose story falls apart.',
                ],
            },
            {
                h2: 'How to play the intruder without looking sus',
                body: [
                    'Stand at a task for about as long as it would really take. Pick a story early and stick to it. Do not be the first to accuse someone, and do not be the last to agree. Tap people out when nobody else is in the room, then walk somewhere busy.',
                    'Crew can turn this around: ask people to describe the task they just did. Real crew remember the details. Intruders tend to keep it vague.',
                ],
            },
        ],
        faqs: [
            { q: 'Do we need to know Among Us?', a: 'No. The rules take about two minutes to explain, and there is a short tutorial in the app.' },
            { q: 'How many players?', a: 'At least 3, and it works for 20+. The game picks one intruder for every five players on Auto.' },
            { q: 'Is Sus Party the official Among Us?', a: 'No. Sus Party is an independent game, not made or endorsed by Innersloth.' },
        ],
    },

    '/mafia-game-app': {
        title: 'Mafia Game App: Play Mafia With Phones, No Narrator | Sus Party',
        description: 'Sus Party is a free Mafia-style game app for in-person groups. Phones deal the roles and count the votes, so nobody has to narrate. Everyone moves around and plays.',
        eyebrow: 'Mafia game app · No narrator needed',
        h1: 'Mafia with phones, and nobody has to be the narrator',
        lead: 'Sus Party is a free game like Mafia, crossed with Among Us in real life. Phones hand out the secret roles and count the votes, so everyone gets to play, including the person who organized it.',
        pack: { href: gen('venue=house&players=10&style=50'), label: 'Start with the 10-player house pack' },
        stepsTitle: 'Run it without a narrator',
        steps: [
            ['Choose the rooms', 'The house pack fills each room with quick tasks. Edit or remove any of them.'],
            ['Everyone joins on their phone', 'Players type the room code at susparty.com. The phones deal the roles, so nobody sees who got what.'],
            ['Play, then vote', 'Meetings and votes run on the phones and the result is counted for you. The organizer plays like everyone else.'],
        ],
        cta: { title: 'Give the narrator a role too.', text: 'Open the house pack, check the rooms, and press \u201cUse this pack\u201d. The game deals the roles and counts the votes.' },
        sections: [
            {
                h2: 'How it is like Mafia',
                body: [
                    'A few players are secretly the bad guys. Everyone else has to work out who they are by talking, bluffing and voting people out. If you like Mafia, Werewolf or The Traitors, you will know what to do.',
                ],
            },
            {
                h2: 'How it is different',
                body: [
                    'There are no night and day phases, and nobody closes their eyes. Instead, everyone walks around doing small real tasks. Intruders take people out in real time when nobody is looking. When someone finds a body, the group meets up and argues.',
                    'That means the clues are real. Who left the kitchen right before the body was found? Who was nowhere near their task? It also means nobody sits around waiting. Even players who are out keep the secret and watch the rest unfold.',
                ],
            },
            {
                h2: 'Mafia roles and their Sus Party match',
                body: [
                    '<strong>Mafia</strong> are the intruders: they pick off players in secret and try to blend in. <strong>Villagers</strong> are the crew: they win by voting out every intruder, or by finishing all the tasks first. There is no doctor or detective. Instead, intruders get sabotage cards that cause trouble for the crew, and the crew gets clues from watching who was where.',
                    'Like a good Mafia game, it gets better with more people. Groups of 8 to 15 get two intruders on Auto and long, loud meetings.',
                ],
            },
        ],
        faqs: [
            { q: 'How many players?', a: 'At least 3, and it works well for 20+. On Auto, the game picks one intruder for every five players.' },
            { q: 'Do we need cards?', a: 'No. Roles, tasks and votes are all on the phones. You just need some rooms to spread out in.' },
            { q: 'Can I still run classic Mafia with it?', a: 'No. Sus Party has its own rules built around real tasks and moving around.' },
        ],
    },

};

export const QUICK_PAGE_PATHS = Object.keys(QUICK_PAGES);
export default QUICK_PAGES;

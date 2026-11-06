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
        ],
        faqs: [
            { q: 'Do we need to know Among Us?', a: 'No. The rules take about two minutes to explain, and there is a short tutorial in the app.' },
            { q: 'How many players?', a: 'At least 3, and it works for 20+. The game picks one intruder for every five players on Auto.' },
            { q: 'Is Sus Party the official Among Us?', a: 'No. Sus Party is an independent game, not made or endorsed by Innersloth.' },
        ],
    },

    '/among-us-party-game': {
        title: 'Among Us Party Game for Real Life, Free on Phones | Sus Party',
        description: 'Turn an Among Us party into a real game. Sus Party gives every guest a secret role on their phone and real tasks around the venue. Free, no app download, 3 to 20+ players.',
        eyebrow: 'Among Us party game · For any party',
        h1: 'The Among Us party game, played for real',
        lead: 'Throwing an Among Us themed party? Sus Party is the game to play at it. Guests get crewmate or intruder roles on their phones, do real tasks around your place, and vote out whoever they think is sus.',
        pack: { href: gen('venue=house&players=12&style=75'), label: 'Start with the 12-player party pack' },
        sections: [
            {
                h2: 'Why it works at a party',
                body: [
                    'Guests do not need to sit still or know the rules ahead of time. They walk around, do quick tasks, run into each other, and gossip. Late arrivals can join the next round with the same room code.',
                    'The host sets up once, about five minutes before people arrive: pick a task pack, check the rooms, and open the room. After that the app runs the game, so the host plays too.',
                ],
            },
            {
                h2: 'Make it feel like a party',
                body: [
                    'Put a laptop or TV in the meeting room to show the shared game screen. Use party cups and plates as task props. Hand the winning team the first slice of cake. Keep rounds short so new guests can rotate in.',
                    'Throwing it for a birthday? See the guides for an <a href="/among-us-birthday-party">Among Us birthday party</a> and an <a href="/among-us-party-for-kids">Among Us party for kids</a>.',
                ],
            },
        ],
        faqs: [
            { q: 'What ages is it for?', a: 'Anyone who can read a short task on a phone. Kids and adults play the same game, often together.' },
            { q: 'How long does a round take?', a: 'About 10 to 20 minutes. Most parties play three or four rounds.' },
            { q: 'Can we play outside?', a: 'Yes. Add the yard or garden as an area in the task pack.' },
        ],
    },

    '/mafia-game-app': {
        title: 'Mafia Game App: Play Mafia With Phones, No Narrator | Sus Party',
        description: 'Sus Party is a free Mafia-style game app for in-person groups. Phones deal the roles and count the votes, so nobody has to narrate. Everyone moves around and plays.',
        eyebrow: 'Mafia game app · No narrator needed',
        h1: 'Mafia with phones, and nobody has to be the narrator',
        lead: 'Sus Party is a free game like Mafia, crossed with Among Us in real life. Phones hand out the secret roles and count the votes, so everyone gets to play, including the person who organized it.',
        pack: { href: gen('venue=house&players=10&style=50'), label: 'Start with the 10-player house pack' },
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
        ],
        faqs: [
            { q: 'How many players?', a: 'At least 3, and it works well for 20+. On Auto, the game picks one intruder for every five players.' },
            { q: 'Do we need cards?', a: 'No. Roles, tasks and votes are all on the phones. You just need some rooms to spread out in.' },
            { q: 'Can I still run classic Mafia with it?', a: 'No. Sus Party has its own rules built around real tasks and moving around.' },
        ],
    },

    '/chore-game-app': {
        title: 'Chore Game App: Turn Cleaning Into a Party Game | Sus Party',
        description: 'A free chore game app for families and roommates. Sus Party turns real chores into Among Us style tasks on your phones, with a hidden intruder to catch.',
        eyebrow: 'Chore game app · Families and roommates',
        h1: 'A chore game app that makes cleaning a game',
        lead: 'Sus Party turns your to-do list into an Among Us style game. Every chore becomes a task on someone\'s phone. One player is secretly the intruder. Finish the chores, catch the intruder, and the house is clean.',
        pack: { href: gen('preset=cleanup&players=4'), label: 'Start with the household chores pack' },
        sections: [
            {
                h2: 'How the chore game works',
                body: [
                    'Open the chores pack and pick the rooms that need work. Each player gets real jobs on their phone, like loading the dishwasher, putting shoes away or wiping the table. When they finish, they mark it done and get the next one.',
                    'Meanwhile one player is the intruder. They still pitch in to look busy, but their goal is to tap people out without getting caught. Meetings stop the cleaning for a minute of accusations, then everyone gets back to it.',
                ],
            },
            {
                h2: 'Who it is for',
                body: [
                    'Families with kids who need a reason to tidy up, roommates splitting the Sunday reset, and anyone hosting a party who wants the cleanup to be the afterparty. For more ideas, see <a href="/chore-games-for-kids">chore games for kids</a> and <a href="/among-us-chores">Among Us chores</a>.',
                ],
            },
        ],
        faqs: [
            { q: 'How many people do we need?', a: 'Three or more. A family of four is a great size.' },
            { q: 'Can we add our own chores?', a: 'Yes. Edit any task or add your own before you start the game.' },
            { q: 'Is it free?', a: 'Yes. No ads, no account, no download.' },
        ],
    },
};

export const QUICK_PAGE_PATHS = Object.keys(QUICK_PAGES);
export default QUICK_PAGES;

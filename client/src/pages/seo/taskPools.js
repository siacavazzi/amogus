/** Location-based missions for the task generator. */
import { CLEANUP_TASKS } from './cleanupTasks';
import { autoIntruderCount } from '../../utils/intruders';
import fr from './taskLocales/fr.json';
import es from './taskLocales/es.json';
import de from './taskLocales/de.json';
import ro from './taskLocales/ro.json';
import pt from './taskLocales/pt.json';
import no from './taskLocales/no.json';
import sv from './taskLocales/sv.json';

// The same pools in the game's other languages (machine drafts, keyed by the English text).
// Room names the host typed stay as typed.
const TASK_LOCALES = { fr, es, de, ro, pt, no, sv };
const TASK_LANGUAGES = ['en', ...Object.keys(TASK_LOCALES)];

// Pools follow the task lists hosts write for real games: short, physical jobs that keep a
// player at the location for 10 to 40 seconds, then reset so the next player can redo them.
// Hosts mostly write actions (do reps, sit or hide for a time, land a throw, tidy, flip a
// switch, read or draw something, involve another player). They almost never write
// "count the X" or make-believe, so those stay rare here.
const practical = [
    'Fold one blanket, towel, or jacket and set it down neatly.',
    'Straighten every chair in this area.',
    'Find one thing that is out of place and put it where it belongs.',
    'Pick up anything on the floor here and put it away.',
    'Close every open drawer and cupboard door here.',
    'Fluff and straighten every cushion or pillow here.',
    'Stack the loose books, magazines, or papers here into one neat pile.',
    'Wipe one table or shelf with a dry cloth or tissue.',
    'Turn the lights off, count to five, and turn them back on.',
    'Open the curtains or blinds, then close them again.',
    'Open and close every door in this area once.',
    'Sit on every seat in this area for two seconds each.',
    'Sit on a chair here for 20 seconds without talking.',
    'Stand in the farthest corner and count slowly to 20.',
    'Stand completely still in the middle of this area for 15 seconds.',
    'Do 10 squats here.',
    'Do 5 push-ups here.',
    'Hold a plank for 15 seconds.',
    'Do a wall sit for 15 seconds.',
    'Do 10 jumping jacks here.',
    'Walk three laps around the biggest piece of furniture here.',
    'Touch all four walls of this area, then go back to the door.',
    'Hop on one foot from the door to the far wall.',
    'Balance on one foot for 20 seconds. If you wobble, start again.',
    'Flip a water bottle until it lands upright.',
    'Toss a balled-up sock or paper into a bin from three steps away. Keep going until it goes in.',
    'Build a tower of five objects that stands for five seconds, then put them back.',
    'Balance a book on your head and walk to the far wall and back.',
    'Throw a cushion up and catch it five times in a row.',
    'Line up five objects here from smallest to biggest, then put them back.',
    'Find three things of the same colour and set them side by side, then put them back.',
    'Find the oldest-looking thing in this area and hold it up for five seconds.',
    'Find something that makes a sound and make it make that sound.',
    'Find an object that starts with the first letter of your name and touch it.',
    'Count your steps from the door to the far wall, then walk back.',
    'Untie one shoe, then tie it again with a double knot.',
    'Take off one shoe, walk to the far wall, and put it back on.',
    'Put on any hat, scarf, or jacket here, then put it back.',
    'Read one full page of a book or magazine here.',
    'Find a book here and read its first sentence out loud.',
    'Read the label on any bottle, box, or tin here from top to bottom.',
    'Write your name on a scrap of paper or a whiteboard here, then bin it or erase it.',
    'Draw a quick cat on any paper or whiteboard here, then bin it or erase it.',
    'Turn a TV, radio, or speaker on, then turn it off again.',
    'Carry one small object from here to another task location and bring it back.',
    'Bring a cup of water to this area and drink it here.',
    'Win a game of rock paper scissors against another player before you leave.',
    'High-five another player here without saying a word.',
    'Ask another player their favourite snack and remember it until the next meeting.',
    'Shake hands with every player you find in this area.',
    'Swap places with another player in this area, then both go back.',
    'Arrange three objects here into a straight line, then put them back.',
    'Find a seat, sit down, and stand up again five times.',
    'Find a plant or a picture here and straighten it or turn it to face the room.',
    'Walk heel to toe in a straight line from the door to the far wall.',
    'Move one chair to the other side of this area, then move it back.',
    'Wait here quietly for 25 seconds.',
    'Carry a cup of water across the room without spilling, then pour it back.',
    'Ring a bell, press a doorbell, or knock three times on a door.',
    'Shuffle a deck of cards and put it back.',
    'Walk up three stairs and back down, three times.',
    'Open and shut a cupboard door three times without a sound.',
    'Sweep or brush a small patch of floor for 20 seconds.',
    'Plug a charger into a socket, then unplug it.',
];

const playful = [
    'Dance here for 20 seconds without any music.',
    'Sing "Happy Birthday" to this room, all the way through.',
    'Laugh out loud for five seconds at nothing at all.',
    'Slow dance with a coat, cushion, or broom for 15 seconds.',
    'Whisper "sus" to the next player you see.',
    'Strike your best model pose in a mirror or window for five seconds.',
    'Read any label here out loud in a dramatic movie-trailer voice.',
    'Hide somewhere in this area and stay hidden for 15 seconds.',
    'Look at a picture or poster here for 20 seconds and say out loud how beautiful it is.',
    'Do your best robot walk from the door to the far wall.',
    'Freeze like a statue for 15 seconds. If someone talks to you, stay frozen.',
    'Moonwalk from one wall to the other.',
    'Crawl from the door to the far wall.',
    'Play ten seconds of air guitar.',
    'Do a slow-motion run across this area.',
    'Give a two-sentence speech about why you are definitely not the intruder.',
    'Tell another player a joke, good or terrible.',
    'Give another player a compliment about their shoes.',
    'Make up a secret handshake with another player.',
    'Thumb-wrestle another player. Best of three.',
    'Write the name of the player you trust least on a scrap of paper, then bin it.',
    'Do your best evil laugh.',
    'Narrate what you are doing here like a nature documentary for 15 seconds.',
    'Fake a nap on the nearest seat for ten seconds, with snoring.',
    'Act out your favourite animal for ten seconds.',
    'Do any viral dance move for ten seconds.',
    'Hug a cushion or pillow and tell it a secret.',
    'Talk like a pirate to the next player you meet.',
    'Stand on one leg and sing the alphabet.',
    'Give this room a five-star review out loud.',
    'Count to 20 in your loudest whisper.',
    'Hold a staring contest with yourself in a mirror or window for ten seconds.',
    'Draw a smiley face on a scrap of paper and leave it for the next player.',
    'Do your best chicken walk to the door.',
    'Leave this area and make the most dramatic entrance you can.',
    'Take a bow and say "Thank you, thank you" to an imaginary crowd.',
    'Fake-sneeze three times as loudly as you dare.',
    'Sing one line of any song in your best opera voice.',
    'Say "red lorry, yellow lorry" five times fast.',
    'Lip-sync to a song in your head for ten seconds.',
    'Give another player a high-five, a fist bump, and a thumbs-up.',
    'Hold three yoga poses for five seconds each.',
    'Tiptoe across this area like you are sneaking past a sleeping dog.',
    'Spin around three times, then walk in a straight line to the door.',
    'Do an impression of another player for ten seconds. Do not say who.',
    'Wear a blanket or towel as a cape until you reach your next task, then put it back.',
    'Bow to the oldest object in this area.',
    'Hum a song for 15 seconds. If another player guesses it, you are done early.',
    'Do a happy dance as if you just won the game.',
    'Give the nearest door a polite knock and say "Room service".',
];

// Party vibe: loud, silly, on the move. Hosts' own party lists lean on sport (shots, flips,
// tricks), dares between players, and showing off.
const party = [
    'Shout "Not me!" as loud as you can, then walk away calmly.',
    'Do 10 jumping jacks while counting out loud.',
    'Beat another player at rock paper scissors twice in a row.',
    'Start a slow clap and keep it going for ten seconds.',
    'Do the worm, or your best try at it.',
    'Do a cartwheel, a forward roll, or a handstand against a wall.',
    'Land a bottle flip three times in a row.',
    'Bounce a ball ten times without losing it.',
    'Balance a spoon on your nose for five seconds.',
    'Wait up to 20 seconds and jump-scare the next player who walks in.',
    'Swap a hat, sock, or bracelet with another player until the next meeting.',
    'Teach another player a dance move and do it together.',
    'Fall onto a sofa or bed in dramatic slow motion.',
    'Play the loudest air-drum solo of your life for ten seconds.',
    'Do a celebrity impression until someone guesses who it is.',
    'Rap four lines about the room you are in.',
    'Do a runway walk across this area and strike a pose at the end.',
    'Cheer the name of the next player you see like a sports crowd.',
    'Do 5 burpees.',
    'Hold a squat while you sing "Twinkle, Twinkle, Little Star".',
    'Have a ten-second dance battle with another player.',
    'Balance a cushion on your head and turn around once.',
    'Do three karate kicks in the air, with sound effects.',
    'Make your loudest animal noise, then leave like nothing happened.',
    'Play air piano on a table for ten seconds like a concert star.',
    'Strike three superhero poses and hold each for three seconds.',
    'Arm-wrestle another player. Best of three.',
    'Do a lap of this area with high knees.',
    'Do a perfectly timed jump together with another player.',
    'Sing the chorus of any song as loudly as you dare.',
    'Run a victory lap of this area, waving to the crowd.',
    'Get another player to laugh without touching them.',
    'Do ten seconds of stand-up comedy for whoever is here.',
    'Make three shots into a bin with a ball or balled-up paper.',
    'Kick a ball or balled-up sock into a goal made of two shoes.',
    'Celebrate for ten seconds like you just won the lottery.',
    'Do the floss, the robot, or any video game dance for ten seconds.',
    'Talk in an accent until you reach your next task.',
    'Give 15 seconds of sports commentary on another player.',
    'Throw and catch a ball against a wall ten times.',
    'Walk like a penguin until you leave this area.',
    'Hold a plank while another player tells you a joke.',
    'Announce the next player who walks in like a boxing champion.',
    'Do your best Tarzan yell.',
];

// Chill vibe: calm jobs a player can do sitting or slowly: reading, drawing, small puzzles,
// tidying one thing, a breather.
const chill = [
    'Sit somewhere comfy and take five slow, deep breaths.',
    'Lie on the floor or a sofa and look at the ceiling for 20 seconds.',
    'Read the first paragraph of any book here.',
    'Doodle something you can see here, then bin it or keep it.',
    'Make up a three-word poem about this room and say it quietly.',
    'Build a card tower with at least three cards, then take it down.',
    'Make up a riddle and tell it to the next player you meet.',
    'Close your eyes for 15 seconds and name three sounds you hear.',
    'Stretch your arms, neck, and back for 20 seconds.',
    'Hold one easy yoga pose for 20 seconds.',
    'Sit down and have a sip of water.',
    'Water a plant here, or check if it needs water.',
    'Tidy one shelf or table so it looks nice.',
    'Fold a paper plane, fly it once, then bin it.',
    'Look out of a window for 20 seconds and find something new.',
    'Say the alphabet backwards from Z to P.',
    'Hum your favourite song quietly for 15 seconds.',
    'Name five things here that start with the letter S.',
    'Shuffle a deck of cards, deal four small piles, then stack it again.',
    'Arrange the cushions or pillows here from smallest to biggest.',
    'Sit back to back with another player for ten seconds without talking.',
    'Play one quiet game of tic-tac-toe with another player.',
    'Spell your full name backwards out loud.',
    'Make a tiny sculpture from three objects here, then put them back.',
    'Draw a quick map of this area on scrap paper, then bin it.',
    'Flip through a book or magazine until you find a picture of an animal.',
    'Find your pulse and feel it for 15 seconds.',
    'Turn off the light and sit in the dark for ten seconds.',
    'Close your eyes and touch your nose with each hand in turn.',
    'Write a word with your finger on a table and let another player guess it.',
    'Walk slowly around a table without making a sound.',
    'Sit on the floor and reach for your toes for 15 seconds.',
    'Pick the comfiest seat here and sit in it for 20 seconds.',
    'Quietly name three things you are grateful for.',
    'Coil the loose cables or chargers here into neat bundles.',
    'Line up every remote, phone, or charger here neatly.',
    'Fix your hair or clothes in a mirror.',
    'Watch a clock or timer for 20 seconds without looking away.',
    'Do ten slow shoulder rolls.',
    'Find a book and read its back cover.',
    'Balance a coin or bottle cap on its edge.',
    'Smell three different things here, like soap, a plant, or a candle.',
    'Whisper a secret to the quietest corner of this area.',
];

const TASKS = {
    any: practical.map(task => ({ task })),
    funny: playful.map(task => ({ task, funny: true })),
    party: party.map(task => ({ task, funny: true })),
    chill: chill.map(task => ({ task })),
    kitchen: [
        'Pour a glass of water and drink it.',
        'Wash and dry one cup, then put it away.',
        'Open the fridge and find the oldest thing inside.',
        'Stack three cups into a pyramid, then put them back.',
        'Line up three jars or cans by height.',
        'Set a place at the table for one person, then put everything back.',
        'Put three fridge magnets in a straight line.',
        'Wipe the counter next to the sink.',
        'Move one drink from the fridge to the table and back.',
        'Fold the dish towel and hang it back up.',
        'Turn the tap on and off without splashing.',
        'Find a spoon, a fork, and a knife and line them up.',
    ].map(task => ({ task })),
    living_room: [
        'Fold one blanket and put it back.',
        'Fluff every cushion on the sofa.',
        'Find the remote and put it on the table.',
        'Turn the TV on, then turn it off again.',
        'Straighten one picture frame.',
        'Read one page of a book from the shelf.',
        'Lie on the sofa for ten seconds.',
        'Take a board game off the shelf, open the box, close it, and put it back.',
        'Line up three books by colour.',
        'Put a cup or glass on a coaster.',
    ].map(task => ({ task })),
    bedroom: [
        'Make the bed a little better than you found it.',
        'Lie on the bed for ten seconds.',
        'Turn one pillow over to its cool side.',
        'Find two socks that match and put them together.',
        'Hang up one item of clothing.',
        'Line up three pairs of shoes.',
        'Close every open drawer in this room.',
        'Open the wardrobe and count five hangers.',
        'Sit at the desk or on the end of the bed for 15 seconds.',
        'Fold one blanket and put it back.',
    ].map(task => ({ task })),
    bathroom: [
        'Wash your hands for 20 seconds.',
        'Make your most serious face in the mirror for ten seconds.',
        'Fold the hand towel and hang it back up.',
        'Close the toilet lid.',
        'Line up the bottles by the sink from shortest to tallest.',
        'Straighten the bath mat.',
        'Turn the tap on and off without splashing.',
        'Sing one line of a song to hear the echo.',
    ].map(task => ({ task })),
    hallway: [
        'Walk to the far end of this hallway and back.',
        'Straighten the doormat.',
        'Line up the shoes by the door.',
        'Hang up one coat or bag.',
        'Touch every door along this hallway.',
        'Walk up the stairs and back down, or walk the hallway twice.',
        'Stand by the front door and count slowly to 15.',
        'Pair two shoes and put them beside each other.',
    ].map(task => ({ task })),
    garage: [
        'Walk the full length of this space and back.',
        'Move one item to another shelf, then move it back.',
        'Coil one loose cable, rope, or hose neatly.',
        'Find a tool and put it back where it lives.',
        'Fold one item from the laundry pile.',
        'Check that the washing machine is closed.',
    ].map(task => ({ task })),
    office: [
        'Straighten the chairs around one table.',
        'Write your name on the whiteboard, then erase it.',
        'Draw a cat on the whiteboard, then erase it.',
        'Sit in every chair at the meeting table for two seconds each.',
        'Spin around once in a desk chair.',
        'Stack the loose paper by the printer.',
        'Put three loose pens back in a cup.',
    ].map(task => ({ task })),
    classroom: [
        'Write your name on the board, then erase it.',
        'Draw a dog, a house, or a tree on the board, then erase it.',
        'Write a sum on the board, solve it, then erase it.',
        'Put four chairs up on the desks, then put them back down.',
        'Find your country on a map or globe.',
        'Straighten the books on one shelf.',
        'Sit at the teacher\'s desk for ten seconds.',
        'Open the blinds, then close them again.',
    ].map(task => ({ task })),
    gym: [
        'Make one basket from the free-throw line.',
        'Run one lap of the court.',
        'Do ten sit-ups on a mat.',
        'Dribble a ball from one end of the court to the other.',
        'Touch the basketball hoop pole or a goal post, then come back.',
        'Kick a ball against the wall five times.',
    ].map(task => ({ task })),
    outdoor: [
        'Walk one lap around the garden or yard.',
        'Collect three sticks longer than your hand, then put them down where you found them.',
        'Bring back one leaf or stone and show it to another player.',
        'Touch the nearest tree, fence, or wall, then come back.',
        'Draw a star in the dirt or sand with a stick.',
        'Do five star jumps on the grass.',
        'Sit on an outdoor chair for 15 seconds.',
        'Run to the farthest fence or edge and back.',
        'Throw a ball at a target until you hit it.',
    ].map(task => ({ task })),
};

const VENUE_ROOMS = {
    apartment: ['Kitchen', 'Living Room', 'Hallway', 'Bedroom', 'Bathroom'],
    house: ['Kitchen', 'Living Room', 'Hallway', 'Upstairs', 'Bedroom', 'Bathroom', 'Basement', 'Garage / Utility', 'Garden / Outdoor'],
    big_house: ['Kitchen', 'Living Room', 'Dining Room', 'Hallway', 'Upstairs Landing', 'Bedroom', 'Bathroom', 'Basement', 'Garage / Utility', 'Garden / Outdoor', 'Pool / Hot tub'],
    hall: ['Main Hall', 'Kitchen', 'Classroom', 'Hallway', 'Foyer', 'Chapel', 'Gym', 'Stage', 'Outdoor'],
    dorm: ['Common Room', 'Hallway', 'Bedroom', 'Bathroom', 'Outdoors'],
    office: ['Kitchen / Break Room', 'Open Plan', 'Meeting Room', 'Hallway', 'Outdoor'],
    airbnb: ['Kitchen', 'Living Room', 'Hallway', 'Bedroom', 'Bathroom', 'Garden / Outdoor'],
    school: ['Classroom', 'Hallway', 'Common Room', 'Kitchen', 'Gym', 'Library', 'Outdoor'],
    other: ['Room A', 'Room B', 'Room C', 'Hallway', 'Outdoor'],
};
const roomKeys = {
    Kitchen: 'kitchen', 'Kitchen / Break Room': 'kitchen', 'Living Room': 'living_room',
    Bedroom: 'bedroom', Bathroom: 'bathroom', Hallway: 'hallway', 'Common Room': 'living_room',
    'Garage / Utility': 'garage', Classroom: 'classroom',
    'Garden / Outdoor': 'outdoor', Outdoor: 'outdoor', Outdoors: 'outdoor',
    'Open Plan': 'office', 'Meeting Room': 'office',
    'Dining Room': 'living_room', 'Main Hall': 'living_room', 'Upstairs Landing': 'hallway',
    Foyer: 'hallway', Basement: 'garage', Upstairs: 'hallway', Gym: 'gym', 'Pool / Hot tub': 'outdoor',
};
const SABOTAGE_IDEAS = { other: [
    'Fake Task: send a decoy task through your intruder cards. Fake completions do not help the crew.',
    'EMP: use the card to disable phones briefly. Plan your next move before the timer ends.',
    'Area Denial: use the card to block a game location temporarily. Physical exits stay open.',
] };

export function taskStyleValue(value) {
    const aliases = { standard: 0, mix: 50, funny: 100 };
    if (Object.hasOwn(aliases, value)) return aliases[value];
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.min(100, Math.round(number))) : 50;
}

// A location's name in a task language. Areas the host typed stay as typed.
export function roomLabel(room, taskLanguage = 'en') {
    return TASK_LOCALES[taskLanguage]?.rooms[room] || room;
}

function shuffled(values, random) {
    const result = [...values];
    for (let index = result.length - 1; index > 0; index--) {
        const other = Math.floor(random() * (index + 1));
        [result[index], result[other]] = [result[other], result[index]];
    }
    return result;
}

const MAX_PLAYERS = 30;

function generateTasks({ venue = 'apartment', playerCount = 8, taskStyle = 'standard', preset = 'standard', selectedRooms, taskLanguage = 'en', random = Math.random }) {
    const locale = TASK_LOCALES[taskLanguage];
    const sayTask = task => locale?.tasks[task] || task;
    const sayRoom = room => locale?.rooms[room] || room;
    const players = Math.max(3, Math.min(MAX_PLAYERS, Math.floor(Number(playerCount) || 8)));
    const rooms = [...new Set((selectedRooms || VENUE_ROOMS[venue] || VENUE_ROOMS.other)
        .filter(room => typeof room === 'string').map(room => room.trim())
        .filter(room => room && room.length <= 60))].slice(0, 12);
    const candidates = Object.fromEntries(rooms.map(location => {
        const here = TASKS[roomKeys[location]] || [];
        const entries = preset === 'cleanup'
            ? [...(CLEANUP_TASKS[location] || []), ...CLEANUP_TASKS.any].map(task => ({ task }))
            : preset === 'party' ? [...here, ...TASKS.party, ...TASKS.funny]
            : preset === 'chill' ? [...here, ...TASKS.chill]
            : [...here, ...TASKS.any, ...TASKS.funny];
        const label = sayRoom(location);
        const unique = new Map(entries.map(task => [task.task, { ...task, task: sayTask(task.task), location: label }]));
        return [label, shuffled([...unique.values()], random)];
    }));
    if (!rooms.length) return { tasks: [], rooms: [], candidates, sabotages: [], recommendations: {} };
    const labels = rooms.map(sayRoom);
    const count = Math.max(24, players * 3);
    // Vibes set their own mix: a party is mostly playful, chill and cleanup none.
    const playfulShare = { cleanup: 0, chill: 0, party: 75 }[preset] ?? taskStyleValue(taskStyle);
    const playfulCount = Math.round(count * playfulShare / 100);
    const styles = shuffled(Array.from({ length: count }, (_, index) => index < playfulCount), random);
    const queues = Object.fromEntries(labels.map(room => [room, {
        practical: candidates[room].filter(task => !task.funny),
        playful: candidates[room].filter(task => task.funny),
    }]));
    const tasks = [];
    const used = new Set();
    for (let index = 0; index < count; index++) {
        const room = labels[index % labels.length];
        const preferred = queues[room][styles[index] ? 'playful' : 'practical'];
        // A big group in few rooms can run one style dry. Fall back to the other style.
        const queue = preferred.length ? preferred : queues[room][styles[index] ? 'practical' : 'playful'];
        const unused = queue.findIndex(task => !used.has(task.task));
        const task = unused < 0 ? queue.shift() : queue.splice(unused, 1)[0];
        if (task) {
            tasks.push(task);
            used.add(task.task);
        }
    }
    return {
        tasks, rooms: labels, candidates, sabotages: SABOTAGE_IDEAS.other,
        recommendations: { intruderCount: autoIntruderCount(players), meetingSeconds: 90, taskGoalPerCrewmate: preset === 'cleanup' ? 2 : 5 },
    };
}

export { TASKS, VENUE_ROOMS, SABOTAGE_IDEAS, MAX_PLAYERS, TASK_LOCALES, TASK_LANGUAGES, generateTasks };

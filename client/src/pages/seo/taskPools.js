/** Location-based missions for the task generator. */
import { CLEANUP_TASKS } from './cleanupTasks';

const practical = [
    'Count the chairs in this area.',
    'Count the doors that open into this area.',
    'Count the windows in this area.',
    'Count the lights in this area.',
    'Find the largest object in this area and touch it.',
    'Find the smallest object in this area and point to it.',
    'Find two objects with the same color.',
    'Find three objects with different colors.',
    'Find something round and something square.',
    'Find an object with a brand name and read the name.',
    'Find an object with a number on it and read the number.',
    'Find something made of wood and something made of metal.',
    'Find a soft object and a hard object.',
    'Find something red and point to it.',
    'Find something blue and point to it.',
    'Find something green and point to it.',
    'Find an object with a pattern and trace the pattern with your finger.',
    'Find two objects that start with the same letter.',
    'Count the corners of the largest table or shelf.',
    'Count the pictures or posters in this area.',
    'Count the shelves in this area.',
    'Count the plants in this area.',
    'Inspect each wall and count the light switches. Leave the switches alone.',
    'Stand at the doorway and count the steps to the center of this area.',
    'Walk along one wall and back to the doorway.',
    'Walk to the farthest wall and touch it.',
    'Walk around one chair and return to your start point.',
    'Find a seat and straighten it.',
    'Find three loose objects and put them in a neat row. Put them back afterward.',
    'Stack three loose objects, then return them to their places.',
    'Find an object out of place and return it to its usual spot.',
    'Check the floor for a loose item and put it away.',
    'Straighten one small surface in this area.',
    'Find two objects of different heights and stand them side by side. Put them back afterward.',
    'Touch the doorway, one wall, and one piece of furniture in that order.',
    'Find the nearest bin and put one piece of litter in it.',
];

const playful = [
    'Patrol this area like a robot for ten seconds.',
    'Inspect one object like a detective for ten seconds.',
    'Salute the largest object and announce, “All systems operational.”',
    'Walk from the doorway to one wall like a secret agent.',
    'Give a dramatic thumbs-up to three different objects.',
    'Bow to a chair, then return to the doorway.',
    'Pretend to scan two objects with an invisible scanner.',
    'Mime the repair of an invisible panel on one wall for ten seconds.',
    'Walk a small circle and announce that your patrol is complete.',
    'Present one ordinary object like a priceless museum exhibit.',
    'Whisper a secret password to the doorway.',
    'Point to three objects and give each one a spaceship job.',
    'March from one side of this area to the other.',
    'Tiptoe to the nearest wall and back.',
    'Stand beside an object and pose like its bodyguard for ten seconds.',
    'Pretend to dust three objects with an invisible feather duster.',
    'Give the room a weather report from the doorway.',
    'Pretend to test the gravity beside a chair for ten seconds.',
    'Count three objects in a dramatic announcer voice.',
    'Give the nearest wall a very serious inspection for ten seconds.',
    'Walk to the center of this area and declare it your command station.',
    'Pretend to interview a piece of furniture for ten seconds.',
    'Walk to the doorway and announce that the airlock is secure.',
    'Search for an imaginary alien behind two pieces of furniture.',
    'Stand beside the tallest object and award it an imaginary medal.',
    'Conduct an invisible orchestra beside one wall for ten seconds.',
    'Mime the delivery of an invisible parcel to the doorway.',
    'Pretend to calibrate one object with an invisible dial.',
    'Find two objects and introduce them to each other.',
    'Walk between two objects as if you cross an invisible laser beam.',
    'Give three objects secret code names.',
    'Walk to one corner and announce the results of your imaginary investigation.',
    'Pretend to take a group photo of three objects.',
    'Inspect the doorway like a spaceship captain for ten seconds.',
    'Trace an invisible map of this area in the air.',
    'Stand at the doorway and welcome an imaginary visitor.',
];

const TASKS = {
    any: practical.map(task => ({ task })),
    funny: playful.map(task => ({ task, funny: true })),
    kitchen: [
        'Count the magnets on the fridge.',
        'Stack three clean cups, then put them back.',
        'Read the brand name on the dish soap.',
        'Count the mugs on the open shelf.',
        'Find a wooden spoon and return it to its place.',
        'Straighten the clean bowls on one shelf.',
        'Count the chairs around the kitchen table.',
        'Fold the dish towel and return it to its place.',
    ].map(task => ({ task })),
    living_room: [
        'Fold one blanket and put it back.',
        'Count every cushion on the sofa.',
        'Straighten three cushions.',
        'Find the remote control and return it to its usual spot.',
        'Read the title of one book on the shelf.',
        'Count the picture frames on one wall.',
        'Put one loose coaster back in its place.',
        'Count the visible lamps.',
    ].map(task => ({ task })),
    bedroom: [
        'Straighten the pillows on the bed.',
        'Pair two shoes and put them beside each other.',
        'Count the drawers in this room.',
        'Put one loose item back on its shelf.',
        'Fold one blanket and put it back.',
    ].map(task => ({ task })),
    hallway: [
        'Count the doors along this hallway.',
        'Straighten the doormat.',
        'Count the pictures along this hallway.',
        'Walk to the far end of this hallway and back.',
        'Pair two shoes and put them beside each other.',
    ].map(task => ({ task })),
    office: [
        'Count the chairs around the meeting table.',
        'Count the buttons on the printer. Leave the buttons alone.',
        'Count the plants in this area.',
        'Find the supply area and count the visible pens.',
        'Straighten the chairs around one table.',
    ].map(task => ({ task })),
    outdoor: [
        'Count the outdoor chairs.',
        'Walk to the nearest tree or plant and back.',
        'Count the lights on the outside wall.',
        'Find a fallen leaf and show it to an imaginary inspector.',
        'Count the windows on one outside wall.',
    ].map(task => ({ task })),
};

const VENUE_ROOMS = {
    apartment: ['Kitchen', 'Living Room', 'Hallway', 'Bedroom', 'Bathroom'],
    house: ['Kitchen', 'Living Room', 'Hallway', 'Bedroom', 'Bathroom', 'Garage / Utility', 'Garden / Outdoor'],
    dorm: ['Common Room', 'Hallway', 'Bedroom', 'Bathroom', 'Outdoors'],
    office: ['Kitchen / Break Room', 'Open Plan', 'Meeting Room', 'Hallway', 'Outdoor'],
    airbnb: ['Kitchen', 'Living Room', 'Hallway', 'Bedroom', 'Bathroom', 'Garden / Outdoor'],
    school: ['Classroom', 'Hallway', 'Common Room', 'Kitchen', 'Outdoor'],
    other: ['Room A', 'Room B', 'Room C', 'Hallway', 'Outdoor'],
};
const roomKeys = {
    Kitchen: 'kitchen', 'Kitchen / Break Room': 'kitchen', 'Living Room': 'living_room',
    Bedroom: 'bedroom', Hallway: 'hallway', 'Common Room': 'living_room',
    'Garden / Outdoor': 'outdoor', Outdoor: 'outdoor', Outdoors: 'outdoor',
    'Open Plan': 'office', 'Meeting Room': 'office',
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

function shuffled(values, random) {
    const result = [...values];
    for (let index = result.length - 1; index > 0; index--) {
        const other = Math.floor(random() * (index + 1));
        [result[index], result[other]] = [result[other], result[index]];
    }
    return result;
}

function generateTasks({ venue = 'apartment', playerCount = 8, taskStyle = 'standard', preset = 'standard', selectedRooms, random = Math.random }) {
    const players = Math.max(3, Math.min(15, Math.floor(Number(playerCount) || 8)));
    const rooms = [...new Set((selectedRooms || VENUE_ROOMS[venue] || VENUE_ROOMS.other)
        .filter(room => typeof room === 'string').map(room => room.trim())
        .filter(room => room && room.length <= 60))].slice(0, 12);
    const candidates = Object.fromEntries(rooms.map(location => {
        const entries = preset === 'cleanup'
            ? [...(CLEANUP_TASKS[location] || []), ...CLEANUP_TASKS.any].map(task => ({ task }))
            : [...(TASKS[roomKeys[location]] || []), ...TASKS.any, ...TASKS.funny];
        const unique = new Map(entries.map(task => [task.task, { ...task, location }]));
        return [location, shuffled([...unique.values()], random)];
    }));
    if (!rooms.length) return { tasks: [], rooms: [], candidates, sabotages: [], recommendations: {} };
    const count = Math.max(24, players * 3);
    const playfulCount = preset === 'cleanup' ? 0 : Math.round(count * taskStyleValue(taskStyle) / 100);
    const styles = shuffled(Array.from({ length: count }, (_, index) => index < playfulCount), random);
    const queues = Object.fromEntries(rooms.map(room => [room, {
        practical: candidates[room].filter(task => !task.funny),
        playful: candidates[room].filter(task => task.funny),
    }]));
    const tasks = [];
    const used = new Set();
    for (let index = 0; index < count; index++) {
        const room = rooms[index % rooms.length];
        const queue = queues[room][styles[index] ? 'playful' : 'practical'];
        const unused = queue.findIndex(task => !used.has(task.task));
        const task = unused < 0 ? queue.shift() : queue.splice(unused, 1)[0];
        if (task) {
            tasks.push(task);
            used.add(task.task);
        }
    }
    return {
        tasks, rooms, candidates, sabotages: SABOTAGE_IDEAS.other,
        recommendations: { intruderCount: players >= 10 ? 2 : 1, meetingSeconds: 90, taskGoalPerCrewmate: preset === 'cleanup' ? 2 : 5 },
    };
}

export { TASKS, VENUE_ROOMS, SABOTAGE_IDEAS, generateTasks };

/**
 * Task pools for the Among Us IRL task generator.
 *
 * Each entry: { task: string, location: string, movement: 'low'|'normal'|'active', funny?: true, sneaky?: true }
 *
 * 'movement' values:
 *   low    – can be done while seated or without walking
 *   normal – requires moving to a specific spot, nothing strenuous
 *   active – involves more walking / quick movement
 */

const TASKS = {
    // ── Any venue / universal ───────────────────────────────────────────────
    any: [
        { task: 'Count every door in your current room', location: 'Anywhere', movement: 'low' },
        { task: 'Find something red and bring it to the common area', location: 'Anywhere', movement: 'normal' },
        { task: 'Name five things you can see from where you stand — write them down', location: 'Anywhere', movement: 'low' },
        { task: "Find the nearest clock that isn't a phone and write down what time it shows", location: 'Anywhere', movement: 'normal' },
        { task: 'Count every light switch in the room', location: 'Anywhere', movement: 'low' },
        { task: 'Find something with a brand logo on it and write the brand name', location: 'Anywhere', movement: 'low' },
        { task: 'Locate and write down the number nearest to you on any label or sign', location: 'Anywhere', movement: 'low' },
        { task: 'Stack three objects that are near you into a tower', location: 'Anywhere', movement: 'low' },
        { task: 'Find a power outlet and count how many plugs are in use', location: 'Anywhere', movement: 'normal' },
        { task: 'Find the nearest window and count its panes', location: 'Anywhere', movement: 'normal' },
        { task: 'Make it to the meeting area and back before anyone sees you', location: 'Anywhere', movement: 'active', sneaky: true },
        { task: 'Write down the name of one plant in the space — or confirm there are none', location: 'Anywhere', movement: 'normal' },
    ],

    // ── Kitchen ─────────────────────────────────────────────────────────────
    kitchen: [
        { task: 'Count all the forks in the cutlery drawer', location: 'Kitchen', movement: 'normal' },
        { task: 'Find the item with the earliest expiration date in the fridge', location: 'Kitchen', movement: 'normal' },
        { task: 'Fill a glass of water and bring it back to the meeting spot', location: 'Kitchen', movement: 'normal' },
        { task: 'Open and close every cabinet door once', location: 'Kitchen', movement: 'active' },
        { task: 'Write down the colour of the dish sponge', location: 'Kitchen', movement: 'normal' },
        { task: 'Find three items in the fridge that share a colour', location: 'Kitchen', movement: 'normal' },
        { task: 'Stack the clean bowls neatly (at least three)', location: 'Kitchen', movement: 'normal' },
        { task: 'Count the number of condiments on the counter or fridge door', location: 'Kitchen', movement: 'normal' },
        { task: 'Wipe down one small surface with a cloth', location: 'Kitchen', movement: 'normal' },
        { task: 'Find something in the kitchen that expires this year', location: 'Kitchen', movement: 'normal' },
        { task: 'Find and hold up a wooden spoon for 5 seconds', location: 'Kitchen', movement: 'normal' },
        { task: 'Count every magnet on the fridge', location: 'Kitchen', movement: 'normal' },
        { task: 'Find the tallest item in the pantry or cupboard and write it down', location: 'Kitchen', movement: 'normal' },
        { task: "Refill the dish soap if it's under half", location: 'Kitchen', movement: 'normal' },
        { task: 'Count the number of mugs visible in the kitchen', location: 'Kitchen', movement: 'normal' },
    ],

    // ── Living room ──────────────────────────────────────────────────────────
    living_room: [
        { task: 'Find the TV remote and place it on the sofa', location: 'Living Room', movement: 'normal' },
        { task: 'Stack all throw pillows on one end of the sofa', location: 'Living Room', movement: 'normal' },
        { task: 'Count the throw pillows in the room', location: 'Living Room', movement: 'low' },
        { task: 'Write down the title of one book from the shelf', location: 'Living Room', movement: 'normal' },
        { task: "Find something with a screen that isn't a phone", location: 'Living Room', movement: 'normal' },
        { task: 'Count the legs on all the furniture in the room', location: 'Living Room', movement: 'normal' },
        { task: 'Find the oldest DVD, game, or disc in the room', location: 'Living Room', movement: 'normal' },
        { task: 'Straighten every picture frame on the walls', location: 'Living Room', movement: 'normal' },
        { task: 'Count every visible cable or wire', location: 'Living Room', movement: 'normal' },
        { task: 'Find and fold one blanket that is lying around', location: 'Living Room', movement: 'normal' },
        { task: 'Name the show currently on the TV (or write "off")', location: 'Living Room', movement: 'low' },
        { task: 'Find a coaster and put it under a drink on the coffee table', location: 'Living Room', movement: 'normal' },
    ],

    // ── Bedroom ─────────────────────────────────────────────────────────────
    bedroom: [
        { task: 'Make the bed — or straighten the pillows', location: 'Bedroom', movement: 'normal' },
        { task: 'Count the total number of pillows on all the beds', location: 'Bedroom', movement: 'normal' },
        { task: 'Find something blue in the bedroom and hold it up', location: 'Bedroom', movement: 'normal' },
        { task: 'Write down the title of a book on the bedside table (or "none")', location: 'Bedroom', movement: 'normal' },
        { task: 'Open and close the wardrobe door twice', location: 'Bedroom', movement: 'normal' },
        { task: 'Count the number of drawers in the room', location: 'Bedroom', movement: 'normal' },
        { task: 'Find a pair of shoes and place them neatly by the door', location: 'Bedroom', movement: 'normal' },
        { task: 'Check under the bed and describe one thing you find', location: 'Bedroom', movement: 'normal' },
        { task: 'Find and plug in any unplugged device charger', location: 'Bedroom', movement: 'normal' },
        { task: 'Count how many outlets are in the bedroom', location: 'Bedroom', movement: 'normal' },
    ],

    // ── Hallway / staircase ──────────────────────────────────────────────────
    hallway: [
        { task: 'Count the steps on the nearest staircase', location: 'Hallway', movement: 'active' },
        { task: 'Find and read the nearest fire safety notice', location: 'Hallway', movement: 'normal' },
        { task: 'Knock on the bathroom door once and wait for a response', location: 'Hallway', movement: 'normal' },
        { task: 'Count all the doors in the hallway', location: 'Hallway', movement: 'normal' },
        { task: 'Locate the nearest fire extinguisher and write down its colour', location: 'Hallway', movement: 'normal' },
        { task: 'Find the light switch at the end of the hallway and flick it off and on', location: 'Hallway', movement: 'active' },
        { task: 'Count every framed item hanging on any hallway wall', location: 'Hallway', movement: 'normal' },
        { task: 'Walk to the furthest point in the building and back', location: 'Hallway', movement: 'active' },
        { task: "Find the welcome mat and describe what's on it", location: 'Hallway', movement: 'normal' },
        { task: 'Check that the front door is locked', location: 'Hallway', movement: 'normal' },
    ],

    // ── Dorm-specific ────────────────────────────────────────────────────────
    dorm: [
        { task: 'Find the nearest vending machine and write down one item it sells', location: 'Dorm', movement: 'active' },
        { task: 'Count the number of fire alarm pull stations on your floor', location: 'Dorm', movement: 'active' },
        { task: 'Find a poster with text in a common area — write down the first word', location: 'Dorm', movement: 'normal' },
        { task: 'Count the number of doors between your room and the bathroom', location: 'Dorm', movement: 'normal' },
        { task: 'Find a microwave in the building and describe its location', location: 'Dorm', movement: 'active' },
        { task: 'Find a communal charging cable and describe what device it fits', location: 'Dorm', movement: 'normal' },
        { task: "Locate the building's main entry keypad or lock and tap it twice", location: 'Dorm', movement: 'active' },
        { task: 'Find a whiteboard or bulletin board and count the items posted', location: 'Dorm', movement: 'normal' },
        { task: "Find the recycling bin on your floor and check what's in it", location: 'Dorm', movement: 'normal' },
        { task: 'Count the ceiling tiles in the common room', location: 'Dorm', movement: 'normal', funny: true },
        { task: "Find someone's door decoration and describe one element of it", location: 'Dorm', movement: 'normal' },
        { task: "Find the RA's door and knock once (politely)", location: 'Dorm', movement: 'normal', funny: true },
        { task: 'Locate the nearest bathroom and count the stalls', location: 'Dorm', movement: 'normal' },
        { task: 'Find a common-room clock and note the exact time', location: 'Dorm', movement: 'normal' },
        { task: 'Count the number of outlets in the common room', location: 'Dorm', movement: 'normal' },
    ],

    // ── Office ───────────────────────────────────────────────────────────────
    office: [
        { task: "Count the chairs in the room you're in", location: 'Office', movement: 'normal' },
        { task: 'Find a stapler and return it to the supply area', location: 'Office', movement: 'normal' },
        { task: 'Find a mug with a company or brand logo', location: 'Office', movement: 'normal' },
        { task: 'Count the whiteboards in the open area', location: 'Office', movement: 'normal' },
        { task: 'Find an unused meeting room and write its name', location: 'Office', movement: 'normal' },
        { task: 'Locate the emergency exit nearest to the kitchen', location: 'Office', movement: 'normal' },
        { task: "Find a sticky note on someone's monitor — count them all", location: 'Office', movement: 'normal' },
        { task: 'Tidy the cable tray or cable mess under one desk', location: 'Office', movement: 'normal' },
        { task: 'Count how many monitors are currently showing a screensaver', location: 'Office', movement: 'normal' },
        { task: 'Find the printer and collect any paper left in the output tray', location: 'Office', movement: 'normal' },
        { task: 'Count the plants in the office', location: 'Office', movement: 'active' },
        { task: 'Find the break room and count the chairs', location: 'Office', movement: 'normal' },
    ],

    // ── Outdoor / yard ──────────────────────────────────────────────────────
    outdoor: [
        { task: 'Count the trees you can see without moving', location: 'Outdoor', movement: 'low' },
        { task: 'Pick up any litter you can find and throw it away', location: 'Outdoor', movement: 'normal' },
        { task: 'Find and describe a plant that is flowering or budding', location: 'Outdoor', movement: 'normal' },
        { task: 'Count every outdoor light fixture you can see', location: 'Outdoor', movement: 'normal' },
        { task: 'Find the mailbox and write down the house number on it', location: 'Outdoor', movement: 'normal' },
        { task: 'Find an outdoor chair and sit in it for exactly 5 seconds', location: 'Outdoor', movement: 'normal', funny: true },
        { task: 'Count the paving slabs between the front door and the street', location: 'Outdoor', movement: 'active' },
        { task: 'Find something man-made that is painted a colour and describe it', location: 'Outdoor', movement: 'normal' },
        { task: 'Locate the garden hose or outdoor tap', location: 'Outdoor', movement: 'normal' },
        { task: 'Count the windows visible on the front of the building', location: 'Outdoor', movement: 'normal' },
    ],

    // ── Funny / chaotic ─────────────────────────────────────────────────────
    funny: [
        { task: 'Make eye contact with another player and hold it for 3 seconds without smiling', location: 'Anywhere', movement: 'low', funny: true },
        { task: 'Tell the nearest player an unprompted fact about cheese', location: 'Anywhere', movement: 'low', funny: true },
        { task: 'Do a silent, dramatic spin before completing your next task', location: 'Anywhere', movement: 'low', funny: true },
        { task: 'High-five yourself as loudly as possible', location: 'Anywhere', movement: 'low', funny: true },
        { task: 'Pretend a random object is a phone and mime a call for 10 seconds', location: 'Anywhere', movement: 'low', funny: true },
        { task: 'Moonwalk exactly 3 steps', location: 'Anywhere', movement: 'low', funny: true },
        { task: 'Ask someone to confirm the weather — outside, right now', location: 'Anywhere', movement: 'low', funny: true },
        { task: 'Silently mime filling a bucket with water near the kitchen', location: 'Kitchen', movement: 'low', funny: true },
        { task: 'Count something in the room by pointing at each one out loud', location: 'Anywhere', movement: 'low', funny: true },
        { task: 'Name every country you can think of in 30 seconds — write your total', location: 'Anywhere', movement: 'low', funny: true },
    ],

    // ── Low-movement (accessible / seated) ──────────────────────────────────
    low_movement: [
        { task: 'Count all visible objects on the table in front of you', location: 'Anywhere', movement: 'low' },
        { task: "Name three things that are blue from where you're sitting", location: 'Anywhere', movement: 'low' },
        { task: 'Write down the Wi-Fi network name for this location', location: 'Anywhere', movement: 'low' },
        { task: 'Count the number of people currently sitting vs. standing in the room', location: 'Anywhere', movement: 'low' },
        { task: "List the colours of every person's top in the meeting area", location: 'Anywhere', movement: 'low' },
        { task: 'Write down the first three items you can see that start with the letter S', location: 'Anywhere', movement: 'low' },
        { task: 'Count the tiles or panels in the ceiling from your seat', location: 'Anywhere', movement: 'low', funny: true },
        { task: 'Name four brands visible from where you are sitting', location: 'Anywhere', movement: 'low' },
        { task: 'Describe the view out of the nearest window in one sentence', location: 'Anywhere', movement: 'low' },
        { task: 'Write down how many people are wearing watches', location: 'Anywhere', movement: 'low' },
    ],
};

/**
 * Room options per venue type.
 * Used to suggest checkboxes in the generator form.
 */
const VENUE_ROOMS = {
    apartment: ['Kitchen', 'Living Room', 'Bedroom', 'Bathroom', 'Hallway'],
    house: ['Kitchen', 'Living Room', 'Bedroom', 'Bathroom', 'Hallway', 'Garage / Utility', 'Garden / Outdoor'],
    dorm: ['Bedroom', 'Common Room', 'Hallway', 'Bathroom', 'Outdoors'],
    office: ['Kitchen / Break Room', 'Open Plan', 'Meeting Room', 'Hallway', 'Outdoor'],
    airbnb: ['Kitchen', 'Living Room', 'Bedroom', 'Bathroom', 'Hallway', 'Garden / Outdoor'],
    school: ['Classroom', 'Hallway', 'Common Room', 'Kitchen', 'Outdoor'],
    other: ['Room A', 'Room B', 'Room C', 'Hallway', 'Outdoor'],
};

/**
 * Sabotage ideas per venue type.
 * The generator picks one from each tier (setup, mid-game, social).
 */
const SABOTAGE_IDEAS = {
    apartment: [
        'Before the game starts, hide the dish soap somewhere unexpected in the kitchen.',
        'Turn off the living room lights at the start of the second round.',
        'Whisper to another player that you "saw something suspicious" in the bedroom.',
    ],
    house: [
        'Move one item from its usual spot in the kitchen before the game starts.',
        "When no one's watching, swap two items that belong in different rooms.",
        "Tell a crewmate that the garden tasks have been changed — they haven't.",
    ],
    dorm: [
        "Quietly prop a common-room door open when it's usually closed.",
        'Put a random object in front of the vending machine to block the path.',
        "Mention casually that the RA is doing a check — they aren't.",
    ],
    office: [
        'Before the game, move the office stapler to a completely different desk.',
        'Pretend to be on a work call and block the kitchen doorway mid-game.',
        "Claim a meeting room is \"booked\" so players can't complete tasks there.",
    ],
    airbnb: [
        'Hide a task-related object (a mug, a coaster) in an unusual room before the game.',
        'Turn off the outdoor lights before the garden task round.',
        "Tell someone the \"living room tasks have been reset\" — they haven't.",
    ],
    school: [
        'Move the projector remote before the game begins.',
        'Quietly lock one classroom door (if you have a key) mid-game.',
        "Claim a hallway is \"off limits\" due to a teacher — it isn't.",
    ],
    other: [
        "Hide one task-related object in a place that's hard to find before the game.",
        'At the start of round 2, move a prop from its original position.',
        "Tell a crewmate that one of their tasks has changed — it hasn't.",
    ],
};

/**
 * Returns a shuffled copy of an array.
 */
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/**
 * Generates a task list based on user preferences.
 *
 * @param {object} opts
 * @param {string}   opts.venue         - venue type key
 * @param {number}   opts.playerCount
 * @param {string[]} opts.selectedRooms - room labels selected by the user
 * @param {string}   opts.movement      - 'low' | 'normal' | 'active'
 * @param {string}   opts.taskStyle     - 'standard' | 'funny' | 'sneaky' | 'mix'
 * @returns {{ tasks: Array, sabotages: string[], recommendations: object }}
 */
function generateTasks({ venue, playerCount, movement, taskStyle }) {
    // Build the pool
    const venueRoomMap = {
        apartment: ['kitchen', 'living_room', 'bedroom', 'hallway'],
        house: ['kitchen', 'living_room', 'bedroom', 'hallway', 'outdoor'],
        dorm: ['dorm', 'hallway', 'bedroom'],
        office: ['office', 'hallway'],
        airbnb: ['kitchen', 'living_room', 'bedroom', 'hallway', 'outdoor'],
        school: ['hallway', 'office'],
        other: ['any'],
    };

    const roomKeys = venueRoomMap[venue] || ['any'];
    let pool = [...(TASKS.any || [])];
    roomKeys.forEach((key) => {
        if (TASKS[key]) pool = pool.concat(TASKS[key]);
    });

    // Add funny tasks if requested
    if (taskStyle === 'funny' || taskStyle === 'mix') {
        pool = pool.concat(TASKS.funny);
    }

    // Add low-movement tasks if requested
    if (movement === 'low') {
        pool = pool.concat(TASKS.low_movement);
    }

    // Filter by movement level
    if (movement === 'low') {
        pool = pool.filter((t) => t.movement === 'low');
    } else if (movement === 'normal') {
        pool = pool.filter((t) => t.movement !== 'active');
    }
    // 'active' includes everything

    // If sneaky style, prefer sneaky tasks (don't filter, just boost)
    // For now, no filtering — all tasks can be used by intruders too

    // Deduplicate
    const seen = new Set();
    pool = pool.filter((t) => {
        if (seen.has(t.task)) return false;
        seen.add(t.task);
        return true;
    });

    // Shuffle and take up to 20
    const selected = shuffle(pool).slice(0, 20);

    // Sabotages
    const sabVenue = SABOTAGE_IDEAS[venue] || SABOTAGE_IDEAS.other;
    const sabotages = shuffle(sabVenue).slice(0, 3);

    // Recommendations
    const intruderCount = Math.max(1, Math.floor(playerCount / 4));
    const durationMin = playerCount * 3;
    const durationMax = playerCount * 4;
    const meltdown = playerCount >= 8;

    return {
        tasks: selected,
        sabotages,
        recommendations: {
            intruderCount,
            durationMin,
            durationMax,
            meltdown,
        },
    };
}

export { TASKS, VENUE_ROOMS, SABOTAGE_IDEAS, generateTasks };

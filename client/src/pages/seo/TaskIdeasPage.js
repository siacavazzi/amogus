import React from 'react';
import { usePageMeta } from '../../seo/usePageMeta';
import SeoPageLayout from './SeoPageLayout';

const SCHEMA = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Among Us IRL Task Ideas at Home',
    description: '100+ free Among Us in real life task ideas for kitchens, living rooms, bedrooms, and other spaces',
    numberOfItems: 116,
    url: 'https://susparty.com/among-us-irl-task-ideas',
};

const TASK_SECTIONS = [
    {
        label: 'Quick — any venue',
        intro: 'These tasks work in almost any space. Use them to pad out any task list.',
        tasks: [
            'Count every door in your current room',
            'Find something red and bring it to the meeting area',
            'Name five things you can see from where you stand — write them down',
            'Find the nearest clock that isn\'t a phone and write down what time it shows',
            'Count every light switch in the room',
            'Find something with a brand logo on it and write the brand name',
            'Find a power outlet and count how many plugs are in use',
            'Find the nearest window and count its panes',
            'Stack three nearby objects into a tower',
            'Find something that has a number printed on it and write the number',
            'Write down the name of one plant in the space — or confirm there are none',
            'Count the chairs in the room you\'re in',
        ],
    },
    {
        label: 'Kitchen',
        intro: 'Kitchen tasks work best with access to cupboards, a fridge, and a sink.',
        tasks: [
            'Count all the forks in the cutlery drawer',
            'Find the item with the earliest expiration date in the fridge',
            'Fill a glass of water and bring it back to the meeting spot',
            'Open and close every cabinet door once',
            'Write down the colour of the dish sponge',
            'Find three items in the fridge that share a colour',
            'Stack the clean bowls neatly (at least three)',
            'Count the number of condiments on the counter or fridge door',
            'Wipe down one small surface with a cloth',
            'Find something in the kitchen that expires this year',
            'Count every magnet on the fridge',
            'Find and hold up a wooden spoon for 5 seconds',
            'Find the tallest item in the pantry or cupboard',
            'Count the number of mugs visible in the kitchen',
            'Check whether the kettle has water in it — fill it if not',
        ],
    },
    {
        label: 'Living room',
        intro: 'Good for spaces with sofas, shelves, and a TV or entertainment area.',
        tasks: [
            'Find the TV remote and place it on the sofa',
            'Stack all throw pillows on one end of the sofa',
            'Count the throw pillows in the room',
            'Write down the title of one book from the shelf',
            'Find something with a screen that isn\'t a phone',
            'Count the legs on all the furniture in the room',
            'Find the oldest DVD, game, or disc you can find',
            'Straighten every picture frame on the walls',
            'Count every visible cable or wire',
            'Find and fold one blanket that is lying around',
            'Find a coaster and put it under a drink on the coffee table',
            'Count how many items are currently on the coffee table',
        ],
    },
    {
        label: 'Bedroom',
        intro: 'Works best when bedrooms are in-bounds — good for house or dorm games.',
        tasks: [
            'Make the bed, or at least straighten the pillows',
            'Count the total number of pillows on all the beds',
            'Find something blue in the bedroom and hold it up',
            'Write down the title of a book on the bedside table (or write "none")',
            'Open and close the wardrobe door twice',
            'Count the number of drawers in the room',
            'Find a pair of shoes and place them neatly by the door',
            'Check under the bed and write down one thing you find',
            'Find and plug in any unplugged device charger',
            'Count how many outlets are in the bedroom',
        ],
    },
    {
        label: 'Hallway & common areas',
        intro: 'These work in any building with a shared hallway, staircase, or lobby.',
        tasks: [
            'Count the steps on the nearest staircase',
            'Find and read the nearest fire safety notice',
            'Count all the doors in the hallway',
            'Locate the nearest fire extinguisher and write down its colour',
            'Count every framed item hanging on any hallway wall',
            'Walk to the furthest point in the building and back',
            'Find the welcome mat and describe what\'s on it',
            'Check that the front door is locked',
            'Find the light switch at the end of the hallway and flick it off and on',
            'Count the ceiling lights in the hallway',
        ],
    },
    {
        label: 'Dorm',
        intro:
            'These lean into the dorm environment — vending machines, bulletin boards, communal kitchens.',
        tasks: [
            'Find the nearest vending machine and write down one item it sells',
            'Count the number of fire alarm pull stations on your floor',
            'Find a poster with text in a common area — write down the first word',
            'Count the number of doors between your room and the bathroom',
            'Find a microwave in the building and describe its location',
            'Find a communal charging cable and describe what device it fits',
            'Find a whiteboard or bulletin board and count the items posted',
            'Find the recycling bin on your floor and check what\'s in it',
            'Count the ceiling tiles in the common room',
            'Find someone\'s door decoration and describe one element of it',
            'Locate the nearest bathroom and count the stalls',
            'Find a common-room clock and note the exact time',
            'Count the number of outlets in the common room',
            'Find something in the shared kitchen that expires this month',
            'Locate the building\'s main entrance and tap the door handle twice',
        ],
    },
    {
        label: 'Office',
        intro: 'Great for after-hours team events. Adjust task specifics to your actual office layout.',
        tasks: [
            'Count the chairs in the room you\'re in',
            'Find a stapler and return it to the supply area',
            'Find a mug with a company or brand logo',
            'Count the whiteboards in the open area',
            'Find an unused meeting room and write its name or number',
            'Locate the emergency exit nearest to the kitchen',
            'Count how many sticky notes are on all visible monitors',
            'Tidy the cable mess under one desk',
            'Count how many monitors are currently showing a screensaver',
            'Find the printer and collect any paper left in the output tray',
            'Count all the plants in the office',
            'Find the break room and count the chairs',
        ],
    },
    {
        label: 'Outdoor / garden',
        intro: 'Suitable for houses with gardens, Airbnbs with outdoor space, or campus games.',
        tasks: [
            'Count the trees you can see without moving from your starting spot',
            'Pick up any litter you can find and throw it away',
            'Find and describe a plant that is flowering or budding',
            'Count every outdoor light fixture you can see',
            'Find the mailbox and write down the number or name on it',
            'Find an outdoor chair and sit in it for exactly five seconds',
            'Count the paving slabs between the front door and the street',
            'Find something man-made that is painted an unusual colour and describe it',
            'Locate the garden hose or outdoor tap',
            'Count the windows visible on the front of the building from outside',
        ],
    },
    {
        label: 'Funny / chaotic',
        intro:
            'These tasks add chaos and comedy. Best mixed in at a ratio of two or three per twenty tasks.',
        tasks: [
            'Make eye contact with another player and hold it for 3 seconds without smiling',
            'Tell the nearest player an unprompted fact about cheese',
            'Do a silent, dramatic spin before completing your next task',
            'High-five yourself as loudly as possible',
            'Pretend a random object is a phone and mime a call for 10 seconds',
            'Moonwalk exactly 3 steps in the direction of the meeting area',
            'Ask someone to confirm the weather — outside, right now',
            'Silently mime filling a bucket with water near the kitchen',
            'Count something in the room by pointing at each item out loud',
            'Name every country you can think of in 30 seconds — write your total',
        ],
    },
    {
        label: 'Low-movement (seated or standing in place)',
        intro:
            'These work for players with limited mobility or for accessibility-inclusive games. All completable without walking to another room.',
        tasks: [
            'Count all visible objects on the table in front of you',
            'Name three things that are blue from where you\'re sitting',
            'Write down the Wi-Fi network name for this location',
            'Count the number of people currently sitting vs. standing in the room',
            'List the colours of every person\'s top in the meeting area',
            'Write down the first three items you can see that start with the letter S',
            'Count the ceiling tiles from your seat',
            'Name four brands visible from where you are sitting',
            'Describe the view out of the nearest window in one sentence',
            'Write down how many people are wearing watches',
        ],
    },
];

const TIPS = [
    {
        title: 'Tie tasks to a specific location',
        body: '"Count the forks in the kitchen drawer" is much better than "count something in the kitchen." The location gives the intruder a place to be seen.',
    },
    {
        title: 'Make completion easy to verify',
        body: 'If another player would need a long explanation to confirm it\'s done, simplify the task. "Fill a glass of water" is immediately verifiable; "reorganise the spice rack" is not.',
    },
    {
        title: 'Spread tasks across all rooms',
        body: 'Aim for roughly equal tasks per room. If all tasks are in the kitchen, everyone clusters there and the intruder has nowhere to operate.',
    },
    {
        title: 'Mix task lengths',
        body: 'One or two tasks per room that take slightly longer (opening every cupboard) mixed with quick ones (count the mugs) keeps the game pace varied.',
    },
    {
        title: 'Walk through the space first',
        body: 'Before the game, do a quick walk-through to confirm each task is actually possible in your venue. Cut anything vague or impossible.',
    },
];

function TaskIdeasPage() {
    usePageMeta({
        title: 'Among Us IRL Task Ideas at Home (100+) | Sus Party',
        description:
            '100+ free Among Us in real life task ideas at home, with tasks for your kitchen, living room, and bedroom. Also covers dorms, offices, and low-movement play.',
        canonical: 'https://susparty.com/among-us-irl-task-ideas',
        ogImage: 'https://susparty.com/og-image.jpg',
        schema: SCHEMA,
    });

    return (
        <SeoPageLayout>
            {/* ── Hero ──────────────────────────────────────────────────── */}
            <div className="seo-hero">
                <p className="seo-eyebrow">
                    <a href="/among-us-irl" style={{ color: '#a5b4fc', textDecoration: 'none' }}>
                        Among Us IRL
                    </a>{' '}
                    › Task ideas
                </p>
                <h1 className="seo-h1">Among Us IRL task ideas at home</h1>
                <p className="seo-lead">
                    More than 100 free Among Us in real life tasks for your kitchen, living room,
                    bedroom, and hallway. Also includes tasks for dorms, offices, and outdoor spaces.
                    Pick the rooms that match your home and skip anything that is out of bounds.
                    Copy and paste, or load them straight into Sus Party.
                </p>
                <div className="seo-actions">
                    <a href="/among-us-irl-task-generator" className="seo-btn--primary">
                        Generate a custom task list →
                    </a>
                    <a href="/play" className="seo-btn--secondary">
                        Use tasks in Sus Party
                    </a>
                </div>
            </div>

            <div className="seo-content">
                {/* Task sections */}
                {TASK_SECTIONS.map((section) => (
                    <section className="seo-section" key={section.label}>
                        <div className="seo-task-group">
                            <h2 className="seo-task-group__label">{section.label}</h2>
                            {section.intro && (
                                <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: 16 }}>
                                    {section.intro}
                                </p>
                            )}
                            <div className="seo-task-grid">
                                {section.tasks.map((task) => (
                                    <div className="seo-task-item" key={task}>
                                        {task}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                ))}

                {/* How to write good tasks */}
                <section className="seo-section">
                    <p className="seo-section__kicker">Advice</p>
                    <h2>How to write good Among Us IRL tasks</h2>
                    <p>
                        The quality of your task list has a big impact on how fun the game feels.
                        These five principles will help you write tasks that work:
                    </p>
                    <div className="seo-cards seo-cards--2" style={{ marginTop: 20 }}>
                        {TIPS.map((tip) => (
                            <div className="seo-card" key={tip.title}>
                                <h3>{tip.title}</h3>
                                <p>{tip.body}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Generator CTA */}
                <section className="seo-section">
                    <p className="seo-section__kicker">Tool</p>
                    <h2>Let the generator do it for you</h2>
                    <p>
                        Select your venue type, available rooms, player count, and preferred task style
                        and the{' '}
                        <a href="/among-us-irl-task-generator" style={{ color: '#a5b4fc' }}>
                            Among Us IRL task generator
                        </a>{' '}
                        will produce a ready-to-use set of 20 tasks, three sabotage ideas, and
                        recommended game settings — instantly.
                    </p>
                    <div style={{ marginTop: 16 }}>
                        <a href="/among-us-irl-task-generator" className="seo-btn--primary">
                            Generate tasks for my space →
                        </a>
                    </div>
                </section>

                {/* Internal links */}
                <nav className="seo-links" aria-label="Related pages">
                    <p className="seo-links__title">More Among Us IRL resources</p>
                    <ul className="seo-links__list">
                        <li>
                            <a href="/among-us-irl">Among Us IRL overview and setup guide</a>
                        </li>
                        <li>
                            <a href="/how-to-play-among-us-irl">Full rules: meetings, voting, and win conditions</a>
                        </li>
                        <li>
                            <a href="/among-us-irl-task-generator">Generate a task list for your venue</a>
                        </li>
                        <li>
                            <a href="/faq">Sus Party FAQ</a>
                        </li>
                    </ul>
                </nav>

                {/* CTA */}
                <div className="seo-cta-box">
                    <h2>Load tasks straight into Sus Party</h2>
                    <p>
                        Create a game, add these tasks to your list, and you're ready to play. Free,
                        no install, no account.
                    </p>
                    <a href="/play" className="seo-btn--primary">
                        Host an Among Us IRL game →
                    </a>
                </div>
            </div>
        </SeoPageLayout>
    );
}

export default TaskIdeasPage;

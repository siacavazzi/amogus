import React from 'react';
import { usePageMeta } from '../../seo/usePageMeta';
import SeoPageLayout from './SeoPageLayout';
import GameplayScreenshots from './GameplayScreenshots';
import GameSetupCta from './GameSetupCta';

const TASK_SECTIONS = [
    {
        id: 'shared-room-tasks',
        label: 'Shared rooms at home',
        intro: 'Use a living room, dining area, or approved hallway. Set out paper, cards, or coasters before roles.',
        generatorHref: '/among-us-irl-task-generator?venue=house&players=8',
        tasks: [
            {
                task: 'Count the chairs around the dining table.',
                place: 'Dining area',
                done: 'Record the count in your task notes.',
            },
            {
                task: 'Count the pillows on the shared living-room sofa.',
                place: 'Living room',
                done: 'Record the count in your task notes.',
            },
            {
                task: 'Read the title of a book from the open shared shelf.',
                place: 'Living room',
                done: 'Write the title in your task notes. Return the book to the same shelf.',
            },
            {
                task: 'Count the visible framed pictures on one approved wall.',
                place: 'Living room or hallway',
                done: 'Record the count in your task notes.',
            },
            {
                task: 'Place four host-provided cards in one straight row.',
                place: 'Dining table',
                done: 'Check that the row contains four cards.',
            },
        ],
    },
    {
        id: 'kitchen-tasks',
        label: 'Kitchen and dining area',
        intro: 'Use visible shared items and a card with a short symbol sequence. Put the game materials on a separate table before the round.',
        generatorHref: '/among-us-irl-task-generator?venue=apartment&players=8',
        tasks: [
            {
                task: 'Count the mugs on the open shelf.',
                place: 'Kitchen',
                done: 'Record the count in your task notes.',
            },
            {
                task: 'Copy the three-symbol signal from a host-provided card.',
                place: 'Kitchen table',
                done: 'Compare your copy with the card, then leave the card for the next player.',
            },
            {
                task: 'Name the color of the soap bottle beside the sink.',
                place: 'Kitchen sink',
                done: 'Record the color in your task notes. Leave the bottle in place.',
            },
            {
                task: 'Count the magnets on the outside of the refrigerator.',
                place: 'Kitchen',
                done: 'Record the count in your task notes.',
            },
            {
                task: 'Arrange three host-provided paper cups in a row.',
                place: 'Kitchen table',
                done: 'Check that the row contains three cups. Leave appliances off.',
            },
        ],
    },
    {
        id: 'classroom-tasks',
        label: 'Classroom task examples',
        intro: 'Use a teacher-approved room and shared materials. Set out markers, index cards, and a symbol-to-letter key before roles.',
        generatorHref: '/among-us-irl-task-generator?venue=school&players=8',
        setupHref: '/among-us-irl#classroom-setup',
        tasks: [
            {
                task: 'Count the markers in the shared supply cup.',
                place: 'Classroom supply table',
                done: 'Record the count in your task notes.',
            },
            {
                task: 'Decode a three-symbol message with the teacher’s letter key.',
                place: 'Classroom table',
                done: 'Write the three decoded letters in order. Leave the key for the next player.',
            },
            {
                task: 'Count the markers in the whiteboard tray.',
                place: 'Classroom board',
                done: 'Record the count in your task notes.',
            },
            {
                task: 'Arrange three teacher-approved index cards in a row.',
                place: 'Classroom table',
                done: 'Check that the row contains three cards.',
            },
            {
                task: 'Count the public posters on one approved wall.',
                place: 'Classroom wall',
                done: 'Record the count in your task notes.',
            },
            {
                task: 'Read the time from the classroom wall clock.',
                place: 'Classroom',
                done: 'Record the time in your task notes.',
            },
        ],
    },
    {
        id: 'vacation-house-tasks',
        label: 'Vacation-house task examples',
        intro: 'Use an approved living room or dining area. Set out a small tray with cards and coasters before roles.',
        generatorHref: '/among-us-irl-task-generator?venue=airbnb&players=8',
        setupHref: '/among-us-irl#vacation-house-setup',
        tasks: [
            {
                task: 'Count the cushions on the shared living-room sofa.',
                place: 'Living room',
                done: 'Record the count in your task notes. Leave each cushion in place.',
            },
            {
                task: 'Count the coasters on the shared dining table.',
                place: 'Dining area',
                done: 'Record the count in your task notes.',
            },
            {
                task: 'Arrange cards labeled north, east, south, and west into a compass.',
                place: 'Dining table',
                done: 'Put north at the top, then east, south, and west clockwise. Shuffle the cards afterward.',
            },
            {
                task: 'Read the title of a game box on the open shared shelf.',
                place: 'Shared game shelf',
                done: 'Write the title in your task notes. Leave the box in place.',
            },
            {
                task: 'Arrange three host-provided coasters in a triangle.',
                place: 'Dining table',
                done: 'Check that the three coasters form a triangle. Return them to their place.',
            },
            {
                task: 'Count the open doorways from the meeting point without entering a room.',
                place: 'Approved shared hallway',
                done: 'Record the count in your task notes.',
            },
        ],
    },
    {
        id: 'playful-tasks',
        label: 'Playful tasks with somewhere to go',
        intro: 'Give players an excuse for suspicious behavior. Assign each job to a separate location.',
        generatorHref: '/among-us-irl-task-generator?venue=house&players=8&style=100',
        tasks: [
            { task: 'Patrol the hallway like a robot for ten seconds.', place: 'Hallway', done: 'Walk the patrol route for ten seconds.' },
            { task: 'Inspect a cushion like a detective for ten seconds.', place: 'Living room', done: 'Inspect the cushion, then return it to its place.' },
            { task: 'Salute the fridge and announce, “All systems operational.”', place: 'Kitchen', done: 'Stand beside the fridge, salute, and make the announcement.' },
            { task: 'Pretend to scan two objects with an invisible scanner.', place: 'Living room', done: 'Visit each object and scan it.' },
            { task: 'Give a dramatic weather report from the doorway.', place: 'Hallway', done: 'Reach the doorway and give a ten-second report.' },
        ],
    },
];

const SCHEMA = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Among Us IRL Task Ideas by Venue',
    description:
        'Original task examples with a place and a clear completion check for homes, classrooms, vacation houses, and playful party rounds.',
    url: 'https://susparty.com/among-us-irl-task-ideas',
    itemListElement: TASK_SECTIONS.map((section, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: section.label,
    })),
};

const TIPS = [
    {
        title: 'Name one place',
        body: 'State the room or surface for each task. Remove tasks that need a private room or a closed cupboard.',
    },
    {
        title: 'Give one finish check',
        body: 'State what the player records or arranges. A count, title, or clear layout gives each player a finish check.',
    },
    {
        title: 'Respect the venue',
        body: 'Set out shared materials before roles. Keep appliances and anything the venue marks private out of play.',
    },
    {
        title: 'Give players a route',
        body: 'Spread tasks across at least two locations. Use nearby areas and edit each job for your group.',
    },
];

function TaskIdeasPage() {
    usePageMeta({
        title: 'Sus Party | Among Us in Real Life Task Ideas by Room',
        description:
            'Find Among Us IRL task ideas with a room and a clear finish. Choose practical or playful tasks for your locations, then generate a pack to import into a Sus Party game.',
        canonical: 'https://susparty.com/among-us-irl-task-ideas',
        ogImage: 'https://susparty.com/og-image.jpg',
        schema: SCHEMA,
    });

    return (
        <SeoPageLayout>
            <div className="seo-hero">
                <p className="seo-eyebrow">
                    <a href="/among-us-irl" style={{ color: '#a5b4fc', textDecoration: 'none' }}>
                        Among Us IRL
                    </a>{' '}
                    › Task ideas
                </p>
                <h1 className="seo-h1">Among Us in real life: task ideas for your rooms</h1>
                <p className="seo-lead">
                    A task gives a crewmate somewhere to go and an intruder an excuse to follow.
                    Pick short jobs that fit your space, then spread them across the map.
                    Each example below names the room and the result that counts as complete.
                </p>
                <div className="seo-actions">
                    <a href="/among-us-irl-task-generator?venue=house&players=8" className="seo-btn--primary">
                        Make a house task list →
                    </a>
                    <a href="/how-to-play-among-us-irl" className="seo-btn--secondary">
                        Read the game rules
                    </a>
                </div>
            </div>

            <div className="seo-content">
                <div className="seo-highlight">
                    <p>Use paper or a personal note for counts and titles. After each task, slide to complete it on your phone.</p>
                    <p>Sus Party trusts players to mark tasks complete and does not verify answers.</p>
                    <p>Use these ideas for a paper game, or add your favorites to a Sus Party list. No task needs a host reply.</p>
                </div>
                <nav className="seo-links" aria-label="Jump to task ideas">
                    <p className="seo-links__title">Choose a task group</p>
                    <ul className="seo-links__list">
                        {TASK_SECTIONS.map((section) => (
                            <li key={section.id}><a href={'#' + section.id}>{section.label}</a></li>
                        ))}
                    </ul>
                </nav>

                <GameplayScreenshots screens={['task-list', 'next-task']} />

                <GameSetupCta title="Turn the ideas into everyone’s task lists"
                    href="/among-us-irl-task-generator?venue=house&players=8" label="Generate a house task pack">
                    Choose your areas and player count. Review the generated pack, select “Use this pack,” and import it in host setup. You can edit the list there.
                </GameSetupCta>

                {TASK_SECTIONS.map((section) => (
                    <section className="seo-section" id={section.id} key={section.id}>
                        <p className="seo-section__kicker">Task list</p>
                        <h2>{section.label}</h2>
                    <p>{section.intro}</p>
                        {section.setupHref && (
                            <p>
                                Review the <a href={section.setupHref}>venue setup guide</a> before you use these examples.
                            </p>
                        )}
                        <div className="seo-task-grid">
                            {section.tasks.map((item) => (
                                <article className="seo-task-item" key={item.task}>
                                    <strong>{item.task}</strong>
                                    <p><strong>Place:</strong> {item.place}</p>
                                    <p><strong>Done when:</strong> {item.done}</p>
                                </article>
                            ))}
                        </div>
                        <p style={{ marginTop: 16 }}>
                            <a href={section.generatorHref}>Generate a task list for this setup →</a>
                        </p>
                    </section>
                ))}

                <section className="seo-section" id="write-good-tasks">
                    <p className="seo-section__kicker">Host notes</p>
                    <h2>How to choose a task</h2>
                    <div className="seo-cards seo-cards--2" style={{ marginTop: 20 }}>
                        {TIPS.map((tip) => (
                            <div className="seo-card" key={tip.title}>
                                <h3>{tip.title}</h3>
                                <p>{tip.body}</p>
                            </div>
                        ))}
                    </div>
                    <p style={{ marginTop: 16 }}>
                        The task generator has presets for{' '}
                        <a href="/among-us-irl-task-generator?venue=house&players=8">houses</a>,{' '}
                        <a href="/among-us-irl-task-generator?venue=apartment&players=8">apartments</a>,{' '}
                        <a href="/among-us-irl-task-generator?venue=school&players=8">schools</a>,{' '}
                        <a href="/among-us-irl-task-generator?venue=airbnb&players=8">vacation rentals</a>,{' '}
                        <a href="/among-us-irl-task-generator?venue=dorm&players=8">dorms</a>,{' '}
                        <a href="/among-us-irl-task-generator?venue=office&players=8">offices</a>, and{' '}
                        <a href="/among-us-irl-task-generator?venue=other&players=8">other spaces</a>.
                    </p>
                </section>

                <nav className="seo-links" aria-label="Related Among Us IRL guides">
                    <p className="seo-links__title">Related guides</p>
                    <ul className="seo-links__list">
                        <li><a href="/among-us-irl#classroom-setup">Set up a classroom game</a></li>
                        <li><a href="/among-us-irl#vacation-house-setup">Set up a vacation-house game</a></li>
                        <li><a href="/how-to-play-among-us-irl#access-options">Plan a low-movement round</a></li>
                        <li><a href="/among-us-birthday-party">Build a birthday game around the tasks</a></li>
                    </ul>
                </nav>
            </div>
        </SeoPageLayout>
    );
}

export default TaskIdeasPage;

import React from 'react';
import { usePageMeta } from '../../seo/usePageMeta';
import SeoPageLayout from './SeoPageLayout';
import GameSetupCta from './GameSetupCta';

const SCHEMA = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Sus Party',
    applicationCategory: 'Game',
    operatingSystem: 'Any (browser-based)',
    description:
        'Sus Party is a free browser game for in-person social deduction with private roles, task lists, meetings, and votes.',
    url: 'https://susparty.com',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
};

const FAQS = [
    {
        q: 'What is Among Us IRL?',
        a: 'It is an Among Us-inspired game in a real space. Your house becomes the map: crew members complete physical tasks, intruders try to stay hidden, and the group meets to discuss and vote. Sus Party runs the roles, task lists, and votes in phone browsers.',
    },
    {
        q: 'How many players do we need?',
        a: 'The game requires at least two crew members per intruder, so one intruder needs at least three players. For a first game, four to six players with one intruder is an option. The task generator prepares groups of five to fifteen. That is a generator range, not a cap on the game.',
    },
    {
        q: 'Can we play without an app?',
        a: 'Yes. Use paper roles, a task list, a timer, and a clear vote method. Sus Party uses each phone to track roles, tasks, meetings, and votes.',
    },
    {
        q: 'Is Sus Party an official Among Us product?',
        a: 'No. Sus Party is an independent fan game. It is not affiliated with or endorsed by Innersloth.',
    },
];

function AmongUsIrlPage() {
    usePageMeta({
        title: 'Free Among Us IRL App | Sus Party',
        description:
            'Play Among Us in real life with Sus Party. Turn your rooms into a map, use real tasks and secret roles, and run meetings from phone browsers. Free, no install.',
        canonical: 'https://susparty.com/among-us-irl',
        ogImage: 'https://susparty.com/og-image.jpg',
        schema: SCHEMA,
    });

    return (
        <SeoPageLayout>
            <div className="seo-hero">
                <p className="seo-eyebrow">Sus Party · Free browser game</p>
                <h1 className="seo-h1">Play Among Us in real life with Sus Party</h1>
                <p className="seo-lead">
                    Someone heads to the kitchen for a task. Someone follows them a little too closely.
                    A meeting starts, and suddenly everyone has an alibi. Sus Party is the free Among Us IRL app
                    that turns your rooms into the map and your friends into the suspects.
                </p>
                <div className="seo-actions">
                    <a href="/among-us-irl-task-generator?venue=house&players=8&movement=normal" className="seo-btn--primary">
                        Build your first game →
                    </a>
                    <a href="/play" className="seo-btn--secondary">
                        Create or join a room
                    </a>
                </div>
            </div>

            <div className="seo-content">
                <nav className="seo-links" aria-label="Jump to a setup guide">
                    <p className="seo-links__title">Choose a venue guide</p>
                    <ul className="seo-links__list">
                        <li><a href="#classroom-setup">Classroom setup</a></li>
                        <li><a href="#vacation-house-setup">Vacation-house setup</a></li>
                        <li><a href="#other-venues">Apartment, dorm, or office</a></li>
                    </ul>
                </nav>

                <section className="seo-section" id="quick-start">
                    <p className="seo-section__kicker">Quick start</p>
                    <h2>Your house is the spaceship. Phones run the game.</h2>
                    <p>
                        Everyone opens a phone browser in the same place. Sus Party supplies private roles,
                        task lists, sabotage cards, and votes. You supply the rooms and the conversation.
                        No account, download, or dedicated game board is required. Each device needs internet.
                    </p>
                    <ol className="seo-steps" aria-label="Quick setup steps">
                        <li className="seo-step">
                            <span className="seo-step__num" aria-hidden="true">1</span>
                            <div>
                                <h3>Make your map</h3>
                                <p>Use the living room, dining area, and other shared spaces. Choose one place to meet and keep private rooms out of play.</p>
                            </div>
                        </li>
                        <li className="seo-step">
                            <span className="seo-step__num" aria-hidden="true">2</span>
                            <div>
                                <h3>Pick a task pack</h3>
                                <p>Open the generator, select your rooms, and review the tasks. Change any item that does not fit your space.</p>
                            </div>
                        </li>
                        <li className="seo-step">
                            <span className="seo-step__num" aria-hidden="true">3</span>
                            <div>
                                <h3>Take it into Sus Party</h3>
                                <p>Select “Use these tasks in a new game.” Create a room, then select “Import generated tasks” in host setup.</p>
                            </div>
                        </li>
                        <li className="seo-step">
                            <span className="seo-step__num" aria-hidden="true">4</span>
                            <div>
                                <h3>Share the code and deal the roles</h3>
                                <p>Friends join with the four-letter code. Explain the meeting point and round rules, then start the game.</p>
                            </div>
                        </li>
                    </ol>
                    <div className="seo-highlight">
                        <p>
                            Try the <a href="/tutorial">crew tutorial</a> before your first round.
                            A phone-only game works. A larger screen can also join as the optional Reactor.
                        </p>
                    </div>
                </section>

                <section className="seo-section">
                    <p className="seo-section__kicker">What the app handles</p>
                    <h2>What happens on your phone</h2>
                    <div className="seo-cards seo-cards--3">
                        <div className="seo-card">
                            <h3>Roles and tasks</h3>
                            <p>Your role stays on your own screen. Crew members see a task and its location, do it in the room, then slide to complete it.</p>
                        </div>
                        <div className="seo-card">
                            <h3>Meetings and votes</h3>
                            <p>A living player calls a meeting. Everyone gathers to compare stories, then votes on their phone. The app displays live vote totals.</p>
                        </div>
                        <div className="seo-card">
                            <h3>Sabotage and the reveal</h3>
                            <p>Intruders use cards to disrupt the crew. At the task goal, the app reveals living intruders. The crew still has to vote them out.</p>
                        </div>
                    </div>
                </section>

                <GameSetupCta title="See the task pack before you invite anyone"
                    href="/among-us-irl-task-generator?venue=house&players=8&movement=normal" label="Preview an eight-player house game">
                    A sample list is ready in the generator. Change the rooms and player count, review the tasks, then carry the pack into a new game.
                </GameSetupCta>

                <section className="seo-section" id="classroom-setup">
                    <p className="seo-section__kicker">Classroom guide</p>
                    <h2>Set up Among Us IRL in a classroom</h2>
                    <p>
                        Turn the supply table, board, and desks into task stations. The school preset supplies a starting list;
                        the host chooses which tasks fit the group. Confirm permission to use phones and the space before the round.
                    </p>
                    <ul className="seo-list">
                        <li>Set tasks at the supply table, board, or desks.</li>
                        <li>Prepare shared materials such as markers, index cards, and task slips.</li>
                        <li>Keep play inside approved rooms and use a step-free route.</li>
                    </ul>
                    <p>
                        For example, count markers in the classroom supply cup.
                        Browse <a href="/among-us-irl-task-ideas#classroom-tasks">classroom task examples</a>
                        {' '}or <a href="/among-us-irl-task-generator?venue=school&players=8&movement=normal">build an eight-player classroom task list</a>.
                    </p>
                </section>

                <section className="seo-section" id="vacation-house-setup">
                    <p className="seo-section__kicker">Vacation-house guide</p>
                    <h2>Set up a vacation-house game</h2>
                    <p>
                        The shared living room becomes one location, the dining table another.
                        Use the vacation-house preset to build a task list around the space you actually have.
                        Put out cards, coasters, and paper before the round so guests know what belongs to the game.
                    </p>
                    <ul className="seo-list">
                        <li>Keep private rooms and host-excluded areas outside the play boundary.</li>
                        <li>Use visible shared items, then return each item to its place.</li>
                        <li>Choose low movement if the group needs a seated or short-distance round.</li>
                    </ul>
                    <p>
                        For example, count the cushions on the shared living-room sofa.
                        See <a href="/among-us-irl-task-ideas#vacation-house-tasks">vacation-house task examples</a>
                        {' '}or <a href="/among-us-irl-task-generator?venue=airbnb&players=8&movement=normal">build an eight-player vacation-rental task list</a>.
                    </p>
                </section>

                <section className="seo-section" id="other-venues">
                    <p className="seo-section__kicker">Other venues</p>
                    <h2>Choose a task preset for your space</h2>
                    <p>Use a preset as a draft. Remove any task that does not fit your actual room or access rules.</p>
                    <div className="seo-cards seo-cards--2">
                        <div className="seo-card">
                            <h3>House or apartment</h3>
                            <p>Use shared rooms such as a living room, dining area, and approved hallway.</p>
                            <a href="/among-us-irl-task-generator?venue=house&players=8&movement=normal">Generate house tasks →</a>
                            {' · '}
                            <a href="/among-us-irl-task-generator?venue=apartment&players=8&movement=normal">Apartment tasks →</a>
                        </div>
                        <div className="seo-card">
                            <h3>Dorm or office</h3>
                            <p>Choose common rooms and exclude private rooms, work areas, and restricted spaces.</p>
                            <a href="/among-us-irl-task-generator?venue=dorm&players=8&movement=normal">Generate dorm tasks →</a>
                            {' · '}
                            <a href="/among-us-irl-task-generator?venue=office&players=8&movement=normal">Office tasks →</a>
                        </div>
                    </div>
                    <p style={{ marginTop: 16 }}>
                        Need a different layout? <a href="/among-us-irl-task-generator?venue=other&players=8&movement=normal">Generate tasks for another venue</a>.
                    </p>
                </section>

                <section className="seo-section">
                    <p className="seo-section__kicker">FAQ</p>
                    <h2>Among Us IRL questions</h2>
                    <div className="seo-faq">
                        {FAQS.map((faq) => (
                            <div className="seo-faq__item" key={faq.q}>
                                <p className="seo-faq__q">{faq.q}</p>
                                <p>{faq.a}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <nav className="seo-links" aria-label="Related Among Us IRL guides">
                    <p className="seo-links__title">Continue with a guide</p>
                    <ul className="seo-links__list">
                        <li><a href="/how-to-play-among-us-irl">How to play: rules and sample round</a></li>
                        <li><a href="/among-us-irl-task-ideas">Task ideas by venue and movement</a></li>
                        <li><a href="/among-us-irl-task-generator?venue=house&players=8&movement=normal">Make a task list for your space</a></li>
                        <li><a href="/among-us-birthday-party">Make it the main birthday activity</a></li>
                        <li><a href="/social-deduction-games">Compare social deduction games for your group</a></li>
                    </ul>
                </nav>
            </div>
        </SeoPageLayout>
    );
}

export default AmongUsIrlPage;

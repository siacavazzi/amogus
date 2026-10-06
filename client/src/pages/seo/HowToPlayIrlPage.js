import React from 'react';
import { usePageMeta } from '../../seo/usePageMeta';
import SeoPageLayout from './SeoPageLayout';
import GameSetupCta from './GameSetupCta';

const SCHEMA = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to play Among Us in real life with Sus Party',
    description:
        'Set a safe game area, assign roles, prepare tasks, run meetings, and follow the Sus Party win conditions.',
    step: [
        {
            '@type': 'HowToStep',
            name: 'Set the play area',
            text: 'Choose approved public rooms, mark boundaries, and name one meeting point.',
        },
        {
            '@type': 'HowToStep',
            name: 'Prepare the game',
            text: 'Choose an intruder count, add tasks with clear locations, and explain the safety rules.',
        },
        {
            '@type': 'HowToStep',
            name: 'Play the round',
            text: 'Crewmates complete tasks while intruders blend in and try to avoid detection.',
        },
        {
            '@type': 'HowToStep',
            name: 'Meet and vote',
            text: 'Gather at the meeting point, discuss evidence, and submit votes before the timer ends.',
        },
        {
            '@type': 'HowToStep',
            name: 'Check the win conditions',
            text: 'Crewmates win when they vote out every intruder. Intruders win when they reach parity with the crew or when a Reactor meltdown reaches zero.',
        },
    ],
};

const MISTAKES = [
    {
        title: 'The play area has no clear edge',
        fix: 'Name every allowed room before roles. Keep private, unsafe, or restricted spaces out of play.',
    },
    {
        title: 'Tasks lack a finish check',
        fix: 'State one room and one clear result for each task. Remove tasks that need private belongings or special access.',
    },
    {
        title: 'Eliminated players share clues',
        fix: 'Set a silence rule before play. A dead screen does not stop speech, gestures, or hints.',
    },
    {
        title: 'Players disagree about votes',
        fix: 'Explain the default threshold and veto rule before the first meeting. Sus Party shows live vote totals.',
    },
    {
        title: 'Players use real building equipment',
        fix: 'Keep sabotage inside the game. Do not touch alarms, locks, breakers, vehicles, or appliances.',
    },
];

function HowToPlayIrlPage() {
    usePageMeta({
        title: 'How to Play Among Us in Real Life at Home | Sus Party',
        description:
            'Learn how to play Among Us in real life with Sus Party: prepare tasks, create a room, invite friends, run meetings, and follow the app’s vote and win rules.',
        canonical: 'https://susparty.com/how-to-play-among-us-irl',
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
                    › Rules guide
                </p>
                <h1 className="seo-h1">How to play Among Us in real life at home</h1>
                <p className="seo-lead">
                    Make your living room the meeting point and the rest of the house the task map.
                    Crew members follow their phone lists. Intruders pretend to belong.
                    This guide takes you from a task pack to the first accusation, using Sus Party’s actual rules.
                </p>
                <div className="seo-actions">
                    <a href="/among-us-irl-task-generator?venue=house&players=8&movement=normal" className="seo-btn--primary">
                        Prepare an eight-player game →
                    </a>
                    <a href="/among-us-irl-task-ideas" className="seo-btn--secondary">
                        Choose task ideas
                    </a>
                </div>
            </div>

            <div className="seo-content">
                <section className="seo-section" id="before-play">
                    <p className="seo-section__kicker">Before the game</p>
                    <h2>From an empty room to a playable game</h2>
                    <p>
                        Each player needs a phone browser and internet. Start with shared areas and materials that you already have.
                        A larger Reactor screen is optional. The host can create a phone-only room.
                    </p>
                    <ol className="seo-steps" aria-label="Host setup checklist">
                        <li className="seo-step">
                            <span className="seo-step__num" aria-hidden="true">1</span>
                            <div>
                                <h3>Choose a safe zone</h3>
                                <p>Choose approved rooms and mark private or restricted spaces out of play.</p>
                            </div>
                        </li>
                        <li className="seo-step">
                            <span className="seo-step__num" aria-hidden="true">2</span>
                            <div>
                                <h3>Set the meeting point</h3>
                                <p>Pick one place for every meeting. Choose one clear signal to start a meeting.</p>
                            </div>
                        </li>
                        <li className="seo-step">
                            <span className="seo-step__num" aria-hidden="true">3</span>
                            <div>
                                <h3>Pick the intruder count</h3>
                                <p>The game settings recommend one intruder for 4–6 players, two for 6–10, three for 10–15, and four for 15+.</p>
                            </div>
                        </li>
                        <li className="seo-step">
                            <span className="seo-step__num" aria-hidden="true">4</span>
                            <div>
                                <h3>Prepare the task list</h3>
                                <p>Open the generator with your rooms and player count. Review each task and supply its materials before you save the pack.</p>
                            </div>
                        </li>
                        <li className="seo-step">
                            <span className="seo-step__num" aria-hidden="true">5</span>
                            <div>
                                <h3>Create the room and invite friends</h3>
                                <p>Select “Use these tasks in a new game,” create a room, and select “Import generated tasks.” Review the settings and share the code.</p>
                            </div>
                        </li>
                    </ol>
                    <p>
                        Set the meeting point, walking pace, and silence rule for eliminated players before you start.
                        Sus Party requires at least three task entries per player before the game starts.
                        The task generator offers presets for{' '}
                        <a href="/among-us-irl#classroom-setup">classrooms</a>,{' '}
                        <a href="/among-us-irl#vacation-house-setup">vacation houses</a>, and other venues.
                    </p>
                </section>

                <section className="seo-section" id="roles">
                    <p className="seo-section__kicker">Roles</p>
                    <h2>What each side does</h2>
                    <div className="seo-cards seo-cards--2">
                        <div className="seo-card">
                            <h3 style={{ color: '#93c5fd' }}>Crewmates</h3>
                            <ul style={{ paddingLeft: 18, margin: 0, color: '#9ca3af', fontSize: '0.88rem', lineHeight: 1.7 }}>
                                <li>Complete tasks from their phone list.</li>
                                <li>Call meetings and share useful observations.</li>
                                <li>Vote to remove intruders.</li>
                            </ul>
                        </div>
                        <div className="seo-card">
                            <h3 style={{ color: '#fca5a5' }}>Intruders</h3>
                            <ul style={{ paddingLeft: 18, margin: 0, color: '#9ca3af', fontSize: '0.88rem', lineHeight: 1.7 }}>
                                <li>Act like crewmates and keep their role hidden.</li>
                                <li>Use the in-game actions that the host enables.</li>
                                <li>Try to reach parity with the living crew.</li>
                            </ul>
                        </div>
                    </div>
                    <p style={{ marginTop: 16 }}>
                        Keep sabotage inside the app. Use shared, host-approved materials for physical tasks.
                    </p>
                </section>

                <section className="seo-section" id="sample-round">
                    <p className="seo-section__kicker">Sample round</p>
                    <h2>What one round can look like</h2>
                    <ol className="seo-steps">
                        <li className="seo-step">
                            <span className="seo-step__num" aria-hidden="true">1</span>
                            <div>
                                <h3>Start with eight players</h3>
                                <p>Choose two intruders, which matches the game settings recommendation for six to ten players.</p>
                            </div>
                        </li>
                        <li className="seo-step">
                            <span className="seo-step__num" aria-hidden="true">2</span>
                            <div>
                                <h3>Complete tasks in public rooms</h3>
                                <p>A crewmate counts coasters at the dining table, records the count, and slides to complete the task on their phone. An intruder needs a convincing reason to be nearby.</p>
                            </div>
                        </li>
                        <li className="seo-step">
                            <span className="seo-step__num" aria-hidden="true">3</span>
                            <div>
                                <h3>Call a meeting</h3>
                                <p>A living player calls a meeting. Everyone gathers in the living room. Ask who saw whom, where they were, and whether their task explains it.</p>
                            </div>
                        </li>
                        <li className="seo-step">
                            <span className="seo-step__num" aria-hidden="true">4</span>
                            <div>
                                <h3>Submit votes</h3>
                                <p>Players vote from their phones. A tie or a total below the threshold results in no ejection.</p>
                            </div>
                        </li>
                    </ol>
                    <p>
                        At the task goal, Sus Party reveals the names of living intruders.
                        The crew still needs to vote out every intruder to win.
                    </p>
                </section>

                <GameSetupCta title="You know the round. Now prepare the rooms."
                    href="/among-us-irl-task-generator?venue=house&players=8&movement=normal" label="Make the sample game your own">
                    Open the eight-player house preset, swap in your real areas, and review the task list. The saved pack carries into host setup.
                </GameSetupCta>

                <section className="seo-section" id="meetings-and-votes">
                    <p className="seo-section__kicker">Meetings</p>
                    <h2>How meetings and votes work</h2>
                    <p>
                        A living player can call a meeting during a round. Everyone goes to the agreed
                        point and discusses observations before they submit votes.
                    </p>
                    <p>
                        Sus Party uses a three-minute vote timer by default. Living players can vote
                        for a player or veto the meeting. The host can change the vote threshold in settings.
                    </p>
                    <div className="seo-highlight">
                        <p>The default ejection threshold is 66% of living players. The app shows live totals by candidate, so votes become part of the conversation.</p>
                    </div>
                    <ul className="seo-list">
                        <li>A tie for the top vote count does not eject a player.</li>
                        <li>A total below the threshold does not eject a player.</li>
                        <li>A veto from more than half of living players ends the meeting without an ejection.</li>
                        <li>Eliminated players do not vote in later meetings.</li>
                    </ul>
                </section>

                <section className="seo-section" id="win-conditions">
                    <p className="seo-section__kicker">Win conditions</p>
                    <h2>How each side wins</h2>
                    <div className="seo-cards seo-cards--2">
                        <div className="seo-card">
                            <h3 style={{ color: '#93c5fd' }}>Crewmates win</h3>
                            <p>Vote out every intruder. Completing tasks reveals the living intruders but does not end the game.</p>
                        </div>
                        <div className="seo-card">
                            <h3 style={{ color: '#fca5a5' }}>Intruders win</h3>
                            <p>Reach the same count as the living crew after an elimination, or let an active Reactor meltdown reach zero.</p>
                        </div>
                    </div>
                </section>

                <section className="seo-section" id="common-mistakes">
                    <p className="seo-section__kicker">Host checks</p>
                    <h2>Common host mistakes</h2>
                    <div className="seo-cards seo-cards--2" style={{ marginTop: 20 }}>
                        {MISTAKES.map((mistake) => (
                            <div className="seo-card" key={mistake.title}>
                                <h3 style={{ color: '#fbbf24', marginTop: 0 }}>{mistake.title}</h3>
                                <p><strong style={{ color: '#e5e7eb' }}>Fix: </strong>{mistake.fix}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="seo-section" id="access-options">
                    <p className="seo-section__kicker">Access options</p>
                    <h2>Offer a low-movement round</h2>
                    <p>
                        Ask each player what movement and task formats work for them before role assignment.
                        Keep every task within a seated area or a short, step-free route.
                    </p>
                    <ul className="seo-list">
                        <li>Remove stairs, timed movement, and tasks that need a reach or grip.</li>
                        <li>Offer a spoken, typed, or pointing answer when a task allows it.</li>
                        <li>Do not use clues that depend only on color, sound, or small print.</li>
                        <li>Use the <a href="/among-us-irl-task-generator?venue=other&players=8&movement=low">low-movement task preset</a> as a draft.</li>
                    </ul>
                </section>

                <nav className="seo-links" aria-label="Related Among Us IRL guides">
                    <p className="seo-links__title">More setup help</p>
                    <ul className="seo-links__list">
                        <li><a href="/among-us-irl#classroom-setup">Classroom setup guide</a></li>
                        <li><a href="/among-us-irl#vacation-house-setup">Vacation-house setup guide</a></li>
                        <li><a href="/among-us-irl-task-ideas">Task examples with place and completion checks</a></li>
                        <li><a href="/among-us-birthday-party">Birthday host plan and practice round</a></li>
                    </ul>
                </nav>
            </div>
        </SeoPageLayout>
    );
}

export default HowToPlayIrlPage;

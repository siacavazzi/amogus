import React from 'react';
import { usePageMeta } from '../../seo/usePageMeta';
import SeoPageLayout from './SeoPageLayout';

const SCHEMA = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to play Among Us IRL',
    description:
        'A complete guide to running Among Us in real life: roles, tasks, meetings, voting, and win conditions.',
    step: [
        {
            '@type': 'HowToStep',
            name: 'Set up roles',
            text: 'Assign Crewmate and Intruder roles privately to each player before the game starts.',
        },
        {
            '@type': 'HowToStep',
            name: 'Distribute tasks',
            text: 'Give each crewmate a list of short physical tasks tied to specific rooms.',
        },
        {
            '@type': 'HowToStep',
            name: 'Play the game loop',
            text: 'Players complete tasks. Intruders eliminate crewmates when alone with them. Anyone can call a meeting.',
        },
        {
            '@type': 'HowToStep',
            name: 'Hold a meeting and vote',
            text: 'Players discuss, accuse, and vote. The top vote-getter is ejected if they clear the vote threshold.',
        },
        {
            '@type': 'HowToStep',
            name: 'Win or lose',
            text: 'Crewmates win by completing all tasks or voting out all intruders. Intruders win by equalling the remaining crew or completing a meltdown.',
        },
    ],
};

const MISTAKES = [
    {
        title: 'Players talk before reaching the meeting area',
        fix: 'Agree on one physical meeting spot before the game starts. No discussions until everyone is there.',
    },
    {
        title: 'Dead players accidentally hint at who killed them',
        fix: 'Dead players should tap "I\'m Dead" immediately and stay silent. In Sus Party this is enforced automatically.',
    },
    {
        title: 'Tasks don\'t match the actual space',
        fix: 'Walk through your venue before the game and only include tasks that are genuinely possible. Vague tasks ("find something important") frustrate players.',
    },
    {
        title: 'No one calls meetings until it\'s too late',
        fix: 'Encourage players to call meetings early — even on weak suspicion. Waiting too long hands the advantage to the intruders.',
    },
    {
        title: 'Forgetting to apply the vote threshold',
        fix: 'The top vote-getter is only ejected if they also pass the 66% threshold. Without this rule, intruders can be voted out with a single vote in a split decision.',
    },
];

function HowToPlayIrlPage() {
    usePageMeta({
        title: 'How to Play Among Us IRL — Rules, Setup, and Tasks | Sus Party',
        description:
            'Complete rules for playing Among Us IRL: roles, tasks, meetings, voting, and win conditions. Covers both manual DIY play and using the Sus Party app.',
        canonical: 'https://susparty.com/how-to-play-among-us-irl',
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
                    › Rules guide
                </p>
                <h1 className="seo-h1">How to play Among Us IRL</h1>
                <p className="seo-lead">
                    A complete rules guide for running Among Us in real life — covering roles, tasks,
                    meetings, voting, and win conditions. Works whether you're running it manually or
                    using Sus Party to handle the logistics.
                </p>
                <div className="seo-actions">
                    <a href="/play" className="seo-btn--primary">
                        Play with Sus Party — free →
                    </a>
                    <a href="/among-us-irl-task-ideas" className="seo-btn--secondary">
                        Browse task ideas
                    </a>
                </div>
            </div>

            <div className="seo-content">
                {/* Quick version */}
                <section className="seo-section">
                    <p className="seo-section__kicker">TL;DR</p>
                    <h2>The quick version</h2>
                    <div className="seo-highlight">
                        <p>
                            Everyone moves around a building doing short real-world tasks. A small number
                            of secret intruders try to quietly eliminate crewmates without getting caught.
                            When someone is suspicious or a body is found, anyone can call an emergency
                            meeting and force a vote. First side to meet their win condition wins.
                        </p>
                    </div>
                </section>

                {/* What you need */}
                <section className="seo-section">
                    <p className="seo-section__kicker">Setup</p>
                    <h2>What you need before you start</h2>
                    <ul className="seo-list">
                        <li>
                            <strong style={{ color: '#e5e7eb' }}>5–15 players</strong> — eight to twelve
                            is the sweet spot
                        </li>
                        <li>
                            <strong style={{ color: '#e5e7eb' }}>Multi-room space</strong> — at least two
                            or three distinct areas so players genuinely spread out
                        </li>
                        <li>
                            <strong style={{ color: '#e5e7eb' }}>A task list</strong> — short physical
                            actions tied to specific rooms (see our{' '}
                            <a href="/among-us-irl-task-ideas" style={{ color: '#a5b4fc' }}>
                                task ideas guide
                            </a>
                            )
                        </li>
                        <li>
                            <strong style={{ color: '#e5e7eb' }}>A way to assign roles</strong> — paper
                            slips, a separate app, or Sus Party
                        </li>
                        <li>
                            <strong style={{ color: '#e5e7eb' }}>An agreed meeting spot</strong> — one
                            physical location where everyone gathers for discussions
                        </li>
                        <li>
                            <strong style={{ color: '#e5e7eb' }}>Optional: a meeting timer</strong> —
                            usually two to three minutes; Sus Party handles this automatically
                        </li>
                    </ul>
                </section>

                {/* Roles */}
                <section className="seo-section">
                    <p className="seo-section__kicker">Roles</p>
                    <h2>Crewmates and Intruders</h2>
                    <p>
                        There are two roles. Most players are <strong style={{ color: '#60a5fa' }}>Crewmates</strong>;
                        one to three players are secret <strong style={{ color: '#f87171' }}>Intruders</strong>.
                        The role split is determined before the game and kept hidden.
                    </p>
                    <div className="seo-cards seo-cards--2">
                        <div className="seo-card">
                            <h3 style={{ color: '#93c5fd' }}>Crewmates</h3>
                            <ul style={{ paddingLeft: 18, margin: 0, color: '#9ca3af', fontSize: '0.88rem', lineHeight: 1.65 }}>
                                <li>Complete tasks from their list by physically performing them</li>
                                <li>Can call emergency meetings at any time</li>
                                <li>Vote in meetings to try to eject the intruders</li>
                                <li>Win by completing all tasks OR voting out all intruders</li>
                            </ul>
                        </div>
                        <div className="seo-card">
                            <h3 style={{ color: '#fca5a5' }}>Intruders</h3>
                            <ul style={{ paddingLeft: 18, margin: 0, color: '#9ca3af', fontSize: '0.88rem', lineHeight: 1.65 }}>
                                <li>Pretend to do tasks to blend in with the crew</li>
                                <li>Can eliminate crewmates when alone with them and unobserved</li>
                                <li>Vote in meetings — and can lie freely</li>
                                <li>Win when living crewmates ≤ living intruders, or by completing a meltdown</li>
                            </ul>
                        </div>
                    </div>
                    <p style={{ marginTop: 16 }}>
                        <strong style={{ color: '#e5e7eb' }}>How many intruders?</strong> Start with one
                        intruder for five to seven players, two for eight to eleven, and three for twelve
                        or more. Fewer intruders makes the game harder for them; more intruders makes it
                        harder for the crew.
                    </p>
                </section>

                {/* Tasks */}
                <section className="seo-section">
                    <p className="seo-section__kicker">Tasks</p>
                    <h2>How tasks work in Among Us IRL</h2>
                    <p>
                        Tasks are short physical actions tied to specific locations in your space —
                        things like "count the forks in the kitchen drawer" or "stack three pillows on
                        the sofa." Each crewmate gets a list; intruders get a fake list to reference so
                        they can convincingly pretend.
                    </p>
                    <h3>Writing good tasks</h3>
                    <ul className="seo-list">
                        <li>Keep them short — completable in under a minute</li>
                        <li>Make completion obvious — another player should be able to verify it</li>
                        <li>Spread them across multiple rooms so players genuinely separate</li>
                        <li>Avoid tasks that require special knowledge or abilities</li>
                        <li>
                            Mix room-specific tasks with a few "anywhere" tasks to keep the flow natural
                        </li>
                    </ul>
                    <h3>Task completion win condition</h3>
                    <p>
                        When crewmates collectively complete 100% of the task list, their phone screens
                        reveal the identities of all intruders by name — but the crew still needs to
                        call a meeting and vote the intruders out to win. Completing tasks alone doesn't
                        end the game automatically.
                    </p>
                    <p>
                        Need task ideas? Browse our{' '}
                        <a href="/among-us-irl-task-ideas" style={{ color: '#a5b4fc' }}>
                            full Among Us IRL task ideas list
                        </a>{' '}
                        or use the{' '}
                        <a href="/among-us-irl-task-generator" style={{ color: '#a5b4fc' }}>
                            task generator
                        </a>{' '}
                        to get a custom set for your venue.
                    </p>
                </section>

                {/* Meetings */}
                <section className="seo-section">
                    <p className="seo-section__kicker">Meetings</p>
                    <h2>How to run an emergency meeting</h2>
                    <p>
                        Any living player can call an emergency meeting at any time. In Sus Party, this
                        is a button on their screen. In a manual game, agree on a verbal signal (e.g.
                        shouting "Meeting!") before you start.
                    </p>
                    <ol className="seo-steps">
                        <li className="seo-step">
                            <span className="seo-step__num">1</span>
                            <div>
                                <h3>Everyone comes to the meeting area</h3>
                                <p>
                                    All living players — including the person who called the meeting —
                                    come to the agreed meeting spot. No side conversations en route.
                                </p>
                            </div>
                        </li>
                        <li className="seo-step">
                            <span className="seo-step__num">2</span>
                            <div>
                                <h3>Dead players tap "I'm Dead"</h3>
                                <p>
                                    Any eliminated player taps their phone button before the meeting
                                    starts. They attend as silent observers and cannot speak or give hints.
                                </p>
                            </div>
                        </li>
                        <li className="seo-step">
                            <span className="seo-step__num">3</span>
                            <div>
                                <h3>Timed discussion</h3>
                                <p>
                                    Players discuss suspicions freely for the allotted time (typically two
                                    to three minutes). Anyone can speak; no one is obligated to tell the
                                    truth.
                                </p>
                            </div>
                        </li>
                        <li className="seo-step">
                            <span className="seo-step__num">4</span>
                            <div>
                                <h3>Anonymous vote</h3>
                                <p>
                                    All living players vote simultaneously — either for a specific person
                                    or to skip. In Sus Party votes are submitted on each phone. In a
                                    manual game, a simultaneous hand raise or written ballot works.
                                </p>
                            </div>
                        </li>
                    </ol>
                </section>

                {/* Voting */}
                <section className="seo-section">
                    <p className="seo-section__kicker">Voting rules</p>
                    <h2>How voting and ejection work</h2>
                    <p>
                        Voting in Among Us IRL has two important rules that prevent cheap wins:
                    </p>
                    <h3>The vote threshold (66%)</h3>
                    <p>
                        The player with the most votes is ejected <em>only if</em> they also received
                        votes from at least 66% of living players. This prevents a single vote from
                        ejecting someone in a large group. In Sus Party the default threshold is 66%;
                        hosts can adjust it.
                    </p>
                    <h3>The skip / veto rule</h3>
                    <p>
                        If more than half of living players vote to skip (pass), no one is ejected
                        regardless of the individual vote counts. This gives the group a way to avoid
                        ejecting on weak evidence.
                    </p>
                    <h3>Ties</h3>
                    <p>
                        If two players are tied for the most votes and neither has a clear majority,
                        no ejection occurs.
                    </p>
                </section>

                {/* Win conditions */}
                <section className="seo-section">
                    <p className="seo-section__kicker">Win conditions</p>
                    <h2>How each side wins</h2>
                    <div className="seo-cards seo-cards--2">
                        <div className="seo-card">
                            <h3 style={{ color: '#93c5fd' }}>Crewmates win when…</h3>
                            <ul style={{ paddingLeft: 18, margin: 0, color: '#9ca3af', fontSize: '0.88rem', lineHeight: 1.7 }}>
                                <li>All intruders are voted out, OR</li>
                                <li>
                                    The crew completes 100% of the task list (revealing intruder names)
                                    and then votes them out
                                </li>
                            </ul>
                        </div>
                        <div className="seo-card">
                            <h3 style={{ color: '#fca5a5' }}>Intruders win when…</h3>
                            <ul style={{ paddingLeft: 18, margin: 0, color: '#9ca3af', fontSize: '0.88rem', lineHeight: 1.7 }}>
                                <li>
                                    Living crewmates ≤ living intruders (intruders can't lose a fair
                                    vote), OR
                                </li>
                                <li>
                                    The meltdown timer runs to zero before the crew can enter the disarm
                                    code (optional mechanic)
                                </li>
                            </ul>
                        </div>
                    </div>
                </section>
 {/* TODO: test code to make sure works*/}
                {/* Common mistakes */}
                <section className="seo-section">
                    <p className="seo-section__kicker">Common mistakes</p>
                    <h2>Rules people most often get wrong</h2>
                    <div className="seo-cards seo-cards--2" style={{ marginTop: 20 }}>
                        {MISTAKES.map((m) => (
                            <div className="seo-card" key={m.title}>
                                <h3 style={{ color: '#fbbf24', marginTop: 0 }}>✕ {m.title}</h3>
                                <p>
                                    <strong style={{ color: '#e5e7eb' }}>Fix: </strong>
                                    {m.fix}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Sus Party option */}
                <section className="seo-section">
                    <p className="seo-section__kicker">Easier option</p>
                    <h2>Running it all with Sus Party</h2>
                    <p>
                        Sus Party is a free browser-based app that handles every part of the game that's
                        hard to manage manually: role assignment, task tracking, meeting timers, vote
                        counting, threshold enforcement, and the optional meltdown mechanic. Players join
                        by opening a URL on their phone — no download required.
                    </p>
                    <p>
                        You still bring the space, the players, and the tasks. Sus Party handles the
                        rest.
                    </p>
                    <div className="seo-actions" style={{ marginTop: 20 }}>
                        <a href="/play" className="seo-btn--primary">
                            Host a free Among Us IRL game →
                        </a>
                        <a href="/how-to-play" className="seo-btn--secondary">
                            Sus Party host guide
                        </a>
                    </div>
                </section>

                {/* Internal links */}
                <nav className="seo-links" aria-label="Related pages">
                    <p className="seo-links__title">More Among Us IRL resources</p>
                    <ul className="seo-links__list">
                        <li>
                            <a href="/among-us-irl">Among Us IRL overview guide</a>
                        </li>
                        <li>
                            <a href="/among-us-irl-task-ideas">100+ task ideas by venue</a>
                        </li>
                        <li>
                            <a href="/among-us-irl-task-generator">Generate a task list for your space</a>
                        </li>
                        <li>
                            <a href="/faq">Sus Party FAQ</a>
                        </li>
                    </ul>
                </nav>

                {/* CTA */}
                <div className="seo-cta-box">
                    <h2>Ready to run your first Among Us IRL game?</h2>
                    <p>
                        Sus Party handles roles, tasks, meetings, and votes automatically. Free — no
                        account, no install.
                    </p>
                    <a href="/play" className="seo-btn--primary">
                        Start an Among Us IRL game →
                    </a>
                </div>
            </div>
        </SeoPageLayout>
    );
}

export default HowToPlayIrlPage;

import React from 'react';
import { usePageMeta } from '../../seo/usePageMeta';
import SeoPageLayout from './SeoPageLayout';

const SCHEMA = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Sus Party',
    applicationCategory: 'Game',
    operatingSystem: 'Any (browser-based)',
    description:
        'Sus Party is a free browser-based app for playing Among Us-style social deduction in real life with friends. No install required.',
    url: 'https://susparty.com',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
};

const EXAMPLE_TASKS = [
    { task: 'Count every fork in the kitchen drawer', location: 'Kitchen' },
    { task: 'Find the item with the earliest expiry date in the fridge', location: 'Kitchen' },
    { task: 'Stack three throw pillows neatly on the sofa', location: 'Living Room' },
    { task: 'Write down the title of one book on the shelf', location: 'Living Room' },
    { task: 'Make the bed (or straighten the pillows)', location: 'Bedroom' },
    { task: 'Count every door in the hallway', location: 'Hallway' },
    { task: 'Locate the nearest fire extinguisher and note its colour', location: 'Hallway' },
    { task: 'Find a mug with a brand logo in the kitchen', location: 'Kitchen' },
    { task: 'Count the outdoor lights you can see from the back door', location: 'Outdoor' },
    { task: 'Wipe down one kitchen surface with a cloth', location: 'Kitchen' },
    { task: 'Stack the clean bowls neatly (at least three)', location: 'Kitchen' },
    { task: 'Find the TV remote and place it on the sofa', location: 'Living Room' },
];

const COMPARISON = [
    {
        problem: 'Assigning roles secretly',
        diy: 'Fold slips of paper or use a second device app',
        sus: 'Automatic — players join with a room code and get their role on screen',
    },
    {
        problem: 'Tracking who completed tasks',
        diy: 'Manual whiteboard or trust-system check-off',
        sus: 'Real-time task list on each phone; 100% completion is detected automatically',
    },
    {
        problem: 'Running the meeting timer',
        diy: 'Someone has to watch a clock and call time',
        sus: 'Timed meetings built in; voting locks when time is up',
    },
    {
        problem: 'Managing votes and ejection',
        diy: 'Count raised hands, argue about ties, track the threshold manually',
        sus: 'Anonymous votes tallied instantly; threshold and veto rules enforced automatically',
    },
    {
        problem: 'Meltdown / sabotage mechanic',
        diy: 'Very difficult to run without software',
        sus: 'Built-in reactor meltdown with disarm code shared on-screen',
    },
    {
        problem: 'Dead players during meetings',
        diy: 'Dead players on the honour system not to speak',
        sus: `Dead players tap "I'm Dead" and see a ghost view — they can't accidentally reveal info`,
    },
];

const FAQS = [
    {
        q: 'Can you play Among Us IRL without any app?',
        a: 'Yes — all you need is a way to assign roles (paper slips work) and an agreed task list. Sus Party is optional but it handles all the coordination automatically, which makes the game run much smoother.',
    },
    {
        q: 'How many players do you need for Among Us IRL?',
        a: 'Minimum five, though eight to twelve is the sweet spot. With fewer than five the game is too predictable; above fifteen it can be hard to manage meetings. Sus Party supports five to fifteen players.',
    },
    {
        q: 'What kind of space do you need?',
        a: 'You want at least two or three distinct rooms so players can genuinely split up. A typical apartment, house, dorm floor, or office works perfectly. Bigger spaces with more rooms make for a better game.',
    },
    {
        q: 'How long does a game take?',
        a: 'About twenty to fifty minutes depending on player count and how quickly people find the intruders. Shorter with experienced players, longer with first-timers who are chatty in meetings.',
    },
    {
        q: 'Is Sus Party officially licensed by Among Us or Innersloth?',
        a: 'No. Sus Party is an independent fan-made party game. It is not affiliated with, endorsed by, or sponsored by Innersloth or Among Us.',
    },
];

function AmongUsIrlPage() {
    usePageMeta({
        title: 'Among Us IRL — Play Among Us in Real Life with Friends | Sus Party',
        description:
            'Want to play Among Us IRL? Sus Party lets your group play an Among Us-style real-life social deduction game with phones, tasks, meetings, voting, and sabotages. Free, no install.',
        canonical: 'https://susparty.com/among-us-irl',
        ogImage: 'https://susparty.com/og-image.jpg',
        schema: SCHEMA,
    });

    return (
        <SeoPageLayout>
            {/* ── Hero ──────────────────────────────────────────────────── */}
            <div className="seo-hero">
                <p className="seo-eyebrow">Sus Party — Free · No Install · Browser-Based</p>
                <h1 className="seo-h1">Among Us IRL: play&nbsp;Among&nbsp;Us in&nbsp;real&nbsp;life</h1>
                <p className="seo-lead">
                    Playing Among Us IRL means running a real social deduction game through your house,
                    dorm, or office. Players physically move between rooms completing tasks while secret
                    intruders blend in, eliminate crewmates, and try to survive the vote. Sus Party
                    handles all the coordination — for free, with no install.
                </p>
                <div className="seo-actions">
                    <a href="/play" className="seo-btn--primary">
                        Start an Among Us IRL game →
                    </a>
                    <a href="/how-to-play-among-us-irl" className="seo-btn--secondary">
                        Read the full rules
                    </a>
                </div>
            </div>

            {/* ── Content ───────────────────────────────────────────────── */}
            <div className="seo-content">
                {/* What is it */}
                <section className="seo-section">
                    <p className="seo-section__kicker">Overview</p>
                    <h2>What is Among Us IRL?</h2>
                    <p>
                        Among Us IRL is a version of the popular social deduction game played
                        physically, using your home, apartment, dorm, or office as the game board.
                        Instead of a digital spaceship, players roam real rooms completing short
                        physical tasks. One to three secret intruders blend in with the crew, quietly
                        eliminating players when no one's watching.
                    </p>
                    <p>
                        When someone finds a body — or gets suspicious enough — they can call an
                        emergency meeting. Everyone gathers, discusses, accuses, and votes. If the
                        vote reaches the threshold, the most-suspected player is ejected. Then the
                        game continues until the crew completes all their tasks or votes out every
                        intruder, or until the intruders equal the remaining crew.
                    </p>
                    <p>
                        The digital game gave everyone the template. Among Us IRL is what happens when
                        you actually walk the halls.
                    </p>
                </section>

                {/* What you need */}
                <section className="seo-section">
                    <p className="seo-section__kicker">Requirements</p>
                    <h2>What you need to play</h2>
                    <div className="seo-cards seo-cards--3">
                        <div className="seo-card">
                            <h3>Players</h3>
                            <p>
                                5–15 players. Eight to twelve is the sweet spot — enough to make the
                                deduction interesting without meetings becoming unmanageable.
                            </p>
                        </div>
                        <div className="seo-card">
                            <h3>Space</h3>
                            <p>
                                Multiple rooms or areas so players can genuinely split up. A house,
                                apartment, dorm floor, office, or large Airbnb all work well.
                            </p>
                        </div>
                        <div className="seo-card">
                            <h3>Devices</h3>
                            <p>
                                One phone per player with a browser (no app download). Wi-Fi or mobile
                                data. Optionally, a laptop or TV for the shared reactor display.
                            </p>
                        </div>
                    </div>
                </section>

                {/* How the game works */}
                <section className="seo-section">
                    <p className="seo-section__kicker">Gameplay loop</p>
                    <h2>How an Among Us IRL game works</h2>
                    <p>
                        Each round follows a four-phase loop that repeats until one side wins:
                    </p>
                    <ol className="seo-steps" aria-label="Game phases">
                        <li className="seo-step">
                            <span className="seo-step__num" aria-hidden="true">1</span>
                            <div>
                                <h3>Spread out and do tasks</h3>
                                <p>
                                    Crewmates check their task list and head to different rooms to
                                    complete short physical actions — counting things, moving items,
                                    finding objects. Intruders move around pretending to do the same.
                                </p>
                            </div>
                        </li>
                        <li className="seo-step">
                            <span className="seo-step__num" aria-hidden="true">2</span>
                            <div>
                                <h3>Intruders strike</h3>
                                <p>
                                    When an intruder is alone with a crewmate and no one else is
                                    watching, they can eliminate them. The victim is out of the round
                                    but stays in the game silently.
                                </p>
                            </div>
                        </li>
                        <li className="seo-step">
                            <span className="seo-step__num" aria-hidden="true">3</span>
                            <div>
                                <h3>Call a meeting</h3>
                                <p>
                                    Anyone can call an emergency meeting at any time — when they find a
                                    body, spot suspicious behaviour, or just have enough information to
                                    make a case. Everyone meets in one place.
                                </p>
                            </div>
                        </li>
                        <li className="seo-step">
                            <span className="seo-step__num" aria-hidden="true">4</span>
                            <div>
                                <h3>Discuss and vote</h3>
                                <p>
                                    Players argue, accuse, and defend themselves during a timed
                                    discussion. Then everyone votes simultaneously. If the top
                                    vote-getter clears the threshold, they're ejected. Otherwise no
                                    ejection — and the game continues.
                                </p>
                            </div>
                        </li>
                    </ol>
                </section>

                {/* Example tasks */}
                <section className="seo-section">
                    <p className="seo-section__kicker">Sample tasks</p>
                    <h2>What Among Us IRL tasks look like</h2>
                    <p>
                        Good tasks are short, obvious to verify, and spread across multiple rooms. Here
                        are twelve from the Sus Party default set:
                    </p>
                    <div className="seo-task-grid" style={{ marginTop: '20px' }}>
                        {EXAMPLE_TASKS.map((t) => (
                            <div className="seo-task-item" key={t.task}>
                                <span
                                    style={{
                                        display: 'block',
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        color: '#6b7280',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.08em',
                                        marginBottom: 4,
                                    }}
                                >
                                    {t.location}
                                </span>
                                {t.task}
                            </div>
                        ))}
                    </div>
                    <p style={{ marginTop: '20px' }}>
                        Need ideas for your space?{' '}
                        <a href="/among-us-irl-task-ideas" style={{ color: '#a5b4fc' }}>
                            Browse 100+ Among Us IRL task ideas
                        </a>{' '}
                        or{' '}
                        <a href="/among-us-irl-task-generator" style={{ color: '#a5b4fc' }}>
                            generate a custom task list for your venue
                        </a>
                        .
                    </p>
                </section>

                {/* Best places */}
                <section className="seo-section">
                    <p className="seo-section__kicker">Venues</p>
                    <h2>Best places to play Among Us IRL</h2>
                    <div className="seo-cards seo-cards--2">
                        <div className="seo-card">
                            <h3>House or apartment</h3>
                            <p>
                                The classic setup. Kitchen, living room, bedrooms, and bathrooms give
                                you four or five distinct task zones. Works with as few as five people.
                            </p>
                        </div>
                        <div className="seo-card">
                            <h3>Dorm or student halls</h3>
                            <p>
                                Common rooms, hallways, kitchen, and laundry areas make great task
                                locations. Easy to coordinate in a building everyone already knows.
                            </p>
                        </div>
                        <div className="seo-card">
                            <h3>Office (after hours)</h3>
                            <p>
                                Meeting rooms, break kitchen, open-plan floor, and hallways cover lots
                                of ground. Best on a Friday evening or team social day.
                            </p>
                        </div>
                        <div className="seo-card">
                            <h3>Large Airbnb or holiday rental</h3>
                            <p>
                                Multiple floors and lots of rooms make these ideal. A weekend group
                                trip is a perfect time for a proper Among Us IRL session.
                            </p>
                        </div>
                    </div>
                </section>

                {/* DIY vs Sus Party */}
                <section className="seo-section">
                    <p className="seo-section__kicker">Comparison</p>
                    <h2>Running Among Us IRL manually vs. using Sus Party</h2>
                    <p>
                        You can absolutely run Among Us IRL with paper role cards and a whiteboard
                        for tasks. Here's how the two approaches compare:
                    </p>
                    <div className="seo-table-wrap">
                        <table className="seo-table">
                            <thead>
                                <tr>
                                    <th>What you need to handle</th>
                                    <th>DIY / manual</th>
                                    <th>With Sus Party</th>
                                </tr>
                            </thead>
                            <tbody>
                                {COMPARISON.map((row) => (
                                    <tr key={row.problem}>
                                        <td>{row.problem}</td>
                                        <td style={{ color: '#9ca3af' }}>{row.diy}</td>
                                        <td>{row.sus}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="seo-highlight">
                        <p>
                            Sus Party is free to host. No account, no install — players join by typing a
                            four-digit room code on any phone browser.
                        </p>
                    </div>
                </section>

                {/* FAQ */}
                <section className="seo-section">
                    <p className="seo-section__kicker">FAQ</p>
                    <h2>Frequently asked questions</h2>
                    <div className="seo-faq">
                        {FAQS.map((f) => (
                            <div className="seo-faq__item" key={f.q}>
                                <p className="seo-faq__q">{f.q}</p>
                                <p className="seo-faq__a">{f.a}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Internal links */}
                <nav className="seo-links" aria-label="Related guides">
                    <p className="seo-links__title">Everything you need for Among Us IRL</p>
                    <ul className="seo-links__list">
                        <li>
                            <a href="/how-to-play-among-us-irl">
                                How to play Among Us IRL — full rules
                            </a>
                        </li>
                        <li>
                            <a href="/among-us-irl-task-ideas">
                                100+ Among Us IRL task ideas by venue
                            </a>
                        </li>
                        <li>
                            <a href="/among-us-irl-task-generator">
                                Generate a custom task list for your space
                            </a>
                        </li>
                        <li>
                            <a href="/how-to-play">Sus Party host guide</a>
                        </li>
                        <li>
                            <a href="/faq">Frequently asked questions</a>
                        </li>
                    </ul>
                </nav>

                {/* CTA */}
                <div className="seo-cta-box">
                    <h2>Ready to play Among Us IRL?</h2>
                    <p>
                        Host a free game in under two minutes. No download, no account — just a link
                        your friends open on their phones.
                    </p>
                    <a href="/play" className="seo-btn--primary">
                        Start an Among Us IRL game →
                    </a>
                </div>
            </div>
        </SeoPageLayout>
    );
}

export default AmongUsIrlPage;

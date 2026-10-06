import React from 'react';
import { usePageMeta } from '../../seo/usePageMeta';
import SeoPageLayout from '../seo/SeoPageLayout';
import './InfoPage.css';

function AboutPage() {
    usePageMeta({
        title: 'About Sus Party | Free In-Person Social Deduction Game',
        description: 'Sus Party turns your rooms into a social deduction game with real tasks, secret roles, and phone-guided meetings. Free, open source, and independent.',
        canonical: 'https://susparty.com/about',
    });

    return (
        <SeoPageLayout className="info-shell">


            <main className="info-page">

                <header className="info-header">
                    <p className="info-eyebrow">About</p>
                    <h1 className="info-title">About Sus Party</h1>
                    <p className="info-lead">
                        Your living room becomes the meeting point. The hallway becomes a place for an alibi.
                        Sus Party is a free social deduction game that uses your real space, with phone browsers to keep the round together.
                    </p>
                </header>

                <section className="info-body info-prose">
                    <h2>The rooms give you something to suspect</h2>
                    <p>
                        A task sends a player to a particular room. An intruder needs a reason to be there too.
                        At the next meeting, the group compares what it saw with what each person claims.
                        Tasks, movement, and in-person observations give the accusations somewhere to start.
                    </p>
                    <p>
                        Each phone keeps the role private, displays tasks, and accepts votes. Sabotage cards add pressure.
                        You choose the areas and materials, then decide together who to trust.
                        Use it for a house party, a group rental, or an <a href="/among-us-birthday-party">Among Us-inspired birthday game</a>.
                    </p>

                    <h2>How it's built</h2>
                    <p>
                        Sus Party is a React PWA on the front-end and a Flask + Socket.IO server on the back-end, with everything coordinated through 4-character room codes. There's an optional Sonos connector that runs on your local Wi-Fi so reactor alarms and meeting bells play through real speakers.
                    </p>
                    <ul>
                        <li>Source: <a href="https://github.com/siacavazzi/amogus" target="_blank" rel="noopener noreferrer">github.com/siacavazzi/amogus</a></li>
                        <li>Sonos connector: <a href="https://github.com/siacavazzi/amogus-sonos-connector" target="_blank" rel="noopener noreferrer">github.com/siacavazzi/amogus-sonos-connector</a></li>
                    </ul>

                    <h2>Why it's free</h2>
                    <p>
                        Sus Party is free, with no accounts or ads. The server stores task lists, game records, and player IDs that support the game.
                    </p>
                    <p>
                        The host browser supplies a source category and an entry page when it creates a room. Aggregate counters show which pages lead to playable games. These counters exclude raw referrer URLs, search terms, and third-party analytics scripts.
                    </p>

                    <h2>Not affiliated with Innersloth</h2>
                    <p>
                        Sus Party is an independent social deduction party game. It is not affiliated with, endorsed by, or associated with Innersloth or Among Us.
                    </p>

                    <h2>Get involved</h2>
                    <p>
                        Bug reports, feature ideas, and "I played this with 14 people and here's what broke" stories are all welcome. Open an issue or PR on{' '}
                        <a href="https://github.com/siacavazzi/amogus" target="_blank" rel="noopener noreferrer">GitHub</a>.
                    </p>
                </section>

                <footer className="info-footer">
                    <p>
                            Start with a <a href="/among-us-irl-task-generator?venue=house&players=8&movement=normal">task pack for your house</a>
                            {' '}or <a href="/play">create or join a room →</a>
                    </p>
                </footer>
            </main>
        </SeoPageLayout>
    );
}

export default AboutPage;

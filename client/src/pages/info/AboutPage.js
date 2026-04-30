import React, { useEffect } from 'react';
import './InfoPage.css';

function useInfoChrome(title) {
    useEffect(() => {
        const html = document.documentElement;
        const body = document.body;
        const themeMeta = document.querySelector('meta[name="theme-color"]');
        const previousTitle = document.title;
        const previousTheme = themeMeta ? themeMeta.getAttribute('content') : null;

        html.classList.add('lp-document');
        body.classList.add('lp-document');
        document.title = title;

        if (themeMeta) themeMeta.setAttribute('content', '#030712');

        return () => {
            html.classList.remove('lp-document');
            body.classList.remove('lp-document');
            document.title = previousTitle;
            if (themeMeta && previousTheme) themeMeta.setAttribute('content', previousTheme);
        };
    }, [title]);
}

function AboutPage() {
    useInfoChrome('About — Sus Party | Among Us in Real Life');

    return (
        <div className="info-shell">
            <div className="info-orb info-orb--indigo" aria-hidden="true" />
            <div className="info-orb info-orb--purple" aria-hidden="true" />

            <main className="info-page">
                <nav className="info-nav">
                    <a href="/" className="info-nav__back">← Back to Sus Party</a>
                </nav>

                <header className="info-header">
                    <p className="info-eyebrow">About</p>
                    <h1 className="info-title">About Sus Party</h1>
                    <p className="info-lead">
                        Sus Party is a free, fan-made, in-person party game inspired by Among Us — built because party games where you actually move around the house are more fun than party games on the couch.
                    </p>
                </header>

                <section className="info-body info-prose">
                    <h2>The idea</h2>
                    <p>
                        Most digital party games keep everyone glued to a screen. Real-life social deduction games (Mafia, Werewolf, Secret Hitler) get people talking but don't have the constant low-grade tension of being stalked through a haunted spaceship. Sus Party tries to do both: phones-as-controllers like Jackbox, physical roaming like hide-and-seek, and the social deduction loop of Among Us.
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
                        There's no business model. Sus Party exists because party games should be free, and because hosting a Flask server costs basically nothing. No accounts, no ads, no analytics on you, no data collection.
                    </p>

                    <h2>Not affiliated with Innersloth</h2>
                    <p>
                        Sus Party is a fan-made project loosely inspired by Among Us. It is not affiliated with, endorsed by, or associated with Innersloth.
                    </p>

                    <h2>Get involved</h2>
                    <p>
                        Bug reports, feature ideas, and "I played this with 14 people and here's what broke" stories are all welcome. Open an issue or PR on{' '}
                        <a href="https://github.com/siacavazzi/amogus" target="_blank" rel="noopener noreferrer">GitHub</a>.
                    </p>
                </section>

                <footer className="info-footer">
                    <p>
                        Ready to play? <a href="/">Start a game →</a>
                    </p>
                </footer>
            </main>
        </div>
    );
}

export default AboutPage;

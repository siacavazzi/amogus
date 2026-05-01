import React, { useEffect } from 'react';
import './InfoPage.css';

const FAQS = [
    {
        q: 'Is Sus Party free?',
        a: 'Yes. Sus Party is completely free with no signup, no ads, and no data collection. Just open susparty.com and play.',
    },
    {
        q: 'Do I need to install an app?',
        a: 'No. Sus Party runs entirely in the browser. Just open susparty.com on any phone: iPhone, Android, anything with a modern browser.',
    },
    {
        q: 'How many players can play?',
        a: 'Sus Party works best with 5–15 players. The host can adjust the number of imposters based on group size. You can play with as few as 4 in a pinch.',
    },
    {
        q: 'Can I play Among Us in real life with friends?',
        a: 'Yes. That is exactly what Sus Party is. Gather a group in a house, apartment, dorm, or office, hand everyone their phone, and run a real-life game with the same crewmate / imposter / meeting structure as Among Us.',
    },
    {
        q: 'What are good tasks for Among Us in real life?',
        a: 'Good tasks are short physical actions tied to a specific room: open the fridge, water a plant, find a hidden card, count books on a shelf. Sus Party ships with an example task list you can use or edit. The best tasks scatter players across the house so imposters have opportunities to strike.',
    },
    {
        q: 'How do you set up Among Us in real life?',
        a: 'On a laptop, TV, or tablet, open susparty.com. That device becomes the shared "Reactor" screen. Everyone else joins on their phone with the 4-character room code. The host configures rooms in your house as locations, picks a task list, and starts the game. Setup takes about 5 minutes.',
    },
    {
        q: 'Do you need an app to play Among Us in real life?',
        a: 'Not with Sus Party. The whole game runs in your browser: both the shared Reactor screen and each player’s phone controller. No App Store, no Play Store, no installs.',
    },
    {
        q: 'Is there a free Among Us party game?',
        a: 'Sus Party is one. It\u2019s free, requires no signup, runs in the browser, and the source is on GitHub.',
    },
    {
        q: 'What is the reactor / meltdown?',
        a: 'The reactor is a Sus Party–unique mechanic. Imposters can trigger a meltdown that forces players to drop everything and enter codes from around the house to stop it. If they fail, the imposters win. It adds a recurring crisis the whole group has to coordinate around.',
    },
    {
        q: 'Does Sus Party work with Sonos speakers?',
        a: 'Yes. There’s an optional Sonos integration that pipes the reactor alarm and meeting bells through your speakers. You run a small connector app on the same Wi-Fi as your speakers and join your game with the room code. It’s completely optional, but it dramatically changes the vibe.',
    },
    {
        q: 'Can I play remotely / over video chat?',
        a: 'No. Sus Party is built for in-person play. Moving between rooms is the whole point. For remote social deduction, original Among Us or browser games like Werewords are better fits.',
    },
    {
        q: 'Is Sus Party affiliated with Innersloth or Among Us?',
        a: 'No. Sus Party is an independent fan-made party game inspired by Among Us. It is not affiliated with, endorsed by, or associated with Innersloth.',
    },
];

function InfoChrome({ titleSuffix, children }) {
    useEffect(() => {
        const html = document.documentElement;
        const body = document.body;
        const themeMeta = document.querySelector('meta[name="theme-color"]');
        const previousTitle = document.title;
        const previousTheme = themeMeta ? themeMeta.getAttribute('content') : null;

        html.classList.add('lp-document');
        body.classList.add('lp-document');
        document.title = titleSuffix;

        if (themeMeta) themeMeta.setAttribute('content', '#030712');

        return () => {
            html.classList.remove('lp-document');
            body.classList.remove('lp-document');
            document.title = previousTitle;
            if (themeMeta && previousTheme) themeMeta.setAttribute('content', previousTheme);
        };
    }, [titleSuffix]);

    return children;
}

function FaqPage() {
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQS.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
    };

    return (
        <InfoChrome titleSuffix="FAQ · Sus Party | Among Us in Real Life">
            <div className="info-shell">
                <div className="info-orb info-orb--indigo" aria-hidden="true" />
                <div className="info-orb info-orb--purple" aria-hidden="true" />

                <main className="info-page">
                    <nav className="info-nav">
                        <a href="/" className="info-nav__back">← Back to Sus Party</a>
                    </nav>

                    <header className="info-header">
                        <p className="info-eyebrow">Frequently Asked Questions</p>
                        <h1 className="info-title">Sus Party FAQ</h1>
                        <p className="info-lead">
                            Quick answers about Sus Party, the free real-life Among Us-style party game you can play in your house.
                        </p>
                    </header>

                    <section className="info-body">
                        {FAQS.map((f, i) => (
                            <article key={i} className="info-faq">
                                <h2 className="info-faq__q">{f.q}</h2>
                                <p className="info-faq__a">{f.a}</p>
                            </article>
                        ))}
                    </section>

                    <footer className="info-footer">
                        <p>
                            Still curious? Read the <a href="/how-to-play">full how-to-play guide</a> or{' '}
                            <a href="/">start a game</a>.
                        </p>
                    </footer>
                </main>

                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
            </div>
        </InfoChrome>
    );
}

export default FaqPage;

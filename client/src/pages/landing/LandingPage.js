import React, { useEffect, useState } from 'react';
import './LandingPage.css';
import PhoneShowcase from './PhoneShowcase';
import { usePageMeta } from '../../seo/usePageMeta';
import { SiteNav, SiteFooter } from '../../components/SiteChrome';

const TAGLINE_WORDS = ['Gaslight.', 'Sneak.', 'Vote.', 'Repeat.'];

const STEPS = [
    {
        n: '01',
        title: 'Open susparty.com',
        body: 'Host from your phone. Friends join in their browsers with your room code. Add a laptop or TV for the optional reactor. No signup or downloads.',
    },
    {
        n: '02',
        title: 'Customize tasks for your venue',
        body: 'Generate a task pack for your rooms, then review it in host setup. Count coasters, read a book title, or sort cards. Use places your group can share.',
    },
    {
        n: '03',
        title: 'Gaslight. Sneak. Vote. Repeat.',
        body: 'Crewmates rush real-life tasks. Intruders pick people off and stir chaos. Meetings decide who walks the plank.',
    },
];

const FEATURES = [
    {
        emoji: '\uD83C\uDFE0',
        title: 'Custom tasks for your venue',
        body: 'Generate a pack for your rooms or write your own tasks. Review the list, import it, and open the room for friends.',
    },
    {
        emoji: '\uD83D\uDD0A',
        title: 'Sonos integration',
        body: 'Pipe meeting bells and reactor alarms through your speakers for full house-wide chaos.',
    },
    {
        emoji: '\uD83C\uDCCF',
        title: 'Sabotage cards',
        body: 'Intruders draw cards mid-game. Hack phones, force votes, mess with the room.',
    },
    {
        emoji: '\u2622\uFE0F',
        title: 'Reactor meltdown',
        body: 'A panic-mode minigame the whole group has to scramble to stop. Or not.',
    },
];

const FAQS = [
    { q: 'Can you play Among Us in real life?', a: 'Yes. Sus Party brings the social deduction setup into your house: secret roles, real tasks, sabotage, meetings, and votes. Everyone plays together in person, with a phone as their controller.' },
    { q: 'Is there a free Among Us IRL app?', a: 'Sus Party is a free browser app for an Among Us-inspired party game. Open it on iPhone, Android, or a laptop. No install or account required.' },
    { q: 'What are good Among Us IRL tasks at home?', a: 'Count coasters at the dining table, read a title from a shared shelf, or sort host-provided cards. Use short tasks in different areas so players have reasons to split up.' },
    { q: 'How do Among Us IRL room codes work?', a: 'The host creates a Sus Party game and shares its four-character room code. Friends open susparty.com/play and enter that code to join the same game.' },
    { q: 'Can we play online from different homes?', a: 'Sus Party connects your phones online, but the group plays together in the same physical space. The tasks, secret eliminations, and meetings happen in real life.' },
    { q: 'How many players?', a: 'The task generator prepares groups of 5–15. The game requires at least two crew members per intruder and has no fixed 15-player cap.' },
    { q: 'Does it cost anything?', a: 'No. It\u2019s free, open source, and ad-free.' },
    { q: 'Where do we play?', a: 'Use shared areas in a house, apartment, dorm, office, or vacation rental. Choose at least two task locations so players have a route. Each phone needs internet.' },
];

function LandingPage() {
    usePageMeta({
        title: 'Sus Party | Free Among us IRL Party Game',
        description: 'Play Among Us in real life with Sus Party, a free browser party game. Use your phones for tasks, secret roles, sabotage, meetings, and votes. No downloads.',
        canonical: 'https://susparty.com/',
    });
    const [tagIdx, setTagIdx] = useState(0);

    useEffect(() => {
        const id = setInterval(() => setTagIdx((i) => (i + 1) % TAGLINE_WORDS.length), 1400);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="site-page lp-shell">
            <SiteNav />

            {/* Hero text + sticky phone live inside the same scroll story.
                Phone follows you down through every panel. */}
            <PhoneShowcase
                heroSlot={
                    <div className="lp-page">
                        <p className="lp-eyebrow">Sus Party · Free · No app download</p>

                        <h1 className="lp-title">
                            <span className="lp-title__text" data-text="Among us IRL">Among us IRL</span>
                        </h1>

                        <p className="lp-rotator" aria-live="polite">
                            {TAGLINE_WORDS.map((w, i) => (
                                <span
                                    key={w}
                                    className={`lp-rotator__word ${i === tagIdx ? 'is-active' : ''}`}
                                >
                                    {w}
                                </span>
                            ))}
                        </p>

                        <p className="lp-tagline">
                            Play Among Us in real life with Sus Party. Your house becomes the board.
                            Open your phone’s browser and
                            move room to room: complete real tasks, survive sabotage, call
                            meetings, and vote out the secret saboteur.
                        </p>

                        <div className="lp-actions">
                            <a href="/play" className="lp-button lp-button--primary">
                                Play now
                            </a>
                            <a href="/how-to-play" className="lp-button lp-button--secondary">
                                How to play
                            </a>
                        </div>

                        <div className="lp-inspired">
                            <p className="lp-inspired__label">The mix</p>
                            <ul className="lp-inspired__list" aria-label="Game ingredients">
                                <li className="lp-pill lp-pill--crew">
                                    <span className="lp-pill__name">Real rooms</span>
                                    <span className="lp-pill__note">The house is the map</span>
                                </li>
                                <li className="lp-pill lp-pill--intruder">
                                    <span className="lp-pill__name">Secret roles</span>
                                    <span className="lp-pill__note">Trust gets expensive</span>
                                </li>
                                <li className="lp-pill lp-pill--meeting">
                                    <span className="lp-pill__name">Phones guide it</span>
                                    <span className="lp-pill__note">No install, no signup</span>
                                </li>
                            </ul>
                        </div>

                        <p className="lp-footnote">Task packs for 5–15 players · One host phone runs the room</p>

                        <a href="#showcase" className="lp-scroll-cue" aria-label="Scroll to game previews">
                            <span>Scroll for the breakdown</span>
                            <span className="lp-scroll-cue__arrow" aria-hidden="true">↓</span>
                        </a>
                    </div>
                }
            />

            {/* HOW IT WORKS */}
            <section className="lp-steps" aria-label="How it works">
                <div className="lp-steps__inner">
                    <p className="lp-section-eyebrow">How it works</p>
                    <h2 className="lp-section-heading">How to play Among Us IRL at home.</h2>
                    <ol className="lp-steps__list">
                        {STEPS.map((s) => (
                            <li className="lp-step" key={s.n}>
                                <span className="lp-step__num">{s.n}</span>
                                <h3 className="lp-step__title">{s.title}</h3>
                                <p className="lp-step__body">{s.body}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            {/* FEATURE HIGHLIGHTS */}
            <section className="lp-features" aria-label="Features">
                <div className="lp-features__inner">
                        <p className="lp-section-eyebrow">What’s in the box</p>
                    <h2 className="lp-section-heading">Built for the chaos of a real-life party.</h2>
                    <div className="lp-features__grid">
                        {FEATURES.map((f) => (
                            <div className="lp-feature" key={f.title}>
                                <span className="lp-feature__emoji" aria-hidden="true">{f.emoji}</span>
                                <h3 className="lp-feature__title">{f.title}</h3>
                                <p className="lp-feature__body">{f.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* QUICK FAQ */}
            <section className="lp-faq" aria-label="Quick FAQ">
                <div className="lp-faq__inner">
                    <p className="lp-section-eyebrow">Quick answers</p>
                    <h2 className="lp-section-heading">The stuff people always ask.</h2>
                    <dl className="lp-faq__list">
                        {FAQS.map((item) => (
                            <div className="lp-faq__item" key={item.q}>
                                <dt className="lp-faq__q">{item.q}</dt>
                                <dd className="lp-faq__a">{item.a}</dd>
                            </div>
                        ))}
                    </dl>
                    <p className="lp-faq__more">
                        <a href="/faq" className="lp-link">More FAQs →</a>
                    </p>
                </div>
            </section>

            {/* SEO content section, below the hero, low-key, indexable */}
            <section className="lp-seo" aria-labelledby="lp-seo-heading">
                <div className="lp-seo__inner">
                    <h2 id="lp-seo-heading" className="lp-seo__heading">
                        Choose the game for your group.
                    </h2>
                    <p className="lp-seo__lead">
                        Sus Party is a free browser app for an Among Us-inspired party game in real life. Open
                        <a href="https://susparty.com"> susparty.com</a> on your phones, gather 5–15 friends, and
                        turn your house into the board. Players move room to room, complete real tasks,
                        survive sabotage, call meetings, and vote out the secret saboteur. No app to install,
                        no signup, no ads.
                    </p>
                    <p className="lp-seo__lead">
                        Want a game night built around bluffing and accusations? Compare
                        {' '}<a href="/social-deduction-games">social deduction games to play in person</a>,
                        plan an <a href="/among-us-birthday-party">Among Us birthday game</a>,
                        or choose <a href="/party-games-for-10-people">party games for ten friends</a>.
                        When you pick Sus Party, the task generator carries your setup into a new room.
                    </p>

                    <p className="lp-seo__cta">
                        <a href="/party-games-for-adults" className="lp-seo__link">Play at your next house party →</a>
                        {' · '}
                        <a href="/murder-mystery-party-game" className="lp-seo__link">Make your friends the murder suspects →</a>
                        {' · '}
                        <a href="/birthday-party-games-for-adults" className="lp-seo__link">Give birthday guests secret roles →</a>
                        {' · '}
                        <a href="/game-night-ideas" className="lp-seo__link">Host a Sus Party game night →</a>
                    </p>

                    <p className="lp-seo__cta">
                        <a href="/among-us-irl" className="lp-seo__link">Free Among Us IRL app →</a>
                        {' · '}
                        <a href="/among-us-irl-task-ideas" className="lp-seo__link">Task ideas at home →</a>
                        {' · '}
                        <a href="/among-us-irl-task-generator" className="lp-seo__link">Task generator →</a>
                        {' · '}
                        <a href="/how-to-play" className="lp-seo__link">How to play →</a>
                    </p>
                </div>
            </section>

            {/* FOOTER */}
            <section className="lp-footer" aria-label="Play Sus Party">
                <div className="lp-footer__inner">
                    <div className="lp-footer__cta">
                        <h2 className="lp-footer__heading">Ready to find the saboteur?</h2>
                        <a href="/play" className="lp-button lp-button--primary lp-footer__btn">Play now →</a>
                    </div>
                </div>
            </section>
            <SiteFooter />
        </div>
    );
}

export default LandingPage;

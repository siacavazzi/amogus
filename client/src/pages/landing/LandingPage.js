import React, { useEffect, useState } from 'react';
import './LandingPage.css';
import PhoneShowcase from './PhoneShowcase';

const TAGLINE_WORDS = ['Sneak.', 'Lie.', 'Vote.', 'Repeat.'];

const STEPS = [
    {
        n: '01',
        title: 'Open susparty.com',
        body: 'On a laptop or TV for the host, and on every player\u2019s phone. No app, no signup, no downloads.',
    },
    {
        n: '02',
        title: 'Customize tasks for your venue',
        body: '\u201CSwap the dish towel.\u201D \u201CCheck the basement light.\u201D Make the task list match your house, dorm, or office.',
    },
    {
        n: '03',
        title: 'Sneak. Lie. Vote. Repeat.',
        body: 'Crewmates rush real-life tasks. Intruders pick people off and stir chaos. Meetings decide who walks the plank.',
    },
];

const FEATURES = [
    {
        emoji: '\uD83C\uDFE0',
        title: 'Custom tasks for your venue',
        body: 'Write tasks tailored to your space. Every game feels personal.',
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
    { q: 'Do I need to install an app?', a: 'Nope. It runs in your browser. iPhone, Android, laptop. All good.' },
    { q: 'How many players?', a: 'Best with 5\u201315. Works in a pinch with 4. Gets wild past 10.' },
    { q: 'Does it cost anything?', a: 'No. It\u2019s free, open source, and ad-free forever.' },
    { q: 'Where do we play?', a: 'Anywhere with multiple rooms: a house, apartment, dorm, office after hours, big Airbnb. Wi-Fi helps.' },
];

function useLandingDocument() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    const previousTitle = document.title;
    const previousTheme = themeMeta ? themeMeta.getAttribute('content') : null;

    html.classList.add('lp-document');
    body.classList.add('lp-document');
    document.title = 'Sus Party · Among Us in Real Life | Free Party Game';

    if (themeMeta) {
      themeMeta.setAttribute('content', '#030712');
    }

    return () => {
      html.classList.remove('lp-document');
      body.classList.remove('lp-document');
      document.title = previousTitle;

      if (themeMeta && previousTheme) {
        themeMeta.setAttribute('content', previousTheme);
      }
    };
  }, []);
}

function LandingPage() {
    useLandingDocument();
    const [tagIdx, setTagIdx] = useState(0);

    useEffect(() => {
        const id = setInterval(() => setTagIdx((i) => (i + 1) % TAGLINE_WORDS.length), 1400);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="lp-shell">
            {/* Animated warping color field behind the hero */}
            <div className="lp-aurora" aria-hidden="true">
                <div className="lp-aurora__blob lp-aurora__blob--a" />
                <div className="lp-aurora__blob lp-aurora__blob--b" />
                <div className="lp-aurora__blob lp-aurora__blob--c" />
                <div className="lp-aurora__blob lp-aurora__blob--d" />
            </div>
            <div className="lp-grain" aria-hidden="true" />

            {/* Hero text + sticky phone live inside the same scroll story.
                Phone follows you down through every panel. */}
            <PhoneShowcase
                heroSlot={
                    <div className="lp-page">
                        <p className="lp-eyebrow">A real-life social deduction party game</p>

                        <h1 className="lp-title">
                            <span className="lp-title__text" data-text="Sus Party">Sus Party</span>
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
                            A social deduction party game that takes over your whole house. Roam
                            room to room doing real tasks, sniff out the intruders hiding in your
                            group, and bring your case to the meeting.
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
                            <p className="lp-inspired__label">Inspired by</p>
                            <ul className="lp-inspired__list" aria-label="Inspired by">
                                <li className="lp-pill lp-pill--crew">
                                    <span className="lp-pill__name">Among Us</span>
                                    <span className="lp-pill__note">Imposters &amp; tasks</span>
                                </li>
                                <li className="lp-pill lp-pill--intruder">
                                    <span className="lp-pill__name">Mafia</span>
                                    <span className="lp-pill__note">Real-room deduction</span>
                                </li>
                                <li className="lp-pill lp-pill--meeting">
                                    <span className="lp-pill__name">Quiplash</span>
                                    <span className="lp-pill__note">Phones as controllers</span>
                                </li>
                            </ul>
                        </div>

                        <p className="lp-footnote">Best with 5–15 players · One host phone runs the room</p>

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
                    <h2 className="lp-section-heading">Three minutes to setup. The rest is mayhem.</h2>
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
                        Among Us in real life. No setup required.
                    </h2>
                    <p className="lp-seo__lead">
                        Sus Party is a free, in-person social deduction party game inspired by Among Us. Open
                        <a href="https://susparty.com"> susparty.com</a> on your phones, gather 5–15 friends, and
                        play in your house. Tasks, sabotage, emergency meetings, votes. All on your phone, no app
                        to install, no signup, no ads.
                    </p>

                    <p className="lp-seo__cta">
                        <a href="/how-to-play" className="lp-seo__link">Read the full how-to-play guide →</a>
                    </p>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="lp-footer">
                <div className="lp-footer__inner">
                    <div className="lp-footer__cta">
                        <h2 className="lp-footer__heading">Ready to find the imposter?</h2>
                        <a href="/play" className="lp-button lp-button--primary lp-footer__btn">
                            Start a game
                        </a>
                    </div>
                    <div className="lp-footer__meta">
                        <p className="lp-footer__line">
                            Open source on{' '}
                            <a className="lp-link" href="https://github.com/siacavazzi/amogus" target="_blank" rel="noreferrer noopener">
                                GitHub
                            </a>
                            . PRs welcome.
                        </p>
                        <p className="lp-footer__line lp-footer__line--muted">
                            Made by Sam Yakovasi ·{' '}
                            <a className="lp-link" href="https://github.com/siacavazzi" target="_blank" rel="noreferrer noopener">
                                @siacavazzi
                            </a>
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default LandingPage;

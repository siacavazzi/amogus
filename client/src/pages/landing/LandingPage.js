import React, { useEffect, useState } from 'react';
import './Landing.css';
import { usePageMeta } from '../../seo/usePageMeta';
import { alternatesFor } from '../../seo/translatedPages';
import { SiteNav, SiteFooter } from '../../components/SiteChrome';
import Avatar from '../../components/Avatar';
import { ArrowRight } from '../../signal/icons';
import { ROOM_QUERY_PARAM, VIA_QUERY_PARAM } from '../../utils/inviteLinks';

// Screens captured from a real 8-phone game on the current build (public/images/landing).
const img = (name) => `/images/landing/${name}.webp`;

// The hero plays one round: each step swaps the phone and the reactor behind it.
const ROUND = [
    {
        label: 'Do tasks',
        phone: 'crew-task',
        phoneAlt: 'A crewmate’s phone showing their task: flip a plastic bottle until it lands upright, in the kitchen',
        tv: 'reactor',
        tvAlt: 'The reactor on a laptop showing 13% of tasks done',
    },
    {
        label: 'Meeting',
        phone: 'meeting-ready',
        phoneAlt: 'Every phone turns yellow: emergency meeting, Maya called it',
        tv: 'reactor-meeting',
        tvAlt: 'The reactor showing the emergency meeting and who is ready',
    },
    {
        label: 'Vote',
        phone: 'vote-selected',
        phoneAlt: 'Voting screen with each player’s face, Jules selected',
        tv: 'reactor-meeting',
        tvAlt: '',
    },
    {
        label: 'Caught',
        phone: 'vote-result',
        phoneAlt: 'Red screen: Jules was ejected. They were an intruder.',
        tv: 'reactor-victory',
        tvAlt: 'The reactor announcing that the crewmates win',
    },
];

const STEPS = [
    { shot: 'role-crew', alt: 'Phone showing your secret role: Crewmate', title: 'Get a secret role', body: 'Crewmate or intruder. Only you know.' },
    { shot: 'next-task', alt: 'Phone showing a task: walk up a flight of stairs and back down', title: 'Spread out and do tasks', body: 'Your phone sends you around the house to do real things.' },
    { shot: 'meeting-ready', alt: 'Emergency meeting screen on a phone', title: 'Find a body? Call a meeting', body: 'Every phone goes yellow and everyone heads to the meeting spot.' },
    { shot: 'vote-selected', alt: 'Voting screen with player faces', title: 'Argue and vote', body: 'Vote out the intruders before they get everyone.' },
];

// The suspects in the "who did it" mini game, with what each one would say for themselves.
const SUSPECTS = [
    { pic: 1, name: 'Maya', alibi: 'Called the meeting. Says they saw Kai near the body.' },
    { pic: 2, name: 'Alex', alibi: 'Was “in the kitchen” the whole time. Nobody saw them.' },
    { pic: 3, name: 'Jules', alibi: 'Finished zero tasks. Says the stairs one is hard.' },
    { pic: 7, name: 'Nora', alibi: 'Very quiet. Keeps checking their phone.' },
    { pic: 5, name: 'Kai', alibi: 'Says Maya is lying. Was alone in the hallway.' },
    { pic: 6, name: 'Theo', alibi: 'Wants to skip the vote. Suspiciously calm.' },
];

const FAQS = [
    { q: 'Is it free?', a: 'Yes. No app, no account, no ads. Everyone opens susparty.com in their phone’s browser.' },
    { q: 'How many people can play?', a: '3 to 20+. Bigger groups get more intruders, and the task generator builds packs for up to 30 players.' },
    { q: 'Where do you play?', a: 'Anywhere people can walk around: a house, apartment, dorm, office, library or camp. Tasks are spread across rooms so people split up.' },
    { q: 'Do we need to be together?', a: 'Yes. The phones connect online, but everyone plays in the same place. Kills, bodies and meetings happen in real life.' },
    { q: 'What are the tasks?', a: 'Short real things, like flipping a bottle, counting fridge magnets or walking up the stairs. Pick a pack for your place or write your own.' },
    { q: 'Do I need a laptop?', a: 'No. It’s optional. A laptop or desktop in the middle becomes the reactor: it shows the room code, task progress and the meltdown. Phones work on their own.' },
];

function Phone({ name, alt, className = '', loading = 'lazy' }) {
    return (
        <div className={`sl-phone ${className}`}>
            <img src={img(name)} alt={alt} width="390" height="845" loading={loading} />
        </div>
    );
}

function HeroScene() {
    const [step, setStep] = useState(0);
    const [auto, setAuto] = useState(true);
    useEffect(() => {
        const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
        if (reduce || !auto) return undefined;
        const id = setInterval(() => setStep((i) => (i + 1) % ROUND.length), 2800);
        return () => clearInterval(id);
    }, [auto]);
    const pick = (i) => { setAuto(false); setStep(i); };
    const prev = (step + ROUND.length - 1) % ROUND.length;
    const tvs = [...new Set(ROUND.map((r) => r.tv))];

    return (
        <div className="sl-scene">
            <div className="sl-scene__stage">
                <div className="sl-tv" aria-hidden="true">
                    <div className="sl-tv__screen">
                        {tvs.map((tv) => (
                            <img key={tv} src={img(tv)} alt="" width="1200" height="900"
                                className={ROUND[step].tv === tv ? 'is-on' : ''} />
                        ))}
                    </div>
                </div>
                <div className="sl-phone sl-phone--hero">
                    {ROUND.map((r, i) => (
                        <img
                            key={r.label}
                            src={img(r.phone)}
                            alt={i === 0 ? r.phoneAlt : ''}
                            aria-hidden={i === 0 ? undefined : true}
                            className={`sl-phone__shot ${i === step ? 'is-on' : ''} ${i === prev ? 'is-under' : ''}`}
                            width="390"
                            height="845"
                            loading={i === 0 ? 'eager' : 'lazy'}
                        />
                    ))}
                </div>
                <span className="sl-scene__note sl-scene__note--tv">a laptop as the reactor (optional)</span>
                <span className="sl-scene__note sl-scene__note--phone">everyone’s phone</span>
            </div>
            <ol className="sl-scene__steps" aria-label="A round of Sus Party">
                {ROUND.map((r, i) => (
                    <li key={r.label}>
                        <button type="button" onClick={() => pick(i)} aria-pressed={i === step}
                            className={i === step ? 'is-on' : ''}>
                            <span>{i + 1}</span>{r.label}
                        </button>
                    </li>
                ))}
            </ol>
        </div>
    );
}

function JoinForm() {
    const [code, setCode] = useState('');
    const clean = code.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 4);
    const submit = (e) => {
        e.preventDefault();
        window.location.href = clean.length === 4 ? `/play?${ROOM_QUERY_PARAM}=${clean}&${VIA_QUERY_PARAM}=home` : '/play';
    };
    return (
        <form className="sl-join" onSubmit={submit} aria-label="Join a game">
            <label className="sl-join__label" htmlFor="sl-code">Friend already started one? Enter the code</label>
            <div className="sl-join__row">
                <input
                    id="sl-code"
                    className="sl-join__code"
                    value={clean}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="CODE"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck="false"
                    inputMode="text"
                    maxLength={4}
                />
                <button type="submit" className="sl-btn sl-btn--ink">Join</button>
            </div>
        </form>
    );
}

// A tiny taste of the meeting: pick who you think did it.
function WhoDidIt() {
    const [intruder, setIntruder] = useState(null);
    const [vote, setVote] = useState(null);
    const choose = (i) => {
        if (vote !== null) return;
        // Decided on the first tap, so every suspect is a fair guess.
        setIntruder(Math.floor(Math.random() * SUSPECTS.length));
        setVote(i);
    };
    const reset = () => { setVote(null); setIntruder(null); };
    const done = vote !== null;
    const right = done && vote === intruder;

    return (
        <section className="sl-band sl-band--meet sl-who" aria-labelledby="sl-who-h">
            <div className="sl-wrap">
                <h2 id="sl-who-h" className="sl-h2">Riley’s been killed. Who did it?</h2>
                <p className="sl-body">Tap who you’d vote out.</p>
                <ul className="sl-who__grid">
                    {SUSPECTS.map((s, i) => {
                        const state = !done ? '' : i === intruder ? 'is-intruder' : i === vote ? 'is-wrong' : 'is-dim';
                        return (
                            <li key={s.name}>
                                <button type="button" className={`sl-suspect ${state}`} onClick={() => choose(i)}
                                    disabled={done} aria-label={`Vote for ${s.name}`}>
                                    <span className="sl-suspect__face"><Avatar id={s.pic} decorative /></span>
                                    <strong>{s.name}</strong>
                                    <span className="sl-suspect__alibi">{s.alibi}</span>
                                    {done && i === intruder && <span className="sl-suspect__tag">Intruder</span>}
                                </button>
                            </li>
                        );
                    })}
                </ul>
                <div className="sl-who__result" aria-live="polite">
                    {done && (
                        <>
                            <p className="sl-h3">
                                {right
                                    ? `You got ${SUSPECTS[intruder].name}. Crew wins.`
                                    : `${SUSPECTS[vote].name} was innocent. It was ${SUSPECTS[intruder].name}.`}
                            </p>
                            <p className="sl-body">It’s a lot more fun when it’s your actual friends lying to you.</p>
                            <div className="sl-who__actions">
                                <a href="/play" className="sl-btn sl-btn--ink">Start a game <ArrowRight size="1em" /></a>
                                <button type="button" className="sl-btn sl-btn--line" onClick={reset}>Try again</button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </section>
    );
}

function LandingPage() {
    usePageMeta({
        title: 'Sus Party | Free Among Us IRL Game for 3 to 20+ Players',
        description: 'Play Among Us in real life, free in your phone browser. Real tasks, secret roles, meetings and votes for 3 to 20+ players at parties, youth groups and classes.',
        canonical: 'https://susparty.com/',
        alternates: alternatesFor('home'),
    });

    return (
        <div className="site-page sl">
            {/* HERO */}
            <div className="sl-band sl-band--meet sl-hero">
                <SiteNav />
                <div className="sl-wrap sl-hero__grid">
                    <div className="sl-hero__text">
                        <h1 className="sl-title">Among Us IRL</h1>
                        <p className="sl-lede">
                            Like Among Us or Mafia, but at your party. Everyone gets a secret role on their
                            phone, spreads out to do real tasks, and tries to catch the intruder.
                        </p>
                        <div className="sl-hero__cta">
                            <a href="/play" className="sl-btn sl-btn--ink sl-btn--big sl-hero__start">Start a game <ArrowRight size="1em" /></a>
                            <p className="sl-hero__facts">Free in the browser, for 3 to 20+ players.</p>
                        </div>
                    </div>
                    <HeroScene />
                    <JoinForm />
                </div>
            </div>

            {/* PROOF: real numbers from the server, rounded */}
            <section className="sl-band sl-band--dark sl-proof" aria-label="Sus Party so far">
                <p className="sl-wrap sl-proof__line">
                    <strong>Hundreds of groups</strong> have hosted a game, <strong>nearly 900 people</strong> played
                    last month, and the biggest game had <strong>over 40 phones</strong>.
                </p>
            </section>

            {/* HOW A ROUND GOES */}
            <section className="sl-band sl-band--white" aria-labelledby="sl-round-h">
                <div className="sl-wrap">
                    <h2 id="sl-round-h" className="sl-h2">How a round goes</h2>
                    <ol className="sl-round">
                        {STEPS.map((s, i) => (
                            <li key={s.title}>
                                <Phone name={s.shot} alt={s.alt} />
                                <h3 className="sl-h3"><span className="sl-round__n">{i + 1}</span>{s.title}</h3>
                                <p className="sl-body">{s.body}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            {/* INTRUDER */}
            <section className="sl-band sl-band--dark sl-intruder" aria-labelledby="sl-intruder-h">
                <div className="sl-wrap sl-split">
                    <div>
                        <h2 id="sl-intruder-h" className="sl-h2">Unless you’re the intruder.</h2>
                        <p className="sl-body">
                            Your phone looks just like everyone else’s. Get people alone, then slip into the vent and
                            play sabotage cards: fake a task, taunt someone, set off a meltdown.
                        </p>
                        <p className="sl-body">Then act shocked at the meeting.</p>
                    </div>
                    <div className="sl-pair">
                        <Phone name="intruder-cards" alt="Intruder’s phone in the vent: kill ready, sabotage cards to play" />
                        <Phone name="phone-meltdown" alt="Meltdown screen: 58 seconds to type a code in at the reactor" className="sl-phone--back" />
                    </div>
                </div>
            </section>

            {/* REACTOR */}
            <section className="sl-band sl-band--round" aria-labelledby="sl-reactor-h">
                <div className="sl-wrap sl-split sl-split--flip">
                    <div>
                        <h2 id="sl-reactor-h" className="sl-h2">Bring a laptop. It’s the reactor.</h2>
                        <p className="sl-body">
                            Open it on a laptop or desktop where everyone passes by. It shows the code to join, how close the crew
                            is to winning, and the meltdown everyone has to run back to stop.
                        </p>
                        <p className="sl-body sl-dim">Optional. Phones are enough.</p>
                    </div>
                    <div className="sl-tv sl-tv--solo">
                        <div className="sl-tv__screen">
                            <img src={img('reactor-lobby')} alt="The reactor lobby on a laptop: room code, QR code and eight players" width="1200" height="900" loading="lazy" />
                        </div>
                    </div>
                </div>
            </section>

            <WhoDidIt />

            {/* SETUP */}
            <section className="sl-band sl-band--white" aria-labelledby="sl-setup-h">
                <div className="sl-wrap sl-split">
                    <div>
                        <h2 id="sl-setup-h" className="sl-h2">Two minutes to set up</h2>
                        <ol className="sl-setup">
                            <li><strong>Start a game</strong> on your phone.</li>
                            <li><strong>Pick a task pack</strong> for your place, or <a href="/among-us-irl-task-generator">make one</a>.</li>
                            <li><strong>Friends join</strong> by scanning the code or typing it in.</li>
                        </ol>
                        <a href="/play" className="sl-btn sl-btn--ink">Start a game <ArrowRight size="1em" /></a>
                    </div>
                    <Phone name="party-lobby" alt="Host’s phone in the lobby: room code AYRX, 8 players, 96 tasks, Start Game" />
                </div>
            </section>

            {/* FAQ */}
            <section className="sl-band sl-band--meet" aria-labelledby="sl-faq-h">
                <div className="sl-wrap sl-faq-wrap">
                    <h2 id="sl-faq-h" className="sl-h2">Questions</h2>
                    <div className="sl-faq">
                        {FAQS.map((item) => (
                            <details className="sl-faq__item" key={item.q}>
                                <summary className="sl-h3">{item.q}</summary>
                                <p className="sl-body">{item.a}</p>
                            </details>
                        ))}
                        <p className="sl-more"><a href="/faq">All questions <ArrowRight size="1em" /></a></p>
                    </div>
                </div>
            </section>

            {/* SEO links, below the fold, indexable */}
            <section className="sl-band sl-band--dark" aria-labelledby="sl-seo-heading">
                <div className="sl-wrap sl-seo">
                    <h2 id="sl-seo-heading" className="sl-h2 sl-h2--small">Plan your game</h2>
                    <p className="sl-body">
                        Sus Party is a free browser app for playing Among Us in real life with 3 to 20+ people.
                        Compare <a href="/social-deduction-games">social deduction games to play in person</a>,
                        plan an <a href="/among-us-birthday-party">Among Us birthday party</a>, or
                        find <a href="/party-games-for-10-people">party games for ten friends</a>.
                    </p>
                    <ul className="sl-links">
                        <li><a href="/among-us-irl">Free Among Us IRL app</a></li>
                        <li><a href="/how-to-play">How to play</a></li>
                        <li><a href="/among-us-irl-task-ideas">Task ideas at home</a></li>
                        <li><a href="/among-us-irl-task-generator">Task generator</a></li>
                        <li><a href="/among-us-role-generator">Role generator</a></li>
                        <li><a href="/party-games-for-adults">House parties</a></li>
                        <li><a href="/birthday-party-games-for-adults">Adult birthdays</a></li>
                        <li><a href="/murder-mystery-party-game">Murder mystery alternative</a></li>
                        <li><a href="/game-night-ideas">Game night</a></li>
                        <li><a href="/among-us-irl-for-youth-groups">Youth groups and big groups</a></li>
                    </ul>
                </div>
            </section>

            {/* CLOSING CTA */}
            <section className="sl-band sl-band--out sl-cta" aria-label="Play Sus Party">
                <div className="sl-wrap">
                    <h2 className="sl-title sl-title--cta">Someone at your party is sus.</h2>
                    <a href="/play" className="sl-btn sl-btn--white sl-btn--big">Start a game <ArrowRight size="1em" /></a>
                </div>
            </section>
            <div className="sl-band sl-band--dark sl-foot"><SiteFooter /></div>
        </div>
    );
}

export default LandingPage;

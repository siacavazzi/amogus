import React, { useEffect, useState } from 'react';
import './Landing.css';
import { usePageMeta } from '../../seo/usePageMeta';
import { SiteNav, SiteFooter } from '../../components/SiteChrome';
import { Home, Speaker, Cards, Radiation, ArrowRight } from '../../signal/icons';
import { ROOM_QUERY_PARAM } from '../../utils/inviteLinks';

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
        Icon: Home,
        title: 'Custom tasks for your venue',
        body: 'Generate a pack for your rooms or write your own tasks. Review the list, import it, and open the room for friends.',
    },
    {
        Icon: Speaker,
        title: 'Sonos integration',
        body: 'Pipe meeting bells and reactor alarms through your speakers for full house-wide chaos.',
    },
    {
        Icon: Cards,
        title: 'Sabotage cards',
        body: 'Intruders draw cards mid-game. Hack phones, force votes, mess with the room.',
    },
    {
        Icon: Radiation,
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
    { q: 'How many players?', a: 'Anywhere from 3 to 20+. The game needs at least two crew members per intruder, so add intruders as the group grows. The task generator builds packs for 5–15 players; add more tasks for a bigger group.' },
    { q: 'How does a big group join at once?', a: 'Open susparty.com/play on a laptop or TV first and create the room there. It becomes the big screen (the Reactor) and shows the room code to the whole group. Players type susparty.com on their phones and enter the code; the first phone in is the host. No download or sign-up.' },
    { q: 'Does it cost anything?', a: 'No. It\u2019s free, open source, and ad-free.' },
    { q: 'Where do we play?', a: 'Use shared areas in a house, apartment, dorm, office, or vacation rental. Choose at least two task locations so players have a route. Each phone needs internet.' },
];

// The hero phone plays the game's big moments in order, each one flooding over the last.
const SHOTS = [
    { src: '/images/signal/task.webp', alt: 'A player’s phone during a round: blue screen with their current task and a slider to complete it' },
    { src: '/images/signal/meeting.webp', alt: 'Every phone floods yellow when someone calls an emergency meeting' },
    { src: '/images/signal/vote.webp', alt: 'Voting screen with each player’s face to tap' },
    { src: '/images/signal/caught.webp', alt: 'Red screen after the group votes out an intruder' },
];

const MOMENTS = [
    {
        tone: 'round',
        tag: 'The round',
        title: 'Real tasks in real rooms.',
        body: 'Your phone shows one job and where to do it. Go to the kitchen, do the thing, slide to finish. Everyone’s screen looks the same, intruders included.',
        shot: 0,
    },
    {
        tone: 'meet',
        tag: 'The meeting',
        title: 'One button stops the whole house.',
        body: 'Find a body or catch someone acting strange? Call a meeting. Every phone floods yellow at once and everyone heads to the meeting spot.',
        shot: 1,
    },
    {
        tone: 'out',
        tag: 'The vote',
        title: 'Argue. Accuse. Vote someone out.',
        body: 'Tap who you think it is. When the group gets it right, every screen goes red. Get it wrong and the intruder keeps going.',
        shot: 3,
    },
];

function HeroPhone() {
    const [idx, setIdx] = useState(0);
    useEffect(() => {
        const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
        if (reduce) return undefined;
        const id = setInterval(() => setIdx((i) => (i + 1) % SHOTS.length), 2600);
        return () => clearInterval(id);
    }, []);
    return (
        <div className="sl-phone sl-phone--hero">
            {SHOTS.map((s, i) => (
                <img
                    key={s.src}
                    src={s.src}
                    alt={i === 0 ? s.alt : ''}
                    aria-hidden={i === 0 ? undefined : true}
                    className={`sl-phone__shot ${i === idx ? 'is-on' : ''} ${i === (idx + SHOTS.length - 1) % SHOTS.length ? 'is-under' : ''}`}
                    width="390"
                    height="844"
                    loading={i === 0 ? 'eager' : 'lazy'}
                />
            ))}
        </div>
    );
}

function JoinForm() {
    const [code, setCode] = useState('');
    const clean = code.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 4);
    const submit = (e) => {
        e.preventDefault();
        window.location.href = clean.length === 4 ? `/play?${ROOM_QUERY_PARAM}=${clean}` : '/play';
    };
    return (
        <form className="sl-join" onSubmit={submit} aria-label="Join a game">
            <label className="sl-join__label" htmlFor="sl-code">Got a room code?</label>
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
            <a href="/play" className="sl-btn sl-btn--line sl-join__host">Host a new game</a>
        </form>
    );
}

function LandingPage() {
    usePageMeta({
        title: 'Sus Party | Free Among Us IRL Game for 3 to 20+ Players',
        description: 'Play Among Us in real life, free in your phone browser. Real tasks, secret roles, meetings and votes for 3 to 20+ players at parties, youth groups and classes.',
        canonical: 'https://susparty.com/',
    });
    const [tagIdx, setTagIdx] = useState(0);

    useEffect(() => {
        const id = setInterval(() => setTagIdx((i) => (i + 1) % TAGLINE_WORDS.length), 1400);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="site-page sl">
            <div className="sl-band sl-band--meet sl-hero">
                <SiteNav />
                <div className="sl-wrap sl-hero__grid">
                    <div className="sl-hero__text">
                        <p className="sl-eyebrow">Sus Party · Free · No app download</p>
                        <h1 className="sl-title">Among us IRL</h1>
                        <p className="sl-rotator" aria-live="polite">
                            {TAGLINE_WORDS.map((w, i) => (
                                <span key={w} className={`sl-rotator__word ${i === tagIdx ? 'is-active' : ''}`}>{w}</span>
                            ))}
                        </p>
                        <p className="sl-lede">
                            Play Among Us in real life with Sus Party. Your house becomes the board.
                            Open your phone’s browser and
                            move room to room: complete real tasks, survive sabotage, call
                            meetings, and vote out the secret saboteur.
                        </p>
                        <JoinForm />
                        <p className="sl-footnote">
                            3 to 20+ players · One host phone runs the room ·{' '}
                            <a href="/how-to-play">How to play</a>
                        </p>
                    </div>
                    <HeroPhone />
                </div>
                <ul className="sl-wrap sl-mix" aria-label="Game ingredients">
                    <li><strong>Real rooms</strong><span>The house is the map</span></li>
                    <li><strong>Secret roles</strong><span>Trust gets expensive</span></li>
                    <li><strong>Phones guide it</strong><span>No install, no signup</span></li>
                </ul>
            </div>

            {MOMENTS.map((m, i) => (
                <section key={m.tag} className={`sl-band sl-band--${m.tone}`} aria-label={m.tag}>
                    <div className={`sl-wrap sl-split ${i % 2 ? 'sl-split--flip' : ''}`}>
                        <div>
                            <p className="sl-tag">{m.tag}</p>
                            <h2 className="sl-h2">{m.title}</h2>
                            <p className="sl-body">{m.body}</p>
                        </div>
                        <div className="sl-phone">
                            <img src={SHOTS[m.shot].src} alt={SHOTS[m.shot].alt} width="390" height="844" loading="lazy" />
                        </div>
                    </div>
                </section>
            ))}

            {/* HOW IT WORKS */}
            <section className="sl-band sl-band--white" aria-label="How it works">
                <div className="sl-wrap">
                    <p className="sl-tag">How it works</p>
                    <h2 className="sl-h2">How to play Among Us IRL at home.</h2>
                    <ol className="sl-steps">
                        {STEPS.map((s) => (
                            <li key={s.n}>
                                <span className="sl-steps__num">{s.n}</span>
                                <h3 className="sl-h3">{s.title}</h3>
                                <p className="sl-body">{s.body}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            {/* FEATURE HIGHLIGHTS */}
            <section className="sl-band sl-band--round" aria-label="Features">
                <div className="sl-wrap">
                    <p className="sl-tag">What’s in the box</p>
                    <h2 className="sl-h2">Built for the chaos of a real-life party.</h2>
                    <div className="sl-features">
                        {FEATURES.map((f) => (
                            <div className="sl-feature" key={f.title}>
                                <span className="sl-feature__icon" aria-hidden="true"><f.Icon size={30} /></span>
                                <h3 className="sl-h3">{f.title}</h3>
                                <p className="sl-body">{f.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* QUICK FAQ */}
            <section className="sl-band sl-band--meet" aria-label="Quick FAQ">
                <div className="sl-wrap">
                    <p className="sl-tag">Quick answers</p>
                    <h2 className="sl-h2">The stuff people always ask.</h2>
                    <dl className="sl-faq">
                        {FAQS.map((item) => (
                            <div className="sl-faq__item" key={item.q}>
                                <dt className="sl-h3">{item.q}</dt>
                                <dd className="sl-body">{item.a}</dd>
                            </div>
                        ))}
                    </dl>
                    <p className="sl-more">
                        <a href="/faq">More FAQs <ArrowRight size="1em" /></a>
                    </p>
                </div>
            </section>

            {/* SEO content section, below the fold, indexable */}
            <section className="sl-band sl-band--dark" aria-labelledby="sl-seo-heading">
                <div className="sl-wrap sl-seo">
                    <h2 id="sl-seo-heading" className="sl-h2">Choose the game for your group.</h2>
                    <p className="sl-body">
                        Sus Party is a free browser app for an Among Us-inspired party game in real life. Open
                        <a href="https://susparty.com"> susparty.com</a> on your phones, gather anywhere from 3 to 20+ people, and
                        turn your house into the board. Players move room to room, complete real tasks,
                        survive sabotage, call meetings, and vote out the secret saboteur. No app to install,
                        no signup, no ads.
                    </p>
                    <p className="sl-body">
                        Want a game night built around bluffing and accusations? Compare
                        {' '}<a href="/social-deduction-games">social deduction games to play in person</a>,
                        plan an <a href="/among-us-birthday-party">Among Us birthday game</a>,
                        or choose <a href="/party-games-for-10-people">party games for ten friends</a>.
                        When you pick Sus Party, the task generator carries your setup into a new room.
                    </p>
                    <ul className="sl-links">
                        <li><a href="/party-games-for-adults">Play at your next house party</a></li>
                        <li><a href="/murder-mystery-party-game">Make your friends the murder suspects</a></li>
                        <li><a href="/birthday-party-games-for-adults">Give birthday guests secret roles</a></li>
                        <li><a href="/game-night-ideas">Host a Sus Party game night</a></li>
                        <li><a href="/among-us-irl">Free Among Us IRL app</a></li>
                        <li><a href="/among-us-irl-task-ideas">Task ideas at home</a></li>
                        <li><a href="/among-us-irl-task-generator">Task generator</a></li>
                        <li><a href="/among-us-role-generator">Role generator</a></li>
                        <li><a href="/among-us-irl-for-youth-groups">Youth groups and big groups</a></li>
                        <li><a href="/how-to-play">How to play</a></li>
                    </ul>
                </div>
            </section>

            {/* CLOSING CTA */}
            <section className="sl-band sl-band--out sl-cta" aria-label="Play Sus Party">
                <div className="sl-wrap">
                    <h2 className="sl-title sl-title--cta">Ready to find the saboteur?</h2>
                    <a href="/play" className="sl-btn sl-btn--white">Play now <ArrowRight size="1em" /></a>
                </div>
            </section>
            <div className="sl-band sl-band--dark sl-foot"><SiteFooter /></div>
        </div>
    );
}

export default LandingPage;

import React, { useEffect, useRef, useState } from 'react';
import { FaRadiation } from 'react-icons/fa';
import {
    AlertTriangle,
    MapPin,
    Target,
    Radio,
    Zap,
    Wifi,
    WifiOff,
    Vote,
    Timer,
    Gavel,
    EyeOff,
    Hand,
    Eye,
    Skull,
    Lock,
    Sparkles,
    Crosshair,
    FileText,
    Flame,
    Megaphone,
    Users,
    Plus,
    X,
    Activity,
    Send,
    Check,
    Ban,
} from 'lucide-react';

// ============================================================
// Hardcoded marketing mockups of in-game phone screens.
// These intentionally do NOT import the real game pages so the
// landing has zero coupling to game state / sockets — but they
// closely mirror the real CrewPage / IntruderPage / HackedPage /
// VotingPage layouts so what you see is what you get.
// ============================================================

function CrewScreen() {
    return (
        <div className="lp-screen lp-crew">
            <div className="lp-crew__bg">
                <div className="lp-crew__glow" />
                <div className="lp-crew__ring lp-crew__ring--a" />
                <div className="lp-crew__ring lp-crew__ring--b" />
            </div>

            <div className="lp-crew__status">
                <span className="lp-crew__badge">
                    <Radio size={11} />
                    ACTIVE
                </span>
            </div>

            <button type="button" className="lp-crew__emergency" disabled>
                <AlertTriangle size={14} />
                <span>CALL MEETING</span>
            </button>

            <div className="lp-crew__card">
                <div className="lp-crew__card-head">
                    <span className="lp-crew__icon-pill">
                        <Target size={12} />
                    </span>
                    <span className="lp-crew__card-title">Current Task</span>
                </div>
                <div className="lp-crew__card-body">
                    <h3 className="lp-crew__task">Swap the dish towel</h3>
                    <div className="lp-crew__location">
                        <MapPin size={11} />
                        <span>Kitchen</span>
                    </div>
                </div>
            </div>

            <div className="lp-crew__foot-pill">
                <Crosshair size={10} />
                3 / 12 tasks
            </div>

            <div className="lp-crew__swiper" aria-hidden="true">
                <div className="lp-crew__swiper-track">
                    <div className="lp-crew__swiper-fill" />
                    <div className="lp-crew__swiper-shimmer" />
                    <div className="lp-crew__swiper-text">
                        Swipe to complete
                        <span className="lp-crew__swiper-arrow">›››</span>
                    </div>
                    <div className="lp-crew__swiper-handle">
                        <Hand size={18} />
                    </div>
                </div>
            </div>
        </div>
    );
}

function CrewPreviewNote({ className = '', compact = false }) {
    const noteClassName = ['lp-story__hero-note', className].filter(Boolean).join(' ');

    return (
        <div className={noteClassName}>
            {!compact ? <p className="lp-story__hero-note-title">Crew View</p> : null}
            <p className="lp-story__hero-note-body">
                {compact
                    ? 'Crew view: swipe tasks, call meetings, and react fast.'
                    : 'Most players live here: swipe tasks, call meetings, and react fast.'}
            </p>
        </div>
    );
}

// =============================================================
// TASK CREATION SCREEN
// Mirrors the redesigned in-game Tasks tab (PreGamePage.js):
//   1. Compact header card  : list name + code chip + Save
//   2. Prominent collab toggle (full-width, green border when on)
//   3. Locations chip bar   : count/MIN with green/yellow status
//   4. Single-row add form  : [📍 select] [input] [send]
//   5. Task groups w/ X     : always-visible delete X
//   6. "Add new location"   : dashed card at the bottom
// =============================================================
const TASK_GROUPS = [
    {
        location: 'Kitchen',
        count: 5,
        tasks: [
            { text: 'Refill the ice tray',  by: 'Sam' },
            { text: 'Wipe down the counter', by: 'Alex' },
        ],
    },
    {
        location: 'Lounge',
        count: 3,
        tasks: [
            { text: 'Find the TV remote', by: 'Jordan' },
        ],
    },
];
const TASK_MIN = 5;

function TaskCreationScreen() {
    return (
        <div className="lp-screen lp-task">
            <div className="lp-task__bg" />

            {/* 1. Header card: list name + code chip + Save */}
            <div className="lp-task__header">
                <div className="lp-task__header-row">
                    <FileText size={11} className="lp-task__header-icon" />
                    <span className="lp-task__header-name">Halloween Party</span>
                    <span className="lp-task__header-code">
                        <span className="lp-task__header-code-text">ABC123</span>
                    </span>
                    <button type="button" className="lp-task__header-save" disabled>
                        <Check size={9} />
                        <span>Saved</span>
                    </button>
                </div>
            </div>

            {/* 2. Big collaborative-mode toggle (ON state) */}
            <button type="button" className="lp-task__collab is-on" disabled>
                <div className="lp-task__collab-left">
                    <Users size={13} className="lp-task__collab-icon" />
                    <div className="lp-task__collab-text">
                        <div className="lp-task__collab-title">Collaborative mode</div>
                        <div className="lp-task__collab-sub">Everyone can add tasks</div>
                    </div>
                </div>
                <div className="lp-task__collab-pill">
                    <span className="lp-task__collab-dot" />
                    On
                </div>
            </button>

            {/* 3. Locations chip bar (per-location progress + pickable) */}
            <div className="lp-task__chips">
                {TASK_GROUPS.map((g) => {
                    const enough = g.count >= TASK_MIN;
                    return (
                        <span
                            key={g.location}
                            className={`lp-task__chip${enough ? ' is-enough' : ' is-short'}${g.location === 'Kitchen' ? ' is-selected' : ''}`}
                        >
                            <MapPin size={9} />
                            <span className="lp-task__chip-name">{g.location}</span>
                            <span className="lp-task__chip-count">{g.count}/{TASK_MIN}</span>
                            {enough && <Check size={9} />}
                        </span>
                    );
                })}
            </div>

            {/* 4. Single-row add-task form */}
            <div className="lp-task__form">
                <div className="lp-task__select">
                    <MapPin size={9} />
                    <span>Kitchen</span>
                    <span className="lp-task__select-caret">▾</span>
                </div>
                <div className="lp-task__input">Do 10 jumping jacks…</div>
                <button type="button" className="lp-task__send" disabled aria-label="Add">
                    <Send size={11} />
                </button>
            </div>

            {/* 5. Task groups with always-visible X delete */}
            <div className="lp-task__groups">
                {TASK_GROUPS.map((g) => {
                    const enough = g.count >= TASK_MIN;
                    return (
                        <div key={g.location} className="lp-task__group">
                            <div className="lp-task__group-head">
                                <span className="lp-task__group-name">
                                    <MapPin size={9} />
                                    {g.location}
                                </span>
                                <span className={`lp-task__group-count${enough ? ' is-enough' : ' is-short'}`}>
                                    {g.count}/{TASK_MIN}
                                    {enough && <Check size={8} />}
                                </span>
                            </div>
                            <ul className="lp-task__group-body">
                                {g.tasks.map((t) => (
                                    <li key={t.text} className="lp-task__row">
                                        <div className="lp-task__row-main">
                                            <div className="lp-task__row-text">{t.text}</div>
                                            <div className="lp-task__row-by">Added by {t.by}</div>
                                        </div>
                                        <X size={12} className="lp-task__row-x" />
                                    </li>
                                ))}
                            </ul>
                        </div>
                    );
                })}
            </div>

            {/* 6. Add-new-location dashed card pinned at the bottom */}
            <div className="lp-task__addloc">
                <div className="lp-task__addloc-label">
                    <Plus size={9} />
                    <span>Add new location</span>
                </div>
                <div className="lp-task__addloc-row">
                    <div className="lp-task__addloc-input">e.g. Garage…</div>
                    <button type="button" className="lp-task__addloc-btn" disabled>
                        <Plus size={10} />
                        <span>Add</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

// =============================================================
// REACTOR / MELTDOWN SCREEN (mobile MeltdownInfo)
// What players ACTUALLY see on their phone during a meltdown:
// the screen DISPLAYS the player's personal shutdown code in big
// yellow digits with instructions to enter it on the reactor
// terminal (the second screen). They do NOT type the code on
// their phone — that would be misleading.
// =============================================================
function ReactorScreen() {
    const TOTAL = 30;
    const [time, setTime] = useState(11);
    useEffect(() => {
        const t = setInterval(() => {
            setTime((s) => (s <= 1 ? TOTAL : s - 1));
        }, 1000);
        return () => clearInterval(t);
    }, []);
    const isCritical = time <= 10;

    const code = '7341';

    return (
        <div
            className={`lp-screen lp-reactor${isCritical ? ' is-critical' : ''}`}
        >
            {/* Reactor rings — purely decorative background */}
            <div className="lp-reactor__ring lp-reactor__ring--a" />
            <div className="lp-reactor__ring lp-reactor__ring--b" />

            <div className="lp-reactor__stack">
                <div className="lp-reactor__hero">
                    {/* Status pill */}
                    <div className="lp-reactor__status">
                        <AlertTriangle size={11} />
                        <span>MELTDOWN IN PROGRESS</span>
                    </div>
                </div>

                {/* Code display card — shows the player THEIR code so
                    they can run to the reactor terminal and key it in. */}
                <div className="lp-reactor__card">
                    <h2 className="lp-reactor__title">CORE MELTDOWN</h2>

                    <div className="lp-reactor__code-label">
                        <Lock size={11} />
                        <span>Your shutdown code</span>
                    </div>

                    <div className="lp-reactor__code">
                        {code.split('').map((d, i) => (
                            <span key={i} className="lp-reactor__code-digit">{d}</span>
                        ))}
                    </div>

                    <p className="lp-reactor__code-hint">
                        Enter this code at the core terminal
                    </p>

                    <div className="lp-reactor__timer">
                        <span className="lp-reactor__timer-val">{time}s</span>
                        <span className="lp-reactor__timer-label">
                            until meltdown
                        </span>
                    </div>

                    {isCritical && (
                        <div className="lp-reactor__critical">
                            <AlertTriangle size={11} />
                            <span>CRITICAL — MELTDOWN IMMINENT!</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom warning stripe only — top stripe collided with
                the phone notch, so we drop it. */}
            <div className="lp-reactor__stripe lp-reactor__stripe--bot" />
        </div>
    );
}

// Mirror of the real HackedPage: matrix rain, glitchy HACKED title,
// EMP subtitle, recovery timer card with corner brackets and progress
// bar, status messages. Trimmed for the phone mock + much lighter on
// runtime cost (no per-frame requestAnimationFrame loops, no random
// glitch interval running at 5Hz).
function HackedScreen() {
    const TOTAL = 30;
    const [time, setTime] = useState(TOTAL);
    useEffect(() => {
        const t = setInterval(() => {
            setTime((s) => (s <= 1 ? TOTAL : s - 1));
        }, 1000);
        return () => clearInterval(t);
    }, []);
    const isUrgent = time <= 10;
    const formatted = `00:${String(time).padStart(2, '0')}`;
    const pct = Math.max(0, (time / TOTAL) * 100);

    // Static set of matrix columns — cheaper than the real page's 25
    // animated React components. CSS handles the falling animation.
    const COLS = 10;

    return (
        <div className="lp-screen lp-hack">
            {/* Circuit grid background */}
            <div className="lp-hack__grid" aria-hidden="true" />

            {/* Matrix rain */}
            <div className="lp-hack__matrix" aria-hidden="true">
                {Array.from({ length: COLS }).map((_, i) => (
                    <div
                        key={i}
                        className="lp-hack__col"
                        style={{
                            left: `${(i / COLS) * 100 + (i % 2) * 1.5}%`,
                            animationDelay: `${(i * 0.27) % 2.4}s`,
                            animationDuration: `${2.4 + (i % 4) * 0.4}s`,
                        }}
                    >
                        {'アイウエオカキクケコ0xDEADBEEFCAFE1337'.split('').map((c, j) => (
                            <span key={j}>{c}</span>
                        ))}
                    </div>
                ))}
            </div>

            {/* Scan line sweep */}
            <div className="lp-hack__scan" aria-hidden="true" />

            {/* Corner status chips */}
            <div className="lp-hack__corner lp-hack__corner--tl">
                <WifiOff size={10} />
                <span>SIGNAL LOST</span>
            </div>
            <div className="lp-hack__corner lp-hack__corner--tr lp-hack__corner--red">
                <AlertTriangle size={10} />
                <span>BREACH</span>
            </div>
            <div className="lp-hack__corner lp-hack__corner--bl">
                <Radio size={10} />
                <span>COMMS JAMMED</span>
            </div>
            <div className="lp-hack__corner lp-hack__corner--br">
                <span>SYS_OVERRIDE</span>
            </div>

            {/* Center content stack: glitch HACKED title, EMP subtitle,
                bracketed timer card, status messages. Mirrors the real
                page's vertical hierarchy. */}
            <div className="lp-hack__center">
                <div className="lp-hack__title-wrap">
                    <h1 className="lp-hack__title">HACKED</h1>
                    <h1 className="lp-hack__title lp-hack__title--g1" aria-hidden="true">HACKED</h1>
                    <h1 className="lp-hack__title lp-hack__title--g2" aria-hidden="true">HACKED</h1>
                </div>

                <div className="lp-hack__emp">
                    <Wifi size={10} />
                    <span>EMP ACTIVE</span>
                    <Wifi size={10} />
                </div>

                <div className={`lp-hack__timer-card${isUrgent ? ' is-urgent' : ''}`}>
                    <span className="lp-hack__bracket lp-hack__bracket--tl" />
                    <span className="lp-hack__bracket lp-hack__bracket--tr" />
                    <span className="lp-hack__bracket lp-hack__bracket--bl" />
                    <span className="lp-hack__bracket lp-hack__bracket--br" />
                    <div className="lp-hack__label">SYSTEM RECOVERY IN</div>
                    <div className="lp-hack__time">{formatted}</div>
                    <div className="lp-hack__progress">
                        <div className="lp-hack__progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                </div>

                <div className="lp-hack__status">
                    <p>&gt; All systems compromised</p>
                    <p>&gt; Communications disabled</p>
                </div>
            </div>
        </div>
    );
}

// The intruder POV in the real game IS the sabotage cards screen.
// This mock mirrors the redesigned in-game CardCarousel: dark slate
// base, per-action accent border + dot, big faint per-action icon
// filling the card body, hold-to-play with a sweeping progress bar
// (no PLAY button), peeked side cards on either edge.
const INTRUDER_CARDS = [
    {
        id: 'emp',
        name: 'EMP',
        desc: 'Black out every player phone for 30 seconds.',
        Icon: Zap,
        meta: '30s',
        accent: 'cyan',
    },
    {
        id: 'fake',
        name: 'Fake task',
        desc: 'Send any crewmate on a wild goose chase.',
        Icon: FileText,
        meta: 'Target',
        accent: 'pink',
    },
    {
        id: 'meltdown',
        name: 'Remote sabotage',
        desc: 'Trigger a reactor meltdown from anywhere.',
        Icon: FaRadiation,
        meta: 'Boom',
        accent: 'rose',
    },
    {
        id: 'self',
        name: 'Self report',
        desc: 'Call a meeting and claim you found a body.',
        Icon: Megaphone,
        meta: 'Now',
        accent: 'amber',
    },
];

function IntruderScreen() {
    const [idx, setIdx] = useState(0);
    // Cycle through cards on a steady cadence so the deck visibly
    // animates without showing any explicit "hold to play" UI.
    useEffect(() => {
        const t = setInterval(() => {
            setIdx((i) => (i + 1) % INTRUDER_CARDS.length);
        }, 2400);
        return () => clearInterval(t);
    }, []);

    const total = INTRUDER_CARDS.length;
    const prevIdx = (idx - 1 + total) % total;
    const nextIdx = (idx + 1) % total;

    return (
        <div className="lp-screen lp-card">
            <div className="lp-card__bg" />

            <div className="lp-card__header">
                <span className="lp-card__chip">
                    <Skull size={11} />
                    INTRUDER
                </span>
                <span className="lp-card__hand">{idx + 1} / {total}</span>
            </div>

            {/* Active Effects panel — mirrors the in-game compact mode
                where the carousel collapses to make room for any
                currently-running ability. */}
            <div className="lp-card__active">
                <div className="lp-card__active-head">
                    <span className="lp-card__active-dot" />
                    <span>Active Effects</span>
                </div>
                <div className="lp-card__active-card">
                    <span className="lp-card__active-icon">
                        <Ban size={13} />
                    </span>
                    <div className="lp-card__active-body">
                        <div className="lp-card__active-name">Area Denial</div>
                        <div className="lp-card__active-meta">
                            <MapPin size={9} />
                            <span>Kitchen</span>
                            <span className="lp-card__active-sep">·</span>
                            <Timer size={9} />
                            <span>18s</span>
                        </div>
                    </div>
                    <div className="lp-card__active-pill">
                        <span />
                        Active
                    </div>
                </div>
            </div>

            <div className="lp-card__deck">
                {INTRUDER_CARDS.map((card, i) => {
                    const { Icon } = card;
                    let pos = 'hidden';
                    if (i === idx) pos = 'active';
                    else if (i === prevIdx) pos = 'left';
                    else if (i === nextIdx) pos = 'right';
                    return (
                        <div
                            key={card.id}
                            className={`lp-card__big lp-card__big--${card.accent} is-${pos}`}
                            aria-hidden={pos !== 'active'}
                        >
                            <div className="lp-card__big-head">
                                <span className="lp-card__big-icon">
                                    <Icon size={14} />
                                </span>
                                <span className="lp-card__big-name">{card.name}</span>
                            </div>
                            <div className="lp-card__big-desc">{card.desc}</div>
                            <div className="lp-card__big-art" aria-hidden="true">
                                <Icon size={88} strokeWidth={1.5} />
                            </div>
                            <div className="lp-card__big-foot">
                                <span className="lp-card__big-meta">{card.meta}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <ul className="lp-card__dots" aria-hidden="true">
                {INTRUDER_CARDS.map((c, i) => (
                    <li
                        key={c.id}
                        className={`lp-card__dot lp-card__dot--${c.accent}${i === idx ? ' is-active' : ''}`}
                    />
                ))}
            </ul>

            <div className="lp-card__exit">
                <Skull size={11} />
                <span>EXIT TO SAFETY</span>
            </div>
        </div>
    );
}

const MEETING_PLAYERS = [
    { name: 'Sam', color: 'purple', alive: true },
    { name: 'Alex', color: 'cyan', alive: true },
    { name: 'Jordan', color: 'pink', alive: true },
    { name: 'Riley', color: 'orange', alive: false },
    { name: 'Casey', color: 'emerald', alive: true, selected: true },
    { name: 'Morgan', color: 'amber', alive: true },
];

function MeetingScreen() {
    const TOTAL = 30;
    const [time, setTime] = useState(24);
    useEffect(() => {
        const t = setInterval(() => {
            setTime((s) => (s <= 1 ? TOTAL : s - 1));
        }, 1000);
        return () => clearInterval(t);
    }, []);
    const pct = Math.max(0, (time / TOTAL) * 100);
    const isUrgent = time <= 10;

    return (
        <div className="lp-screen lp-meet">
            <div className="lp-meet__bg" />

            <div className="lp-meet__head">
                <Gavel size={14} />
                <span>Emergency Vote</span>
            </div>

            <div className={`lp-meet__timer${isUrgent ? ' is-urgent' : ''}`}>
                <div className="lp-meet__timer-row">
                    <span className="lp-meet__timer-label">
                        <Timer size={10} />
                        Time Remaining
                    </span>
                    <span className="lp-meet__timer-val">{time}s</span>
                </div>
                <div className="lp-meet__timer-bar">
                    <div className="lp-meet__timer-fill" style={{ width: `${pct}%` }} />
                </div>
            </div>

            <div className="lp-meet__grid">
                {MEETING_PLAYERS.map((p) => (
                    <div
                        key={p.name}
                        className={`lp-meet__player lp-meet__player--${p.color}${
                            p.alive ? '' : ' is-dead'
                        }${p.selected ? ' is-selected' : ''}`}
                    >
                        <div className="lp-meet__avatar">
                            <span>{p.name[0]}</span>
                            {!p.alive && <span className="lp-meet__x">✕</span>}
                            {p.selected && (
                                <span className="lp-meet__vote">
                                    <Vote size={11} />
                                </span>
                            )}
                        </div>
                        <div className="lp-meet__name">{p.name}</div>
                    </div>
                ))}
            </div>

            <button type="button" className="lp-meet__cast" disabled>
                <Vote size={12} />
                <span>Vote for Casey</span>
            </button>
        </div>
    );
}

const SHOWCASE_PANELS = [
    {
        id: 'task',
        eyebrow: 'Lobby · Task setup',
        title: 'Real tasks. Real rooms.',
        body: 'Custom tasks, Quiplash style. In the lobby every player adds tasks for your specific space — your kitchen, your couch, your weird hallway closet. Anyone can remove a dud. Save the list and reuse it next party.',
        Component: TaskCreationScreen,
        details: [
            { icon: Users, label: 'Everyone in the room contributes' },
            { icon: MapPin, label: 'Tagged to your real locations' },
            { icon: FileText, label: 'Save lists, reuse them later' },
        ],
    },
    {
        id: 'meet',
        eyebrow: 'Emergency meeting',
        title: 'Bring it to the table.',
        body: 'Slam the red button and everyone gathers. Make your case, vote, and pray you guessed right. One wrong vote can lose the round.',
        Component: MeetingScreen,
        details: [
            { icon: AlertTriangle, label: 'Triggered by any player' },
            { icon: Timer, label: '30s to discuss and vote' },
            { icon: Gavel, label: 'Veto, accuse, or eject' },
        ],
    },
    {
        id: 'intruder',
        eyebrow: 'Intruder POV',
        title: 'A trick up your sleeve.',
        body: 'Intruders draw sabotage cards mid-game: hack phones, force meetings, fake tasks, mess with the lights. Each card flips the table.',
        Component: IntruderScreen,
        details: [
            { icon: Sparkles, label: 'Hold a hand of sabotage cards' },
            { icon: Zap, label: 'Single-use, high impact' },
            { icon: Skull, label: 'Pick off crew between meetings' },
        ],
    },
    {
        id: 'reactor',
        eyebrow: 'Optional · Reactor mode',
        title: 'Run a meltdown? Up to you.',
        body: 'Plug a second device into a TV as the reactor terminal. When the meltdown starts, every player gets a personal shutdown code on their phone — they sprint to the terminal and key it in before the timer hits zero.',
        Component: ReactorScreen,
        details: [
            { icon: Flame, label: 'Optional second-screen mode' },
            { icon: Lock, label: 'Race to enter shutdown PINs' },
            { icon: Timer, label: '30s to defuse or you lose' },
        ],
    },
];

// Shared phone mock — used both in the desktop sticky column and
// inline on mobile (one per panel).
function PhoneFrame({ children }) {
    return (
        <div className="lp-phone">
            <div className="lp-phone__notch" />
            <div className="lp-phone__screen">{children}</div>
        </div>
    );
}

export default function PhoneShowcase({ heroSlot }) {
    // active is 0 for the hero (crew screen), then 1..N for scroll panels.
    const [active, setActive] = useState(0);
    const heroRef = useRef(null);
    const panelRefs = useRef([]);

    // Pick the panel whose vertical center is closest to the viewport
    // center on every scroll/resize. The hero is index 0 — when at the
    // top of the page the phone shows the crew screen, then transitions
    // into each scroll panel as the user scrolls down.
    useEffect(() => {
        let raf = 0;
        const recompute = () => {
            raf = 0;
            const vc = window.innerHeight / 2;
            let bestIdx = 0;
            let bestDist = Infinity;
            const candidates = [heroRef.current, ...panelRefs.current];
            candidates.forEach((el, i) => {
                if (!el) return;
                const r = el.getBoundingClientRect();
                const center = r.top + r.height / 2;
                const d = Math.abs(center - vc);
                if (d < bestDist) {
                    bestDist = d;
                    bestIdx = i;
                }
            });
            setActive(bestIdx);
        };
        const onScroll = () => {
            if (raf) return;
            raf = requestAnimationFrame(recompute);
        };
        recompute();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
            if (raf) cancelAnimationFrame(raf);
        };
    }, []);

    return (
        <section className="lp-story" aria-label="Game preview">
            <div className="lp-story__inner">
                <div className="lp-story__text">
                    <div ref={heroRef}>{heroSlot}</div>

                    <div className="lp-story__hero-mobile">
                        <div className="lp-story__hero-phone" aria-hidden="true">
                            <PhoneFrame>
                                <div className="lp-phone__layer is-active">
                                    <CrewScreen />
                                </div>
                            </PhoneFrame>
                        </div>
                        <CrewPreviewNote className="lp-story__hero-note--mobile" />
                    </div>

                    <div className="lp-story__panels">
                        {SHOWCASE_PANELS.map((p, i) => {
                            const Comp = p.Component;
                            const panelActive = i + 1 === active;
                            return (
                                <article
                                    key={p.id}
                                    ref={(el) => {
                                        panelRefs.current[i] = el;
                                    }}
                                    className={`lp-story__panel ${
                                        panelActive ? 'is-active' : ''
                                    }`}
                                >
                                    <p className="lp-section-eyebrow">{p.eyebrow}</p>
                                    <h2 className="lp-section-heading">{p.title}</h2>

                                    {/* Mobile-only inline phone. Hidden on desktop where
                                        the sticky column handles it. We only mount the
                                        screen Component when this panel is the active one
                                        — every screen runs its own setInterval/animations,
                                        so leaving them all mounted at once burns CPU for
                                        no visible benefit. */}
                                    <div className="lp-story__panel-phone" aria-hidden="true">
                                        <PhoneFrame>
                                            <div className="lp-phone__layer is-active">
                                                {panelActive ? <Comp /> : null}
                                            </div>
                                        </PhoneFrame>
                                    </div>

                                    <p className="lp-section-body">{p.body}</p>
                                    <ul className="lp-story__details">
                                        {p.details.map(({ icon: Icon, label }) => (
                                            <li key={label} className="lp-story__detail">
                                                <span className="lp-story__detail-icon">
                                                    <Icon size={14} />
                                                </span>
                                                <span>{label}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </article>
                            );
                        })}
                    </div>
                </div>

                <div className="lp-story__phone-col" aria-hidden="true">
                    <div className="lp-story__phone-sticky">
                        <PhoneFrame>
                            {/* Only mount the currently-visible screen. Each screen
                               runs its own setInterval (card cycles, hack progress,
                               reactor countdown, etc.) and CSS animations — mounting
                               all 5 at once meant ~5× the work for no benefit since
                               only one is ever visible. */}
                            <div className="lp-phone__layer is-active">
                                {active === 0 ? <CrewScreen /> : (() => {
                                    const Cur = SHOWCASE_PANELS[active - 1]?.Component;
                                    return Cur ? <Cur /> : null;
                                })()}
                            </div>
                        </PhoneFrame>
                        <ul className="lp-story__dots" aria-hidden="true">
                            {SHOWCASE_PANELS.map((p, i) => (
                                <li
                                    key={p.id}
                                    className={`lp-story__dot ${
                                        i + 1 === active ? 'is-active' : ''
                                    }`}
                                />
                            ))}
                        </ul>
                        {active === 0 ? (
                            <CrewPreviewNote className="lp-story__hero-note--desktop" compact />
                        ) : null}
                    </div>
                </div>
            </div>
        </section>
    );
}

import React, { useState, useCallback } from 'react';
import { usePageMeta } from '../../seo/usePageMeta';
import SeoPageLayout from './SeoPageLayout';
import { VENUE_ROOMS, generateTasks } from './taskPools';

const VENUE_OPTIONS = [
    { value: 'apartment', label: 'Apartment / flat' },
    { value: 'house', label: 'House' },
    { value: 'dorm', label: 'Dorm / student halls' },
    { value: 'office', label: 'Office' },
    { value: 'airbnb', label: 'Airbnb / holiday rental' },
    { value: 'school', label: 'School or community centre' },
    { value: 'other', label: 'Other' },
];

const MOVEMENT_OPTIONS = [
    { value: 'low', label: 'Low — seated / standing in place' },
    { value: 'normal', label: 'Normal — walking between rooms' },
    { value: 'active', label: 'Active — anything goes' },
];

const STYLE_OPTIONS = [
    { value: 'standard', label: 'Standard' },
    { value: 'funny', label: 'Funny / chaotic' },
    { value: 'mix', label: 'Mix of both' },
];

function TaskGeneratorPage() {
    usePageMeta({
        title: 'Among Us IRL Task Generator — Make Tasks for Your Space | Sus Party',
        description:
            'Generate a custom Among Us IRL task list for your space. Pick your venue, rooms, player count, and style to get 20 ready-to-play tasks, sabotage ideas, and recommended settings.',
        canonical: 'https://susparty.com/among-us-irl-task-generator',
        ogImage: 'https://susparty.com/og-image.jpg',
    });

    const [venue, setVenue] = useState('apartment');
    const [playerCount, setPlayerCount] = useState(8);
    const [movement, setMovement] = useState('normal');
    const [taskStyle, setTaskStyle] = useState('standard');
    const [result, setResult] = useState(null);
    const [copied, setCopied] = useState(false);

    const suggestedRooms = VENUE_ROOMS[venue] || VENUE_ROOMS.other;

    const handleGenerate = useCallback(() => {
        const output = generateTasks({ venue, playerCount, movement, taskStyle });
        setResult(output);
        setCopied(false);
        // Scroll to output after a tick
        setTimeout(() => {
            const el = document.getElementById('generator-output');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
    }, [venue, playerCount, movement, taskStyle]);

    const handleCopy = useCallback(() => {
        if (!result) return;
        const lines = [
            `Among Us IRL — Task List`,
            `Venue: ${VENUE_OPTIONS.find((v) => v.value === venue)?.label || venue}`,
            `Players: ${playerCount}`,
            '',
            '=== TASKS ===',
            ...result.tasks.map((t, i) => `${i + 1}. [${t.location}] ${t.task}`),
            '',
            '=== SABOTAGE IDEAS (intruders only) ===',
            ...result.sabotages.map((s, i) => `${i + 1}. ${s}`),
            '',
            '=== RECOMMENDED SETTINGS ===',
            `Intruders: ${result.recommendations.intruderCount}`,
            `Est. duration: ${result.recommendations.durationMin}–${result.recommendations.durationMax} min`,
            `Meltdown: ${result.recommendations.meltdown ? 'Recommended' : 'Optional'}`,
            '',
            'Generated at susparty.com/among-us-irl-task-generator',
        ];
        navigator.clipboard
            .writeText(lines.join('\n'))
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2500);
            })
            .catch(() => {
                // Clipboard not available — ignore silently
            });
    }, [result, venue, playerCount]);

    return (
        <SeoPageLayout>
            {/* ── Hero ──────────────────────────────────────────────────── */}
            <div className="seo-hero">
                <p className="seo-eyebrow">
                    <a href="/among-us-irl" style={{ color: '#a5b4fc', textDecoration: 'none' }}>
                        Among Us IRL
                    </a>{' '}
                    › Task generator
                </p>
                <h1 className="seo-h1">Among Us IRL task generator</h1>
                <p className="seo-lead">
                    Tell the generator about your space and group. It will produce twenty tasks, three
                    sabotage ideas, and recommended game settings — ready to use immediately or load
                    into Sus Party.
                </p>
            </div>

            <div className="seo-content">
                <section className="seo-section" style={{ paddingTop: 0, borderTop: 'none' }}>
                    {/* ── Form ──────────────────────────────────────────── */}
                    <div className="seo-generator">
                        {/* Venue */}
                        <div className="seo-generator__field">
                            <label htmlFor="gen-venue">Where are you playing?</label>
                            <select
                                id="gen-venue"
                                value={venue}
                                onChange={(e) => {
                                    setVenue(e.target.value);
                                    setResult(null);
                                }}
                            >
                                {VENUE_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>
                                        {o.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Player count */}
                        <div className="seo-generator__field">
                            <label htmlFor="gen-players">
                                How many players?{' '}
                                <span style={{ color: '#a5b4fc', fontWeight: 700 }}>
                                    {playerCount}
                                </span>
                            </label>
                            <div className="seo-generator__range-row">
                                <input
                                    id="gen-players"
                                    type="range"
                                    min={5}
                                    max={15}
                                    step={1}
                                    value={playerCount}
                                    onChange={(e) => {
                                        setPlayerCount(Number(e.target.value));
                                        setResult(null);
                                    }}
                                    aria-valuemin={5}
                                    aria-valuemax={15}
                                    aria-valuenow={playerCount}
                                />
                                <span className="seo-generator__range-val" aria-hidden="true">
                                    {playerCount}
                                </span>
                            </div>
                        </div>

                        {/* Movement level */}
                        <div className="seo-generator__field">
                            <label htmlFor="gen-movement">Movement level</label>
                            <select
                                id="gen-movement"
                                value={movement}
                                onChange={(e) => {
                                    setMovement(e.target.value);
                                    setResult(null);
                                }}
                            >
                                {MOVEMENT_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>
                                        {o.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Task style */}
                        <div className="seo-generator__field">
                            <label htmlFor="gen-style">Task style</label>
                            <select
                                id="gen-style"
                                value={taskStyle}
                                onChange={(e) => {
                                    setTaskStyle(e.target.value);
                                    setResult(null);
                                }}
                            >
                                {STYLE_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>
                                        {o.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Rooms info */}
                        <div className="seo-generator__field">
                            <label>
                                Suggested rooms for{' '}
                                {VENUE_OPTIONS.find((v) => v.value === venue)?.label || venue}
                            </label>
                            <div className="seo-tags" aria-label="Suggested room areas">
                                {suggestedRooms.map((room) => (
                                    <span key={room} className="seo-tag is-selected" aria-label={room}>
                                        {room}
                                    </span>
                                ))}
                            </div>
                            <p
                                style={{
                                    color: '#6b7280',
                                    fontSize: '0.8rem',
                                    marginTop: 6,
                                    marginBottom: 0,
                                }}
                            >
                                Tasks are drawn from pools matching these areas.
                            </p>
                        </div>

                        {/* Generate button */}
                        <button
                            className="seo-btn--primary"
                            onClick={handleGenerate}
                            style={{ marginTop: 4, width: '100%', justifyContent: 'center' }}
                        >
                            Generate my task list →
                        </button>
                    </div>

                    {/* ── Output ────────────────────────────────────────── */}
                    {result && (
                        <div id="generator-output" className="seo-output">
                            {/* Badges */}
                            <div className="seo-output__meta">
                                <span className="seo-output__badge">
                                    <strong>Venue:</strong>{' '}
                                    {VENUE_OPTIONS.find((v) => v.value === venue)?.label || venue}
                                </span>
                                <span className="seo-output__badge">
                                    <strong>Players:</strong> {playerCount}
                                </span>
                                <span className="seo-output__badge">
                                    <strong>Tasks:</strong> {result.tasks.length}
                                </span>
                            </div>

                            {/* Recommended settings */}
                            <div
                                style={{
                                    background: 'rgba(99,102,241,0.08)',
                                    border: '1px solid rgba(99,102,241,0.2)',
                                    borderRadius: 10,
                                    padding: '14px 18px',
                                    marginBottom: 20,
                                    fontSize: '0.88rem',
                                    color: '#c7d2fe',
                                }}
                            >
                                <strong style={{ color: '#e5e7eb' }}>Recommended settings:</strong>{' '}
                                {result.recommendations.intruderCount} intruder
                                {result.recommendations.intruderCount !== 1 ? 's' : ''} ·{' '}
                                {result.recommendations.durationMin}–{result.recommendations.durationMax}{' '}
                                minute game · Meltdown{' '}
                                {result.recommendations.meltdown ? 'recommended' : 'optional'}
                            </div>

                            {/* Task list */}
                            <p className="seo-output__heading">Your 20 tasks</p>
                            <div className="seo-output__tasks">
                                {result.tasks.map((t, i) => (
                                    <div className="seo-output__task" key={i}>
                                        <span className="seo-output__loc">{t.location}</span>
                                        <span className="seo-output__text">{t.task}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Sabotage ideas */}
                            <div className="seo-output__subs">
                                <p className="seo-output__sub-label">Sabotage ideas (intruders only)</p>
                                {result.sabotages.map((s, i) => (
                                    <p className="seo-output__sub" key={i}>
                                        {i + 1}. {s}
                                    </p>
                                ))}
                            </div>

                            {/* Actions */}
                            <div className="seo-output__actions">
                                <button
                                    className="seo-btn--secondary"
                                    onClick={handleCopy}
                                    aria-label="Copy task list to clipboard"
                                >
                                    {copied ? '✓ Copied!' : 'Copy tasks'}
                                </button>
                                <button
                                    className="seo-btn--secondary"
                                    onClick={handleGenerate}
                                    aria-label="Regenerate a new task list"
                                >
                                    Regenerate
                                </button>
                                <a href="/play" className="seo-btn--primary">
                                    Start a game at Sus Party →
                                </a>
                            </div>
                        </div>
                    )}
                </section>

                {/* How it works */}
                <section className="seo-section">
                    <p className="seo-section__kicker">How it works</p>
                    <h2>What the generator produces</h2>
                    <div className="seo-cards seo-cards--3">
                        <div className="seo-card">
                            <h3>20 tasks</h3>
                            <p>
                                Sampled from curated pools matched to your venue and movement preference.
                                Every task is specific, verifiable, and completable in under a minute.
                            </p>
                        </div>
                        <div className="seo-card">
                            <h3>3 sabotage ideas</h3>
                            <p>
                                Suggestions intruders can use to slow the crew down or create confusion
                                — all physical, no special equipment needed.
                            </p>
                        </div>
                        <div className="seo-card">
                            <h3>Recommended settings</h3>
                            <p>
                                Based on player count: how many intruders to use, estimated game
                                duration, and whether to enable the meltdown mechanic.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Browse link */}
                <section className="seo-section">
                    <p className="seo-section__kicker">Prefer to browse?</p>
                    <h2>See the full task idea library</h2>
                    <p>
                        The generator draws from a curated library of 100+ tasks. If you want to
                        hand-pick tasks for your game, browse the full collection in the{' '}
                        <a href="/among-us-irl-task-ideas" style={{ color: '#a5b4fc' }}>
                            Among Us IRL task ideas guide
                        </a>
                        , organised by venue type.
                    </p>
                </section>

                {/* Internal links */}
                <nav className="seo-links" aria-label="Related pages">
                    <p className="seo-links__title">More Among Us IRL resources</p>
                    <ul className="seo-links__list">
                        <li>
                            <a href="/among-us-irl">Among Us IRL overview and setup guide</a>
                        </li>
                        <li>
                            <a href="/how-to-play-among-us-irl">Full rules guide</a>
                        </li>
                        <li>
                            <a href="/among-us-irl-task-ideas">Browse 100+ task ideas by venue</a>
                        </li>
                        <li>
                            <a href="/faq">Sus Party FAQ</a>
                        </li>
                    </ul>
                </nav>

                {/* CTA */}
                <div className="seo-cta-box">
                    <h2>Load tasks into Sus Party</h2>
                    <p>
                        Sus Party handles role assignment, task tracking, voting, and meetings
                        automatically. Free — no account, no install.
                    </p>
                    <a href="/play" className="seo-btn--primary">
                        Start an Among Us IRL game →
                    </a>
                </div>
            </div>
        </SeoPageLayout>
    );
}

export default TaskGeneratorPage;

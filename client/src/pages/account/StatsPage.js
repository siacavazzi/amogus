import React, { useEffect, useState } from 'react';
import { usePageMeta } from '../../seo/usePageMeta';
import { SignInForm } from '../../account/SignInSheet';
import { fetchAccountStats, signInAvailable, useAccount } from '../../account/accountStore';
import { getLanguage, t, tn } from '../../i18n';
import '../../account/account.css';
import './StatsPage.css';

// /account/stats: a signed-in player's game record. Only games played while signed in on the
// phone that played count; the server keeps nothing for anyone who isn't signed in.

function locale() {
    const lang = getLanguage();
    return lang === 'no' ? 'nb' : lang === 'pt' ? 'pt-BR' : lang || 'en';
}

function formatNumber(value) {
    try { return new Intl.NumberFormat(locale()).format(value); } catch (_) { return String(value); }
}

function percent(part, whole) {
    return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

function shortDate(seconds, options = { day: 'numeric', month: 'short' }) {
    try { return new Intl.DateTimeFormat(locale(), options).format(new Date(seconds * 1000)); } catch (_) { return ''; }
}

/** One role's win rate: a meter on a same-hue track, with the numbers in text beside it. */
function WinMeter({ label, wins, games, tone, testId }) {
    const rate = percent(wins, games);
    const width = games > 0 ? Math.max(rate, wins > 0 ? 2 : 0) : 0;
    return (
        <div className="st-meter" data-testid={testId}>
            <div className="st-meter__head">
                <span className="st-meter__label">{label}</span>
                <span className="st-meter__value">{games > 0 ? `${rate}%` : '–'}</span>
            </div>
            <svg className="st-meter__bar" viewBox="0 0 100 10" preserveAspectRatio="none" role="img"
                aria-label={t('{wins} of {games} won', { wins, games })}>
                <rect className={`st-track st-track--${tone}`} x="0" y="0" width="100" height="10" rx="5" />
                {width > 0 && <rect className={`st-fill st-fill--${tone}`} x="0" y="0" width={width} height="10" rx="5" />}
            </svg>
            <p className="st-meter__note">
                {games > 0 ? t('{wins} of {games} won', { wins, games }) : t('Not played yet')}
            </p>
        </div>
    );
}

/** Games each week for the last 12 weeks: won (blue) stacked under the rest (gray). */
function WeeksChart({ weeks }) {
    const [active, setActive] = useState(null);
    const max = Math.max(4, ...weeks.map((w) => w.games));
    const top = max <= 4 ? 4 : Math.ceil(max / 2) * 2;
    const H = 120;
    const slot = 100 / weeks.length;
    const bar = slot * 0.62;
    const y = (value) => H - (value / top) * H;
    return (
        <div className="st-weeks">
            <ul className="st-legend">
                <li><span className="st-key st-key--crew" aria-hidden="true" />{t('Won')}</li>
                <li><span className="st-key st-key--rest" aria-hidden="true" />{t('Other games')}</li>
            </ul>
            <div className="st-weeks__plot">
                <svg viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" className="st-weeks__svg" aria-hidden="true">
                    {[0, top / 2, top].map((tick) => (
                        <line key={tick} className={tick === 0 ? 'st-axis' : 'st-grid'} x1="0" x2="100" y1={y(tick)} y2={y(tick)} vectorEffect="non-scaling-stroke" />
                    ))}
                    {weeks.map((week, i) => {
                        const x = i * slot + (slot - bar) / 2;
                        const wonTop = y(week.wins);
                        const allTop = y(week.games);
                        const gap = week.wins > 0 && week.games > week.wins ? 1.5 : 0;
                        return (
                            <g key={week.end} className={active === i ? 'is-active' : ''}>
                                {week.wins > 0 && <rect className="st-fill st-fill--crew" x={x} y={wonTop} width={bar} height={H - wonTop} />}
                                {week.games > week.wins && <rect className="st-fill st-fill--rest" x={x} y={allTop} width={bar} height={Math.max(0, wonTop - allTop - gap)} />}
                            </g>
                        );
                    })}
                </svg>
                <span className="st-weeks__tick st-weeks__tick--top">{top}</span>
                <span className="st-weeks__tick st-weeks__tick--mid">{top / 2}</span>
                <div className="st-weeks__hits">
                    {weeks.map((week, i) => (
                        <button
                            type="button"
                            key={week.end}
                            className="st-weeks__hit"
                            onMouseEnter={() => setActive(i)}
                            onMouseLeave={() => setActive(null)}
                            onFocus={() => setActive(i)}
                            onBlur={() => setActive(null)}
                            aria-label={t('Week to {date}: {games} played, {wins} won', { date: shortDate(week.end), games: week.games, wins: week.wins })}
                        >
                            {active === i && (
                                <span className="st-tip" role="tooltip">
                                    <b>{t('Week to {date}', { date: shortDate(week.end) })}</b>
                                    <span>{tn(week.games, '{count} game', '{count} games')} · {t('{wins} won', { wins: week.wins })}</span>
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>
            <div className="st-weeks__axis" aria-hidden="true">
                <span>{shortDate(weeks[0].end)}</span>
                <span>{t('This week')}</span>
            </div>
        </div>
    );
}

/** The last games, oldest first: colour says the role, a filled square a win. */
function RecentStrip({ recent }) {
    const size = 16;
    const gap = 6;
    const width = recent.length * (size + gap) - gap;
    return (
        <div className="st-recent">
            <svg className="st-recent__svg" viewBox={`0 0 ${Math.max(width, 1)} ${size}`} width={width} height={size} role="img"
                aria-label={recent.map((game) => `${game.role === 'crew' ? t('Crew') : t('Intruder')}: ${game.won ? t('won') : t('lost')}`).join(', ')}>
                {recent.map((game, i) => (
                    <rect
                        key={`${game.at}-${i}`}
                        x={i * (size + gap) + (game.won ? 0 : 1.5)}
                        y={game.won ? 0 : 1.5}
                        width={game.won ? size : size - 3}
                        height={game.won ? size : size - 3}
                        rx="4"
                        className={`st-chip st-chip--${game.role}${game.won ? ' is-won' : ''}`}
                    >
                        <title>{`${shortDate(game.at)} · ${game.role === 'crew' ? t('Crew') : t('Intruder')} · ${game.won ? t('won') : t('lost')}`}</title>
                    </rect>
                ))}
            </svg>
            <ul className="st-legend st-legend--small">
                <li><span className="st-key st-key--crew" aria-hidden="true" />{t('Crew')}</li>
                <li><span className="st-key st-key--intruder" aria-hidden="true" />{t('Intruder')}</li>
                <li><span className="st-key st-key--hollow" aria-hidden="true" />{t('Outline: didn\'t win')}</li>
            </ul>
        </div>
    );
}

function Tile({ value, label, note, testId }) {
    return (
        <div className="st-tile" data-testid={testId}>
            <p className="st-tile__value">{value}</p>
            <p className="st-tile__label">{label}</p>
            {note && <p className="st-tile__note">{note}</p>}
        </div>
    );
}

/** A few cheerful headlines picked from the numbers, best first. */
function highlights(stats) {
    const out = [];
    if (stats.best_streak >= 2) out.push(t('Best win streak: {count} in a row', { count: stats.best_streak }));
    if (stats.sharp_votes > 0) out.push(tn(stats.sharp_votes, 'Sharp eye: {count} vote found an intruder', 'Sharp eye: {count} votes found an intruder'));
    if (stats.biggest_party >= 8) out.push(t('Biggest party: {count} players', { count: stats.biggest_party }));
    if (stats.tasks >= 10) out.push(tn(stats.tasks, 'Task machine: {count} task done', 'Task machine: {count} tasks done'));
    if (stats.games > 0 && stats.survived === stats.games) out.push(t('Made it to the end of every game'));
    return out.slice(0, 3);
}

function StatsBody({ stats, name }) {
    if (!stats || stats.games === 0) {
        return (
            <section className="st-card st-empty" data-testid="stats-empty">
                <p className="st-empty__big">0</p>
                <h2>{t('No games yet')}</h2>
                <p>{t('Play a game while you\'re signed in on your phone, and your stats show up here.')}</p>
                <a className="st-btn" href="/play">{t('Play Sus Party')}</a>
            </section>
        );
    }
    const since = stats.first_played ? shortDate(stats.first_played, { month: 'long', year: 'numeric' }) : '';
    const facts = highlights(stats);
    return (
        <>
            <section className="st-hero" data-testid="stats-hero">
                <p className="st-hero__eyebrow">{name ? t('Nice playing, {name}!', { name }) : t('Nice playing!')}</p>
                <p className="st-hero__num" data-testid="stats-games">{formatNumber(stats.games)}</p>
                <p className="st-hero__label">{tn(stats.games, 'game played', 'games played')}</p>
                <p className="st-hero__note">
                    {t('{wins} won', { wins: formatNumber(stats.wins) })}
                    {since ? ` · ${t('since {date}', { date: since })}` : ''}
                </p>
                {facts.length > 0 && (
                    <ul className="st-badges">
                        {facts.map((fact) => <li key={fact}>{fact}</li>)}
                    </ul>
                )}
            </section>

            <section className="st-card">
                <h2 className="st-h2">{t('Win rate')}</h2>
                <div className="st-meters">
                    <WinMeter label={t('As crew')} wins={stats.crew.wins} games={stats.crew.games} tone="crew" testId="stats-crew" />
                    <WinMeter label={t('As intruder')} wins={stats.intruder.wins} games={stats.intruder.games} tone="intruder" testId="stats-intruder" />
                </div>
            </section>

            <section className="st-card">
                <h2 className="st-h2">{t('Games each week')}</h2>
                <WeeksChart weeks={stats.weeks} />
            </section>

            {stats.recent.length > 0 && (
                <section className="st-card">
                    <h2 className="st-h2">{t('Your last games')}</h2>
                    <RecentStrip recent={stats.recent} />
                </section>
            )}

            <section className="st-card">
                <h2 className="st-h2">{t('Your numbers')}</h2>
                <div className="st-tiles">
                    <Tile testId="stats-tasks" value={formatNumber(stats.tasks)} label={t('Tasks done')} />
                    <Tile value={formatNumber(stats.meetings)} label={t('Meetings called')} />
                    <Tile value={formatNumber(stats.votes)} label={t('Votes cast')} note={stats.votes > 0 ? t('{count} found an intruder', { count: stats.sharp_votes }) : null} />
                    <Tile value={formatNumber(stats.survived)} label={t('Games you made it to the end')} />
                    <Tile value={formatNumber(stats.cards)} label={t('Intruder cards played')} />
                    <Tile value={formatNumber(stats.takedowns)} label={t('Intruder takedowns')} note={t('By your intruder team')} />
                    <Tile value={formatNumber(stats.players_met)} label={t('Players in your games')} note={t('Added up over every game')} />
                    <Tile value={formatNumber(stats.biggest_party)} label={t('Biggest party')} />
                    <Tile value={formatNumber(stats.best_streak)} label={t('Best win streak')} note={stats.current_streak > 1 ? t('{count} in a row right now', { count: stats.current_streak }) : null} />
                    <Tile value={formatNumber(stats.minutes)} label={t('Minutes played')} />
                </div>
            </section>
        </>
    );
}

function StatsPage() {
    usePageMeta({
        title: 'My stats | Sus Party',
        description: 'Your Sus Party game stats.',
        canonical: 'https://susparty.com/account/stats',
    });
    useEffect(() => {
        const meta = document.createElement('meta');
        meta.setAttribute('name', 'robots');
        meta.setAttribute('content', 'noindex');
        document.head.appendChild(meta);
        return () => meta.remove();
    }, []);

    const current = useAccount();
    const [stats, setStats] = useState(null);
    const [failed, setFailed] = useState(false);
    const accountId = current.account?.id;

    useEffect(() => {
        if (!accountId) { setStats(null); return undefined; }
        let live = true;
        setFailed(false);
        fetchAccountStats()
            .then((reply) => { if (!live) return; if (reply.ok) setStats(reply.stats); else setFailed(true); })
            .catch(() => live && setFailed(true));
        return () => { live = false; };
    }, [accountId]);

    let body;
    if (!current.loaded || (accountId && !stats && !failed)) {
        body = <p className="st-muted">{t('Loading…')}</p>;
    } else if (!current.account) {
        body = (
            <section className="st-card">
                <h2 className="st-h2">{t('Sign in to see your stats')}</h2>
                <p className="st-muted">{t('Games you play while signed in count toward your stats. Signing in is optional, and the game works the same without it.')}</p>
                {signInAvailable(current) ? <SignInForm /> : <p className="st-muted">{t('Sign-in isn\'t available right now.')}</p>}
            </section>
        );
    } else if (failed) {
        body = <p className="st-muted">{t('Your stats didn\'t load. Check your connection and try again.')}</p>;
    } else {
        body = <StatsBody stats={stats} name={current.account.name} />;
    }

    return (
        <div className="st-shell">
            <header className="st-top">
                <a href="/" className="st-brand">Sus Party</a>
                <nav className="st-tabs" aria-label={t('Account')}>
                    <a href="/account/stats" aria-current="page">{t('My stats')}</a>
                    <a href="/account">{t('My lists')}</a>
                </nav>
            </header>
            <main className="st-main">
                <h1 className="st-title">{t('My stats')}</h1>
                {body}
                <section className="st-privacy" data-testid="stats-privacy">
                    <h2>{t('About your stats')}</h2>
                    <p>{t('Only you can see them. We count games you play while signed in on that phone: your role, if your side won, and what you did. Nothing about the other players, and nothing for anyone who isn\'t signed in.')}</p>
                    <p>{t('Deleting your account deletes your stats too.')} <a href="/privacy">{t('Privacy')}</a></p>
                </section>
            </main>
        </div>
    );
}

export default StatsPage;

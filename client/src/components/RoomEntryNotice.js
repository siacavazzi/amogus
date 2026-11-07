import React from 'react';
import '../signal/signal.css';
import '../signal/host.css';
import { t, tk } from '../i18n';

const TITLES = {
    room_not_open: tk('Ask the host to open the room'),
    room_not_found: tk('Room code not found'),
    round_in_progress: tk('This round already started'),
    session_not_found: tk('Previous session unavailable'),
    connection_timeout: tk('No response from the room'),
};

function playedOn(seconds) {
    try {
        return new Date(seconds * 1000).toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
    } catch (_) {
        return '';
    }
}

// An invite link to a game that is over. Its own tasks come back when the link carried the game's token.
function GameEnded({ status, onStartNew, onChangeCode, busy }) {
    const saved = status.saved_game;
    return (
        <section className="hs-entry sg sg-a sg-rise" role="status" aria-live="polite" aria-atomic="true">
            <h2>{t('This game has ended')}</h2>
            <p>{saved
                ? t('It was played on {date}. Start a new game to play it again with the same {count} tasks.', { date: playedOn(saved.played_at), count: saved.task_count })
                : t('Start a new game, or enter the code for a game that is on now.')}</p>
            <div className="hs-entry__actions">
                <button type="button" onClick={onStartNew} disabled={busy} className="sg-btn sg-btn-blue">
                    {saved ? t('Play it again') : t('Start a new game')}
                </button>
                <button type="button" onClick={onChangeCode} disabled={busy} className="sg-link">{t('Enter a code')}</button>
            </div>
        </section>
    );
}

export default function RoomEntryNotice({ status, onRetry, onChangeCode, onStartNew, busy = false }) {
    if (!status) return null;
    if (status.code === 'game_ended' && onStartNew) return <GameEnded status={status} onStartNew={onStartNew} onChangeCode={onChangeCode} busy={busy} />;
    // The server holds a phone that came before the host opened the room and joins it on Open.
    const waiting = status.code === 'room_not_open' && status.waiting;
    return (
        <section className="hs-entry sg sg-a sg-rise" role="status" aria-live="polite" aria-atomic="true">
            {status.room_code && <p className="hs-entry__room">{t('Room {room_code}', { room_code: status.room_code })}</p>}
            <h2>{waiting ? t('Waiting for the host to open the room') : (TITLES[status.code] ? t(TITLES[status.code]) : t('Room unavailable'))}</h2>
            <p>{t(status.message)}</p>
            {waiting && <p data-testid="waiting-to-open" className="sg-small" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><span className="hs-dot" aria-hidden="true" /> {t('Keep this page open')}</p>}
            <div className="hs-entry__actions">
                {!waiting && (
                    <button type="button" onClick={onRetry} disabled={busy} className="sg-btn sg-btn-blue">
                        {busy ? t('Please wait…') : t('Try again')}
                    </button>
                )}
                <button type="button" onClick={onChangeCode} disabled={busy} className="sg-link">{t('Change code')}</button>
            </div>
        </section>
    );
}

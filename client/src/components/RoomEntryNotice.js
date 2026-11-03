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

export default function RoomEntryNotice({ status, onRetry, onChangeCode, busy = false }) {
    if (!status) return null;
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

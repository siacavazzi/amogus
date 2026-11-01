import React from 'react';
import '../signal/signal.css';
import '../signal/host.css';

const TITLES = {
    room_not_open: 'Ask the host to open the room',
    room_not_found: 'Room code not found',
    round_in_progress: 'This round already started',
    session_not_found: 'Previous session unavailable',
    connection_timeout: 'No response from the room',
};

export default function RoomEntryNotice({ status, onRetry, onChangeCode, busy = false }) {
    if (!status) return null;
    // The server holds a phone that came before the host opened the room and joins it on Open.
    const waiting = status.code === 'room_not_open' && status.waiting;
    return (
        <section className="hs-entry sg sg-a sg-rise" role="status" aria-live="polite" aria-atomic="true">
            {status.room_code && <p className="hs-entry__room">Room {status.room_code}</p>}
            <h2>{waiting ? 'Waiting for the host to open the room' : TITLES[status.code] || 'Room unavailable'}</h2>
            <p>{status.message}</p>
            {waiting && <p data-testid="waiting-to-open" className="sg-small" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><span className="hs-dot" aria-hidden="true" /> Keep this page open</p>}
            <div className="hs-entry__actions">
                {!waiting && (
                    <button type="button" onClick={onRetry} disabled={busy} className="sg-btn sg-btn-blue">
                        {busy ? 'Please wait…' : 'Try again'}
                    </button>
                )}
                <button type="button" onClick={onChangeCode} disabled={busy} className="sg-link">Change code</button>
            </div>
        </section>
    );
}

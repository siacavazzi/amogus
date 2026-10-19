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
    return (
        <section className="hs-entry sg sg-a sg-rise" role="status" aria-live="polite" aria-atomic="true">
            {status.room_code && <p className="hs-entry__room">Room {status.room_code}</p>}
            <h2>{TITLES[status.code] || 'Room unavailable'}</h2>
            <p>{status.message}</p>
            <div className="hs-entry__actions">
                <button type="button" onClick={onRetry} disabled={busy} className="sg-btn sg-btn-blue">
                    {busy ? 'Please wait…' : 'Try again'}
                </button>
                <button type="button" onClick={onChangeCode} disabled={busy} className="sg-link">Change code</button>
            </div>
        </section>
    );
}

import React from 'react';

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
        <section className="mb-5 border-l-2 border-amber-400 bg-amber-400/5 p-4 text-left"
            role="status" aria-live="polite" aria-atomic="true">
            {status.room_code && <p className="mb-1 font-mono text-xs tracking-widest text-amber-300">ROOM {status.room_code}</p>}
            <h2 className="mb-2 text-base font-semibold text-white">{TITLES[status.code] || 'Room unavailable'}</h2>
            <p className="text-sm leading-relaxed text-gray-300">{status.message}</p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
                <button type="button" onClick={onRetry} disabled={busy}
                    className="font-semibold text-amber-300 underline underline-offset-4 disabled:opacity-50">
                    {busy ? 'Please wait…' : 'Try again'}
                </button>
                <button type="button" onClick={onChangeCode} disabled={busy}
                    className="text-gray-300 underline underline-offset-4 disabled:opacity-50">Change code</button>
            </div>
        </section>
    );
}

import React, { useEffect, useState } from 'react';
import GroupRecap from './GroupRecap';
import { buildRoomInviteUrl } from '../utils/inviteLinks';
import { readLastGame, dismissLastGame } from '../utils/lastGame';
import { savedGameUrl } from '../utils/savedGame';
import { t } from '../i18n';
import { ENDPOINT } from '../ENDPOINT';

// The dev server (port 3000) doesn't serve /api; the game server does.
const API = typeof window !== 'undefined' && window.location.port === '3000' ? ENDPOINT : '';

function playedOn(ms) {
    try {
        return new Date(ms).toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
    } catch (_) {
        return '';
    }
}

// Returning hosts mostly come back through Google and land on the home page with nothing
// that remembers them. A phone that finished a game gets that game's tasks back in one tap.
export default function WelcomeBackCard({ style }) {
    const [game, setGame] = useState(readLastGame);
    const [group, setGroup] = useState(null);
    const token = game?.group;
    useEffect(() => {
        if (!token || typeof fetch !== 'function') return undefined;
        let live = true;
        fetch(`${API}/api/group?g=${encodeURIComponent(token)}`, { credentials: 'omit' })
            .then(response => (response.ok ? response.json() : null))
            .then(body => { if (live && body) setGroup(body); })
            .catch(() => { /* The card works without the score. */ });
        return () => { live = false; };
    }, [token]);
    if (!game) return null;
    const room = group?.room;
    const dismiss = () => { dismissLastGame(); setGame(null); };
    return (
        <section className="sg-welcome-back" aria-labelledby="welcome-back-title" style={{
            background: '#fff', color: '#14161a', borderRadius: 18, padding: '14px 16px',
            boxShadow: '0 6px 18px rgba(0, 0, 0, 0.12)', textAlign: 'left', maxWidth: 420, width: '100%', ...style,
        }}>
            <h2 id="welcome-back-title" style={{ margin: 0, fontSize: 19, fontWeight: 900, color: '#14161a' }}>{t('Welcome back')}</h2>
            <p style={{ margin: '4px 0 12px', fontSize: 15, fontWeight: 600, lineHeight: 1.35, color: '#14161a' }}>
                {game.taskCount
                    ? t('Play your game from {date} again, with the same {count} tasks.', { date: playedOn(game.playedAt), count: game.taskCount })
                    : t('Play your game from {date} again, with the same tasks.', { date: playedOn(game.playedAt) })}
            </p>
            <GroupRecap recap={group?.recap} style={{ margin: '0 0 12px' }} />
            {room && (
                <p data-testid="group-room-live" style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#14161a' }}>
                    {t('Your group is in room {room_code} right now.', { room_code: room.room_code })}
                </p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <a href={room ? buildRoomInviteUrl(room.room_code, window.location.origin, null, room.link_token)
                    : savedGameUrl(game.code, window.location.origin, { group: token, from: 'welcome' })} style={{
                    background: '#14161a', color: '#fff', borderRadius: 12, padding: '10px 16px',
                    fontWeight: 800, fontSize: 16, textDecoration: 'none',
                }}>{room ? t('Join your group') : t('Play it again')}</a>
                <button type="button" onClick={dismiss} style={{
                    background: 'none', border: 0, padding: 4, color: 'inherit', fontWeight: 700, fontSize: 15,
                    textDecoration: 'underline', cursor: 'pointer',
                }}>{t('Not now')}</button>
            </div>
        </section>
    );
}

import React, { useContext, useEffect, useState } from 'react';
import { DataContext } from '../GameContext';
import { Share2, Check } from '../signal/icons';
import { savedGameUrl, shareLink } from '../utils/savedGame';
import { rememberLastGame } from '../utils/lastGame';
import { sendClientMetric } from '../utils/clientMetrics';
import { t } from '../i18n';

// Most players never host, and the ones who did started from an empty task list. This gives
// every phone the night's game to keep. The code is fetched up front so the tap can open the
// share sheet straight away (iOS refuses it after a network wait).
function SaveGameButton({ onDone }) {
    const { socket, roomCode, roundId } = useContext(DataContext);
    const [code, setCode] = useState(undefined);
    const [group, setGroup] = useState('');
    const [result, setResult] = useState(null);

    useEffect(() => {
        if (!socket || !roomCode) return;
        let live = true;
        socket.emit('save_game_link', { room_code: roomCode, player_id: localStorage.getItem('player_id') || undefined },
            (response) => {
                if (response?.ok && response.code) rememberLastGame({ code: response.code, taskCount: response.task_count, group: response.link_token });
                if (live) {
                    setCode(response?.ok ? response.code : null);
                    setGroup(response?.ok ? response.link_token || '' : '');
                }
            });
        return () => { live = false; };
    }, [socket, roomCode, roundId]);

    const handleSave = async () => {
        const outcome = await shareLink({
            url: savedGameUrl(code, window.location.origin, { group }),
            title: 'Sus Party',
            text: code ? t('Our Sus Party game. Open the link to play it again with the same tasks.') : t('Sus Party: the real-life social deduction game'),
        });
        setResult(outcome);
        if (outcome !== 'failed') onDone?.();
        if (outcome === 'shared' || outcome === 'copied') {
            sendClientMetric(socket, { kind: 'end_screen_action', action: outcome === 'shared' ? 'save_game_shared' : 'save_game_copied' });
        }
    };

    return (
        <div className="flex flex-col gap-1">
            <button
                type="button"
                onClick={handleSave}
                disabled={code === undefined}
                className="sg-btn"
                style={{ background: 'transparent', color: 'var(--sg-ink)', border: '2px solid var(--sg-ink)', minHeight: 48, padding: 10, fontWeight: 800, fontSize: 16 }}
            >
                {result === 'copied' ? <><Check size={18} strokeWidth={3} /> {t('Link copied')}</> : <><Share2 size={18} /> {t('Save this game')}</>}
            </button>
            <p className="sg-small" style={{ textAlign: 'center', opacity: 0.7 }}>
                {code ? t('Send it to your group chat. The first to open it hosts, everyone else joins.') : t('Send yourself the link to play again later')}
            </p>
        </div>
    );
}

export default SaveGameButton;

import React, { useContext, useEffect, useState } from 'react';
import { DataContext } from '../GameContext';
import { RotateCcw, LogOut, Check } from '../signal/icons';
import { useFeedbackPrompt } from './GameFeedback';
import SaveGameButton from './SaveGameButton';
import InstallPrompt from './InstallPrompt';
import { t } from '../i18n';

function EndGameButtons() {
    const { socket, roomCode, resetVotes, isMobile, roundId } = useContext(DataContext);
    const [sending, setSending] = useState(false);
    // Play Again and Leave act straight away and call off the feedback prompt for this round.
    // The prompt never covers Save this game either: it waits until the player is done with it.
    const feedback = useFeedbackPrompt();

    const playerId = localStorage.getItem('player_id');
    // The reactor isn't a player, so it has no vote: its Play Again takes the room back to the lobby.
    const isReactor = !isMobile;
    const hasVoted = !isReactor && resetVotes.voters?.includes(playerId);
    const votesInProgress = resetVotes.current > 0 && resetVotes.current < resetVotes.needed;

    // Hold the button while a tap is on its way, so a slow connection doesn't queue a pile of them.
    useEffect(() => {
        if (!sending) return undefined;
        const timer = setTimeout(() => setSending(false), 4000);
        return () => clearTimeout(timer);
    }, [sending]);
    useEffect(() => setSending(false), [resetVotes]);

    const handlePlayAgain = () => {
        feedback.skipRound(roundId);
        if (!socket || sending) return;
        setSending(true);
        socket.emit('reset', isReactor
            ? { room_code: roomCode, force: true }
            : { player_id: playerId || undefined, room_code: roomCode });
    };

    const handleLeaveRoom = () => {
        feedback.skipRound(roundId);
        // Clear local storage first
        localStorage.removeItem('player_id');
        localStorage.removeItem('room_code');
        sessionStorage.removeItem('is_room_creator');
        
        if (socket) {
            // Send both player_id and room_code for compatibility
            console.log('Emitting leave_room with player_id:', playerId, 'room_code:', roomCode);
            socket.emit('leave_room', { 
                player_id: playerId || undefined,
                room_code: roomCode 
            });
        } else {
            console.error('Cannot leave room: missing socket');
        }
    };

    return (
        <div className="sg flex flex-col gap-2.5 w-full">
            {votesInProgress && (
                <p className="sg-num text-center" style={{ fontWeight: 700, fontSize: 15 }}>
                    {t('{current} / {needed} players ready', { current: resetVotes.current, needed: resetVotes.needed })}
                </p>
            )}
            <button
                onClick={handlePlayAgain}
                disabled={hasVoted || sending}
                className="sg-btn"
                style={{ background: hasVoted ? '#eceae4' : 'var(--sg-ink)', color: hasVoted ? 'var(--sg-ink)' : '#fff', opacity: 1 }}
            >
                {hasVoted ? <><Check size={20} strokeWidth={3} /> {t('Ready!')}</> : <><RotateCcw size={20} strokeWidth={3} /> {t('Play Again')}</>}
            </button>
            {!isReactor && <SaveGameButton onDone={() => feedback.savedRound(roundId)} />}
            <button onClick={handleLeaveRoom} className="sg-btn" style={{ background: 'transparent', color: 'var(--sg-ink)', minHeight: 48, padding: 10, fontWeight: 700, fontSize: 16 }}>
                <LogOut size={18} />
                <span>{t('Leave')}</span>
            </button>
            {/* Below Leave: the hint is a nice-to-have, the buttons above it must fit on a phone. */}
            {!isReactor && <InstallPrompt />}
        </div>
    );
}

export default EndGameButtons;

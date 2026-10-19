import React, { useContext, useEffect, useState } from 'react';
import { DataContext } from '../GameContext';
import { RotateCcw, LogOut, Check } from '../signal/icons';

function EndGameButtons() {
    const { socket, roomCode, resetVotes, isMobile } = useContext(DataContext);
    const [sending, setSending] = useState(false);

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
        if (!socket || sending) return;
        setSending(true);
        socket.emit('reset', isReactor
            ? { room_code: roomCode, force: true }
            : { player_id: playerId || undefined, room_code: roomCode });
    };

    const handleLeaveRoom = () => {
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
                    {resetVotes.current} / {resetVotes.needed} players ready
                </p>
            )}
            <button
                onClick={handlePlayAgain}
                disabled={hasVoted || sending}
                className="sg-btn"
                style={{ background: hasVoted ? '#eceae4' : 'var(--sg-ink)', color: hasVoted ? 'var(--sg-ink)' : '#fff', opacity: 1 }}
            >
                {hasVoted ? <><Check size={20} strokeWidth={3} /> Ready!</> : <><RotateCcw size={20} strokeWidth={3} /> Play Again</>}
            </button>
            <button onClick={handleLeaveRoom} className="sg-btn" style={{ background: 'transparent', color: 'var(--sg-ink)', minHeight: 48, padding: 10, fontWeight: 700, fontSize: 16 }}>
                <LogOut size={18} />
                <span>Leave</span>
            </button>
        </div>
    );
}

export default EndGameButtons;

import React, { useContext } from 'react';
import { DataContext } from '../GameContext';
import { RotateCcw, LogOut, Check, Users } from 'lucide-react';

function EndGameButtons() {
    const { socket, roomCode, resetVotes, playerState } = useContext(DataContext);
    
    const playerId = localStorage.getItem('player_id');
    const hasVoted = resetVotes.voters?.includes(playerId);
    const votesInProgress = resetVotes.current > 0 && resetVotes.current < resetVotes.needed;

    const handlePlayAgain = () => {
        if (socket) {
            // Send both player_id and room_code for compatibility with both mobile and reactor
            console.log('Emitting reset with player_id:', playerId, 'room_code:', roomCode);
            socket.emit('reset', { 
                player_id: playerId || undefined,
                room_code: roomCode 
            });
        } else {
            console.error('Cannot reset: missing socket');
        }
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
        <div className="flex flex-col gap-3 w-full">
            {/* Vote progress indicator */}
            {votesInProgress && (
                <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                    <Users size={16} className="text-cyan-400" />
                    <span className="text-cyan-300 text-sm font-medium">
                        {resetVotes.current} / {resetVotes.needed} players ready
                    </span>
                </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-3">
                <button
                    onClick={handlePlayAgain}
                    disabled={hasVoted}
                    className={`group relative flex-1 flex items-center justify-center gap-2 font-bold py-4 px-6 rounded-xl transition-all transform shadow-lg overflow-hidden ${
                        hasVoted 
                            ? 'bg-green-800/50 border-2 border-green-500/50 cursor-default'
                            : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 hover:scale-[1.02] shadow-green-500/20'
                    } text-white`}
                >
                    {!hasVoted && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    )}
                    {hasVoted ? (
                        <>
                            <Check size={20} className="relative z-10 text-green-400" />
                            <span className="relative z-10 text-green-300">Ready!</span>
                        </>
                    ) : (
                        <>
                            <RotateCcw size={20} className="relative z-10" />
                            <span className="relative z-10">Play Again</span>
                        </>
                    )}
                </button>
                <button
                    onClick={handleLeaveRoom}
                    className="group relative flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white font-medium py-4 px-6 rounded-xl transition-all"
                >
                    <LogOut size={18} />
                    <span>Leave</span>
                </button>
            </div>
        </div>
    );
}

export default EndGameButtons;

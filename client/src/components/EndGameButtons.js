import React, { useContext } from 'react';
import { DataContext } from '../GameContext';
import { RotateCcw, LogOut } from 'lucide-react';

function EndGameButtons() {
    const { socket } = useContext(DataContext);

    const handlePlayAgain = () => {
        const playerId = localStorage.getItem('player_id');
        if (playerId && socket) {
            console.log('Emitting reset with player_id:', playerId);
            socket.emit('reset', { player_id: playerId });
        } else {
            console.error('Cannot reset: missing player_id or socket');
        }
    };

    const handleLeaveRoom = () => {
        const playerId = localStorage.getItem('player_id');
        if (playerId && socket) {
            console.log('Emitting leave_room with player_id:', playerId);
            socket.emit('leave_room', { player_id: playerId });
        } else {
            console.error('Cannot leave room: missing player_id or socket');
        }
    };

    return (
        <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <button
                onClick={handlePlayAgain}
                className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105 shadow-lg"
            >
                <RotateCcw size={20} />
                Play Again
            </button>
            <button
                onClick={handleLeaveRoom}
                className="flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105 shadow-lg"
            >
                <LogOut size={20} />
                Leave Room
            </button>
        </div>
    );
}

export default EndGameButtons;

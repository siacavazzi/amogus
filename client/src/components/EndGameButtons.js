import React, { useContext } from 'react';
import { DataContext } from '../GameContext';
import { RotateCcw, LogOut } from 'lucide-react';

function EndGameButtons() {
    const { socket, playerState } = useContext(DataContext);

    const handlePlayAgain = () => {
        socket.emit('reset', { player_id: playerState.playerId });
    };

    const handleLeaveRoom = () => {
        socket.emit('leave_room', { player_id: playerState.playerId });
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

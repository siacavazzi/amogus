import React, { useState, useContext, useEffect } from 'react';
import { DataContext } from '../GameContext';
import { Users, Plus, ArrowRight } from 'lucide-react';

function LobbyPage() {
    const [inputRoomCode, setInputRoomCode] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState('');
    const { socket } = useContext(DataContext);

    // Listen for errors and success to reset the button states
    useEffect(() => {
        if (!socket) return;

        const handleError = (data) => {
            setError(data.message || 'An error occurred');
            setIsJoining(false);
            setIsCreating(false);
        };

        const handleSuccess = () => {
            // Reset states on successful join/create (though we'll navigate away anyway)
            setIsJoining(false);
            setIsCreating(false);
            setError('');
        };

        socket.on('error', handleError);
        socket.on('game_created', handleSuccess);
        socket.on('game_joined', handleSuccess);

        return () => {
            socket.off('error', handleError);
            socket.off('game_created', handleSuccess);
            socket.off('game_joined', handleSuccess);
        };
    }, [socket]);

    const handleCreateGame = () => {
        setIsCreating(true);
        setError('');
        socket.emit('create_game');
        
        // Timeout fallback in case server doesn't respond
        setTimeout(() => {
            setIsCreating(false);
        }, 10000);
    };

    const handleJoinGame = (e) => {
        e.preventDefault();
        if (inputRoomCode.length !== 4) {
            setError('Room code must be 4 letters');
            return;
        }
        setIsJoining(true);
        setError('');
        // Include player_id for reconnection (to restore host status)
        const playerId = localStorage.getItem('player_id');
        socket.emit('join_game', { 
            room_code: inputRoomCode.toUpperCase(),
            player_id: playerId || undefined
        });
        
        // Timeout fallback in case server doesn't respond
        setTimeout(() => {
            setIsJoining(false);
        }, 10000);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-tr from-gray-800 to-gray-900 p-6">
            <div className="relative bg-gray-700 bg-opacity-90 backdrop-blur-md p-8 rounded-lg shadow-lg max-w-md w-full">
                {/* Header */}
                <div className="flex flex-col items-center mb-8">
                    <img 
                        src="https://i1.sndcdn.com/artworks-Uii8SMJvNPxy8ePA-romBoQ-t1080x1080.jpg" 
                        alt="Among Us"
                        className="w-32 h-32 rounded-full mb-4"
                    />
                    <h1 className="text-3xl font-bold text-gray-100">Among Us IRL</h1>
                    <p className="text-gray-400 mt-2">Create or join a game room</p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-500 bg-opacity-20 border border-red-500 rounded-lg text-red-300 text-center">
                        {error}
                    </div>
                )}

                {/* Create Game Button */}
                <button
                    onClick={handleCreateGame}
                    disabled={isCreating}
                    className="w-full bg-indigo-600 text-white py-4 px-6 rounded-lg hover:bg-indigo-700 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 transform hover:scale-105 flex items-center justify-center gap-3 mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isCreating ? (
                        <span className="animate-pulse">Creating...</span>
                    ) : (
                        <>
                            <Plus size={24} />
                            <span className="text-lg font-semibold">Create New Game</span>
                        </>
                    )}
                </button>

                {/* Divider */}
                <div className="flex items-center mb-6">
                    <div className="flex-1 border-t border-gray-500"></div>
                    <span className="px-4 text-gray-400 text-sm">or join existing</span>
                    <div className="flex-1 border-t border-gray-500"></div>
                </div>

                {/* Join Game Form */}
                <form onSubmit={handleJoinGame}>
                    <div className="mb-4">
                        <label htmlFor="roomCode" className="block text-gray-300 mb-2">
                            Room Code
                        </label>
                        <input
                            type="text"
                            id="roomCode"
                            value={inputRoomCode}
                            onChange={(e) => setInputRoomCode(e.target.value.toUpperCase().slice(0, 4))}
                            className="w-full px-4 py-3 border border-gray-500 rounded-lg bg-gray-600 text-gray-100 text-center text-2xl font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-green-400 transition-colors"
                            placeholder="ABCD"
                            maxLength={4}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isJoining || inputRoomCode.length !== 4}
                        className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-all focus:outline-none focus:ring-2 focus:ring-green-400 transform hover:scale-105 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isJoining ? (
                            <span className="animate-pulse">Joining...</span>
                        ) : (
                            <>
                                <Users size={20} />
                                <span className="font-semibold">Join Game</span>
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                </form>

                {/* Footer */}
                <div className="mt-8 text-center text-gray-500 text-sm">
                    <p>Get everyone on the same WiFi network</p>
                </div>
            </div>
        </div>
    );
}

export default LobbyPage;

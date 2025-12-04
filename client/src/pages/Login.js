import React, { useState, useContext, useEffect } from 'react';
import { ChevronLeft, Copy, Check } from 'lucide-react';
import { DataContext } from '../GameContext';

function LoginPage() {
    const [username, setUsername] = useState('');
    const [copied, setCopied] = useState(false);
    const { setPlayerState, socket, setTaskEntry, roomCode } = useContext(DataContext);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const handleJoin = async (e) => {
        e.preventDefault();

        setPlayerState(prevState => ({ ...prevState, username: username }));
        let playerId = localStorage.getItem('player_id');

        socket.emit('join', { 
            player_id: playerId, 
            username: username,
            room_code: roomCode 
        });
    };

    const handleEnterTasks = () => {
        setTaskEntry(true)
    };

    const copyRoomCode = async () => {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(roomCode);
            } else {
                // Fallback for older browsers/non-HTTPS
                const textArea = document.createElement('textarea');
                textArea.value = roomCode;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-tr from-gray-800 to-gray-900 p-6 relative">
            {/* Back Button Styled */}
            <button
                type="button"
                onClick={handleEnterTasks}
                className="absolute top-6 left-6 flex items-center text-gray-300 hover:text-white transition-colors"
            >
                <ChevronLeft className="mr-1" />
                <span className="text-sm">Task Entry</span>
            </button>

            <div className="relative bg-gray-700 bg-opacity-90 backdrop-blur-md p-8 rounded-lg shadow-lg max-w-sm w-full">
                {/* Room Code Display */}
                {roomCode && (
                    <div className="mb-6 p-4 bg-gray-800 rounded-lg">
                        <p className="text-gray-400 text-sm text-center mb-2">Room Code</p>
                        <div className="flex items-center justify-center gap-3">
                            <span className="text-3xl font-mono font-bold text-indigo-400 tracking-widest">
                                {roomCode}
                            </span>
                            <button
                                onClick={copyRoomCode}
                                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                                title="Copy room code"
                            >
                                {copied ? (
                                    <Check className="text-green-400" size={20} />
                                ) : (
                                    <Copy className="text-gray-400" size={20} />
                                )}
                            </button>
                        </div>
                        <p className="text-gray-500 text-xs text-center mt-2">
                            Share this code with other players
                        </p>
                    </div>
                )}

                {/* Decorative Icon */}
                <div className="flex flex-col items-center mb-6">
                    <img 
                        src="https://i1.sndcdn.com/artworks-Uii8SMJvNPxy8ePA-romBoQ-t1080x1080.jpg"
                        alt="Among Us"
                        className="w-24 h-24 rounded-lg mb-4"
                    />
                    <h2 className="text-2xl font-bold mb-2 text-gray-100">Join the Game</h2>
                    <p className="text-sm text-gray-300">Enter your username to start playing</p>
                </div>
                {/* Login Form */}
                <form onSubmit={handleJoin}>
                    <div className="mb-4">
                        <label htmlFor="username" className="block text-gray-300 mb-2">
                            Username
                        </label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-500 rounded-lg bg-gray-600 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors"
                            placeholder="Enter your username"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 transform hover:scale-105"
                    >
                        Join
                    </button>
                </form>
                {/* Optional Decorative Text */}
                <div className="mt-6 text-center text-gray-400 text-sm">
                    <p>sussy amogus time ;)</p>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;
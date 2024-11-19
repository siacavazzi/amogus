// ./pages/LoginPage.jsx

import React, { useState, useContext } from 'react';
import { DataContext } from '../GameContext';
import { ENDPOINT } from '../ENDPOINT'; // Ensure this is used if necessary
import { FaGamepad } from 'react-icons/fa'; // Example of a decorative icon

function LoginPage() {
    const [username, setUsername] = useState('');
    const { setPlayerState, socket } = useContext(DataContext);

    const handleJoin = async (e) => {
        e.preventDefault();

        setPlayerState(prevState => ({ ...prevState, username: username }));
        let playerId = localStorage.getItem('player_id');

        // Emit 'join' event with playerId and username
        socket.emit('join', { player_id: playerId, username: username });
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-tr from-pink-300 to-purple-400 p-6">
            <div className="bg-white bg-opacity-90 backdrop-blur-md p-8 rounded-lg shadow-lg max-w-sm w-full">
                <div className="flex flex-col items-center mb-6">
                    <FaGamepad className="text-4xl text-purple-500 mb-2" />
                    <h2 className="text-2xl font-bold mb-2 text-gray-800">Join the Game</h2>
                    <p className="text-sm text-gray-600">Enter your username to start playing</p>
                </div>
                <form onSubmit={handleJoin}>
                    <div className="mb-4">
                        <label htmlFor="username" className="block text-gray-700 mb-2">
                            Username
                        </label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 transition-colors"
                            placeholder="Enter your username"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-purple-500 text-white py-2 px-4 rounded-lg hover:bg-purple-600 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400"
                    >
                        Join
                    </button>
                </form>
                {/* Optional: Decorative Element */}
                <div className="mt-6 text-center text-gray-500 text-sm">
                    <p>Ready to play? Let’s go!</p>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;

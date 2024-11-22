// ./pages/LoginPage.jsx

import React, { useState, useContext } from 'react';
import { DataContext } from '../GameContext';

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
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-tr from-gray-800 to-gray-900 p-6">
            <div className="relative bg-gray-700 bg-opacity-90 backdrop-blur-md p-8 rounded-lg shadow-lg max-w-sm w-full">
                {/* Decorative Icon */}
                <div className="flex flex-col items-center mb-6">
                    <img src="https://i1.sndcdn.com/artworks-Uii8SMJvNPxy8ePA-romBoQ-t1080x1080.jpg"/>
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

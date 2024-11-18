// ./pages/LoginPage.jsx

import React, { useState, useContext } from 'react';
import { DataContext } from '../GameContext';
import { ENDPOINT } from '../ENDPOINT';

function LoginPage() {
    const [username, setUsername] = useState('');
    const { setPlayerState, socket} = useContext(DataContext);

    const handleJoin = async (e) => {
        e.preventDefault();

        setPlayerState(prevState => ({ ...prevState, name: username }));
        let playerId = localStorage.getItem('player_id');

        // Emit 'join' event with playerId and username
        socket.emit('join', { player_id: playerId, username: username });

    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="bg-white p-8 rounded shadow-md w-full max-w-sm">
                <h2 className="text-2xl font-bold mb-6 text-center">Join the Game</h2>
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
                            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter your username"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
                    >
                        Join
                    </button>
                </form>
            </div>
        </div>
    );
}

export default LoginPage;

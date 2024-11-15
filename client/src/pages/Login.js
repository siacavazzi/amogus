// ./pages/LoginPage.jsx

import React, { useState, useContext } from 'react';
import { DataContext } from '../GameContext';
import { ENDPOINT } from '../ENDPOINT';

function LoginPage() {
    const [username, setUsername] = useState('');
    const { setPlayerState } = useContext(DataContext);

    const handleJoin = async (e) => {
        e.preventDefault();

        if (username.trim()) {
            try {
                const response = await fetch(`${ENDPOINT}/player_join`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username }),
                });

                const result = await response.json();

                if (response.ok && result.status === 'success') {
                    console.log(result.message); // "Joined successfully" or "Rejoined successfully"
                    setPlayerState({ name: username });
                } else {
                    console.error(result.message);
                    alert(result.message);
                }
            } catch (error) {
                console.error('Request failed:', error);
                alert('There was an error connecting to the server.');
            }
        }
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

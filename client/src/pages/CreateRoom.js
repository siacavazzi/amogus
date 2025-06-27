import React, { useState, useContext, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { DataContext } from '../GameContext';
import { ENDPOINT } from '../ENDPOINT';

function CreateRoomPage() {
    const [username, setUsername] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const { socket, setPlayerState, setRoomId, setCreateRoom } = useContext(DataContext);

    useEffect(() => {
        socket.on('error', (data) => setErrorMsg(data.message));
        return () => {
            socket.off('error');
        };
    }, [socket]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!username) {
            setErrorMsg('Username required');
            return;
        }
        fetch(ENDPOINT+'/api/rooms', { method: 'POST' })
            .then(res => res.json())
            .then(data => {
                setRoomId(data.room_id);
                const playerId = localStorage.getItem('player_id');
                setPlayerState(prev => ({ ...prev, username }));
                socket.emit('join', { player_id: playerId, username, room_id: data.room_id });
                setCreateRoom(false);
            })
            .catch(() => setErrorMsg('Failed to create room'));
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-tr from-gray-800 to-gray-900 p-6 relative">
            <button
                type="button"
                onClick={() => setCreateRoom(false)}
                className="absolute top-6 left-6 flex items-center text-gray-300 hover:text-white transition-colors"
            >
                <ChevronLeft className="mr-1" />
                <span className="text-sm">Back</span>
            </button>
            <div className="relative bg-gray-700 bg-opacity-90 backdrop-blur-md p-8 rounded-lg shadow-lg max-w-sm w-full">
                <h2 className="text-2xl font-bold mb-4 text-gray-100 text-center">Create Room</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="username" className="block text-gray-300 mb-2">Username</label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-500 rounded-lg bg-gray-600 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            placeholder="Enter your username"
                            required
                        />
                    </div>
                    {errorMsg && <div className="mb-2 text-red-400 text-sm">{errorMsg}</div>}
                    <button
                        type="submit"
                        className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-400"
                    >
                        Create Room
                    </button>
                </form>
            </div>
        </div>
    );
}

export default CreateRoomPage;

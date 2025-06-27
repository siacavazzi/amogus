import React, { useState, useContext, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { DataContext } from '../GameContext';
import { ENDPOINT } from '../ENDPOINT';

function LoginPage() {
    const [username, setUsername] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const { setPlayerState, socket, setTaskEntry, roomId, setRoomId, setCreateRoom } = useContext(DataContext);

    useEffect(() => {
        window.scrollTo(0, 0);
        if (roomId) setRoomCode(roomId);
      }, [roomId]);
    

    const handleJoin = async (e) => {
        e.preventDefault();

        
        const playerId = localStorage.getItem('player_id');
        const room = roomCode || roomId;
        if (!room) return;

        try {
            const res = await fetch(ENDPOINT+`/api/rooms/${room}`);
            if (!res.ok) {
                setErrorMsg('Room not found');
                return;
            }
            setRoomId(room);
            socket.emit('join', { player_id: playerId, username, room_id: room });
        } catch {
            setErrorMsg('Failed to reach server');
        }
        setPlayerState(prevState => ({ ...prevState, username }));
    };

    useEffect(() => {
        socket.on('error', (data) => {
            if (data.message === 'Room not found') {
                setRoomId('');
                localStorage.removeItem('room_id');
                setRoomCode('');
            }
            setErrorMsg(data.message);
        });
        return () => {
            socket.off('error');
        };
    }, [socket, setRoomId]);

    const handleCreateRoom = () => {
        setCreateRoom(true);
    };

    const handleEnterTasks = () => {
        setTaskEntry(true)
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
                    {errorMsg && (
                        <div className="mb-2 text-red-400 text-sm">{errorMsg}</div>
                    )}
                    <div className="mb-4">
                        <label htmlFor="room" className="block text-gray-300 mb-2">
                            Room Code
                        </label>
                        <input
                            type="text"
                            id="room"
                            value={roomCode}
                            onChange={(e) => setRoomCode(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-500 rounded-lg bg-gray-600 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors"
                            placeholder="Enter room code"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 transform hover:scale-105"
                    >
                        Join
                    </button>
                    <button
                        type="button"
                        onClick={handleCreateRoom}
                        className="w-full mt-2 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-400"
                    >
                        Create Room
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
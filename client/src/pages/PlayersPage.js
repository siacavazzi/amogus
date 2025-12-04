// ./pages/PlayersPage.jsx

import React, { useContext, useEffect, useState } from "react";
import { DataContext } from "../GameContext";
import MUECustomSlider from "../components/swiper";
import PlayerCard from "../components/PlayerCard";
import { ChevronLeft, Copy, Check } from 'lucide-react';

export default function PlayersPage() {
    const { players, socket, setMessage, setAudio, running, setTaskEntry, roomCode } = useContext(DataContext);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        window.scrollTo(0, 0)
    }, [])

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

    console.log(running)

    if (!players || players.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-tr from-gray-800 to-gray-900 p-6">
                <div className="text-center text-gray-400">
                    <p className="text-lg">No players available</p>
                </div>
            </div>
        );
    }

    function startGame() {
        socket.emit('start_game', { player_id: localStorage.getItem('player_id') });
    }

    return (
        <div className="min-h-screen bg-gradient-to-tr from-gray-800 to-gray-900 p-6">
            {!running && <button
                type="button"
                onClick={() => setTaskEntry(true)}
                className="absolute top-6 left-6 flex items-center text-gray-300 hover:text-white transition-colors"
            >
                <ChevronLeft className="mr-1" />
                <span className="text-sm">Task Entry</span>
            </button>}
            <div className="max-w-6xl mx-auto">
                {/* Room Code Display */}
                {roomCode && !running && (
                    <div className="flex items-center justify-center mb-6">
                        <div className="bg-gray-800 bg-opacity-80 px-6 py-3 rounded-lg flex items-center gap-3">
                            <span className="text-gray-400 text-sm">Room:</span>
                            <span className="text-2xl font-mono font-bold text-indigo-400 tracking-widest">
                                {roomCode}
                            </span>
                            <button
                                onClick={copyRoomCode}
                                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                                title="Copy room code"
                            >
                                {copied ? (
                                    <Check className="text-green-400" size={18} />
                                ) : (
                                    <Copy className="text-gray-400" size={18} />
                                )}
                            </button>
                        </div>
                    </div>
                )}
                <div className="flex flex-col items-center mb-6">
                    <button
                        className="mb-4 bg-indigo-600 text-white py-2 px-6 rounded-full shadow-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        onClick={() => setAudio('test')}
                    >
                        Test Sound
                    </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {players.map((player) => (
                        <PlayerCard key={player.id} player={player} />
                    ))}
                </div>
                <div className="mt-8 flex justify-center p-4">
                    {!running && <MUECustomSlider text={"Swipe to start game"} onSuccess={startGame} />}
                </div>
            </div>
        </div>
    );
}

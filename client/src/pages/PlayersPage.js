// ./pages/PlayersPage.jsx

import React, { useContext, useEffect, useState } from "react";
import { DataContext } from "../GameContext";
import PlayerCard from "../components/PlayerCard";
import { ChevronLeft, Copy, Check, LogOut, Play, Users } from 'lucide-react';

export default function PlayersPage() {
    const { players, socket, running, setTaskEntry, roomCode } = useContext(DataContext);
    const [copied, setCopied] = useState(false);
    
    const playerId = localStorage.getItem('player_id');

    useEffect(() => {
        window.scrollTo(0, 0)
    }, [])

    const copyRoomCode = async () => {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(roomCode);
            } else {
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

    const handleStartGame = () => {
        socket.emit('start_game', { player_id: playerId });
    };

    const handleLeaveRoom = () => {
        if (window.confirm('Are you sure you want to leave this room?')) {
            socket.emit('leave_room', { player_id: playerId });
        }
    };

    if (!players || players.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-tr from-gray-800 to-gray-900 p-6">
                <div className="text-center text-gray-400">
                    <p className="text-lg">No players available</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-tr from-gray-800 to-gray-900 p-4 pb-32">
            {/* Back button */}
            {!running && (
                <button
                    type="button"
                    onClick={() => setTaskEntry(true)}
                    className="absolute top-4 left-4 flex items-center text-gray-300 hover:text-white transition-colors z-10"
                >
                    <ChevronLeft className="mr-1" />
                    <span className="text-sm">Task Entry</span>
                </button>
            )}
            
            <div className="max-w-4xl mx-auto">
                {/* Room Code Display */}
                {roomCode && !running && (
                    <div className="flex items-center justify-center mb-4">
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
                            <div className="w-px h-6 bg-gray-600 mx-1"></div>
                            <button
                                onClick={handleLeaveRoom}
                                className="p-2 hover:bg-red-600 hover:bg-opacity-20 rounded-lg transition-colors group"
                                title="Leave room"
                            >
                                <LogOut className="text-gray-400 group-hover:text-red-400" size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Player Count Header */}
                <div className="flex items-center justify-center gap-2 mb-4">
                    <div className="bg-gray-800 bg-opacity-80 px-4 py-2 rounded-lg flex items-center gap-2">
                        <Users className="text-indigo-400" size={20} />
                        <span className="text-gray-200 font-semibold">
                            {players.length} {players.length === 1 ? 'Player' : 'Players'}
                        </span>
                    </div>
                </div>

                {/* Players Grid - 2 columns on mobile */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                    {players.map((player) => (
                        <PlayerCard key={player.id} player={player} />
                    ))}
                </div>
            </div>

            {/* Fixed bottom area for start game button */}
            {!running && (
                <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900 via-gray-900 to-transparent pt-8 pb-6 px-4">
                    <div className="max-w-md mx-auto">
                        <button
                            onClick={handleStartGame}
                            className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold text-lg rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <Play size={24} fill="currentColor" />
                            <span>Start Game</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

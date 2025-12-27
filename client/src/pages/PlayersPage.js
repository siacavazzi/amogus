// ./pages/PlayersPage.jsx

import React, { useContext, useEffect, useState, useMemo } from "react";
import { DataContext } from "../GameContext";
import PlayerCard from "../components/PlayerCard";
import { ChevronLeft, Copy, Check, LogOut, Play, Users, Zap, Wifi } from 'lucide-react';

// Floating particle component
const FloatingParticle = ({ delay, duration, size, left, color }) => (
    <div
        className={`absolute rounded-full ${color} pointer-events-none`}
        style={{
            width: size,
            height: size,
            left: `${left}%`,
            bottom: '-20px',
            animation: `floatUp ${duration}s ease-in-out infinite`,
            animationDelay: `${delay}s`,
            filter: 'blur(1px)',
        }}
    />
);

export default function PlayersPage() {
    const { players, socket, running, setTaskEntry, roomCode } = useContext(DataContext);
    const [copied, setCopied] = useState(false);
    const [showContent, setShowContent] = useState(false);
    
    const playerId = localStorage.getItem('player_id');

    // Generate floating particles
    const particles = useMemo(() => 
        Array.from({ length: 15 }, (_, i) => ({
            id: i,
            delay: Math.random() * 8,
            duration: 6 + Math.random() * 6,
            size: 3 + Math.random() * 5,
            left: Math.random() * 100,
            color: i % 3 === 0 ? 'bg-indigo-500/30' : i % 3 === 1 ? 'bg-cyan-500/20' : 'bg-purple-500/20',
        }))
    , []);

    useEffect(() => {
        window.scrollTo(0, 0);
        const timer = setTimeout(() => setShowContent(true), 100);
        return () => clearTimeout(timer);
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
            <div className="fixed inset-0 flex items-center justify-center bg-gray-950 p-6">
                <div className="text-center text-gray-400">
                    <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-lg">Waiting for players...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-gray-950 overflow-hidden">
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/50 via-gray-950 to-purple-950/30"></div>
            
            {/* Floating particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {particles.map(p => (
                    <FloatingParticle key={p.id} {...p} />
                ))}
            </div>
            
            {/* Glowing orbs */}
            <div className="absolute top-20 right-10 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-40 left-10 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            
            {/* Grid overlay */}
            <div 
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                    backgroundSize: '50px 50px'
                }}
            ></div>
            
            {/* Scrollable content */}
            <div className="relative z-10 h-full overflow-y-auto pb-32">
                <div className={`transition-all duration-700 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    
                    {/* Back button */}
                    {!running && (
                        <button
                            type="button"
                            onClick={() => setTaskEntry(true)}
                            className="fixed top-4 left-4 flex items-center gap-1 text-gray-400 hover:text-white transition-colors z-50 bg-gray-900/50 backdrop-blur-sm px-3 py-2 rounded-xl border border-gray-800/50"
                        >
                            <ChevronLeft size={18} />
                            <span className="text-sm font-medium">Tasks</span>
                        </button>
                    )}
                    
                    <div className="max-w-4xl mx-auto px-4 pt-16">
                        {/* Room Code Card */}
                        {roomCode && !running && (
                            <div className="flex justify-center mb-6">
                                <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800/80 rounded-2xl px-6 py-4 flex items-center gap-4 shadow-xl">
                                    {/* Live indicator */}
                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                            <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                                        </div>
                                        <span className="text-green-400 text-xs font-medium uppercase tracking-wider">Live</span>
                                    </div>
                                    
                                    <div className="w-px h-8 bg-gray-700"></div>
                                    
                                    {/* Room code */}
                                    <div className="flex items-center gap-3">
                                        <span className="text-gray-500 text-sm">Room</span>
                                        <span className="text-2xl font-mono font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent tracking-widest">
                                            {roomCode}
                                        </span>
                                    </div>
                                    
                                    <button
                                        onClick={copyRoomCode}
                                        className="p-2 hover:bg-gray-800 rounded-xl transition-all group"
                                        title="Copy room code"
                                    >
                                        {copied ? (
                                            <Check className="text-green-400" size={18} />
                                        ) : (
                                            <Copy className="text-gray-500 group-hover:text-indigo-400 transition-colors" size={18} />
                                        )}
                                    </button>
                                    
                                    <div className="w-px h-8 bg-gray-700"></div>
                                    
                                    <button
                                        onClick={handleLeaveRoom}
                                        className="p-2 hover:bg-red-500/10 rounded-xl transition-all group"
                                        title="Leave room"
                                    >
                                        <LogOut className="text-gray-500 group-hover:text-red-400 transition-colors" size={18} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Player Count Header */}
                        <div className="flex justify-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl border border-indigo-500/30">
                                    <Users className="text-indigo-400" size={24} />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-white">
                                        {players.length} {players.length === 1 ? 'Player' : 'Players'}
                                    </h1>
                                    <p className="text-gray-500 text-sm">Connected & ready</p>
                                </div>
                            </div>
                        </div>

                        {/* Players Grid - 2 columns on mobile */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                            {players.map((player, index) => (
                                <div 
                                    key={player.id}
                                    className="transition-all duration-500"
                                    style={{ 
                                        animationDelay: `${index * 50}ms`,
                                        animation: showContent ? 'fadeInScale 0.5s ease-out forwards' : 'none'
                                    }}
                                >
                                    <PlayerCard player={player} />
                                </div>
                            ))}
                        </div>
                        
                        {/* Waiting message */}
                        {players.length < 4 && !running && (
                            <div className="mt-6 text-center">
                                <div className="inline-flex items-center gap-2 bg-gray-900/60 backdrop-blur-sm border border-gray-800/60 rounded-full px-4 py-2">
                                    <Wifi className="text-indigo-400 animate-pulse" size={16} />
                                    <span className="text-gray-400 text-sm">Waiting for more players to join...</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Fixed bottom area for start game button */}
            {!running && (
                <div className="fixed bottom-0 left-0 right-0 z-20">
                    <div className="bg-gradient-to-t from-gray-950 via-gray-950/95 to-transparent pt-8 pb-6 px-4">
                        <div className="max-w-md mx-auto">
                            <button
                                onClick={handleStartGame}
                                className="w-full relative group"
                            >
                                {/* Glow effect */}
                                <div className="absolute -inset-1 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl blur opacity-40 group-hover:opacity-60 transition-opacity"></div>
                                
                                <div className="relative py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold text-lg rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 group-hover:scale-[1.02]">
                                    <Play size={24} fill="currentColor" />
                                    <span>Start Game</span>
                                    <Zap size={18} className="opacity-60" />
                                </div>
                            </button>
                            
                            <p className="text-center text-gray-600 text-xs mt-3">
                                All {players.length} players will receive their roles
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

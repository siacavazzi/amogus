import React, { useState, useEffect, useContext } from 'react';
import EndGameButtons from '../components/EndGameButtons';
import DeathSummary from '../components/DeathSummary';
import { DataContext } from '../GameContext';
import { Shield, Star, Trophy, Sparkles } from 'lucide-react';
import { PlayerBadge } from '../components/PlayerCard';

const CrewVictoryScreen = ({ message = "Crewmates Win!" }) => {
    const { players } = useContext(DataContext);
    const [showContent, setShowContent] = useState(false);
    const [particles, setParticles] = useState([]);

    // Get surviving crewmates for the victory display
    const survivingCrew = players.filter(p => p.alive && !p.sus);
    const exposedIntruders = players.filter(p => p.sus);

    useEffect(() => {
        // Trigger content reveal animation
        const timer = setTimeout(() => setShowContent(true), 300);
        
        // Generate celebration particles
        const newParticles = Array.from({ length: 30 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            delay: Math.random() * 2,
            duration: 2 + Math.random() * 3,
            size: 4 + Math.random() * 8,
            type: Math.random() > 0.5 ? 'star' : 'circle'
        }));
        setParticles(newParticles);
        
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="relative flex flex-col items-center min-h-screen bg-gradient-to-b from-gray-900 via-cyan-950/30 to-gray-900 text-white p-6 pt-12 pb-32 overflow-hidden">
            {/* Animated Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                {/* Victory glow */}
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl bg-cyan-500/20 animate-pulse" />
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full blur-2xl bg-blue-500/30 animate-pulse" style={{ animationDelay: '0.5s' }} />
                
                {/* Celebration rings */}
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border-2 border-cyan-500/20 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-cyan-500/10 rounded-full animate-ping" style={{ animationDuration: '4s', animationDelay: '0.5s' }} />
                
                {/* Floating particles */}
                {particles.map((p) => (
                    <div
                        key={p.id}
                        className="absolute animate-bounce"
                        style={{
                            left: `${p.x}%`,
                            bottom: '-20px',
                            animationDelay: `${p.delay}s`,
                            animationDuration: `${p.duration}s`,
                            opacity: 0.6
                        }}
                    >
                        {p.type === 'star' ? (
                            <Star size={p.size} className="text-yellow-400 fill-yellow-400" />
                        ) : (
                            <div 
                                className="rounded-full bg-cyan-400"
                                style={{ width: p.size, height: p.size }}
                            />
                        )}
                    </div>
                ))}

                {/* Grid overlay */}
                <div 
                    className="absolute inset-0 opacity-5"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(6,182,212,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.3) 1px, transparent 1px)',
                        backgroundSize: '60px 60px'
                    }}
                />
            </div>

            <div className={`relative z-10 text-center flex flex-col items-center w-full max-w-lg transition-all duration-1000 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                {/* Trophy Icon */}
                <div className="relative mb-6">
                    <div className="absolute inset-0 blur-2xl bg-cyan-500 opacity-40 rounded-full scale-150 animate-pulse" />
                    <div className="relative w-28 h-28 rounded-3xl bg-gradient-to-br from-cyan-500/30 to-blue-500/30 border-2 border-cyan-500/50 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                        <Trophy size={56} className="text-cyan-400" />
                    </div>
                    <Sparkles size={24} className="absolute -top-2 -right-2 text-yellow-400 animate-pulse" />
                </div>

                {/* Victory Badge */}
                <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-cyan-500/20 border border-cyan-500/50 mb-4">
                    <Shield size={18} className="text-cyan-400" />
                    <span className="font-semibold text-cyan-300 uppercase tracking-wider text-sm">Mission Complete</span>
                </div>

                <h1 className="text-4xl md:text-5xl font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 drop-shadow-[0_0_30px_rgba(6,182,212,0.5)]">
                    {message}
                </h1>
                <p className="text-lg text-gray-400 mb-8">
                    The crew successfully completed all tasks and exposed the intruders!
                </p>

                {/* Exposed Intruders */}
                {exposedIntruders.length > 0 && (
                    <div className="w-full mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30">
                        <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-3">
                            Intruders Exposed
                        </h3>
                        <div className="flex flex-wrap justify-center gap-2">
                            {exposedIntruders.map((player) => (
                                <PlayerBadge 
                                    key={player.player_id}
                                    player={player}
                                    variant="intruder"
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Death Summary */}
                <DeathSummary title="Lost Along The Way" showSurvivors={true} theme="crew" />
                
                {/* End Game Buttons */}
                <div className="mt-8 p-6 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 w-full">
                    <EndGameButtons />
                </div>
            </div>
        </div>
    );
};

export default CrewVictoryScreen;

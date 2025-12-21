import React, { useState, useEffect, useContext } from 'react';
import EndGameButtons from '../components/EndGameButtons';
import DeathSummary from '../components/DeathSummary';
import { DataContext } from '../GameContext';
import { Skull, Swords, Crown, Flame } from 'lucide-react';
import { ProfilePicture } from '../components/PlayerCard';

const IntruderVictoryScreen = ({ message = "Intruders Win!" }) => {
    const { players } = useContext(DataContext);
    const [showContent, setShowContent] = useState(false);
    const [flameParticles, setFlameParticles] = useState([]);
    const [glitchActive, setGlitchActive] = useState(false);

    // Get intruders for the victory display
    const intruders = players.filter(p => p.sus);
    const deadCrew = players.filter(p => !p.alive && !p.sus);

    useEffect(() => {
        // Trigger content reveal animation
        const timer = setTimeout(() => setShowContent(true), 300);
        
        // Generate flame particles
        const particles = Array.from({ length: 20 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            delay: Math.random() * 2,
            duration: 1 + Math.random() * 2,
            size: 10 + Math.random() * 20
        }));
        setFlameParticles(particles);

        // Glitch effect timer
        const glitchInterval = setInterval(() => {
            setGlitchActive(true);
            setTimeout(() => setGlitchActive(false), 150);
        }, 3000);
        
        return () => {
            clearTimeout(timer);
            clearInterval(glitchInterval);
        };
    }, []);

    return (
        <div className="relative flex flex-col items-center min-h-screen bg-gradient-to-b from-gray-900 via-red-950/40 to-gray-900 text-white p-6 pt-12 pb-32 overflow-hidden">
            {/* Animated Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                {/* Ominous glow */}
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl bg-red-600/30 animate-pulse" />
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full blur-2xl bg-red-500/40 animate-pulse" style={{ animationDelay: '0.5s' }} />
                
                {/* Blood splatter effect circles */}
                <div className="absolute top-[20%] left-[10%] w-32 h-32 rounded-full bg-red-900/30 blur-2xl" />
                <div className="absolute top-[60%] right-[15%] w-48 h-48 rounded-full bg-red-800/20 blur-3xl" />
                <div className="absolute bottom-[30%] left-[20%] w-24 h-24 rounded-full bg-red-700/25 blur-xl" />

                {/* Rising flame particles */}
                {flameParticles.map((p) => (
                    <div
                        key={p.id}
                        className="absolute bottom-0"
                        style={{
                            left: `${p.x}%`,
                            animation: `float ${p.duration}s ease-in-out infinite`,
                            animationDelay: `${p.delay}s`,
                        }}
                    >
                        <Flame 
                            size={p.size} 
                            className="text-red-500/40"
                            style={{ 
                                filter: 'blur(1px)',
                                animation: 'flicker 0.5s ease-in-out infinite alternate'
                            }}
                        />
                    </div>
                ))}

                {/* Danger stripes */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-60" />
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-60" />

                {/* Grid overlay with red tint */}
                <div 
                    className="absolute inset-0 opacity-5"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(239,68,68,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(239,68,68,0.3) 1px, transparent 1px)',
                        backgroundSize: '60px 60px'
                    }}
                />
            </div>

            <div className={`relative z-10 text-center flex flex-col items-center w-full max-w-lg transition-all duration-1000 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                {/* Skull Icon with Crown */}
                <div className="relative mb-6">
                    <div className="absolute inset-0 blur-2xl bg-red-600 opacity-50 rounded-full scale-150 animate-pulse" />
                    <div className="relative w-28 h-28 rounded-3xl bg-gradient-to-br from-red-500/30 to-red-900/30 border-2 border-red-500/50 flex items-center justify-center shadow-lg shadow-red-500/30">
                        <Skull size={56} className="text-red-400" />
                    </div>
                    <Crown size={28} className="absolute -top-4 left-1/2 -translate-x-1/2 text-yellow-500" />
                </div>

                {/* Victory Badge */}
                <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-500/20 border border-red-500/50 mb-4">
                    <Swords size={18} className="text-red-400" />
                    <span className="font-semibold text-red-300 uppercase tracking-wider text-sm">Hostile Takeover</span>
                </div>

                {/* Glitchy Title */}
                <div className="relative mb-3">
                    <h1 
                        className={`text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-red-500 to-red-400 drop-shadow-[0_0_30px_rgba(239,68,68,0.5)] ${glitchActive ? 'animate-glitch-intense' : ''}`}
                    >
                        {message}
                    </h1>
                    {glitchActive && (
                        <>
                            <h1 className="absolute inset-0 text-4xl md:text-5xl font-bold text-cyan-500 opacity-70" style={{ transform: 'translate(-2px, -2px)' }}>
                                {message}
                            </h1>
                            <h1 className="absolute inset-0 text-4xl md:text-5xl font-bold text-red-500 opacity-70" style={{ transform: 'translate(2px, 2px)' }}>
                                {message}
                            </h1>
                        </>
                    )}
                </div>
                
                <p className="text-lg text-gray-400 mb-8">
                    The intruders have successfully eliminated the crew.
                </p>

                {/* Victorious Intruders */}
                {intruders.length > 0 && (
                    <div className="w-full mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30">
                        <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-3">
                            The Masterminds
                        </h3>
                        <div className="flex flex-wrap justify-center gap-3">
                            {intruders.map((player) => (
                                <div
                                    key={player.player_id}
                                    className="flex flex-col items-center gap-2 p-3 rounded-xl bg-red-500/20 border border-red-500/40"
                                >
                                    <ProfilePicture 
                                        imageCode={player.pic}
                                        selfie={player.selfie}
                                        size="medium"
                                        isDead={!player.alive}
                                        deathCause={player.death_cause}
                                        ringColor="ring-red-500/50"
                                    />
                                    <span className="text-sm font-medium text-red-300">{player.username}</span>
                                    {player.alive && (
                                        <span className="text-[10px] px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">
                                            Survived
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Death Summary */}
                <DeathSummary title="The Body Count" showSurvivors={false} theme="intruder" />
                
                {/* End Game Buttons */}
                <div className="mt-8 p-6 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-red-500/20 w-full">
                    <EndGameButtons />
                </div>
            </div>
        </div>
    );
};

export default IntruderVictoryScreen;

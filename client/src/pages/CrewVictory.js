import React, { useState, useEffect, useContext } from 'react';
import EndGameButtons from '../components/EndGameButtons';
import DeathSummary from '../components/DeathSummary';
import GameStats from '../components/GameStats';
import { DataContext } from '../GameContext';
import { Shield, Star, Trophy, Sparkles } from 'lucide-react';
import { PlayerBadge } from '../components/PlayerCard';
import { 
    GlowingOrb, 
    GridOverlay, 
    RotatingRing,
    useCelebrationParticles 
} from '../components/ui';
import { Card, StatusBadge } from '../components/ui';

const CrewVictoryScreen = ({ message = "Crewmates Win!" }) => {
    const { players } = useContext(DataContext);
    const [showContent, setShowContent] = useState(false);
    const particles = useCelebrationParticles(30);

    // Get surviving crewmates for the victory display
    const survivingCrew = players.filter(p => p.alive && !p.sus);
    const exposedIntruders = players.filter(p => p.sus);

    useEffect(() => {
        const timer = setTimeout(() => setShowContent(true), 300);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="fixed inset-0 flex flex-col items-center bg-gradient-to-b from-gray-900 via-cyan-950/30 to-gray-900 text-white p-6 pt-12 pb-32 overflow-y-auto">
            {/* Animated Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                {/* Victory glow */}
                <GlowingOrb top="25%" left="50%" size="600px" color="bg-cyan-500/20" delay={0} />
                <GlowingOrb top="25%" left="50%" size="300px" color="bg-blue-500/30" delay={0.5} />
                
                {/* Celebration rings */}
                <RotatingRing size="400px" borderColor="border-cyan-500/20" borderWidth="border-2" duration={3} />
                <RotatingRing size="500px" borderColor="border-cyan-500/10" duration={4} />
                
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
                <GridOverlay color="rgba(6,182,212,0.3)" />
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
                <StatusBadge icon={Shield} variant="cyan" size="large" className="mb-4">
                    <span className="uppercase tracking-wider">Mission Complete</span>
                </StatusBadge>

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
                
                {/* Game Stats */}
                <GameStats />
                
                {/* End Game Buttons */}
                <Card variant="glass" padding="default" className="mt-8 w-full">
                    <EndGameButtons />
                </Card>
            </div>
        </div>
    );
};

export default CrewVictoryScreen;

import React, { useState, useEffect, useContext } from 'react';
import EndGameButtons from '../components/EndGameButtons';
import DeathSummary from '../components/DeathSummary';
import { DataContext } from '../GameContext';
import { Radiation, AlertTriangle, Flame, Zap } from 'lucide-react';
import { ProfilePicture } from '../components/PlayerCard';

const NuclearMeltdownScreen = ({ message = "Meltdown!" }) => {
    const { players } = useContext(DataContext);
    const [showContent, setShowContent] = useState(false);
    const [shakeIntensity, setShakeIntensity] = useState(0);
    const [explosionParticles, setExplosionParticles] = useState([]);

    // Get intruders who caused this
    const intruders = players.filter(p => p.sus);

    useEffect(() => {
        // Trigger content reveal animation
        const timer = setTimeout(() => setShowContent(true), 500);
        
        // Generate explosion particles
        const particles = Array.from({ length: 40 }, (_, i) => ({
            id: i,
            angle: (i / 40) * 360,
            distance: 50 + Math.random() * 150,
            size: 4 + Math.random() * 12,
            delay: Math.random() * 0.5,
            duration: 1 + Math.random() * 2,
            type: Math.random() > 0.3 ? 'ember' : 'debris'
        }));
        setExplosionParticles(particles);

        // Screen shake effect
        const shakeInterval = setInterval(() => {
            setShakeIntensity(Math.random() * 3);
            setTimeout(() => setShakeIntensity(0), 100);
        }, 2000);
        
        return () => {
            clearTimeout(timer);
            clearInterval(shakeInterval);
        };
    }, []);

    return (
        <div 
            className="relative flex flex-col items-center min-h-screen bg-gradient-to-b from-orange-950 via-red-950/80 to-gray-900 text-white p-6 pt-12 pb-32 overflow-hidden"
            style={{ transform: `translate(${shakeIntensity}px, ${shakeIntensity}px)` }}
        >
            {/* Animated Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                {/* Nuclear explosion glow */}
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-3xl bg-orange-500/40 animate-pulse" />
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-2xl bg-yellow-500/30 animate-pulse" style={{ animationDelay: '0.3s' }} />
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full blur-xl bg-white/20 animate-pulse" style={{ animationDelay: '0.5s' }} />

                {/* Explosion particles radiating outward */}
                {explosionParticles.map((p) => (
                    <div
                        key={p.id}
                        className="absolute top-1/4 left-1/2"
                        style={{
                            transform: `rotate(${p.angle}deg) translateY(-${p.distance}px)`,
                            animation: `pulse ${p.duration}s ease-out infinite`,
                            animationDelay: `${p.delay}s`,
                        }}
                    >
                        {p.type === 'ember' ? (
                            <div 
                                className="rounded-full"
                                style={{ 
                                    width: p.size, 
                                    height: p.size,
                                    background: `radial-gradient(circle, rgba(255,200,100,0.8) 0%, rgba(255,100,0,0.6) 50%, transparent 100%)`
                                }}
                            />
                        ) : (
                            <div 
                                className="bg-gray-600 rounded-sm"
                                style={{ width: p.size * 0.6, height: p.size }}
                            />
                        )}
                    </div>
                ))}

                {/* Radiation rings */}
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] border-4 border-orange-500/30 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border-2 border-yellow-500/20 rounded-full animate-ping" style={{ animationDuration: '3s', animationDelay: '0.5s' }} />

                {/* Warning stripes */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-yellow-500 via-orange-600 to-yellow-500 animate-pulse" />
                <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-yellow-500 via-orange-600 to-yellow-500 animate-pulse" />

                {/* Smoke/ash overlay */}
                <div 
                    className="absolute inset-0 opacity-10"
                    style={{
                        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)'
                    }}
                />
            </div>

            <div className={`relative z-10 text-center flex flex-col items-center w-full max-w-lg transition-all duration-1000 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                {/* Radiation Icon */}
                <div className="relative mb-6">
                    <div className="absolute inset-0 blur-3xl bg-orange-500 opacity-60 rounded-full scale-150 animate-pulse" />
                    <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-orange-500/40 to-red-600/40 border-4 border-orange-500/60 flex items-center justify-center shadow-2xl shadow-orange-500/40 animate-spin" style={{ animationDuration: '8s' }}>
                        <Radiation size={64} className="text-orange-400" />
                    </div>
                    {/* Warning triangles */}
                    <AlertTriangle size={24} className="absolute -top-2 -right-2 text-yellow-500 animate-pulse" />
                    <AlertTriangle size={24} className="absolute -bottom-2 -left-2 text-yellow-500 animate-pulse" style={{ animationDelay: '0.5s' }} />
                </div>

                {/* Critical Alert Badge */}
                <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-500/30 border-2 border-red-500 mb-4 animate-pulse">
                    <Zap size={18} className="text-yellow-400" />
                    <span className="font-bold text-red-300 uppercase tracking-wider text-sm">Critical Failure</span>
                    <Zap size={18} className="text-yellow-400" />
                </div>

                <h1 className="text-5xl md:text-6xl font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-yellow-400 to-orange-400 drop-shadow-[0_0_40px_rgba(251,146,60,0.6)]">
                    {message}
                </h1>
                
                <p className="text-lg text-orange-200/80 mb-6">
                    The reactor core has breached. All hands lost.
                </p>

                {/* Saboteurs */}
                {intruders.length > 0 && (
                    <div className="w-full mb-6 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30">
                        <h3 className="text-sm font-semibold text-orange-400 uppercase tracking-wider mb-3 flex items-center justify-center gap-2">
                            <Flame size={16} />
                            The Saboteurs
                            <Flame size={16} />
                        </h3>
                        <div className="flex flex-wrap justify-center gap-3">
                            {intruders.map((player) => (
                                <div
                                    key={player.player_id}
                                    className="flex flex-col items-center gap-2 p-3 rounded-xl bg-orange-500/20 border border-orange-500/40"
                                >
                                    <ProfilePicture 
                                        imageCode={player.pic}
                                        selfie={player.selfie}
                                        size="medium"
                                        isDead={!player.alive}
                                        deathCause="meltdown"
                                        ringColor="ring-orange-500/50"
                                    />
                                    <span className="text-sm font-medium text-orange-300">{player.username}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Death Summary */}
                <DeathSummary title="Vaporized" showSurvivors={false} theme="meltdown" />
                
                {/* End Game Buttons */}
                <div className="mt-8 p-6 bg-gray-900/70 backdrop-blur-sm rounded-2xl border border-orange-500/30 w-full">
                    <EndGameButtons />
                </div>
            </div>
        </div>
    );
};

export default NuclearMeltdownScreen;

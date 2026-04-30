import React, { useState, useContext, useEffect } from 'react';
import { DataContext } from '../GameContext';
import { Users, Plus, ArrowRight, HelpCircle, Zap, Shield, Skull, Wifi } from 'lucide-react';
import { 
    useFloatingParticles, 
    FloatingParticles, 
    GlowingOrb, 
    GridOverlay, 
    ScanLine,
    RotatingRing,
    Vignette 
} from '../components/ui';
import { PrimaryButton } from '../components/ui';
import { Card } from '../components/ui';

// Feature badge component
const FeatureBadge = ({ icon: Icon, text, delay }) => (
    <div 
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/60 border border-gray-700/50 rounded-full text-xs text-gray-400 animate-fadeIn"
        style={{ animationDelay: `${delay}s` }}
    >
        <Icon size={12} className="text-indigo-400" />
        <span>{text}</span>
    </div>
);

function LobbyPage() {
    const [inputRoomCode, setInputRoomCode] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState('');
    const [showContent, setShowContent] = useState(false);
    const { socket } = useContext(DataContext);

    // Use shared floating particles hook
    const particles = useFloatingParticles(20, 'default');

    // Trigger content reveal animation
    useEffect(() => {
        const timer = setTimeout(() => setShowContent(true), 100);
        return () => clearTimeout(timer);
    }, []);

    // Listen for errors and success to reset the button states
    useEffect(() => {
        if (!socket) return;

        const handleError = (data) => {
            setError(data.message || 'An error occurred');
            setIsJoining(false);
            setIsCreating(false);
        };

        const handleSuccess = () => {
            setIsJoining(false);
            setIsCreating(false);
            setError('');
        };

        socket.on('error', handleError);
        socket.on('game_created', handleSuccess);
        socket.on('game_joined', handleSuccess);

        return () => {
            socket.off('error', handleError);
            socket.off('game_created', handleSuccess);
            socket.off('game_joined', handleSuccess);
        };
    }, [socket]);

    const handleCreateGame = () => {
        setIsCreating(true);
        setError('');
        socket.emit('create_game');
        
        setTimeout(() => {
            setIsCreating(false);
        }, 10000);
    };

    const handleJoinGame = (e) => {
        e.preventDefault();
        if (inputRoomCode.length !== 4) {
            setError('Room code must be 4 letters');
            return;
        }
        setIsJoining(true);
        setError('');
        const playerId = localStorage.getItem('player_id');
        socket.emit('join_game', { 
            room_code: inputRoomCode.toUpperCase(),
            player_id: playerId || undefined
        });
        
        setTimeout(() => {
            setIsJoining(false);
        }, 10000);
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-950 overflow-hidden">
            {/* Animated background layers */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-indigo-950/20 to-gray-950" />
            
            {/* Glowing orbs */}
            <GlowingOrb top="10%" left="10%" size="400px" color="bg-indigo-600/10" delay={0} />
            <GlowingOrb top="60%" left="70%" size="300px" color="bg-purple-600/10" delay={1} />
            <GlowingOrb top="30%" left="80%" size="250px" color="bg-cyan-600/10" delay={2} />
            
            {/* Grid overlay */}
            <GridOverlay />
            
            {/* Floating particles */}
            <FloatingParticles particles={particles} />
            
            {/* Scan line */}
            <ScanLine />
            
            {/* Vignette effect */}
            <Vignette intensity={60} />

            {/* Main content */}
            <div className={`relative z-10 w-full max-w-md mx-4 transition-all duration-700 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                {/* Logo and Title Section */}
                <div className="text-center mb-8">
                    {/* Animated logo container */}
                    <div className="relative inline-block mb-6">
                        {/* Rotating rings */}
                        <RotatingRing size="calc(7rem + 32px)" borderColor="border-indigo-500/20" borderWidth="border-2" duration={20} />
                        <RotatingRing size="calc(7rem + 64px)" borderColor="border-purple-500/10" duration={30} reverse />
                        
                        {/* Glow behind logo */}
                        <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full scale-150" />
                        
                        {/* Logo */}
                        <img 
                            src="https://i1.sndcdn.com/artworks-Uii8SMJvNPxy8ePA-romBoQ-t1080x1080.jpg" 
                            alt="Sus Party"
                            className="relative w-28 h-28 rounded-full shadow-2xl shadow-indigo-500/30 border-2 border-indigo-500/30"
                        />
                        
                        {/* Online indicator */}
                        <div className="absolute -bottom-1 -right-1 flex items-center gap-1 px-2 py-1 bg-emerald-500/20 border border-emerald-500/50 rounded-full">
                            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                            <span className="text-[10px] text-emerald-400 font-medium">LIVE</span>
                        </div>
                    </div>
                    
                    {/* Title */}
                    <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 mb-2 tracking-tight">
                        Sus Party
                    </h1>
                    <p className="text-gray-500 text-sm">Real-life social deduction game</p>
                    
                    {/* Feature badges */}
                    <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                        <FeatureBadge icon={Users} text="4-16+ Players" delay={0.2} />
                        <FeatureBadge icon={Zap} text="Real-time" delay={0.3} />
                        <FeatureBadge icon={Shield} text="Physical Tasks" delay={0.4} />
                    </div>
                </div>

                {/* Main Card */}
                <Card variant="default" padding="default">
                    {/* Error message */}
                    {error && (
                        <div className="mb-5 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-center text-sm flex items-center justify-center gap-2 animate-fadeIn">
                            <Skull size={16} />
                            {error}
                        </div>
                    )}

                    {/* Create Game Button */}
                    <PrimaryButton
                        onClick={handleCreateGame}
                        loading={isCreating}
                        loadingText="Creating Room..."
                        variant="indigo"
                    >
                        <Plus size={22} strokeWidth={2.5} />
                        <span className="text-lg font-bold">Create New Game</span>
                    </PrimaryButton>

                    {/* Divider */}
                    <div className="flex items-center my-6">
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent" />
                        <span className="px-4 text-gray-600 text-xs uppercase tracking-wider">or join existing</span>
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent" />
                    </div>

                    {/* Join Game Form */}
                    <form onSubmit={handleJoinGame}>
                        <div className="mb-4">
                            <label htmlFor="roomCode" className="block text-gray-400 text-sm mb-2 ml-1">
                                Enter Room Code
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    id="roomCode"
                                    value={inputRoomCode}
                                    onChange={(e) => {
                                        const value = e.target.value.toUpperCase().replace(/[^A-Za-z]/g, '').slice(0, 4);
                                        setInputRoomCode(value);
                                    }}
                                    className="w-full px-6 py-4 bg-gray-800/80 border-2 border-gray-700/80 rounded-2xl text-white text-center text-3xl font-mono tracking-[0.5em] uppercase focus:outline-none focus:border-emerald-500/50 focus:bg-gray-800 transition-all placeholder:text-gray-600 placeholder:tracking-[0.3em]"
                                    placeholder="XXXX"
                                    maxLength={4}
                                    autoComplete="off"
                                    autoCapitalize="characters"
                                    spellCheck="false"
                                />
                                {/* Character indicators */}
                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-3">
                                    {[0, 1, 2, 3].map(i => (
                                        <div 
                                            key={i} 
                                            className={`w-6 h-0.5 rounded-full transition-colors ${
                                                inputRoomCode.length > i ? 'bg-emerald-500' : 'bg-gray-700'
                                            }`} 
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                        
                        <PrimaryButton
                            type="submit"
                            disabled={inputRoomCode.length !== 4}
                            loading={isJoining}
                            loadingText="Joining..."
                            variant="emerald"
                        >
                            <Users size={18} />
                            <span className="font-bold">Join Game</span>
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </PrimaryButton>
                    </form>
                </Card>

                {/* Footer */}
                <div className="mt-6 text-center">
                    <a 
                        href="/how-to-play" 
                        className="inline-flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-indigo-400 transition-colors text-sm group"
                    >
                        <HelpCircle size={16} className="group-hover:rotate-12 transition-transform" />
                        <span>How to Play</span>
                    </a>
                </div>
                
                {/* Connection status */}
                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-600">
                    <Wifi size={12} className={socket?.connected ? 'text-emerald-500' : 'text-red-500'} />
                    <span>{socket?.connected ? 'Connected to server' : 'Connecting...'}</span>
                </div>
            </div>
        </div>
    );
}

export default LobbyPage;

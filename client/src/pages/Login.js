import React, { useState, useContext, useEffect } from 'react';
import { ChevronLeft, Camera, User, Sparkles, ArrowRight } from 'lucide-react';
import { DataContext } from '../GameContext';
import CameraCapture from '../components/CameraCapture';
import { 
    useFloatingParticles, 
    FloatingParticles, 
    GlowingOrb, 
    GridOverlay 
} from '../components/ui';
import { PrimaryButton } from '../components/ui';
import { Card } from '../components/ui';

function LoginPage() {
    const [username, setUsername] = useState('');
    const [step, setStep] = useState('username'); // 'username', 'camera', 'joining'
    const [showContent, setShowContent] = useState(false);
    const { setPlayerState, socket, setTaskEntry, roomCode } = useContext(DataContext);

    // Use shared floating particles
    const particles = useFloatingParticles(15, 'default');

    useEffect(() => {
        window.scrollTo(0, 0);
        const timer = setTimeout(() => setShowContent(true), 100);
        return () => clearTimeout(timer);
    }, []);
    
    const handleUsernameSubmit = (e) => {
        e.preventDefault();
        if (username.trim()) {
            setStep('camera');
        }
    };

    const handleCameraCapture = (imageData) => {
        joinGame(imageData);
    };

    const handleCameraSkip = () => {
        joinGame(null);
    };

    const joinGame = (selfie) => {
        setStep('joining');
        setPlayerState(prevState => ({ ...prevState, username: username }));
        let playerId = localStorage.getItem('player_id');
        const storedRoomCode = roomCode || localStorage.getItem('room_code');
        socket.emit('join', { player_id: playerId, username: username, selfie: selfie, room_code: storedRoomCode });
    };

    const handleEnterTasks = () => {
        setTaskEntry(true)
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-950 overflow-hidden">
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-indigo-950/20 to-gray-950" />
            
            {/* Glowing orbs */}
            <GlowingOrb top="25%" left="25%" size="384px" color="bg-indigo-600/10" delay={0} />
            <GlowingOrb top="75%" left="75%" size="288px" color="bg-purple-600/10" delay={1} />
            
            {/* Grid overlay */}
            <GridOverlay />
            
            {/* Floating particles */}
            <FloatingParticles particles={particles} />
            
            {/* Back Button */}
            {step === 'camera' && (
                <button
                    type="button"
                    onClick={() => setStep('username')}
                    className="fixed top-6 left-6 z-50 flex items-center gap-2 px-3 py-2 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-700/50 rounded-xl text-gray-400 hover:text-white transition-all backdrop-blur-sm"
                >
                    <ChevronLeft size={18} />
                    <span className="text-sm">Back</span>
                </button>
            )}

            {/* Main content */}
            <div className={`relative z-10 w-full max-w-sm mx-4 transition-all duration-700 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                {/* Step 1: Username Entry */}
                {step === 'username' && (
                    <>
                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className="relative inline-block mb-4">
                                <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full scale-150" />
                                <div className="relative w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-2xl shadow-indigo-500/30">
                                    <User size={36} className="text-white" />
                                </div>
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-1">Join the Game</h2>
                            <p className="text-gray-500 text-sm">Room: <span className="text-indigo-400 font-mono font-bold">{roomCode}</span></p>
                        </div>

                        {/* Card */}
                        <Card variant="default" padding="default">
                            <form onSubmit={handleUsernameSubmit}>
                                <div className="mb-5">
                                    <label htmlFor="username" className="block text-gray-400 text-sm mb-2 ml-1">
                                        What should we call you?
                                    </label>
                                    <input
                                        type="text"
                                        id="username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full px-4 py-4 bg-gray-800/80 border-2 border-gray-700/80 rounded-2xl text-white text-lg focus:outline-none focus:border-indigo-500/50 focus:bg-gray-800 transition-all placeholder:text-gray-600"
                                        placeholder="Enter your name"
                                        required
                                        autoFocus
                                        autoComplete="off"
                                    />
                                </div>
                                <PrimaryButton
                                    type="submit"
                                    disabled={!username.trim()}
                                    variant="indigo"
                                >
                                    <Camera size={20} />
                                    <span className="font-bold">Next: Take Selfie</span>
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </PrimaryButton>
                            </form>
                        </Card>

                        <p className="text-center text-gray-600 text-sm mt-6">sussy amogus time ;)</p>
                    </>
                )}

                {/* Step 2: Camera Capture */}
                {step === 'camera' && (
                    <Card variant="default" padding="default">
                        <div className="text-center mb-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-indigo-400 text-sm mb-3">
                                <Sparkles size={14} />
                                <span>Almost there!</span>
                            </div>
                            <h2 className="text-xl font-bold text-white">Hey {username}!</h2>
                            <p className="text-gray-500 text-sm mt-1">Take a selfie for your profile</p>
                        </div>
                        <CameraCapture 
                            onCapture={handleCameraCapture}
                            onCancel={handleCameraSkip}
                        />
                    </Card>
                )}

                {/* Step 3: Joining */}
                {step === 'joining' && (
                    <Card variant="default" padding="large">
                        <div className="flex flex-col items-center">
                            <div className="relative mb-6">
                                <div className="w-16 h-16 border-4 border-gray-700 border-t-indigo-500 rounded-full animate-spin" />
                                <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-purple-500/50 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">Joining game...</h2>
                            <p className="text-gray-500 text-sm">Get ready to be sus!</p>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
}

export default LoginPage;
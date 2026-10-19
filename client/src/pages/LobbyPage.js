import React, { useState, useContext, useEffect, useRef } from 'react';
import { isMobile as isMobileDevice } from 'react-device-detect';
import { DataContext } from '../GameContext';
import { Users, Plus, ArrowRight, HelpCircle, Zap, Shield, Skull, Wifi, WifiOff, Monitor, Radio, Speaker, Smartphone, AlertTriangle, ChevronRight, Sparkles, GraduationCap, Megaphone } from '../signal/icons';
import { 
    useFloatingParticles, 
    FloatingParticles, 
    GlowingOrb, 
    GridOverlay, 
    ScanLine,
    Vignette 
} from '../components/ui';
import { PrimaryButton } from '../components/ui';
import { Card } from '../components/ui';
import { dismissTutorialPrompt, shouldRecommendTutorial } from '../tutorial/tutorialStorage';
import { getAcquisition } from '../seo/discovery';
import RoomEntryNotice from '../components/RoomEntryNotice';
import { getRoomCodeFromSearch, clearRoomCodeFromUrl } from '../utils/inviteLinks';

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
    const [inputRoomCode, setInputRoomCode] = useState(getRoomCodeFromSearch);
    const entryTimeout = useRef(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState('');
    const [showContent, setShowContent] = useState(false);
    const [showTutorialPrompt, setShowTutorialPrompt] = useState(false);
    const { socket, roomEntryStatus, setRoomEntryStatus } = useContext(DataContext);

    useEffect(() => {
        if (roomEntryStatus?.room_code) setInputRoomCode(roomEntryStatus.room_code);
    }, [roomEntryStatus]);

    // Resolve effective device mode (matches GameContext / PageController logic)
    const mobileOverride = new URLSearchParams(window.location.search).get('mobile');
    const isMobile = mobileOverride !== null ? mobileOverride === 'true' : isMobileDevice;
    const isReactorDevice = !isMobile;

    const switchToMobileHref = (() => {
        const params = new URLSearchParams(window.location.search);
        params.set('mobile', 'true');
        return `${window.location.pathname}?${params.toString()}`;
    })();
    const tutorialHref = '/tutorial?returnTo=play';

    // Use shared floating particles hook
    const particles = useFloatingParticles(20, 'default');

    // Trigger content reveal animation
    useEffect(() => {
        const timer = setTimeout(() => setShowContent(true), 100);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        setShowTutorialPrompt(isMobile && !getRoomCodeFromSearch() && !roomEntryStatus && shouldRecommendTutorial());
    }, [isMobile, roomEntryStatus]);

    // Listen for errors and success to reset the button states
    useEffect(() => {
        if (!socket) return;

        const handleError = (data) => {
            clearTimeout(entryTimeout.current);
            setError(data.scope === 'room_entry' ? '' : data.message || 'An error occurred');
            setIsJoining(false);
            setIsCreating(false);
        };

        const handleSuccess = () => {
            clearTimeout(entryTimeout.current);
            setIsJoining(false);
            setIsCreating(false);
            setError('');
        };

        socket.on('error', handleError);
        socket.on('game_created', handleSuccess);
        socket.on('game_joined', handleSuccess);
        socket.on('rejoin_failed', handleSuccess);

        return () => {
            socket.off('error', handleError);
            socket.off('game_created', handleSuccess);
            socket.off('game_joined', handleSuccess);
            socket.off('rejoin_failed', handleSuccess);
            clearTimeout(entryTimeout.current);
        };
    }, [socket]);

    const handleCreateGame = () => {
        setRoomEntryStatus(null);
        clearRoomCodeFromUrl();
        setIsCreating(true);
        setError('');
        socket.emit('create_game', { acquisition: getAcquisition() });
        
        setTimeout(() => {
            setIsCreating(false);
        }, 10000);
    };

    const handleJoinGame = (e) => {
        e?.preventDefault();
        if (inputRoomCode.length !== 4) {
            setError('Room code must be 4 letters');
            return;
        }
        setIsJoining(true);
        setError('');
        setRoomEntryStatus(null);
        const playerId = localStorage.getItem('player_id');
        if (playerId && localStorage.getItem('room_code') === inputRoomCode) {
            socket.emit('rejoin', { player_id: playerId });
        } else {
            socket.emit('join_game', { room_code: inputRoomCode });
        }
        clearTimeout(entryTimeout.current);
        entryTimeout.current = setTimeout(() => {
            setIsJoining(false);
            setRoomEntryStatus({ code: 'connection_timeout', room_code: inputRoomCode,
                message: 'The room did not respond. Check your internet connection, then try again.' });
        }, 10000);
    };

    const changeCode = () => {
        setRoomEntryStatus(null);
        setError('');
        clearRoomCodeFromUrl();
        document.getElementById('game-entry-code')?.select();
    };

    const updateCode = event => {
        setInputRoomCode(event.target.value.toUpperCase().replace(/[^A-Za-z]/g, '').slice(0, 4));
        setRoomEntryStatus(null);
        setError('');
        clearRoomCodeFromUrl();
    };

    const handleSkipTutorialPrompt = () => {
        dismissTutorialPrompt();
        setShowTutorialPrompt(false);
    };

    const connectedLine = (
        <p className="sg-small" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: 0.7 }}>
            {socket?.connected ? <Wifi size={14} /> : <WifiOff size={14} />}
            {socket?.connected ? 'Connected to server' : 'Connecting...'}
        </p>
    );

    if (!isReactorDevice) {
        return (
            <div className="sg-screen sg-round sg-home">
                <div className="sg-home__top sg-a sg-rise">
                    <h1 className="sg-big sg-home__mark">Sus Party</h1>
                    <p className="sg-lede">The real-life social deduction game</p>
                    <p className="sg-small" style={{ marginTop: 6 }}>4–16+ players · Real-time · Physical Tasks</p>
                </div>

                <div className="sg-home__body sg-a sg-rise" style={{ animationDelay: '120ms' }}>
                    <RoomEntryNotice status={roomEntryStatus} busy={isJoining} onRetry={() => handleJoinGame()} onChangeCode={changeCode} />
                    {error && (
                        <p className="sg-home__error" role="alert"><AlertTriangle size={18} /> {error}</p>
                    )}

                    <form onSubmit={handleJoinGame} className="sg-home__join">
                        <label htmlFor="game-entry-code" className="sg-lede">Room code</label>
                        <input
                            type="text"
                            id="game-entry-code"
                            value={inputRoomCode}
                            onChange={updateCode}
                            className="sg-home__code sg-num"
                            placeholder="XXXX"
                            maxLength={4}
                            autoComplete="one-time-code"
                            autoCapitalize="characters"
                            spellCheck="false"
                        />
                        <button type="submit" className="sg-btn sg-btn-white" disabled={inputRoomCode.length !== 4 || isJoining}>
                            {isJoining ? 'Joining...' : <>Join Game <ArrowRight size={22} /></>}
                        </button>
                    </form>

                    <p className="sg-small sg-home__or">or start one</p>
                    <button type="button" className="sg-btn sg-btn-ink" onClick={handleCreateGame} disabled={isCreating}>
                        {isCreating ? 'Creating Room...' : <><Plus size={22} /> Create New Game</>}
                    </button>
                </div>

                <div className="sg-home__foot">
                    <p style={{ display: 'flex', justifyContent: 'center', gap: 22 }}>
                        <a href="/how-to-play" className="sg-link">How to Play</a>
                        <a href={tutorialHref} className="sg-link">Tutorial</a>
                    </p>
                    {connectedLine}
                </div>

                {showTutorialPrompt && (
                    <div className="sg-home__scrim" role="dialog" aria-modal="true" aria-labelledby="tutorial-prompt-title">
                        <div className="sg-home__sheet sg-a sg-rise">
                            <p className="sg-pill" style={{ background: 'var(--sg-meet)', color: 'var(--sg-ink)' }}>First game?</p>
                            <h2 id="tutorial-prompt-title" className="sg-big sg-h2" style={{ margin: '12px 0 8px' }}>Try the tutorial first</h2>
                            <p className="sg-small" style={{ opacity: 0.75 }}>
                                Sus Party moves quickly once the round starts. A short tutorial walks you through it before anyone joins a real room.
                            </p>
                            <ul className="sg-home__learn">
                                <li><GraduationCap size={22} /> <span><b>Crew basics</b> Tasks and slide-to-complete</span></li>
                                <li><Megaphone size={22} /> <span><b>Meetings</b> When to call one and how voting works</span></li>
                                <li><Zap size={22} /> <span><b>Intruder tools</b> Log a kill, open the vent and play your cards</span></li>
                            </ul>
                            <a href={tutorialHref} className="sg-btn sg-btn-blue">Start tutorial</a>
                            <button type="button" className="sg-btn sg-btn-flat" onClick={handleSkipTutorialPrompt}>Skip for now</button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (        <div className="fixed inset-0 flex items-start justify-center overflow-y-auto py-8 bg-gray-950">
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
            <div className={`relative z-10 w-full ${isReactorDevice ? 'max-w-4xl' : 'max-w-md'} mx-4 transition-all duration-700 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                {/* Logo and Title Section */}
                <div className="text-center mb-8">
                    {/* Wordmark */}
                    <h1 className="sg-big text-white" style={{ fontSize: 'clamp(56px, 18vw, 84px)', marginBottom: 8 }}>
                        Sus Party
                    </h1>
                    <p className="text-gray-300" style={{ fontWeight: 700, fontSize: 17 }}>The real-life social deduction game</p>
                    
                    {/* Feature badges */}
                    <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                        <FeatureBadge icon={Users} text="4-16+ Players" delay={0.2} />
                        <FeatureBadge icon={Zap} text="Real-time" delay={0.3} />
                        <FeatureBadge icon={Shield} text="Physical Tasks" delay={0.4} />
                    </div>
                </div>

                {/* Reactor mode: join card LEFT, info cards RIGHT (side-by-side) */}
                {isReactorDevice ? (
                    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6 items-start">
                        {/* Left column: join card */}
                        <div>
                            <Card variant="default" padding="default">
                                <RoomEntryNotice status={roomEntryStatus} busy={isJoining} onRetry={() => handleJoinGame()}
                        onChangeCode={changeCode} />
                    {error && (
                                    <div className="mb-5 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-center text-sm flex items-center justify-center gap-2 animate-fadeIn">
                                        <Skull size={16} />
                                        {error}
                                    </div>
                                )}

                                <PrimaryButton
                                    onClick={handleCreateGame}
                                    loading={isCreating}
                                    loadingText="Creating Room..."
                                    variant="indigo"
                                >
                                    <Plus size={22} strokeWidth={2.5} />
                                    <span className="text-lg font-bold">Create New Game</span>
                                </PrimaryButton>

                                <div className="flex items-center my-6">
                                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent" />
                                    <span className="px-4 text-gray-600 text-xs uppercase tracking-wider">or join existing</span>
                                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent" />
                                </div>

                                <form onSubmit={handleJoinGame}>
                                    <div className="mb-4">
                                        <label htmlFor="game-entry-code" className="block text-gray-400 text-sm mb-2 ml-1">Enter Room Code</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                id="game-entry-code"
                                                value={inputRoomCode}
                                                onChange={updateCode}
                                                className="w-full px-6 py-4 bg-gray-800/80 border-2 border-gray-700/80 rounded-2xl text-white text-center text-3xl font-mono tracking-[0.5em] uppercase focus:outline-none focus:border-emerald-500/50 focus:bg-gray-800 transition-all placeholder:text-gray-600 placeholder:tracking-[0.3em]"
                                                placeholder="XXXX"
                                                maxLength={4}
                                                autoComplete="one-time-code"
                                                autoCapitalize="characters"
                                                spellCheck="false"
                                            />
                                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-3">
                                                {[0, 1, 2, 3].map(i => (
                                                    <div
                                                        key={i}
                                                        className={`w-6 h-0.5 rounded-full transition-colors ${inputRoomCode.length > i ? 'bg-emerald-500' : 'bg-gray-700'}`}
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
                        </div>

                        {/* Right column: info cards stacked + switch link */}
                        <div className="space-y-4 animate-fadeIn">
                            <div className="p-5 bg-gradient-to-br from-indigo-500/10 via-gray-900/70 to-cyan-500/10 border border-indigo-500/25 rounded-xl">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-indigo-500/15 rounded-lg border border-indigo-500/20 shrink-0">
                                        <Monitor size={18} className="text-indigo-300" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-indigo-300/80 text-[11px] font-semibold uppercase tracking-[0.22em] mb-1">This device = Reactor</p>
                                        <p className="text-gray-300 text-sm leading-snug">
                                            Larger screens act as the <span className="text-white font-semibold">Reactor</span>: a shared display for the meltdown code-entry mini-game and meeting status. It is not a player.
                                        </p>
                                        <p className="text-gray-500 text-xs mt-2">
                                            Set it down somewhere central. Players use their phones. <a href="/how-to-play#meltdown" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">More about the reactor</a>.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 bg-gray-900/60 border border-gray-800/80 rounded-xl">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-purple-500/15 rounded-lg border border-purple-500/20 shrink-0">
                                        <Speaker size={18} className="text-purple-300" />
                                    </div>
                                    <div className="min-w-0 w-full">
                                        <p className="text-purple-300/80 text-[11px] font-semibold uppercase tracking-[0.22em] mb-1">Sonos integration</p>
                                        <p className="text-gray-300 text-sm leading-snug">
                                            Optional. Pipe meeting calls, meltdown alarms, and round audio through a Sonos speaker for in-room ambience.
                                        </p>
                                        <p className="text-gray-500 text-xs mt-2 flex items-center gap-1.5">
                                            <Radio size={12} className="text-purple-400" />
                                            Configure it on the Reactor screen after creating a game.
                                        </p>

                                        <details className="mt-3 group">
                                            <summary className="flex items-center gap-1.5 text-purple-300 hover:text-purple-200 text-xs font-medium cursor-pointer select-none list-none">
                                                <ChevronRight size={12} className="transition-transform group-open:rotate-90" />
                                                How does it work?
                                            </summary>
                                            <div className="mt-2 pl-4 space-y-2 text-xs text-gray-400 leading-relaxed border-l border-purple-500/20">
                                                <p>
                                                    Sus Party can connect to a Sonos speaker on your local network and play sound effects through it instead of (or in addition to) the Reactor's own speakers.
                                                </p>
                                                <ul className="list-disc list-inside space-y-1">
                                                    <li>Meeting calls and meltdown alarms become room-filling.</li>
                                                    <li>Players hear cues even when their phone is silent.</li>
                                                    <li>Setup happens on the Reactor screen. Pick a speaker from the dropdown.</li>
                                                </ul>
                                                <p className="text-gray-500">
                                                    Requires the Reactor device and the Sonos speaker on the same Wi-Fi network. Skip it if you don't have one. The game runs fine without it.
                                                </p>                                                <p>
                                                    <a
                                                        href="https://github.com/siacavazzi/amogus-sonos-connector"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-purple-300 hover:text-purple-200 underline underline-offset-2"
                                                    >
                                                        Sonos connector source on GitHub
                                                        <ArrowRight size={11} className="-rotate-45" />
                                                    </a>
                                                </p>                                            </div>
                                        </details>
                                    </div>
                                </div>
                            </div>

                            <a
                                href={switchToMobileHref}
                                className="flex items-start gap-3 p-3 bg-gray-900/40 border border-gray-800/60 hover:border-amber-500/40 rounded-xl transition-colors group"
                            >
                                <div className="p-1.5 bg-amber-500/10 rounded-lg border border-amber-500/20 shrink-0">
                                    <Smartphone size={14} className="text-amber-300" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-gray-300 text-sm font-medium group-hover:text-white transition-colors">
                                        Use this device as a player instead
                                    </p>
                                    <p className="text-gray-500 text-xs mt-0.5 flex items-start gap-1.5">
                                        <AlertTriangle size={11} className="text-amber-400/80 mt-0.5 shrink-0" />
                                        <span>
                                            Not recommended. Players need a phone they can carry around the house - the game involves walking between rooms to do tasks, find bodies, and reach the meeting area. A laptop or desktop won&rsquo;t work mid-game.
                                        </span>
                                    </p>
                                </div>
                            </a>
                        </div>
                    </div>
                ) : null}

                {/* Footer */}
                <div className="mt-6 flex items-center justify-center gap-2 text-center">
                    <a 
                        href="/how-to-play" 
                        className="inline-flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-indigo-400 transition-colors text-sm group"
                    >
                        <HelpCircle size={16} className="group-hover:rotate-12 transition-transform" />
                        <span>How to Play</span>
                    </a>
                    <a 
                        href={tutorialHref}
                        className="inline-flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-cyan-300 transition-colors text-sm group"
                    >
                        <Sparkles size={16} className="group-hover:scale-110 transition-transform" />
                        <span>Tutorial</span>
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

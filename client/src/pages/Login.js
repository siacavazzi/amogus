import React, { useState, useContext, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, Camera, ArrowRight, Shuffle } from '../signal/icons';
import { DataContext } from '../GameContext';
import CameraCapture from '../components/CameraCapture';
import Avatar, { getAvatar } from '../components/Avatar';
import AvatarPicker, { takenAvatars, isAvatarLocked, randomFreeAvatar } from '../components/AvatarPicker';
import RoomEntryNotice from '../components/RoomEntryNotice';
import { clearRoomCodeFromUrl } from '../utils/inviteLinks';
import LeaveGameButton from '../components/LeaveGameButton';

function LoginPage() {
    const [username, setUsername] = useState('');
    const [step, setStep] = useState('username'); // 'username', 'avatar', 'camera', 'joining'
    const [showContent, setShowContent] = useState(false);
    const lastSelfie = useRef(null);
    const scrollRef = useRef(null);
    const { setPlayerState, socket, setTaskEntry, roomCode, roomEntryStatus, setRoomEntryStatus, players } = useContext(DataContext);

    // Avatars other players in the room already have. The camera only opens if
    // the player explicitly chooses a selfie instead.
    const takenBy = useMemo(() => takenAvatars(players || [], localStorage.getItem('player_id')), [players]);
    const [pic, setPic] = useState(() => randomFreeAvatar(takenBy));
    const avatar = getAvatar(pic);

    useEffect(() => {
        if (isAvatarLocked(pic, takenBy)) setPic(randomFreeAvatar(takenBy));
    }, [pic, takenBy]);

    useEffect(() => {
        if (roomEntryStatus) setStep('username');
    }, [roomEntryStatus]);

    useEffect(() => {
        if (step !== 'joining') return;
        const timeout = setTimeout(() => {
            setRoomEntryStatus({ code: 'connection_timeout', room_code: roomCode,
                message: 'The room did not respond. Check your internet connection, then try again.' });
        }, 10000);
        return () => clearTimeout(timeout);
    }, [step, roomCode, setRoomEntryStatus]);

    useEffect(() => {
        window.scrollTo(0, 0);
        const timer = setTimeout(() => setShowContent(true), 100);
        return () => clearTimeout(timer);
    }, []);

    // Each step starts at the top; the avatar step can be scrolled on small phones.
    useEffect(() => {
        if (!scrollRef.current) return;
        scrollRef.current.scrollTop = 0;
        scrollRef.current.scrollLeft = 0;
    }, [step]);

    const handleUsernameSubmit = (e) => {
        e.preventDefault();
        if (username.trim()) {
            setStep('avatar');
        }
    };

    const handleCameraCapture = (imageData) => {
        joinGame(imageData);
    };

    const joinGame = (selfie) => {
        lastSelfie.current = selfie;
        setRoomEntryStatus(null);
        setStep('joining');
        setPlayerState(prevState => ({ ...prevState, username: username }));
        let playerId = localStorage.getItem('player_id');
        const storedRoomCode = roomCode || localStorage.getItem('room_code');
        // The avatar also stands in for a selfie that fails to load.
        socket.emit('join', { player_id: playerId, username: username, selfie: selfie, pic: pic, room_code: storedRoomCode });
    };

    const handleEnterTasks = () => {
        setTaskEntry(true)
    };

    return (
        <div ref={scrollRef} className="sg-screen sg-round sg-join" style={{ overflowY: 'auto' }}>
            <div className="sg-join__bar">
                {(step === 'avatar' || step === 'camera') ? (
                    <button
                        type="button"
                        onClick={() => setStep(step === 'camera' ? 'avatar' : 'username')}
                        className="sg-btn sg-btn-ghost sg-join__back"
                    >
                        <ChevronLeft size={20} /> Back
                    </button>
                ) : <span />}
                {step !== 'joining' && <LeaveGameButton />}
            </div>

            <div className={`sg-join__body ${showContent ? 'sg-a sg-rise' : ''}`}>
                <RoomEntryNotice status={roomEntryStatus} busy={step === 'joining'}
                    onRetry={() => joinGame(lastSelfie.current)}
                    onChangeCode={() => {
                        clearRoomCodeFromUrl();
                        localStorage.removeItem('player_id');
                        localStorage.removeItem('room_code');
                        sessionStorage.removeItem('is_room_creator');
                        window.location.reload();
                    }} />

                {/* Step 1: name */}
                {step === 'username' && (
                    <form onSubmit={handleUsernameSubmit} className="sg-join__form">
                        <p className="sg-pill">Join the Game · Room {roomCode}</p>
                        <label htmlFor="username" className="sg-big sg-h1 sg-join__ask">What should we call you?</label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="sg-join__name"
                            placeholder="Enter your name"
                            required
                            autoFocus
                            autoComplete="nickname"
                            maxLength={24}
                        />
                        <button type="submit" className="sg-btn sg-btn-white" disabled={!username.trim()}>
                            Next: Choose Avatar <ArrowRight size={22} />
                        </button>
                        <p className="sg-small" style={{ textAlign: 'center', opacity: 0.6 }}>sussy amogus time ;)</p>
                    </form>
                )}

                {/* Step 2: avatar (selfie is opt-in from here) */}
                {step === 'avatar' && (
                    <div className="sg-join__form">
                        <div className="sg-join__me">
                            <div className="sg-join__face"><Avatar id={pic} className="w-full h-full" /></div>
                            <div style={{ minWidth: 0 }}>
                                <h1 className="sg-big sg-h2 sg-join__who">{username}</h1>
                                <p className="sg-lede" style={{ opacity: 0.85 }}>{avatar?.name}</p>
                                <p className="sg-small" style={{ opacity: 0.6 }}>Room {roomCode}</p>
                            </div>
                        </div>

                        <div className="sg-join__picker">
                            <AvatarPicker selected={pic} onSelect={setPic} takenBy={takenBy} />
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button
                                type="button"
                                className="sg-btn sg-btn-ghost"
                                style={{ width: 64, flex: 'none', padding: 0 }}
                                onClick={() => setPic(randomFreeAvatar(takenBy, pic))}
                                aria-label="Pick a random avatar"
                                title="Pick a random avatar"
                            >
                                <Shuffle size={24} />
                            </button>
                            <button type="button" className="sg-btn sg-btn-white" onClick={() => joinGame(null)}>
                                <span>Join Game</span> <ArrowRight size={22} />
                            </button>
                        </div>

                        <button type="button" onClick={() => setStep('camera')} className="sg-link" style={{ alignSelf: 'center', display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                            <Camera size={18} />
                            <span>Take a selfie instead</span>
                        </button>
                    </div>
                )}

                {/* Step 2b: camera (only after the player asks for it) */}
                {step === 'camera' && (
                    <div className="sg-join__form">
                        <h1 className="sg-big sg-h2">Take a selfie</h1>
                        <p className="sg-small" style={{ opacity: 0.75 }}>Other players see it on their phones during the game.</p>
                        <CameraCapture
                            onCapture={handleCameraCapture}
                            onCancel={() => setStep('avatar')}
                        />
                    </div>
                )}

                {/* Step 3: joining */}
                {step === 'joining' && (
                    <div className="sg-center" style={{ gap: 14, minHeight: '60vh' }}>
                        <div className="sg-join__face sg-a sg-bounce"><Avatar id={pic} className="w-full h-full" /></div>
                        <h2 className="sg-big sg-h2">Joining game...</h2>
                        <p className="sg-lede" style={{ opacity: 0.8 }}>Get ready to be sus!</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default LoginPage;

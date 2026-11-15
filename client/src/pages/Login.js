import React, { useState, useContext, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, Camera, ArrowRight, Shuffle, User } from '../signal/icons';
import { DataContext } from '../GameContext';
import CameraCapture from '../components/CameraCapture';
import Avatar, { getAvatar } from '../components/Avatar';
import AvatarPicker, { takenAvatars, isAvatarLocked, randomFreeAvatar } from '../components/AvatarPicker';
import { getTabId } from '../utils/browserTab';
import RoomEntryNotice from '../components/RoomEntryNotice';
import { clearRoomCodeFromUrl } from '../utils/inviteLinks';
import LeaveGameButton from '../components/LeaveGameButton';
import { t } from '../i18n';
import LanguagePicker from '../components/LanguagePicker';

// Set when this browser has no camera or the player refused it, so the join screen
// goes straight to the avatars next time. Tapping "Take a selfie instead" clears it.
const CAMERA_BLOCKED_KEY = 'sp_camera_blocked';

function cameraBlocked() {
    try { return localStorage.getItem(CAMERA_BLOCKED_KEY) === '1'; } catch { return false; }
}

function rememberCameraBlocked(blocked) {
    try {
        if (blocked) localStorage.setItem(CAMERA_BLOCKED_KEY, '1');
        else localStorage.removeItem(CAMERA_BLOCKED_KEY);
    } catch { /* storage off: ask again next time */ }
}

function LoginPage() {
    const [username, setUsername] = useState('');
    const [step, setStep] = useState('username'); // 'username', 'camera', 'avatar', 'joining'
    const [showContent, setShowContent] = useState(false);
    const [cameraMissing, setCameraMissing] = useState(false);
    const lastSelfie = useRef(null);
    const scrollRef = useRef(null);
    const { setPlayerState, socket, setTaskEntry, roomCode, roomEntryStatus, setRoomEntryStatus, players, waitingPlayers, roundRunningAtEntry, lateJoinLive } = useContext(DataContext);

    // Avatars other players in the room already have. A selfie comes first; the avatar is the
    // fallback, and also stands in for a selfie that fails to load or has been deleted.
    const takenBy = useMemo(() => takenAvatars([...(players || []), ...(waitingPlayers || [])], localStorage.getItem('player_id')), [players, waitingPlayers]);
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
            setStep(cameraBlocked() ? 'avatar' : 'camera');
        }
    };

    const handleCameraCapture = (imageData) => {
        joinGame(imageData);
    };

    const openCamera = () => {
        rememberCameraBlocked(false);
        setCameraMissing(false);
        setStep('camera');
    };

    // No camera, or the player said no: go to the avatars, and skip the camera next time.
    const handleCameraUnavailable = (reason) => {
        if (reason === 'NotAllowedError' || reason === 'NotFoundError' || reason === 'unsupported') rememberCameraBlocked(true);
        setCameraMissing(true);
        setStep('avatar');
    };

    const joinGame = (selfie) => {
        lastSelfie.current = selfie;
        setRoomEntryStatus(null);
        setStep('joining');
        setPlayerState(prevState => ({ ...prevState, username: username }));
        let playerId = localStorage.getItem('player_id');
        const storedRoomCode = roomCode || localStorage.getItem('room_code');
        // The avatar also stands in for a selfie that fails to load.
        socket.emit('join', { player_id: playerId, username: username, selfie: selfie, pic: pic, room_code: storedRoomCode, tab_id: getTabId() });
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
                        onClick={() => setStep('username')}
                        className="sg-btn sg-btn-ghost sg-join__back"
                    >
                        <ChevronLeft size={20} /> {t('Back')}
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
                        <p className="sg-pill">{t('Join the Game · Room {roomCode}', { roomCode })}</p>
                        {roundRunningAtEntry && (
                            <p className="sg-lede" data-testid="round-on-notice" style={{ opacity: 0.9 }}>
                                {lateJoinLive
                                    ? t('A round is on right now. Join and you\'ll be dealt in, as crew or intruder.')
                                    : t('A round is on right now. Join and you\'ll be dealt in at the next round.')}
                            </p>
                        )}
                        <label htmlFor="username" className="sg-big sg-h1 sg-join__ask">{t('What should we call you?')}</label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="sg-join__name"
                            placeholder={t('Enter your name')}
                            required
                            autoFocus
                            autoComplete="nickname"
                            maxLength={24}
                        />
                        <button type="submit" className="sg-btn sg-btn-white" disabled={!username.trim()}>
                            {cameraBlocked() ? t('Next: Choose Avatar') : t('Next: Take a selfie')} <ArrowRight size={22} />
                        </button>
                        <LanguagePicker style={{ alignSelf: 'center', opacity: 0.85 }} />
                    </form>
                )}

                {/* Step 2: selfie first */}
                {step === 'camera' && (
                    <div className="sg-join__form">
                        <h1 className="sg-big sg-h2">{t('Take a selfie')}</h1>
                        <CameraCapture
                            onCapture={handleCameraCapture}
                            onCancel={() => setStep('avatar')}
                            onUnavailable={handleCameraUnavailable}
                        />
                        <button type="button" onClick={() => setStep('avatar')} className="sg-link" style={{ alignSelf: 'center', display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                            <User size={18} />
                            <span>{t('Pick an avatar instead')}</span>
                        </button>
                    </div>
                )}

                {/* Step 2b: avatar, the fallback */}
                {step === 'avatar' && (
                    <div className="sg-join__form">
                        {cameraMissing && (
                            <p className="sg-small" role="status" style={{ opacity: 0.8 }}>{t("Your camera isn't available here, so pick an avatar instead.")}</p>
                        )}
                        <div className="sg-join__me">
                            <div className="sg-join__face"><Avatar id={pic} className="w-full h-full" /></div>
                            <div style={{ minWidth: 0 }}>
                                <h1 className="sg-big sg-h2 sg-join__who" translate="no">{username}</h1>
                                <p className="sg-lede" style={{ opacity: 0.85 }}>{avatar?.name}</p>
                                <p className="sg-small" style={{ opacity: 0.6 }}>{t('Room {roomCode}', { roomCode })}</p>
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
                                aria-label={t('Pick a random avatar')}
                                title={t('Pick a random avatar')}
                            >
                                <Shuffle size={24} />
                            </button>
                            <button type="button" className="sg-btn sg-btn-white" onClick={() => joinGame(null)}>
                                <span>{t('Join Game')}</span> <ArrowRight size={22} />
                            </button>
                        </div>

                        <button type="button" onClick={openCamera} className="sg-link" style={{ alignSelf: 'center', display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                            <Camera size={18} />
                            <span>{t('Take a selfie instead')}</span>
                        </button>
                    </div>
                )}

                {/* Step 3: joining */}
                {step === 'joining' && (
                    <div className="sg-center" style={{ gap: 14, minHeight: '60vh' }}>
                        <div className="sg-join__face sg-a sg-bounce">
                            {lastSelfie.current
                                ? <img src={lastSelfie.current} alt="" className="w-full h-full" style={{ objectFit: 'cover', borderRadius: 'inherit' }} />
                                : <Avatar id={pic} className="w-full h-full" />}
                        </div>
                        <h2 className="sg-big sg-h2">{t('Joining game...')}</h2>
                        <p className="sg-lede" style={{ opacity: 0.8 }}>{t('Get ready to be sus!')}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default LoginPage;

import React, { useState, useContext, useEffect, useRef } from 'react';
import { isMobile as isMobileDevice } from 'react-device-detect';
import { DataContext } from '../GameContext';
import { Plus, ArrowRight, Zap, Wifi, WifiOff, AlertTriangle, GraduationCap, Megaphone } from '../signal/icons';
import { ReactorModeBanner } from '../components/ReactorModeBanner';
import '../signal/reactor.css';
import { dismissTutorialPrompt, shouldRecommendTutorial } from '../tutorial/tutorialStorage';
import { getAcquisition } from '../seo/discovery';
import RoomEntryNotice from '../components/RoomEntryNotice';
import { getRoomCodeFromSearch, clearRoomCodeFromUrl } from '../utils/inviteLinks';
import { readGeneratedSetup, claimGeneratedRoomCreation } from './seo/gameDraft';
import { rememberSavedGame, keepSavedGame, readPendingGroup } from '../utils/savedGame';
import { t } from '../i18n';
import LanguagePicker from '../components/LanguagePicker';
import LaptopHostPrompt, { laptopHasHosted } from '../components/LaptopHostPrompt';
import AccountButton from '../account/AccountButton';
import WelcomeBackCard from '../components/WelcomeBackCard';
import { readLastGame } from '../utils/lastGame';

function LobbyPage() {
    const [inputRoomCode, setInputRoomCode] = useState(getRoomCodeFromSearch);
    const entryTimeout = useRef(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState('');
    const [showTutorialPrompt, setShowTutorialPrompt] = useState(false);
    const [showLaptopPrompt, setShowLaptopPrompt] = useState(false);
    const { socket, roomEntryStatus, setRoomEntryStatus } = useContext(DataContext);
    // Arriving from "Use this pack": open the room straight away, the pack loads in host setup.
    const [generatedSetup] = useState(readGeneratedSetup);
    const autoCreated = useRef(false);
    // A "Save this game" link: the tasks wait on this phone until it next creates a room.
    const [savedGameCode] = useState(() => rememberSavedGame());

    useEffect(() => {
        // A game that has ended is not a code to retry, so its code stays out of the box.
        if (roomEntryStatus?.code === 'game_ended') setInputRoomCode('');
        else if (roomEntryStatus?.room_code) setInputRoomCode(roomEntryStatus.room_code);
    }, [roomEntryStatus]);

    // Resolve effective device mode (matches GameContext / PageController logic)
    const mobileOverride = new URLSearchParams(window.location.search).get('mobile');
    const isMobile = mobileOverride !== null ? mobileOverride === 'true' : isMobileDevice;
    const isReactorDevice = !isMobile;

    const tutorialHref = '/tutorial?returnTo=play';

    useEffect(() => {
        // A phone that has finished a game has played, so it gets its welcome back card instead.
        setShowTutorialPrompt(isMobile && !generatedSetup && !savedGameCode && !readLastGame() && !getRoomCodeFromSearch() && !roomEntryStatus && shouldRecommendTutorial());
    }, [isMobile, roomEntryStatus, generatedSetup, savedGameCode]);

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
        // A game started from a group's link stays in that group, so the group's score carries on.
        const group = generatedSetup ? null : readPendingGroup();
        socket.emit('create_game', { acquisition: getAcquisition(), ...(generatedSetup ? { setup: 'generated' } : {}), ...(group || {}) });
        
        setTimeout(() => {
            setIsCreating(false);
        }, 10000);
    };

    // On a laptop, say first that everyone (the host too) plays on a phone. A laptop that has
    // already had phones join one of its rooms goes straight to setup.
    const handleCreateClick = () => {
        if (isReactorDevice && !laptopHasHosted()) setShowLaptopPrompt(true);
        else handleCreateGame();
    };

    useEffect(() => {
        if (!socket || !generatedSetup || autoCreated.current) return;
        autoCreated.current = true;
        if (claimGeneratedRoomCreation(generatedSetup)) handleCreateGame();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket, generatedSetup]);

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
            socket.emit('join_game', { room_code: inputRoomCode, entry_method: 'typed' });
        }
        clearTimeout(entryTimeout.current);
        entryTimeout.current = setTimeout(() => {
            setIsJoining(false);
            setRoomEntryStatus({ code: 'connection_timeout', room_code: inputRoomCode,
                message: 'The room did not respond. Check your internet connection, then try again.' });
        }, 10000);
    };

    // An old invite link: start a new room, with that game's tasks when the link brought them back.
    const startFromEndedGame = () => {
        keepSavedGame(roomEntryStatus?.saved_game?.code, Date.now(), { group: roomEntryStatus?.group_link, via: 'old_link' });
        setInputRoomCode('');
        handleCreateGame();
    };

    const changeCode = () => {
        setRoomEntryStatus(null);
        setError('');
        clearRoomCodeFromUrl();
        document.getElementById('game-entry-code')?.select();
    };

    const updateCode = event => {
        setInputRoomCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4));
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
            {socket?.connected ? t('Connected to server') : t('Connecting...')}
        </p>
    );

    if (!isReactorDevice) {
        return (
            <div className="sg-screen sg-round sg-home">
                <AccountButton className="sp-acct__corner" />
                <div className="sg-home__top sg-a sg-rise">
                    <h1 className="sg-big sg-home__mark">Sus Party</h1>
                    <p className="sg-lede">{t('The real-life social deduction game')}</p>
                    <p className="sg-small" style={{ marginTop: 6 }}>{t('3 to 20+ players · Real-time · Physical Tasks')}</p>
                </div>

                <div className="sg-home__body sg-a sg-rise" style={{ animationDelay: '120ms' }}>
                    <RoomEntryNotice status={roomEntryStatus} busy={isJoining || isCreating} onRetry={() => handleJoinGame()} onChangeCode={changeCode} onStartNew={startFromEndedGame} />
                    {error && (
                        <p className="sg-home__error" role="alert"><AlertTriangle size={18} /> {error}</p>
                    )}

                    <form onSubmit={handleJoinGame} className="sg-home__join">
                        <label htmlFor="game-entry-code" className="sg-lede">{t('Room code')}</label>
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
                            {isJoining ? t('Joining...') : <>{t('Join Game')} <ArrowRight size={22} /></>}
                        </button>
                    </form>

                    {!savedGameCode && !generatedSetup && !roomEntryStatus && !getRoomCodeFromSearch() && <WelcomeBackCard style={{ margin: '0 auto' }} />}
                    {savedGameCode && (
                        <p className="sg-small" role="status" style={{ background: '#fff', color: 'var(--sg-ink)', borderRadius: 14, padding: '10px 12px', fontWeight: 700 }}>
                            {t('Saved game ready. Create a new game to host it with the same tasks.')}
                        </p>
                    )}
                    <p className="sg-small sg-home__or">{t('or start one')}</p>
                    <button type="button" className="sg-btn sg-btn-ink" onClick={handleCreateGame} disabled={isCreating}>
                        {isCreating ? t('Creating Room...') : <><Plus size={22} /> {t('Create New Game')}</>}
                    </button>
                </div>

                <div className="sg-home__foot">
                    <p style={{ display: 'flex', justifyContent: 'center', gap: 22 }}>
                        <a href="/how-to-play" className="sg-link">{t('How to Play')}</a>
                        <a href={tutorialHref} className="sg-link">{t('Tutorial')}</a>
                        <LanguagePicker />
                    </p>
                    {connectedLine}
                </div>

                {showTutorialPrompt && (
                    <div className="sg-home__scrim" role="dialog" aria-modal="true" aria-labelledby="tutorial-prompt-title">
                        <div className="sg-home__sheet sg-a sg-rise">
                            <p className="sg-pill" style={{ background: 'var(--sg-meet)', color: 'var(--sg-ink)' }}>{t('First game?')}</p>
                            <h2 id="tutorial-prompt-title" className="sg-big sg-h2" style={{ margin: '12px 0 8px' }}>{t('Try the tutorial first')}</h2>
                            <p className="sg-small" style={{ opacity: 0.75 }}>
                                {t('Sus Party moves quickly once the round starts. A short tutorial walks you through it before anyone joins a real room.')}
                            </p>
                            <ul className="sg-home__learn">
                                <li><GraduationCap size={22} /> <span><b>{t('Crew basics')}</b> {t('Tasks and slide-to-complete')}</span></li>
                                <li><Megaphone size={22} /> <span><b>{t('Meetings')}</b> {t('When to call one and how voting works')}</span></li>
                                <li><Zap size={22} /> <span><b>{t('Intruder tools')}</b> {t('Log a kill, open the vent and play your cards')}</span></li>
                            </ul>
                            <a href={tutorialHref} className="sg-btn sg-btn-blue">{t('Start tutorial')}</a>
                            <button type="button" className="sg-btn sg-btn-flat" onClick={handleSkipTutorialPrompt}>{t('Skip for now')}</button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // The reactor (a laptop or desktop): the same blue home screen, laid out wide, with a note on
    // what this screen becomes once a room is open.
    return (
        <div className="sg-screen sg-round sg-rx sg-rx-lobby">
            <AccountButton className="sp-acct__corner" />
            <div className="sg-rx-lobby__grid">
                <div className="sg-a sg-rise">
                    <h1 className="sg-big sg-rx-lobby__mark">Sus Party</h1>
                    <p className="sg-rx__lede">{t('The real-life social deduction game')}</p>
                    <p className="sg-small" style={{ marginTop: 8 }}>{t('3 to 20+ players · Real-time · Physical Tasks')}</p>

                    <div className="sg-rx-lobby__form">
                        <RoomEntryNotice status={roomEntryStatus} busy={isJoining || isCreating} onRetry={() => handleJoinGame()} onChangeCode={changeCode} onStartNew={startFromEndedGame} />
                        {error && (
                            <p className="sg-home__error" role="alert"><AlertTriangle size={18} /> {error}</p>
                        )}
                        <form onSubmit={handleJoinGame} className="sg-home__join">
                            <label htmlFor="game-entry-code" className="sg-lede">{t('Enter Room Code')}</label>
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
                                {isJoining ? t('Joining...') : <>{t('Join Game')} <ArrowRight size={22} /></>}
                            </button>
                        </form>
                        <p className="sg-small sg-home__or">{t('or start one')}</p>
                        <button type="button" className="sg-btn sg-btn-ink" onClick={handleCreateClick} disabled={isCreating}>
                            {isCreating ? t('Creating Room...') : <><Plus size={22} /> {t('Create New Game')}</>}
                        </button>
                    </div>
                </div>

                <ReactorModeBanner className="sg-a sg-rise" />
            </div>

            {showLaptopPrompt && (
                <LaptopHostPrompt
                    onSetUpHere={() => { setShowLaptopPrompt(false); handleCreateGame(); }}
                    onClose={() => setShowLaptopPrompt(false)}
                />
            )}

            <div className="sg-rx-lobby__foot">
                <p style={{ display: 'flex', justifyContent: 'center', gap: 22 }}>
                    <a href="/how-to-play" className="sg-link">{t('How to Play')}</a>
                    <a href={tutorialHref} className="sg-link">{t('Tutorial')}</a>
                    <LanguagePicker />
                </p>
                {connectedLine}
            </div>
        </div>
    );
}

export default LobbyPage;

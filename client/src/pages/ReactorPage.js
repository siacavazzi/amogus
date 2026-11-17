import React, { useContext, useState, useEffect } from "react";
import { DataContext } from "../GameContext";
import { AlertTriangle, LogOut, Radiation } from "../signal/icons";
import MeetingDisplay from "../components/MeetingDisplay";
import IntrudersRevealedDisplay from "../components/IntrudersRevealedDisplay";
import MeltdownAvertedDisplay, { wasMeltdownJustAverted, clearMeltdownAverted } from "../components/MeltdownAverted";
import RoomQrCode from "../components/RoomQrCode";
import { isBetaChannel } from "../components/BetaBadge";
import { buildRoomQrUrl } from "../utils/inviteLinks";
import { Face } from "../signal";
import { Bolt, EmpBattery, EmpHit, useEmpIntro, useEmpProgress } from "../signal/Emp";
import "../signal/reactor.css";
import { t } from '../i18n';

const ARM_MS = 3000;

// The reactor during the round: the room's task progress, huge, and the sabotage button.
// A meeting floods it yellow; a finished task list turns it red with the intruders' names.
function ReactorNormal() {
    const { socket,
        meetingState,
        hackTime,
        endState,
        roomCode,
        crewScore,
        taskGoal,
        players,
        intrudersRevealed,
        waitingPlayers,
        lateJoinLive,
        lobbyState,
     } = useContext(DataContext);
    const meeting = meetingState && meetingState.stage !== 'over';
    const [isSabotaging, setIsSabotaging] = useState(false);
    const [armLeft, setArmLeft] = useState(ARM_MS / 1000);
    const [showAverted, setShowAverted] = useState(() => wasMeltdownJustAverted());

    useEffect(() => {
        if (!showAverted) return undefined;
        const timer = setTimeout(() => {
            clearMeltdownAverted();
            setShowAverted(false);
        }, 3600);
        return () => clearTimeout(timer);
    }, [showAverted]);

    // Count the three seconds down on screen while the sabotage arms.
    useEffect(() => {
        if (!isSabotaging) {
            setArmLeft(ARM_MS / 1000);
            return undefined;
        }
        const interval = setInterval(() => setArmLeft((s) => Math.max(1, s - 1)), 1000);
        return () => clearInterval(interval);
    }, [isSabotaging]);

    const [sabotageError, setSabotageError] = useState(null);

    useEffect(() => {
        if (!sabotageError) return undefined;
        const timer = setTimeout(() => setSabotageError(null), 6000);
        return () => clearTimeout(timer);
    }, [sabotageError]);

    const handleSabotage = () => {
        setSabotageError(null);
        setIsSabotaging(true);
        setTimeout(() => {
            // The big screen speaks for the room. It never sends a player_id: this browser may have
            // played as a phone, and the server would refuse a phone's id from the screen's socket.
            socket.emit("meltdown", { room_code: roomCode }, (result) => {
                if (result && result.ok === false) {
                    setSabotageError(result.error || "The sabotage did not start. Try again.");
                }
            });
            setIsSabotaging(false);
        }, ARM_MS);
    };

    function isDisabled() {
        // TODO FIX THIS WHEN THERE IS A HACK IT BREAKS AND THE BUTTON CANT BE CLICKED
        return !!(isSabotaging || meeting || hackTime > 0 || endState);
    }

    const handleLeaveRoom = () => {
        // Clear local storage first
        localStorage.removeItem('room_code');
        sessionStorage.removeItem('is_room_creator');
        // Send leave_room with room_code (reactor doesn't have player_id)
        socket.emit('leave_room', { room_code: roomCode });
    };

    let percentage = Math.round(((crewScore || 0) / (taskGoal || 1)) * 100);
    if (!Number.isFinite(percentage)) percentage = 0;
    percentage = Math.max(0, Math.min(percentage, 100));

    const disabled = isDisabled();
    const reason = meeting ? t("Cannot sabotage during meeting") :
        hackTime > 0 ? t("Sabotage in progress...") :
        endState ? t("Game has ended") : "";

    const leave = (corner = true) => (
        <button type="button" onClick={handleLeaveRoom} className={`sg-rx__leave${corner ? " sg-rx__corner" : ""}`} title={t('Leave Room')}>
            <LogOut size={18} />
            <span>{t('Leave Room')}</span>
        </button>
    );

    const sabotage = (tone) => (
        <>
            <button
                type="button"
                onClick={handleSabotage}
                disabled={disabled}
                className={`sg-btn sg-rx__sabotage ${tone}`}
            >
                {isSabotaging ? (
                    <>
                        <AlertTriangle size={40} />
                        <span>{t('INITIATING...')}</span>
                    </>
                ) : (
                    <>
                        <Radiation size={40} />
                        <span>{t('SABOTAGE CORE')}</span>
                    </>
                )}
            </button>
            {disabled && !isSabotaging && reason && <p className="sg-rx__why">{reason}</p>}
            {!disabled && sabotageError && <p className="sg-rx__why" role="alert" data-testid="sabotage-error">{sabotageError}</p>}
        </>
    );

    if (meeting) {
        return (
            <>
                <MeetingDisplay
                    stage={meetingState.stage}
                    callerName={meetingState.trigger === 'tasks_complete' ? undefined : meetingState.player_who_started_it}
                    message={meetingState.trigger === 'tasks_complete' ? t('Tasks complete: intruders revealed') : undefined}
                    hostName={meetingState.host_name}
                    meeting={meetingState}
                    players={players || []}
                >
                    {sabotage('sg-btn-ink sg-rx__sabotage--quiet')}
                </MeetingDisplay>
                {leave()}
            </>
        );
    }

    if (isSabotaging) {
        return (
            <div className="sg sg-screen sg-rx sg-rx--arming" role="alert">
                <div className="sg-rx__main">
                    <p className="sg-rx__label">{t('Overloading core...')}</p>
                    <p key={armLeft} className="sg-rx__count sg-a sg-slam" aria-live="assertive">{armLeft}</p>
                    <p className="sg-rx__lede">{t('Meltdown incoming')}</p>
                </div>
                <div className="sg-rx__foot">{sabotage('sg-btn-ink sg-rx__sabotage--armed')}</div>
            </div>
        );
    }

    if (intrudersRevealed) {
        const names = Array.isArray(intrudersRevealed.intruder_names)
            ? intrudersRevealed.intruder_names
            : (players || []).filter((p) => p.sus && p.alive).map((p) => p.username);
        return (
            <>
                <IntrudersRevealedDisplay intruderNames={names} players={players || []}>
                    {sabotage('sg-btn-white')}
                </IntrudersRevealedDisplay>
                {leave()}
                {showAverted && <MeltdownAvertedDisplay />}
            </>
        );
    }

    if (hackTime > 0) {
        return (
            <>
                <ReactorEmp hackTime={hackTime} roomCode={roomCode} leave={leave(false)} />
                {showAverted && <MeltdownAvertedDisplay />}
            </>
        );
    }

    return (
        <div className="sg sg-screen sg-round sg-rx">
            <div className="sg-rx__bar">
                <p className="sg-rx__brand">Sus Party <span style={{ opacity: 0.7, fontWeight: 700 }}>{t('· Room {roomCode}', { roomCode })}</span></p>
                {leave(false)}
            </div>

            <div className="sg-rx__main">
                <p className="sg-rx__label">{t('Tasks done')}</p>
                <p className="sg-rx__pct" aria-label={t('Tasks {percentage}% done', { percentage })}>
                    {percentage}<small>%</small>
                </p>
                <div
                    className="sg-rx__track"
                    role="progressbar"
                    aria-valuenow={percentage}
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-label={t('Progress: {percentage}%', { percentage })}
                >
                    <div className="sg-rx__fill" style={{ width: `${percentage}%` }} />
                </div>
                <p className="sg-rx__lede">{t('At 100% the intruders are revealed')}</p>
            </div>

            <div className="sg-rx__foot">{sabotage('sg-btn-red')}</div>
            <LateJoin roomCode={roomCode} waitingPlayers={waitingPlayers} live={lateJoinLive} linkToken={lobbyState?.link_token} />
            {showAverted && <MeltdownAvertedDisplay />}
        </div>
    );
}

// EMP on the laptop: the same yellow bolt strikes the screen, and everyone across the room
// can see how long the phones stay down while the battery recharges.
export function ReactorEmp({ hackTime, roomCode, leave }) {
    const phase = useEmpIntro(false);
    const progress = useEmpProgress(hackTime);
    const left = Math.max(0, hackTime || 0);
    const clock = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    return (
        <div className="sg sg-screen sg-rx sg-rx--emp" role="status" data-testid="reactor-emp">
            <div className="sg-rx__bar">
                <p className="sg-rx__brand">Sus Party <span style={{ opacity: 0.7, fontWeight: 700 }}>{t('· Room {roomCode}', { roomCode })}</span></p>
                {leave}
            </div>
            <EmpHit phase={phase} boltSize={240} />
            {phase === 'down' && (
            <div className="sg-rx__main sg-emp-on">
                <div className="sg-rx-emp__row">
                    <Bolt size={150} className="sg-rx-emp__strike" />
                    <div style={{ display: 'grid', gap: 10, justifyItems: 'start', textAlign: 'left' }}>
                        <p className="sg-rx__label">{t('HACKED')}</p>
                        <h1 className="sg-big" style={{ fontSize: 'clamp(48px, 7vw, 110px)' }}>{t('Devices down')}</h1>
                        <p className="sg-rx__lede" style={{ opacity: 0.75 }}>{t('An intruder played EMP')}</p>
                    </div>
                </div>
                <div className="sg-rx-emp__row" style={{ marginTop: 'clamp(16px, 5vh, 56px)' }}>
                    <EmpBattery progress={progress} width={400} />
                    <div style={{ display: 'grid', gap: 4, justifyItems: 'start' }}>
                        <p className="sg-rx__label">{t('Back in')}</p>
                        <p key={left <= 10 ? left : 'steady'} className={`sg-rx-emp__count ${left <= 10 ? 'sg-tick' : ''}`}>{clock}</p>
                    </div>
                </div>
            </div>
            )}
        </div>
    );
}

// Bottom-left corner during a round: latecomers scan to get on the next-round waiting list,
// and everyone sees who is joining next round. Nobody on it is part of this round.
export function LateJoin({ roomCode, waitingPlayers, live = false, linkToken = '' }) {
    const waiting = waitingPlayers || [];
    const qrUrl = roomCode ? buildRoomQrUrl(roomCode, { beta: isBetaChannel(), linkToken }) : '';
    if (!qrUrl && waiting.length === 0) return null;
    return (
        <aside className="sg-rx__late" data-testid="reactor-late-join">
            {qrUrl && (
                <figure className="sg-rx__late-qr">
                    <RoomQrCode value={qrUrl} title={t('QR code to join room {roomCode} for the next round', { roomCode })} />
                    <figcaption>{live ? t('Late? Scan to join') : t('Late? Scan to join the next round')}</figcaption>
                </figure>
            )}
            {waiting.length > 0 && (
                <div className="sg-rx__late-list" data-testid="reactor-waiting-list">
                    <p className="sg-num">{live ? t('+{count} waiting to join', { count: waiting.length }) : t('+{count} joining next round', { count: waiting.length })}</p>
                    <div className="sg-rx__late-faces">
                        {waiting.slice(0, 8).map((player) => (
                            <Face key={player.player_id} player={player} size={40} className="sg-rx__face-ring" />
                        ))}
                    </div>
                </div>
            )}
        </aside>
    );
}

export default ReactorNormal;

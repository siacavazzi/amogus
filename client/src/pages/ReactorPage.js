import React, { useContext, useState, useEffect } from "react";
import { DataContext } from "../GameContext";
import { AlertTriangle, LogOut, Radiation } from "../signal/icons";
import MeetingDisplay from "../components/MeetingDisplay";
import IntrudersRevealedDisplay from "../components/IntrudersRevealedDisplay";
import MeltdownAvertedDisplay, { wasMeltdownJustAverted, clearMeltdownAverted } from "../components/MeltdownAverted";
import "../signal/reactor.css";

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
     } = useContext(DataContext);
    const meeting = meetingState && meetingState.stage !== 'over';
    const [isSabotaging, setIsSabotaging] = useState(false);
    const [armLeft, setArmLeft] = useState(ARM_MS / 1000);
    const [showAverted, setShowAverted] = useState(() => wasMeltdownJustAverted());

    useEffect(() => {
        if (!showAverted) return undefined;
        const t = setTimeout(() => {
            clearMeltdownAverted();
            setShowAverted(false);
        }, 3600);
        return () => clearTimeout(t);
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

    const handleSabotage = () => {
        setIsSabotaging(true);
        setTimeout(() => {
            // Send both player_id and room_code for maximum compatibility
            socket.emit("meltdown", {
                player_id: localStorage.getItem('player_id'),
                room_code: roomCode
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
    const reason = meeting ? "Cannot sabotage during meeting" :
        hackTime > 0 ? "Sabotage in progress..." :
        endState ? "Game has ended" : "";

    const leave = (corner = true) => (
        <button type="button" onClick={handleLeaveRoom} className={`sg-rx__leave${corner ? " sg-rx__corner" : ""}`} title="Leave Room">
            <LogOut size={18} />
            <span>Leave Room</span>
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
                        <span>INITIATING...</span>
                    </>
                ) : (
                    <>
                        <Radiation size={40} />
                        <span>SABOTAGE CORE</span>
                    </>
                )}
            </button>
            {disabled && !isSabotaging && reason && <p className="sg-rx__why">{reason}</p>}
        </>
    );

    if (meeting) {
        return (
            <>
                <MeetingDisplay
                    stage={meetingState.stage}
                    callerName={meetingState.player_who_started_it}
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
                    <p className="sg-rx__label">Overloading core...</p>
                    <p key={armLeft} className="sg-rx__count sg-a sg-slam" aria-live="assertive">{armLeft}</p>
                    <p className="sg-rx__lede">Meltdown incoming</p>
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

    return (
        <div className="sg sg-screen sg-round sg-rx">
            <div className="sg-rx__bar">
                <p className="sg-rx__brand">Sus Party <span style={{ opacity: 0.7, fontWeight: 700 }}>· Room {roomCode}</span></p>
                {leave(false)}
            </div>

            <div className="sg-rx__main">
                <p className="sg-rx__label">Tasks done</p>
                <p className="sg-rx__pct" aria-label={`Tasks ${percentage}% done`}>
                    {percentage}<small>%</small>
                </p>
                <div
                    className="sg-rx__track"
                    role="progressbar"
                    aria-valuenow={percentage}
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-label={`Progress: ${percentage}%`}
                >
                    <div className="sg-rx__fill" style={{ width: `${percentage}%` }} />
                </div>
                <p className="sg-rx__lede">At 100% the intruders are revealed</p>
            </div>

            <div className="sg-rx__foot">{sabotage('sg-btn-red')}</div>
            {showAverted && <MeltdownAvertedDisplay />}
        </div>
    );
}

export default ReactorNormal;

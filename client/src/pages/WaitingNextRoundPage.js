// A phone that joined while a round was on. It is on the room's waiting list and is dealt
// in when the room goes back to the lobby; nothing on this screen touches the round.
import React, { useContext } from 'react';
import { DataContext } from '../GameContext';
import LeaveGameButton from '../components/LeaveGameButton';
import { ProfilePicture } from '../components/PlayerCard';
import { Clock } from '../signal/icons';
import '../signal/signal.css';

// When this phone gets dealt in. "next_round" covers both the setting being off and a round
// too close to join, so the screen never hints at how the round is going.
const JOINS_WHEN = {
    now: 'Dealing you into the round…',
    meeting: "You'll be dealt into this round when the meeting ends.",
    meltdown: "You'll be dealt into this round once the meltdown is over.",
    next_round: "You'll be dealt in when the next round starts.",
};

export function roundStatus({ endState, meetingState, meltdownTimer }) {
    if (endState) return 'This round is over. Everyone else is tapping Play Again.';
    if (meltdownTimer > 0) return 'A meltdown is on. The round is nearly decided.';
    if (meetingState && meetingState.stage !== 'over') return 'A meeting is on right now.';
    return 'A round is being played right now.';
}

const WaitingNextRoundPage = () => {
    const { playerState, waitingPlayers, endState, meetingState, meltdownTimer, roomCode, waitingJoinsWhen } = useContext(DataContext);
    const myId = playerState?.player_id || playerState?.playerId;
    const others = (waitingPlayers || []).filter((player) => player.player_id !== myId);

    return (
        <div className="sg-screen sg-round" data-testid="waiting-next-round">
            <LeaveGameButton className="sg-corner" />

            <div className="sg-center" style={{ gap: 14 }}>
                <span className="sg-pill sg-a sg-rise" style={{ background: 'rgba(255,255,255,0.16)' }}>
                    <Clock size={16} strokeWidth={2.75} />
                    Room {roomCode}
                </span>
                <div className="sg-a sg-pop" style={{ animationDelay: '150ms' }}>
                    <ProfilePicture imageCode={playerState?.pic} selfie={playerState?.selfie} size="large" />
                </div>
                <p className="sg-lede" style={{ opacity: 0.85 }}>{playerState?.username || 'Player'}</p>
                <h1 className="sg-big sg-h1 sg-a sg-slam" style={{ animationDelay: '300ms' }}>You're in!</h1>
                <p className="sg-lede" style={{ maxWidth: '24ch' }} data-testid="waiting-joins-when">
                    {JOINS_WHEN[waitingJoinsWhen] || JOINS_WHEN.next_round}
                </p>
                <p className="sg-small" style={{ maxWidth: '28ch' }} data-testid="waiting-round-status">
                    {roundStatus({ endState, meetingState, meltdownTimer })} Keep this page open.
                </p>

                {others.length > 0 && (
                    <div className="sg-a sg-rise" style={{ marginTop: 10 }}>
                        <p className="sg-small" style={{ marginBottom: 10 }}>
                            Also joining next round: {others.length}
                        </p>
                        <div className="flex flex-wrap justify-center gap-3">
                            {others.map((player) => (
                                <div key={player.player_id} className="flex flex-col items-center gap-1">
                                    <ProfilePicture imageCode={player.pic} selfie={player.selfie} size="small" />
                                    <span style={{ fontWeight: 700, fontSize: 13 }}>{player.username}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WaitingNextRoundPage;

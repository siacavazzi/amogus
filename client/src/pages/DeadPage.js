// ./pages/DeadPage.jsx

import React, { useContext, useState } from 'react';
import { DataContext } from '../GameContext';
import LeaveGameButton from '../components/LeaveGameButton';
import HostStartVoting from '../components/HostStartVoting';
import { ProfilePicture, getDeathInfo } from '../components/PlayerCard';
import { Skull, Eye, EyeOff } from '../signal/icons';

// Get a readable death cause label
const getDeathLabel = (cause) => {
  switch (cause) {
    case 'voted_out':
    case 'voted_out_intruder':
    case 'voted_out_innocent':
      return 'Ejected';
    case 'murdered':
    case 'murdered_during_task':
      return 'Murdered';
    case 'meltdown':
      return 'Irradiated';
    case 'left_game':
      return 'Disconnected';
    default:
      return 'Eliminated';
  }
};

const DeadPage = () => {
  const { playerState, players } = useContext(DataContext);
  const [showSpectate, setShowSpectate] = useState(false);
  
  // Get the death message from player state, fallback to default
  const deathMessage = playerState?.death_message || "You have been eliminated";
  const deathCause = playerState?.death_cause;
  const DeathIcon = getDeathInfo(deathCause)?.icon || Skull;
  const deathLabel = getDeathLabel(deathCause);
  
  // Get alive players for spectating
  const alivePlayers = players?.filter(p => p.alive) || [];
  
  return (
    <div className="sg-screen sg-dark" style={{ zIndex: 50 }}>
      <LeaveGameButton className="sg-corner" />

      <div className="sg-center" style={{ gap: 14 }}>
        <span className="sg-pill sg-a sg-rise" style={{ background: 'rgba(255,255,255,0.12)' }}>
          <DeathIcon size={16} strokeWidth={2.75} />
          {deathLabel}
        </span>
        <div className="sg-a sg-pop" style={{ animationDelay: '150ms' }}>
          <ProfilePicture
            imageCode={playerState?.pic}
            selfie={playerState?.selfie}
            size="large"
            isDead={true}
            deathCause={deathCause}
          />
        </div>
        <p className="sg-lede" style={{ opacity: 0.8 }}>{playerState?.username || 'Player'}</p>
        <h1 className="sg-big sg-h1 sg-a sg-slam" style={{ animationDelay: '300ms' }}>You're out</h1>
        <p className="sg-lede" style={{ maxWidth: '24ch', opacity: 0.85 }}>"{deathMessage}"</p>
        <p className="sg-small" style={{ maxWidth: '28ch' }}>Stay quiet and keep watching. You can still cheer at the end.</p>

        {/* A dead host still runs the room: the meeting may be stuck on them */}
        <HostStartVoting dark />

        <div className="w-full max-w-sm" style={{ marginTop: 10 }}>
          <button type="button" className="sg-btn sg-btn-ghost" onClick={() => setShowSpectate(!showSpectate)} style={{ background: 'rgba(255,255,255,0.12)' }}>
            {showSpectate ? <EyeOff size={18} /> : <Eye size={18} />}
            <span>{showSpectate ? 'Hide Survivors' : 'View Survivors'}</span>
            <span className="sg-num" style={{ background: '#fff', color: 'var(--sg-dark)', borderRadius: 999, padding: '1px 9px', fontSize: 14 }}>{alivePlayers.length}</span>
          </button>

          {showSpectate && alivePlayers.length > 0 && (
            <div className="sg-a sg-rise flex flex-wrap justify-center gap-3" style={{ marginTop: 16 }}>
              {alivePlayers.map(player => (
                <div key={player.player_id} className="flex flex-col items-center gap-1">
                  <ProfilePicture imageCode={player.pic} selfie={player.selfie} size="small" />
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{player.username}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeadPage;

// ./pages/DeadPage.jsx

import React, { useContext, useState, useMemo } from 'react';
import { DataContext } from '../GameContext';
import LeaveGameButton from '../components/LeaveGameButton';
import { ProfilePicture, getDeathInfo } from '../components/PlayerCard';
import { Ghost, Skull, Eye, EyeOff } from 'lucide-react';
import { Vignette } from '../components/ui';
import { StatusBadge, SecondaryButton } from '../components/ui';

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
  const { playerState, players, meetingState } = useContext(DataContext);
  const [showSpectate, setShowSpectate] = useState(false);
  
  // Get the death message from player state, fallback to default
  const deathMessage = playerState?.death_message || "You have been eliminated";
  const deathCause = playerState?.death_cause;
  const deathInfo = getDeathInfo(deathCause);
  const DeathIcon = deathInfo?.icon || Skull;
  const deathLabel = getDeathLabel(deathCause);
  
  // Get alive players for spectating
  const alivePlayers = players?.filter(p => p.alive) || [];
  
  // Floating ghost particles
  const particles = useMemo(() => 
    Array.from({ length: 8 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 8 + Math.random() * 6,
      size: 12 + Math.random() * 12,
      opacity: 0.1 + Math.random() * 0.2,
    }))
  , []);

  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col z-50 overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900" />
      
      {/* Floating ghost particles */}
      {particles.map(particle => (
        <div
          key={particle.id}
          className="absolute pointer-events-none"
          style={{
            left: `${particle.left}%`,
            bottom: '-50px',
            animation: `floatUp ${particle.duration}s linear infinite`,
            animationDelay: `${particle.delay}s`,
          }}
        >
          <Ghost 
            size={particle.size} 
            className="text-gray-600" 
            style={{ opacity: particle.opacity }}
          />
        </div>
      ))}
      
      {/* Vignette effect */}
      <Vignette intensity={50} />
      
      {/* Leave Game Button */}
      <LeaveGameButton className="fixed top-4 right-4 z-50" />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        {/* Death indicator badge */}
        <StatusBadge 
          icon={DeathIcon} 
          variant={deathCause?.includes('voted') ? 'purple' : deathCause === 'meltdown' ? 'orange' : 'red'}
          className="mb-6 animate-fadeIn"
        >
          {deathLabel}
        </StatusBadge>
        
        {/* Player selfie with death styling */}
        <div className="relative mb-6 animate-fadeInScale">
          {/* Glow effect behind image */}
          <div className={`absolute inset-0 blur-2xl opacity-30 ${deathInfo.bg} scale-150`} />
          
          <ProfilePicture
            imageCode={playerState?.pic}
            selfie={playerState?.selfie}
            size="large"
            isDead={true}
            deathCause={deathCause}
          />
          
          {/* Ghost overlay */}
          <div className="absolute -top-3 -right-3 animate-float">
            <Ghost size={28} className="text-gray-400 drop-shadow-lg" />
          </div>
        </div>
        
        {/* Player name */}
        <h2 className="text-2xl font-bold text-gray-300 mb-2 text-center">
          {playerState?.username || 'Player'}
        </h2>
        
        {/* YOU ARE DEAD title */}
        <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-gray-400 to-gray-600 mb-4 text-center tracking-tight animate-pulse-slow">
          YOU ARE DEAD
        </h1>
        
        {/* Death message */}
        <div className={`max-w-sm w-full p-4 rounded-xl ${deathInfo.bg} ${deathInfo.border} border mb-8`}>
          <p className="text-gray-300 text-center text-lg leading-relaxed">
            "{deathMessage}"
          </p>
        </div>
        
        {/* Spectate section */}
        <div className="w-full max-w-sm">
          <SecondaryButton
            onClick={() => setShowSpectate(!showSpectate)}
            variant="gray"
          >
            {showSpectate ? <EyeOff size={18} /> : <Eye size={18} />}
            <span>{showSpectate ? 'Hide Survivors' : 'View Survivors'}</span>
            <span className="ml-1 px-2 py-0.5 text-xs bg-gray-700 rounded-full">{alivePlayers.length}</span>
          </SecondaryButton>
          
          {showSpectate && alivePlayers.length > 0 && (
            <div className="mt-4 p-4 rounded-xl bg-gray-800/60 border border-gray-700 animate-fadeIn">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-3 text-center">Still Alive</p>
              <div className="flex flex-wrap justify-center gap-3">
                {alivePlayers.map(player => (
                  <div key={player.player_id} className="flex flex-col items-center gap-1">
                    <ProfilePicture
                      imageCode={player.pic}
                      selfie={player.selfie}
                      size="small"
                    />
                    <span className="text-xs text-gray-400">{player.username}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CSS for float animation - using global now */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
};

export default DeadPage;

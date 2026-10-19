import React, { useContext, useState } from "react";
import { ENDPOINT } from "../ENDPOINT";
import { DataContext } from '../GameContext';
import Avatar, { getAvatar } from './Avatar';
import { Skull, Vote, Radiation, DoorOpen, UserX, Shield } from 'lucide-react';

function getSelfieUrl(filename, access) {
  if (!filename || !access?.sid || !access?.token) return null;
  const query = new URLSearchParams({ sid: access.sid, token: access.token });
  return `${ENDPOINT}/selfies/${encodeURIComponent(filename)}?${query}`;
}

// Show the selfie until it fails to load (e.g. expired), then fall back to the avatar.
function useSelfieFallback(selfieUrl) {
  const [failedUrl, setFailedUrl] = useState(null);
  const shownUrl = selfieUrl && selfieUrl !== failedUrl ? selfieUrl : null;
  return [shownUrl, () => setFailedUrl(selfieUrl)];
}

// Map death causes to icons and colors
export const getDeathInfo = (cause) => {
  switch (cause) {
    case 'voted_out':
    case 'voted_out_intruder':
    case 'voted_out_innocent':
      return { 
        icon: Vote, 
        color: 'text-purple-400', 
        bg: 'bg-purple-500/20',
        border: 'border-purple-500/40',
        ring: 'ring-purple-500/50'
      };
    case 'murdered':
    case 'murdered_during_task':
      return { 
        icon: Skull, 
        color: 'text-red-400', 
        bg: 'bg-red-500/20',
        border: 'border-red-500/40',
        ring: 'ring-red-500/50'
      };
    case 'meltdown':
      return { 
        icon: Radiation, 
        color: 'text-orange-400', 
        bg: 'bg-orange-500/20',
        border: 'border-orange-500/40',
        ring: 'ring-orange-500/50'
      };
    case 'left_game':
      return { 
        icon: DoorOpen, 
        color: 'text-gray-400', 
        bg: 'bg-gray-500/20',
        border: 'border-gray-500/40',
        ring: 'ring-gray-500/50'
      };
    default:
      return { 
        icon: UserX, 
        color: 'text-gray-400', 
        bg: 'bg-gray-500/20',
        border: 'border-gray-500/40',
        ring: 'ring-gray-500/50'
      };
  }
};

export const ProfilePicture = ({ 
  imageCode, 
  selfie, 
  size = "large", 
  isDead = false,
  deathCause = null,
  ringColor = "ring-indigo-500/50"
}) => {
  const { selfieAccess } = useContext(DataContext) || {};
  // Size variants
  const sizeMap = {
    large: "w-24 h-24 sm:w-28 sm:h-28",
    medium: "w-16 h-16 sm:w-20 sm:h-20",
    small: "w-12 h-12",
    tiny: "w-8 h-8"
  };
  const sizeClasses = sizeMap[size] || sizeMap.large;
  
  // Get death styling if dead
  const deathInfo = isDead && deathCause ? getDeathInfo(deathCause) : null;
  const DeathIcon = deathInfo?.icon;
  
  const [selfieUrl, onSelfieError] = useSelfieFallback(getSelfieUrl(selfie, selfieAccess));

  // Icon overlay size based on profile size
  const iconSizes = {
    large: { container: "w-8 h-8", icon: 16 },
    medium: { container: "w-7 h-7", icon: 14 },
    small: { container: "w-6 h-6", icon: 12 },
    tiny: { container: "w-5 h-5", icon: 10 }
  };
  const iconSize = iconSizes[size] || iconSizes.large;
  
  return (
    <div className={`${sizeClasses} relative`}>
      {selfieUrl ? (
        <img
          src={selfieUrl}
          referrerPolicy="no-referrer"
          alt="Player"
          className={`${sizeClasses} rounded-full object-cover ${isDead ? 'grayscale opacity-70' : ''}`}
          onError={onSelfieError}
        />
      ) : getAvatar(imageCode) ? (
        <div className={`${sizeClasses} rounded-full overflow-hidden ${isDead ? 'grayscale opacity-70' : ''}`}>
          <Avatar id={imageCode} className="w-full h-full" />
        </div>
      ) : (
        <div className={`${sizeClasses} rounded-full bg-gray-700 flex items-center justify-center ${isDead ? 'opacity-70' : ''}`}>
          <Shield size={size === 'large' ? 32 : size === 'medium' ? 24 : 16} className="text-gray-500" />
        </div>
      )}
      
      {/* Death icon overlay */}
      {isDead && DeathIcon && (
        <div className={`absolute -bottom-1 -right-1 ${iconSize.container} rounded-full flex items-center justify-center`} style={{ background: '#fff', color: '#1a1400' }}>
          <DeathIcon size={iconSize.icon} strokeWidth={2.75} />
        </div>
      )}
    </div>
  );
};

// Compact card for death summary / survivor lists
export const PlayerCardCompact = ({
  player,
  showDeathInfo = false,
  variant = "default" // "default", "survivor", "dead"
}) => {
  const isDead = !player.alive;
  
  return (
    <div className="sg flex items-center gap-3" style={{ padding: 10, borderRadius: 18, background: 'rgba(0,0,0,0.18)', color: '#fff' }}>
      <ProfilePicture 
        imageCode={player.pic}
        selfie={player.selfie}
        size="small"
        isDead={isDead}
        deathCause={player.death_cause}
      />
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2">
          <span className="truncate" style={{ fontWeight: 900, fontSize: 17 }}>
            {player.username}
          </span>
          {player.sus && (
            <span style={{ fontSize: 11, fontWeight: 900, padding: '2px 8px', borderRadius: 999, background: '#fff', color: 'var(--sg-out)' }}>
              Intruder
            </span>
          )}
        </div>
        {showDeathInfo && player.death_message && (
          <p className="break-words whitespace-normal" style={{ fontWeight: 500, fontSize: 14, opacity: 0.85, marginTop: 2 }}>
            {player.death_message}
          </p>
        )}
      </div>
    </div>
  );
};

// Mini badge-style card for survivor lists
export const PlayerBadge = ({
  player,
  variant = "default" // "default", "survivor", "intruder"
}) => {
  return (
    <div className="sg flex items-center gap-2" style={{ padding: '6px 12px 6px 6px', borderRadius: 999, background: 'rgba(0,0,0,0.18)', color: '#fff' }}>
      <ProfilePicture 
        imageCode={player.pic}
        selfie={player.selfie}
        size="tiny"
        isDead={!player.alive}
        deathCause={player.death_cause}
      />
      <span style={{ fontWeight: 700, fontSize: 15 }}>
        {player.username}
      </span>
      {player.sus && variant !== "intruder" && (
        <span style={{ fontSize: 11, fontWeight: 900, padding: '1px 7px', borderRadius: 999, background: '#fff', color: 'var(--sg-out)' }}>Intruder</span>
      )}
    </div>
  );
};

const PlayerCard = ({
  player,
  selected = false,
  votes = 0,
  onClick,
  isMe = false,
  isClickable = true,
}) => {
  const { selfieAccess } = useContext(DataContext) || {};
  const isDead = !player.alive;
  const deathInfo = isDead && player.death_cause ? getDeathInfo(player.death_cause) : null;
  const DeathIcon = deathInfo?.icon;

  // Glow and border colours based on state
  const glowColor = selected
    ? 'shadow-green-500/40'
    : isDead
    ? 'shadow-red-900/40'
    : isMe
    ? 'shadow-indigo-500/30'
    : 'shadow-black/40';

  const borderColor = selected
    ? 'border-green-500/70'
    : isDead
    ? 'border-red-900/50'
    : isMe
    ? 'border-indigo-500/50'
    : 'border-gray-700/60';

  const [selfieUrl, onSelfieError] = useSelfieFallback(getSelfieUrl(player.selfie, selfieAccess));

  return (
    <div
      onClick={isClickable ? onClick : null}
      className={`
        relative overflow-hidden rounded-2xl border ${borderColor}
        shadow-lg ${glowColor}
        bg-gray-900
        flex flex-col
        transition-all duration-200
        ${isClickable ? 'cursor-pointer hover:scale-[1.04] hover:shadow-xl active:scale-[0.98]' : 'opacity-50 cursor-not-allowed'}
        ${selected ? 'ring-2 ring-green-500/60' : ''}
      `}
      style={{ aspectRatio: '3/4' }}
    >
      {/* ── Portrait area (top ~70%) ── */}
      <div className="relative flex-1 overflow-hidden bg-gray-950">
        {selfieUrl ? (
          <img
            src={selfieUrl}
            referrerPolicy="no-referrer"
            alt={player.username}
            className={`absolute inset-0 w-full h-full object-cover ${isDead ? 'grayscale opacity-60' : ''}`}
            onError={onSelfieError}
          />
        ) : getAvatar(player.pic) ? (
          <Avatar
            id={player.pic}
            label={player.username}
            className={`absolute inset-0 w-full h-full ${isDead ? 'grayscale opacity-60' : ''}`}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            <Shield size={40} className="text-gray-600" />
          </div>
        )}

        {/* Bottom portrait fade into the footer */}
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-gray-900 to-transparent pointer-events-none" />

        {/* Corner nicks */}
        <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-current opacity-40 rounded-tl-sm"
          style={{ color: selected ? '#22c55e' : isDead ? '#ef4444' : '#818cf8' }} />
        <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-current opacity-40 rounded-tr-sm"
          style={{ color: selected ? '#22c55e' : isDead ? '#ef4444' : '#818cf8' }} />

        {/* Death cause badge */}
        {isDead && DeathIcon && (
          <div className={`absolute top-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${deathInfo.bg} ${deathInfo.border} border ${deathInfo.color} backdrop-blur-sm`}>
            <DeathIcon size={9} />
            <span>Eliminated</span>
          </div>
        )}

        {/* Vote counter */}
        {votes > 0 && (
          <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold py-0.5 px-1.5 rounded-full shadow-md">
            {votes}▲
          </div>
        )}
      </div>

      {/* ── Name / status footer ── */}
      <div className="px-2.5 py-2 bg-gray-900/95 backdrop-blur-sm border-t border-gray-700/50 flex flex-col gap-0.5">
        {/* Thin coloured accent line at the very top of the footer */}
        <div
          className="absolute left-0 right-0 h-px"
          style={{
            bottom: '100%',
            background: selected
              ? 'linear-gradient(90deg, transparent, #22c55e, transparent)'
              : isDead
              ? 'linear-gradient(90deg, transparent, #ef4444, transparent)'
              : isMe
              ? 'linear-gradient(90deg, transparent, #818cf8, transparent)'
              : 'linear-gradient(90deg, transparent, #4b5563, transparent)',
          }}
        />

        <p className="text-sm font-bold text-white truncate leading-tight text-center">
          {player.username}
          {isMe && <span className="text-indigo-400 font-normal text-xs"> · me</span>}
        </p>

        <p className={`text-[10px] font-semibold tracking-widest uppercase text-center ${isDead ? 'text-red-400' : 'text-green-400'}`}>
          {isDead ? '● ELIMINATED' : '● ACTIVE'}
        </p>
      </div>
    </div>
  );
};


export default PlayerCard;

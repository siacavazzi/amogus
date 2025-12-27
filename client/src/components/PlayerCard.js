import React from "react";
import { ENDPOINT } from "../ENDPOINT";
import { Skull, Vote, Radiation, DoorOpen, UserX, Shield } from 'lucide-react';

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
  const actualRingColor = deathInfo ? deathInfo.ring : ringColor;
  
  // Build the selfie URL
  const selfieUrl = selfie ? `${ENDPOINT}/selfies/${selfie}` : null;
  
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
          alt="Player"
          className={`${sizeClasses} rounded-full object-cover ring-4 ${actualRingColor} shadow-lg ${isDead ? 'grayscale opacity-70' : ''}`}
          onError={(e) => {
            // Fallback to GIF if selfie fails to load
            e.target.onerror = null;
            if (imageCode) {
              e.target.src = require(`../imgs/${imageCode}.gif`);
            }
          }}
        />
      ) : imageCode ? (
        <img
          src={require(`../imgs/${imageCode}.gif`)}
          alt={`Profile ${imageCode}`}
          className={`${sizeClasses} rounded-full ring-4 ${actualRingColor} shadow-lg ${isDead ? 'grayscale opacity-70' : ''}`}
        />
      ) : (
        <div className={`${sizeClasses} rounded-full ring-4 ${actualRingColor} shadow-lg bg-gray-700 flex items-center justify-center ${isDead ? 'opacity-70' : ''}`}>
          <Shield size={size === 'large' ? 32 : size === 'medium' ? 24 : 16} className="text-gray-500" />
        </div>
      )}
      
      {/* Death icon overlay */}
      {isDead && DeathIcon && (
        <div className={`absolute -bottom-1 -right-1 ${iconSize.container} rounded-lg ${deathInfo.bg} ${deathInfo.border} border flex items-center justify-center`}>
          <DeathIcon size={iconSize.icon} className={deathInfo.color} />
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
  const deathInfo = isDead && player.death_cause ? getDeathInfo(player.death_cause) : null;
  
  // Determine styling based on variant
  let cardBg, cardBorder;
  if (variant === "survivor") {
    cardBg = "bg-green-500/10";
    cardBorder = "border-green-500/30";
  } else if (variant === "dead" && deathInfo) {
    cardBg = deathInfo.bg;
    cardBorder = deathInfo.border;
  } else {
    cardBg = "bg-gray-800/50";
    cardBorder = "border-gray-700/50";
  }
  
  return (
    <div className={`relative overflow-hidden flex items-center gap-3 p-3 rounded-xl border ${cardBg} ${cardBorder} backdrop-blur-sm transition-all hover:scale-[1.02]`}>
      {/* Profile picture */}
      <ProfilePicture 
        imageCode={player.pic}
        selfie={player.selfie}
        size="small"
        isDead={isDead}
        deathCause={player.death_cause}
        ringColor={variant === "survivor" ? "ring-green-500/50" : "ring-gray-500/30"}
      />
      
      {/* Player info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white truncate">
            {player.username}
          </span>
          {player.sus && (
            <span className="text-[10px] px-1.5 py-0.5 bg-red-500/30 text-red-300 rounded font-medium uppercase">
              Intruder
            </span>
          )}
        </div>
        {showDeathInfo && player.death_message && (
          <p className="text-xs text-gray-400 mt-1 break-words whitespace-normal text-left">
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
  const variantStyles = {
    default: "bg-gray-500/10 border-gray-500/30",
    survivor: "bg-green-500/10 border-green-500/30",
    intruder: "bg-red-500/10 border-red-500/30"
  };
  
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${variantStyles[variant]} border backdrop-blur-sm transition-all hover:scale-105`}>
      <ProfilePicture 
        imageCode={player.pic}
        selfie={player.selfie}
        size="tiny"
        isDead={!player.alive}
        deathCause={player.death_cause}
        ringColor={variant === "survivor" ? "ring-green-500/50" : variant === "intruder" ? "ring-red-500/50" : "ring-gray-500/30"}
      />
      <span className="text-sm font-medium text-white">
        {player.username}
      </span>
      {player.sus && variant !== "intruder" && (
        <span className="text-xs">🔪</span>
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
  return (
    <div
      onClick={isClickable ? onClick : null}
      className={`relative bg-gray-800 shadow-md rounded-xl p-4 flex flex-col items-center transition-transform transform 
              ${isClickable ? "hover:scale-105 cursor-pointer" : "opacity-50 cursor-not-allowed"}
              ${selected ? "border-4 border-green-500" : "border-2 border-transparent"}`}
    >
      <div className="mb-3">
        <ProfilePicture 
          imageCode={player.pic} 
          selfie={player.selfie}
          isDead={!player.alive}
          deathCause={player.death_cause}
        />
      </div>
      <h3 className="text-base sm:text-lg font-semibold text-gray-200 text-center truncate w-full">
        {player.username} {isMe && <span className="text-indigo-400">(me)</span>}
      </h3>
      <p
        className={`mt-1 text-xs font-medium ${player.alive ? "text-green-400" : "text-red-500"
          }`}
      >
        {player.alive ? "Alive" : "Dead"}
      </p>

      {/* Optional Votes Display */}
      {votes > 0 && (
        <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold py-1 px-2 rounded-full shadow-md">
          {votes} {votes === 1 ? "Vote" : "Votes"}
        </div>
      )}
    </div>
  );
};


export default PlayerCard;

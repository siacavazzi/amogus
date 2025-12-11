// ./components/PlayerRole.jsx

import React from 'react';
import PropTypes from 'prop-types';
import { Users, Shield, Skull } from 'lucide-react';

const PlayerRole = ({ sus, otherIntruders }) => {
  const isCrewmate = !sus;
  const displayText = isCrewmate ? 'Crewmate' : 'Intruder';

  // Colors based on role
  const borderColor = isCrewmate ? 'border-cyan-500/50' : 'border-red-500/50';
  const bgGradient = isCrewmate 
    ? 'from-gray-900 via-cyan-950/30 to-gray-900' 
    : 'from-gray-900 via-red-950/30 to-gray-900';
  const iconBg = isCrewmate ? 'bg-cyan-500/20 border-cyan-500/30' : 'bg-red-500/20 border-red-500/30';
  const iconColor = isCrewmate ? 'text-cyan-400' : 'text-red-400';
  const accentBg = isCrewmate ? 'via-cyan-500' : 'via-red-500';
  const subtitleColor = isCrewmate ? 'text-cyan-300/70' : 'text-red-300/70';

  return (
    <div className={`relative overflow-hidden rounded-2xl border ${borderColor} bg-gradient-to-r ${bgGradient} shadow-lg my-4`}>
      {/* Animated background pulse */}
      <div className={`absolute inset-0 ${isCrewmate ? 'bg-cyan-500/5' : 'bg-red-500/10'} animate-pulse`} />
      
      <div className="relative flex items-center gap-4 p-5">
        {/* Icon */}
        <div className={`flex-shrink-0 w-14 h-14 rounded-xl ${iconBg} border flex items-center justify-center`}>
          {isCrewmate ? (
            <Shield size={28} className={iconColor} />
          ) : (
            <Skull size={28} className={iconColor} />
          )}
        </div>

        {/* Role info */}
        <div className="flex-1">
          <p className="text-xl font-bold text-white">{displayText}</p>
          <p className={`text-sm ${subtitleColor}`}>
            {isCrewmate ? 'Complete tasks to win' : 'Eliminate the crew'}
          </p>
        </div>
      </div>

      {/* Other intruders section */}
      {!isCrewmate && Array.isArray(otherIntruders) && otherIntruders.length > 0 && (
        <div className="relative px-5 pb-4">
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <Users size={16} className="text-red-400" />
            <span className="text-sm text-red-300">
              <span className="font-medium">Allies: </span>
              {otherIntruders.map((player, idx) => (
                <span key={player.username}>
                  {player.username}
                  {idx < otherIntruders.length - 1 ? ', ' : ''}
                </span>
              ))}
            </span>
          </div>
        </div>
      )}
      
      {/* Bottom accent line */}
      <div className={`h-1 bg-gradient-to-r from-transparent ${accentBg} to-transparent`} />
    </div>
  );
};

PlayerRole.propTypes = {
  sus: PropTypes.bool.isRequired,
  otherIntruders: PropTypes.arrayOf(
    PropTypes.shape({
      username: PropTypes.string.isRequired,
    })
  ),
};

export default PlayerRole;
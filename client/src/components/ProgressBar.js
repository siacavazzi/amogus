// src/components/ProgressBar.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { Target, Skull } from 'lucide-react';

const ProgressBar = ({ score, goalScore, sus }) => {
  // Calculate percentage
  let percentage = (score / goalScore) * 100;
  if (isNaN(percentage)) {
    percentage = 0;
  } else {
    percentage = Math.max(0, Math.min(Math.round(percentage), 100));
  }

  const isComplete = percentage >= 100;
  
  // Theme based on role - keeping them visually similar
  const theme = sus
    ? {
        gradient: 'from-red-500 via-orange-500 to-red-400',
        glowColor: 'shadow-red-500/30',
        accentColor: 'text-red-400',
        icon: Skull,
        message: 'Eliminate Crew',
      }
    : {
        gradient: 'from-cyan-500 via-emerald-500 to-cyan-400',
        glowColor: 'shadow-emerald-500/30',
        accentColor: 'text-cyan-400',
        icon: Target,
        message: 'Complete Tasks',
      };

  const Icon = theme.icon;

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700/50">
      <div className="max-w-lg mx-auto px-3 py-1.5 flex items-center gap-3">
        {/* Icon and Message */}
        <div className={`flex items-center gap-1.5 ${theme.accentColor}`}>
          <Icon size={12} className={isComplete ? 'animate-pulse' : ''} />
          <span className="text-xs font-medium whitespace-nowrap">{theme.message}</span>
        </div>

        {/* Progress Container */}
        <div className="flex-grow">
          <div
            className="w-full h-2 rounded-full bg-gray-800 overflow-hidden"
            role="progressbar"
            aria-valuenow={score}
            aria-valuemin="0"
            aria-valuemax={goalScore}
            aria-label={`Progress: ${percentage}%`}
          >
            {/* Progress fill */}
            <div
              className={`h-full bg-gradient-to-r ${theme.gradient} transition-all duration-500 ease-out rounded-full ${
                isComplete ? `shadow-lg ${theme.glowColor}` : ''
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Percentage */}
        <span className="text-xs font-mono text-gray-400 w-8 text-right">
          {percentage}%
        </span>
      </div>
    </div>
  );
};

ProgressBar.propTypes = {
  score: PropTypes.number.isRequired,
  goalScore: PropTypes.number.isRequired,
  sus: PropTypes.bool,
};

ProgressBar.defaultProps = {
  sus: false,
};

export default ProgressBar;

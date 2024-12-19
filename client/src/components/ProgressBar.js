// src/components/ProgressBar.jsx
import React from 'react';
import PropTypes from 'prop-types';

const ProgressBar = ({ score, goalScore, sus }) => {
  // Calculate percentage
  let percentage = (score / goalScore) * 100;
  if (isNaN(percentage)) {
    percentage = 0;
  } else {
    percentage = Math.max(0, Math.min(Math.round(percentage), 100));
  }

  const progressGradient = sus
    ? 'from-red-500 via-pink-500 to-red-500'
    : 'from-green-400 via-green-500 to-green-400';

  const message = sus ? 'Eliminate Crew' : 'Complete Tasks';

  return (
    <div className="fixed top-0 w-full z-50 bg-gray-900">
      <div className="max-w-md mx-auto px-2 py-1 flex items-center space-x-2 text-xs text-gray-300">
        {/* Message */}
        <span className="whitespace-nowrap">{message}</span>

        {/* Progress Container */}
        <div
          className="flex-grow bg-gray-700 h-3 rounded overflow-hidden"
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin="0"
          aria-valuemax={goalScore}
          aria-label={`Progress: ${percentage}%`}
        >
          <div
            className={`h-full bg-gradient-to-r ${progressGradient} transition-all duration-500 ease-in-out`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Percentage */}
        <span className="text-gray-400">{percentage}%</span>
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

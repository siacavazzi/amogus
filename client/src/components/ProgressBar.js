// src/components/ProgressBar.jsx

import React from 'react';
import PropTypes from 'prop-types';

const ProgressBar = ({ score, goalScore, sus }) => {
  // Calculate percentage
  let percentage = (score / goalScore) * 100;

  console.log(`Score: ${score}, Goal: ${goalScore}, Percent: ${percentage}`);

  // Handle edge cases: NaN, less than 0, greater than 100
  if (isNaN(percentage)) {
    percentage = 0;
  } else {
    percentage = Math.max(0, Math.min(Math.round(percentage), 100));
  }

  // Determine progress bar gradient based on 'sus' status
  const progressGradient = sus
    ? 'from-red-500 via-pink-500 to-red-500'
    : 'from-green-400 via-green-500 to-green-400';

  // Determine message based on role
  const message = sus
    ? 'Eliminate all players before they complete the tasks.'
    : 'Complete the progress bar or remove the imposters before getting eliminated.';

  return (
    <div className="w-full max-w-md mx-auto p-4 bg-gray-900 rounded-none shadow-md">
      {/* Message */}
      <div className="mb-2">
        <p className="text-sm font-medium text-gray-300 dark:text-gray-400">
          {message}
        </p>
      </div>

      {/* Progress Bar */}
      <div
        className="w-full bg-gray-700 dark:bg-gray-800 h-4 overflow-hidden shadow-inner"
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin="0"
        aria-valuemax={goalScore}
        aria-label={`Progress: ${percentage} percent`}
      >
        <div
          className={`h-full bg-gradient-to-r ${progressGradient} transition-all duration-500 ease-in-out`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>

      {/* Percentage Display */}
      <div className="mt-2 text-center text-sm text-gray-400 dark:text-gray-500">
        {percentage}%
      </div>
    </div>
  );
};

ProgressBar.propTypes = {
  score: PropTypes.number.isRequired,
  goalScore: PropTypes.number.isRequired,
  sus: PropTypes.bool, // Optional prop
};

ProgressBar.defaultProps = {
  sus: false,
};

export default ProgressBar;

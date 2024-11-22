// ProgressBar.jsx
import React from 'react';
import PropTypes from 'prop-types';
import './ProgressBar.css'; // Import the CSS for ProgressBar

const ProgressBar = ({ score, goalScore, sus }) => {
  // Calculate percentage
  let percentage = (score / goalScore) * 100;

  console.log(`Score: ${score}, Goal: ${goalScore}, Percent: ${percentage}`)

  // Handle edge cases
  if (percentage < 0) percentage = 0;
  if (percentage > 100) percentage = 100;

  // Determine progress bar color
  const progressColor = sus ? '#ff4757' : '#2ed573'; // Red if sus, Green otherwise

  // Determine message based on role
  const message = sus
    ? 'Kill all players before they complete the bar'
    : 'Complete the progress bar or remove the imposters before getting killed';

  return (
    <div className="progress-bar-container">
      <div
        className="progress-bar"
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin="0"
        aria-valuemax={goalScore}
        aria-label={`Progress: ${percentage.toFixed(1)} percent`}
      >
        <div
          className="progress-bar-fill"
          style={{ width: `${percentage}%`, backgroundColor: progressColor }}
        ></div>
      </div>
      <div className="progress-bar-text">
        {score} / {goalScore} ({percentage.toFixed(1)}%)
      </div>
      <div className="progress-bar-message">
        {message}
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

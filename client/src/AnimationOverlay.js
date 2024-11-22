// ./components/AnimationOverlay.jsx

import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import './AnimationOverlay.css';

const AnimationOverlay = ({ onComplete }) => {
  useEffect(() => {
    console.log('AnimationOverlay mounted');
    const timer = setTimeout(() => {
      console.log('AnimationOverlay timer completed');
      onComplete();
    }, 800); // 0.8 seconds

    return () => {
      console.log('AnimationOverlay unmounted');
      clearTimeout(timer);
    };
  }, [onComplete]);

  return (
    <div className="animation-overlay">
      <div className="checkmark-container">
        <svg
          className="checkmark"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 52 52"
        >
          <path
            className="checkmark-check"
            fill="none"
            d="M16 27l7 7 13-13"
          />
        </svg>
      </div>
      <p className="animation-message">Task Completed!</p>
    </div>
  );
};

AnimationOverlay.propTypes = {
  onComplete: PropTypes.func.isRequired,
};

export default AnimationOverlay;

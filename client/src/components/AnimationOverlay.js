// ./components/AnimationOverlay.jsx

import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Confetti } from '../signal';

// Task done: a white wipe follows the swipe, a check draws itself, then the wipe moves on
// and the next task drops in underneath. Crewmates and intruders see the same thing.
const AnimationOverlay = ({ onComplete }) => {
  const [leaving, setLeaving] = useState(false);
  const onCompleteRef = useRef(onComplete);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const leaveTimer = setTimeout(() => setLeaving(true), 1100);
    const completeTimer = setTimeout(() => {
      if (!hasCompletedRef.current) {
        hasCompletedRef.current = true;
        onCompleteRef.current();
      }
    }, 1500);
    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(completeTimer);
    };
  }, []);

  return (
    <div
      className={`sg-layer ${leaving ? 'sg-wipe-out' : 'sg-wipe-in'}`}
      style={{ background: '#fff', color: 'var(--sg-round)', pointerEvents: 'none', zIndex: 9999 }}
      role="status"
    >
      <div className="sg-center" style={{ height: '100%' }}>
        <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
          <path
            className="sg-draw"
            d="M28 62 L52 86 L94 36"
            fill="none"
            stroke="currentColor"
            strokeWidth="14"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength="1"
          />
        </svg>
        <p className="sg-big sg-h2 sg-a sg-pop" style={{ animationDelay: '420ms', animationDuration: '360ms' }}>
          Done
        </p>
      </div>
      <Confetti colors={['#1b4fd8', '#ffc21a', '#18171d', '#1b4fd8']} />
    </div>
  );
};

AnimationOverlay.propTypes = {
  onComplete: PropTypes.func.isRequired,
};

export default AnimationOverlay;

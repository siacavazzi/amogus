// src/components/ProgressBar.jsx
import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { DataContext } from '../GameContext';
import '../signal/signal.css';

// The crew's task progress across the top of every game screen. Crewmates and intruders
// see exactly the same bar, so a glance at a phone never gives a role away.
const ProgressBar = ({ score, goalScore }) => {
  const { meetingState } = useContext(DataContext) || {};
  let percentage = (score / goalScore) * 100;
  if (isNaN(percentage)) {
    percentage = 0;
  } else {
    percentage = Math.max(0, Math.min(Math.round(percentage), 100));
  }

  const isComplete = percentage >= 100;
  // Meeting screens are yellow, so the bar switches to ink there.
  const onYellow = meetingState?.stage === 'waiting' || meetingState?.stage === 'voting';
  const fg = onYellow ? 'var(--sg-ink)' : '#fff';

  return (
    <div
      className="sg fixed top-0 left-0 z-40 pointer-events-none"
      style={{ right: 64, paddingTop: 'calc(env(safe-area-inset-top, 0px) + 22px)', paddingLeft: 20, color: fg }}
    >
      <div className="max-w-lg flex items-center gap-2.5" style={{ fontWeight: 700, fontSize: 14 }}>
        <span>Tasks</span>
        <div
          className="flex-grow overflow-hidden"
          style={{ height: 8, borderRadius: 8, background: onYellow ? 'rgba(26,20,0,0.18)' : 'rgba(255,255,255,0.25)' }}
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin="0"
          aria-valuemax={goalScore}
          aria-label={`Progress: ${percentage}%`}
        >
          <div
            className="h-full"
            style={{ width: `${percentage}%`, transition: 'width 0.7s cubic-bezier(.34,1.56,.64,1)' }}
          >
            <div
              key={score}
              className={`h-full ${score > 0 ? 'sg-bounce' : ''}`}
              data-complete={isComplete || undefined}
              style={{ background: fg, borderRadius: 8, transformOrigin: 'left center' }}
            />
          </div>
        </div>
        <span className="sg-num" style={{ minWidth: '3.2ch', textAlign: 'right' }}>
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

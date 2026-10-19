import React, { useEffect, useState, useRef } from 'react';

/**
 * FakeTaskReveal - A dramatic reveal animation when a player completes a fake task
 * Shows them they were tricked by an intruder
 */
const FakeTaskReveal = ({ task, location, onComplete }) => {
  const [phase, setPhase] = useState('glitch'); // 'glitch', 'reveal', 'exit'
  const onCompleteRef = useRef(onComplete);
  const hasCompletedRef = useRef(false);

  // Keep the ref updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Phase transitions - longer display time
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('reveal'), 500),
      setTimeout(() => setPhase('exit'), 2500),
      setTimeout(() => {
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true;
          onCompleteRef.current?.();
        }
      }, 3000),
    ];

    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  // A private moment: the phone stays blue, the task gets struck out and the phone shakes.
  return (
    <div
      className="sg-layer sg-round"
      style={{ zIndex: 9999, pointerEvents: 'none', opacity: phase === 'exit' ? 0 : 1, transition: 'opacity .4s' }}
      role="alert"
    >
      <div className={`sg-center ${phase === 'reveal' ? 'sg-nudge' : ''}`} style={{ height: '100%', padding: 24 }}>
        {task && (
          <p className="sg-big sg-h3" style={{ maxWidth: '16ch', textDecoration: phase === 'glitch' ? 'none' : 'line-through', textDecorationThickness: 5, opacity: 0.85 }}>
            {task}
          </p>
        )}
        {location && <p className="sg-small">{location}</p>}
        <h1 className="sg-big sg-h1" style={{ marginTop: 18, opacity: phase === 'glitch' ? 0 : 1, transform: phase === 'glitch' ? 'scale(1.6)' : 'none', transition: 'all .28s cubic-bezier(.5,0,.2,1)' }}>
          FAKE TASK!
        </h1>
        <p className="sg-lede" style={{ opacity: phase === 'glitch' ? 0 : 0.9, transition: 'opacity .3s .2s' }}>
          An intruder sent you on that one. No points awarded.
        </p>
      </div>
    </div>
  );
};

export default FakeTaskReveal;

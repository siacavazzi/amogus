import React, { useEffect, useState, useRef } from 'react';
import { t } from '../i18n';
import { vibrate } from '../signal';

const STAMP_MS = 500;
const TEAR_MS = 1350;
const EXIT_MS = 2500;
const DONE_MS = 3000;

// Each torn half draws the whole card and shows only its own side, so the ink splats tear too.
function CardFace({ task, location, inked }) {
  return (
    <>
      {location && <p className="sg-fake__where">{location}</p>}
      {task && <p className="sg-fake__task">{task}</p>}
      {inked && (
        <>
          <span className="sg-fake__ink" style={{ left: '8%', top: '16%' }} aria-hidden="true" />
          <span className="sg-fake__ink" style={{ right: '10%', bottom: '12%', width: 8, height: 8 }} aria-hidden="true" />
          <span className="sg-fake__ink" style={{ right: '22%', top: '8%', width: 6, height: 6 }} aria-hidden="true" />
        </>
      )}
    </>
  );
}

/**
 * FakeTaskReveal - shown when a player finishes a fake task: the task they just did gets a
 * red FAKE TASK stamp slammed on it, then the card rips in two and falls away.
 * A private moment: the phone stays blue so nobody nearby learns anything from the colour.
 */
const FakeTaskReveal = ({ task, location, onComplete }) => {
  const [phase, setPhase] = useState('card'); // 'card' -> 'stamped' -> 'torn' -> 'exit'
  const onCompleteRef = useRef(onComplete);
  const hasCompletedRef = useRef(false);

  // Keep the ref updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const timers = [
      setTimeout(() => {
        setPhase('stamped');
        vibrate([30, 40, 90]);
      }, STAMP_MS),
      setTimeout(() => setPhase('torn'), TEAR_MS),
      setTimeout(() => setPhase('exit'), EXIT_MS),
      setTimeout(() => {
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true;
          onCompleteRef.current?.();
        }
      }, DONE_MS),
    ];

    return () => timers.forEach(id => clearTimeout(id));
  }, []);

  const stamped = phase !== 'card';
  // Longer words ("FALSCHE AUFGABE!") shrink so the stamp stays on the phone.
  const stampText = t('FAKE TASK!');
  const len = Math.max(8, String(stampText).length);
  const stampSize = `clamp(24px, ${(130 / len).toFixed(1)}vw, ${Math.min(50, Math.floor(520 / len))}px)`;
  const torn = phase === 'torn' || phase === 'exit';

  return (
    <div
      className="sg-layer sg-round"
      style={{ zIndex: 9999, pointerEvents: 'none', opacity: phase === 'exit' ? 0 : 1, transition: 'opacity .4s' }}
      role="alert"
    >
      <div className="sg-center" style={{ height: '100%', padding: 24, gap: 22 }}>
        <div className={`sg-fake sg-a sg-rise${stamped ? ' is-stamped' : ''}${torn ? ' is-torn' : ''}`} data-testid="fake-task-card">
          <div className="sg-fake__half sg-fake__half--l"><CardFace task={task} location={location} inked={stamped} /></div>
          <div className="sg-fake__half sg-fake__half--r" aria-hidden="true"><CardFace task={task} location={location} inked={stamped} /></div>
          {stamped && <h1 className="sg-fake__stamp" style={{ fontSize: stampSize }}>{stampText}</h1>}
        </div>
        <p
          className={`sg-lede${torn ? ' sg-fake__line' : ''}`}
          style={{ maxWidth: '24ch', opacity: torn ? 0.95 : 0 }}
        >
          {t('An intruder sent you on that one. No points awarded.')}
        </p>
      </div>
    </div>
  );
};

export default FakeTaskReveal;

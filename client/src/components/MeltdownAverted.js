import React from 'react';
import { ShieldCheck } from '../signal/icons';
import { Words } from '../signal';
import '../signal/reactor.css';

// The meltdown handoff: once the last code lands, the reactor floods white for a moment of
// relief, then settles back to the round's blue. ReactorPage shows it right after a meltdown
// that MeltdownPage saw end in success.
let avertedAt = 0;
export function markMeltdownAverted() {
  avertedAt = Date.now();
}
// Non-destructive so a double-run state initialiser (React StrictMode) still sees it.
export function wasMeltdownJustAverted(withinMs = 6000) {
  return !!avertedAt && Date.now() - avertedAt < withinMs;
}
export function clearMeltdownAverted() {
  avertedAt = 0;
}

const MeltdownAvertedDisplay = ({ message = "Meltdown Averted!" }) => {
  return (
    <div className="sg sg-screen sg-rx sg-rx--relief sg-flood" role="status" style={{ zIndex: 70 }}>
      <div className="sg-rx__main">
        <ShieldCheck size={140} className="sg-a sg-pop" style={{ animationDelay: '300ms' }} />
        <h1 className="sg-rx__meet">
          <Words text={message.replace(/!$/, '').toUpperCase()} delay={420} />
        </h1>
        <p className="sg-rx__lede sg-a sg-rise" style={{ animationDelay: '800ms' }}>
          The reactor is safe. Back to your tasks.
        </p>
      </div>
    </div>
  );
};

export default MeltdownAvertedDisplay;

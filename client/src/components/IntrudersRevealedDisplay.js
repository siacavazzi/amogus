import React from 'react';
import { Skull, ShieldAlert } from '../signal/icons';
import { Face, Words } from '../signal';
import '../signal/reactor.css';

/**
 * IntrudersRevealedDisplay - the red moment when tasks reach 100% and the intruders are named.
 * On the reactor it fills the screen; pass `players` so the names get their faces.
 */
const IntrudersRevealedDisplay = ({ intruderNames = [], isIntruder = false, players = [], children }) => {
  if (isIntruder) {
    // Special display for intruders - they've been exposed!
    return (
      <div className="sg sg-screen sg-out sg-rx sg-flood" role="status">
        <div className="sg-rx__main">
          <ShieldAlert size={120} className="sg-a sg-pop" style={{ animationDelay: '300ms' }} />
          <h1 className="sg-rx__meet"><Words text="LOCKED OUT" delay={400} /></h1>
          <p className="sg-rx__lede">All systems compromised. Eliminate remaining crew immediately!</p>
          <div className="sg-row">
            <span className="sg-pill">VENTS DISABLED</span>
            <span className="sg-pill">IDENTITY EXPOSED</span>
          </div>
        </div>
        {children && <div className="sg-rx__foot">{children}</div>}
      </div>
    );
  }

  const faces = intruderNames.map((name) => players.find((p) => p.username === name) || { username: name });

  return (
    <div className="sg sg-screen sg-out sg-rx sg-flood" role="status">
      <div className="sg-rx__main">
        <p className="sg-rx__label sg-a sg-rise" style={{ animationDelay: '250ms' }}>Tasks complete</p>
        <h1 className="sg-rx__meet sg-rx__reveal-title">
          <Words text={intruderNames.length > 1 ? 'THE INTRUDERS ARE' : 'THE INTRUDER IS'} delay={380} />
        </h1>
        <div className="sg-rx__names" style={{ marginTop: 'clamp(6px, 2vh, 24px)' }}>
          {faces.map((player, index) => (
            <div key={player.username || index} className="sg-rx__name sg-a sg-pop" style={{ animationDelay: `${900 + index * 160}ms` }}>
              {player.pic !== undefined || player.selfie ? (
                <Face player={player} size={168} style={{ boxShadow: '0 0 0 6px #fff' }} />
              ) : (
                <Skull size={96} />
              )}
              <b>{player.username}</b>
            </div>
          ))}
        </div>
        <p className="sg-rx__lede sg-a sg-rise" style={{ animationDelay: '1300ms' }}>
          Find them and vote them out!
        </p>
      </div>
      {children && <div className="sg-rx__foot">{children}</div>}
    </div>
  );
};

export default IntrudersRevealedDisplay;

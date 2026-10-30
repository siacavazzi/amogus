// src/components/MeetingDisplay.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { Check } from '../signal/icons';
import { Face, Words } from '../signal';
import '../signal/reactor.css';
import { readyNeeded } from '../utils/meetingQuorum';

// The reactor's meeting screen: the same yellow flood the phones get, with the roll call big
// enough to read from across the room. The moving stripes are the one thing in motion.
const MeetingDisplay = ({ message = "Meeting called", stage = 'waiting', callerName, hostName, meeting, players = [], children }) => {
  const alive = players.filter((p) => p.alive !== false);
  // Someone offline past the server's grace period isn't waited for.
  const present = alive.filter((p) => !p.absent);
  const isReady = (p) => p.active !== false && p.ready;
  const readyCount = present.filter(isReady).length;
  const needed = readyNeeded(meeting, present.length);
  const caller = callerName ? players.find((p) => p.username === callerName) : undefined;
  const voting = stage === 'voting';

  return (
    <>
      <div className="sg-screen sg-round" aria-hidden="true" />
      <div className="sg sg-screen sg-meet sg-flood sg-rx" style={{ '--fy': '50%' }} role="status">
        <div className="sg-stripes" />
        <div className="sg-rx__main">
          <h1 className="sg-rx__meet">
            <Words text="EMERGENCY" delay={380} />
            <br />
            <Words text="MEETING" delay={520} />
          </h1>

          <div className="sg-a sg-rise" style={{ display: 'flex', alignItems: 'center', gap: 18, animationDelay: '800ms' }}>
            {caller && <Face player={caller} size={84} className="sg-a sg-pop" style={{ animationDelay: '820ms' }} />}
            <div style={{ textAlign: caller ? 'left' : 'center' }}>
              <p className="sg-rx__lede">{callerName ? `${callerName} called it` : message}</p>
              <p className="sg-rx__note">
                {voting ? 'Voting is open' : 'Everyone to the meeting spot, then slide ready'}
              </p>
            </div>
          </div>

          {alive.length > 0 && (
            <div className="sg-rx__roll sg-a sg-fade" style={{ marginTop: 'clamp(6px, 2vh, 22px)', animationDelay: '1000ms' }}>
              {alive.map((player) => {
                const ready = voting || isReady(player);
                return (
                  <div key={player.player_id || player.id || player.username} className="sg-rx__face">
                    <div style={{ position: 'relative' }}>
                      <Face player={player} size={104} style={{ opacity: ready ? 1 : 0.35, transition: 'opacity .3s' }} />
                      {ready && !voting && (
                        <span key="ok" className="sg-rx__tick sg-a sg-pop">
                          <Check size={18} strokeWidth={4} />
                        </span>
                      )}
                    </div>
                    <span style={{ opacity: ready ? 1 : 0.6 }}>{player.username}</span>
                  </div>
                );
              })}
            </div>
          )}

          {voting && (
            <p className="sg-rx__alert sg-a sg-pop" style={{ background: 'var(--sg-ink)', color: 'var(--sg-meet)', fontSize: 'clamp(20px, 2.4vw, 34px)', padding: '14px 28px' }}>
              VOTE ON YOUR PHONES
            </p>
          )}

          {!voting && alive.length > 0 && (
            <p className="sg-rx__lede sg-num" data-testid="reactor-ready-count">
              {readyCount >= needed ? 'Everyone is here. Voting opens.' : `${readyCount} of ${present.length} ready`}
            </p>
          )}

          {!voting && readyCount < needed && needed < present.length && (
            <p className="sg-rx__note" data-testid="reactor-ready-needed">Voting opens at {needed} ready</p>
          )}

          {!voting && hostName && readyCount < needed && (
            <p className="sg-rx__note" data-testid="reactor-host-can-start">
              Stuck? {hostName} is the host and can start the vote from their phone.
            </p>
          )}
        </div>
        {children && <div className="sg-rx__foot">{children}</div>}
      </div>
    </>
  );
};

MeetingDisplay.propTypes = {
  message: PropTypes.string,
  stage: PropTypes.string,
  callerName: PropTypes.string,
  hostName: PropTypes.string,
  meeting: PropTypes.object,
  players: PropTypes.array,
  children: PropTypes.node,
};

export default MeetingDisplay;

import React, { useContext, useEffect, useRef, useState } from 'react';
import { DataContext } from '../GameContext';
import { t, tn } from '../i18n';

// A big room never gets every phone to slide ready. After a short wait the host
// (and only the host) can open voting without the stragglers. Everyone else is
// told who can, so the room knows to shout at the host rather than wait forever.
const HostStartVoting = ({ dark = false }) => {
  const { isRoomCreator, meetingState, players, socket, playerState, roundId, connected } = useContext(DataContext);
  const meetingId = meetingState?.id;
  const waitSeconds = meetingState?.host_override_in;
  const [readyAt, setReadyAt] = useState(() => (waitSeconds == null ? null : Date.now() + waitSeconds * 1000));
  const [, setTick] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [sent, setSent] = useState(false);
  const confirmTimer = useRef(null);

  // The server says how long is left, so phone clocks never need to agree.
  useEffect(() => {
    if (waitSeconds === null || waitSeconds === undefined) return;
    setReadyAt(Date.now() + waitSeconds * 1000);
    setSent(false);
    setConfirming(false);
  }, [meetingId, waitSeconds]);

  useEffect(() => {
    const tick = setInterval(() => setTick((n) => n + 1), 500);
    return () => {
      clearInterval(tick);
      clearTimeout(confirmTimer.current);
    };
  }, []);

  if (!meetingState || meetingState.stage !== 'waiting') return null;

  const present = (players || []).filter((p) => p.alive && !p.absent);
  const waitingOn = present.filter((p) => !p.ready).length;
  if (waitingOn === 0) return null;

  const secondsLeft = readyAt ? Math.max(0, Math.ceil((readyAt - Date.now()) / 1000)) : 0;
  const hostName = meetingState.host_name;

  if (!isRoomCreator) {
    if (secondsLeft > 0 || !hostName) return null;
    return (
      <p data-testid="host-can-start-voting" className="sg-small" style={{ maxWidth: '28ch' }}>
        {t('Stuck? {hostName} is the host and can start the vote.', { hostName })}
      </p>
    );
  }

  const handleTap = () => {
    if (!confirming) {
      setConfirming(true);
      clearTimeout(confirmTimer.current);
      confirmTimer.current = setTimeout(() => setConfirming(false), 5000);
      return;
    }
    clearTimeout(confirmTimer.current);
    setConfirming(false);
    setSent(true);
    socket.emit('host_start_voting', {
      player_id: playerState?.player_id || playerState?.playerId || localStorage.getItem('player_id'),
      round_id: meetingState?.round_id || roundId,
      meeting_id: meetingId,
    }, (result) => {
      if (!result?.ok) setSent(false);
    });
  };

  const waiting = secondsLeft > 0;
  let label = t('Start voting now');
  if (waiting) label = t('Start voting in {seconds}s', { seconds: secondsLeft });
  else if (sent) label = t('Starting the vote...');
  else if (confirming) label = tn(waitingOn, 'Tap again to vote without {count} player', 'Tap again to vote without {count} players');

  return (
    <div className="w-full max-w-sm" style={{ display: 'grid', gap: 6, justifyItems: 'center' }}>
      <button
        type="button"
        data-testid="host-start-voting"
        className={`sg-btn ${confirming ? (dark ? 'sg-btn-white' : 'sg-btn-ink') : (dark ? 'sg-btn-ghost' : 'sg-btn-line')}`}
        style={dark && !confirming ? { background: 'rgba(255,255,255,0.12)' } : undefined}
        onClick={handleTap}
        disabled={waiting || sent || !connected}
      >
        {label}
      </button>
      <span className="sg-small" style={{ opacity: 0.75 }}>
        {t('Host only. Starts the vote even if some people haven\'t slid to ready.')}
      </span>
    </div>
  );
};

export default HostStartVoting;

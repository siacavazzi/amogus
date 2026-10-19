import React, { useContext, useEffect, useMemo, useState } from 'react';
import { DataContext } from '../GameContext';
import MUECustomSlider from '../components/swiper';
import LeaveGameButton from '../components/LeaveGameButton';
import { Check } from '../signal/icons';
import { Face, Words, takeOrigin, vibrate } from '../signal';

// Every phone floods yellow at once: the meeting is the loudest moment in the game.
const MeetingWaitingPage = ({ tutorialMode = false, tutorialHighlightTarget = null }) => {
  const { playerState, players, meetingState, socket, roundId, connected } = useContext(DataContext);
  const highlightReadySlider = tutorialMode && tutorialHighlightTarget === 'ready-slider';
  const [origin] = useState(() => takeOrigin());

  useEffect(() => {
    vibrate([120, 60, 120]);
  }, []);

  const alive = useMemo(() => players.filter((p) => p.alive), [players]);
  const isReady = (p) => p.active !== false && p.ready;
  const readyCount = alive.filter(isReady).length;
  const totalAlive = alive.length;
  const allReady = totalAlive > 0 && readyCount === totalAlive;
  const caller = players.find((p) => p.username === meetingState?.player_who_started_it);

  const handleReadyUp = () => {
    socket.emit('ready', {
      player_id: playerState?.player_id || playerState?.playerId || localStorage.getItem('player_id'),
      round_id: meetingState?.round_id || roundId,
      meeting_id: meetingState?.id || meetingState?.meeting_id,
    });
  };

  const handleImDead = () => {
    if(!window.confirm('Are you sure you want to mark yourself as dead?')) {
      return;
    }
    if (socket) {
      socket.emit('player_dead', {
        player_id: playerState?.player_id || playerState?.playerId || localStorage.getItem('player_id'),
        round_id: meetingState?.round_id || roundId,
        meeting_id: meetingState?.id || meetingState?.meeting_id,
      });
    }
  };

  const meReady = playerState.ready && playerState.active !== false;

  return (
    <>
    {/* The round's blue stays underneath while the yellow floods out over it */}
    <div className="sg-screen sg-round" aria-hidden="true" />
    <div
      className="sg-screen sg-meet sg-flood"
      style={{ '--fx': origin.fx, '--fy': origin.fy, paddingBottom: meReady ? 24 : 130 }}
    >
      <div className="sg-stripes" />
      {!tutorialMode && <LeaveGameButton className="sg-corner" />}

      <div className="sg-shake sg-center" style={{ animationDelay: '700ms', gap: 16, paddingTop: 12 }}>
        <h1 className="sg-big sg-h1">
          <Words text="EMERGENCY" delay={420} />
          <br />
          <Words text="MEETING" delay={560} />
        </h1>

        {caller ? (
          <Face player={caller} size={104} className="sg-a sg-pop" style={{ animationDelay: '820ms' }} />
        ) : null}
        <p className="sg-lede sg-a sg-rise" style={{ animationDelay: '1000ms' }}>
          {meetingState.player_who_started_it} called it
        </p>
        <p className="sg-small sg-a sg-rise" style={{ animationDelay: '1090ms' }}>
          Go to the meeting spot, then slide ready
        </p>

        {/* Roll call: everyone alive, filling in as they get there */}
        <div className="sg-row sg-a sg-fade" style={{ gap: 14, marginTop: 10, animationDelay: '1200ms' }}>
          {alive.map((player) => {
            const ready = isReady(player);
            return (
              <div key={player.player_id || player.id} className="flex flex-col items-center" style={{ width: 64, gap: 4 }}>
                <div style={{ position: 'relative' }}>
                  <Face player={player} size={52} style={{ opacity: ready ? 1 : 0.35, transition: 'opacity .3s' }} />
                  {ready && (
                    <span
                      key="ok"
                      className="sg-a sg-pop"
                      style={{ position: 'absolute', right: -4, bottom: -4, width: 22, height: 22, borderRadius: 11, background: 'var(--sg-ink)', color: 'var(--sg-meet)', display: 'grid', placeItems: 'center' }}
                    >
                      <Check size={14} strokeWidth={4} />
                    </span>
                  )}
                </div>
                <span style={{ fontWeight: 700, fontSize: 13, maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: ready ? 1 : 0.6 }}>
                  {player.username}
                </span>
                {player.active === false && (
                  <span style={{ fontWeight: 700, fontSize: 11, opacity: 0.6 }}>Offline</span>
                )}
              </div>
            );
          })}
        </div>

        <p data-testid="ready-count" className="sg-lede sg-num" style={{ marginTop: 4 }}>
          {allReady ? 'Everyone is here. Voting opens.' : `${readyCount} of ${totalAlive} ready`}
        </p>

        {meReady && <p className="sg-small">You're ready</p>}

        <button type="button" className="sg-link" onClick={handleImDead}>
          I've Been Killed
        </button>
      </div>

      {!playerState.ready && (
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <div
            className={highlightReadySlider ? 'animate-pulse' : ''}
            style={highlightReadySlider ? { borderRadius: 999, outline: '4px solid var(--sg-ink)', outlineOffset: -8 } : {}}
          >
            <MUECustomSlider text="Slide when you're there" tone="meet" onSuccess={handleReadyUp} disabled={!connected} />
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default MeetingWaitingPage;

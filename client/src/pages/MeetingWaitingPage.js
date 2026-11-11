import React, { useContext, useEffect, useMemo, useState } from 'react';
import { emitAsPlayer } from '../utils/playerCommand';
import { DataContext } from '../GameContext';
import MUECustomSlider from '../components/swiper';
import LeaveGameButton from '../components/LeaveGameButton';
import HostStartVoting from '../components/HostStartVoting';
import { readyNeeded } from '../utils/meetingQuorum';
import { Check, Skull } from '../signal/icons';
import { Face, Words, takeOrigin, vibrate } from '../signal';
import { t } from '../i18n';

// Every phone floods yellow at once: the meeting is the loudest moment in the game.
const MeetingWaitingPage = ({ tutorialMode = false, tutorialHighlightTarget = null }) => {
  const game = useContext(DataContext);
  const { playerState, players, meetingState, socket, roundId, connected } = game;
  const highlightReadySlider = tutorialMode && tutorialHighlightTarget === 'ready-slider';
  const [origin] = useState(() => takeOrigin());

  useEffect(() => {
    vibrate([120, 60, 120]);
  }, []);

  const alive = useMemo(() => players.filter((p) => p.alive), [players]);
  // A phone that drops after sliding stays ready on the server, so it counts here too.
  const isReady = (p) => Boolean(p.ready);
  // Someone offline past the server's grace period isn't waited for, so they don't count here.
  const present = alive.filter((p) => !p.absent);
  const readyCount = present.filter(isReady).length;
  const totalAlive = present.length;
  const needed = readyNeeded(meetingState, totalAlive);
  const allReady = totalAlive > 0 && readyCount >= needed;
  const caller = players.find((p) => p.username === meetingState?.player_who_started_it);
  // Finishing the task goal calls this meeting on its own, so nobody "called it".
  const tasksDone = meetingState?.trigger === 'tasks_complete';

  const handleReadyUp = () => {
    const playerId = playerState?.player_id || playerState?.playerId || localStorage.getItem('player_id');
    const payload = {
      player_id: playerId,
      round_id: meetingState?.round_id || roundId,
      meeting_id: meetingState?.id || meetingState?.meeting_id,
    };
    // On prod 26 ready slides came from a socket that had reconnected but never rejoined, and
    // the server threw them away while the meeting waited. sendAsPlayer rejoins and sends it again.
    emitAsPlayer(game, 'ready', payload);
  };

  const handleImDead = () => {
    if (playerState?.sus) return;
    if(!window.confirm(t('Are you sure you want to mark yourself as dead?'))) {
      return;
    }
    if (socket) {
      emitAsPlayer(game, 'player_dead', {
        player_id: playerState?.player_id || playerState?.playerId || localStorage.getItem('player_id'),
        round_id: meetingState?.round_id || roundId,
        meeting_id: meetingState?.id || meetingState?.meeting_id,
      });
    }
  };

  const meReady = Boolean(playerState.ready);

  return (
    <>
    {/* The round's blue stays underneath while the yellow floods out over it */}
    <div className="sg-screen sg-round" aria-hidden="true" />
    <div
      className="sg-screen sg-meet sg-flood"
      style={{ '--fx': origin.fx, '--fy': origin.fy, paddingBottom: 0 }}
    >
      <div className="sg-stripes" />
      {!tutorialMode && <LeaveGameButton className="sg-corner" />}

      <div className="sg-shake sg-center" style={{ animationDelay: '700ms', gap: 16, paddingTop: 12 }}>
        <h1 className="sg-big sg-h1">
          <Words text={t('EMERGENCY')} delay={420} />
          <br />
          <Words text={t('MEETING')} delay={560} />
        </h1>

        {caller && !tasksDone ? (
          <Face player={caller} size={104} className="sg-a sg-pop" style={{ animationDelay: '820ms' }} />
        ) : null}
        <p className="sg-lede sg-a sg-rise" style={{ animationDelay: '1000ms' }}>
          {tasksDone ? t('Every task is done. The intruders are revealed.') : t('{name} called it', { name: meetingState?.player_who_started_it })}
        </p>
        <p className="sg-small sg-a sg-rise" style={{ animationDelay: '1090ms' }}>
          {t('Go to the meeting spot, then slide ready')}
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
                <span style={{ fontWeight: 700, fontSize: 13, maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: ready ? 1 : 0.6 }} translate="no">
                  {player.username}
                </span>
                {player.active === false && (
                  <span style={{ fontWeight: 700, fontSize: 11, opacity: 0.6 }}>{t('Offline')}</span>
                )}
              </div>
            );
          })}
        </div>

        <p data-testid="ready-count" className="sg-lede sg-num" style={{ marginTop: 4 }}>
          {allReady ? t('Everyone is here. Voting opens.') : t('{ready} of {total} ready', { ready: readyCount, total: totalAlive })}
        </p>
        {!allReady && needed < totalAlive && (
          <p data-testid="ready-needed" className="sg-small">{t('Voting opens at {needed} ready', { needed })}</p>
        )}

        {meReady && <p className="sg-small">{t('You\'re ready')}</p>}

        {!tutorialMode && <HostStartVoting />}
      </div>

      {/* The dock sits in the page's flow and sticks to the bottom, so the slider can never cover
          the death button (on prod it did, on short phones and on the host's longer screen). */}
      <div data-testid="meeting-dock" className="sg-meet-dock">
        {/* Intruders can't be killed: on prod one tapped this by mistake and lost the round. */}
        {!playerState?.sus && (
          <button type="button" data-testid="im-dead" className="sg-btn sg-btn-line sg-dead-btn" onClick={handleImDead}>
            <Skull size={24} />
            {t('I\'ve Been Killed')}
          </button>
        )}
        {!playerState.ready && (
          <div
            className={highlightReadySlider ? 'animate-pulse' : ''}
            style={highlightReadySlider ? { borderRadius: 999, outline: '4px solid var(--sg-ink)', outlineOffset: -8 } : {}}
          >
            <MUECustomSlider text={t('Slide when you\'re there')} tone="meet" onSuccess={handleReadyUp} disabled={!connected} />
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default MeetingWaitingPage;

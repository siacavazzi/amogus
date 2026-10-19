import React, { useEffect, useState, useContext } from "react";
import { DataContext } from "../GameContext";
import LeaveGameButton from "../components/LeaveGameButton";
import { Face, Letters, vibrate } from "../signal";

// The votes are in: the screen holds on yellow, then floods red if an intruder was caught
// or drains to dark if the crew threw out one of their own.
const HOLD_MS = 1300;

export default function MeetingResultPage({ tutorialMode = false, tutorialHighlightTarget = null }) {
  const { meetingState, players, setMeetingState, setVotes, setVetoVotes } = useContext(DataContext);
  const highlightContinue = tutorialMode && tutorialHighlightTarget === 'continue';
  const [phase, setPhase] = useState('hold'); // 'hold' -> 'reveal' -> 'complete'

  useEffect(() => {
    setVotes(undefined);
    setVetoVotes(0);
  }, [meetingState, setVotes, setVetoVotes]);

  const votedOutPlayer = meetingState?.voted_out
    ? players.find((p) => p.player_id === meetingState.voted_out)
    : undefined;
  const ejected = !!meetingState?.voted_out && meetingState?.reason !== 'veto';
  const wasIntruder = !!votedOutPlayer?.sus;
  const intrudersLeft = players.filter((p) => p.sus && p.alive && p.player_id !== meetingState?.voted_out).length;

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('reveal'), ejected ? HOLD_MS : 300);
    const t2 = setTimeout(() => setPhase('complete'), ejected ? HOLD_MS + 1600 : 900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [ejected]);

  useEffect(() => {
    if (phase === 'reveal' && ejected) vibrate(wasIntruder ? [200] : [40]);
  }, [phase, ejected, wasIntruder]);

  const revealed = phase !== 'hold';

  const renderVerdict = () => {
    if (meetingState?.reason === "veto") {
      return (
        <>
          <h1 className="sg-big sg-h1 sg-a sg-slam">Meeting Vetoed</h1>
          <p className="sg-lede sg-a sg-rise" style={{ animationDelay: '250ms' }}>The crew decided to skip the vote</p>
        </>
      );
    }
    if (!meetingState?.voted_out) {
      return (
        <>
          <h1 className="sg-big sg-h1 sg-a sg-slam">No one was ejected</h1>
          <p className="sg-lede sg-a sg-rise" style={{ animationDelay: '250ms' }}>No Consensus</p>
          <p className="sg-small sg-a sg-rise" style={{ animationDelay: '350ms' }}>No one got enough votes. The intruders are still out there.</p>
        </>
      );
    }
    return (
      <>
        <p className="sg-lede">{revealed ? 'Ejected' : 'The votes are in'}</p>
        <div style={{ height: 150, display: 'grid', placeItems: 'center' }}>
          <Face
            player={votedOutPlayer}
            size={150}
            className={revealed ? (wasIntruder ? 'sg-fling' : 'sg-drift') : 'sg-wobble'}
            style={revealed ? { animationDelay: '700ms' } : null}
          />
        </div>
        <h1 className="sg-big sg-h2">{votedOutPlayer?.username}</h1>
        <p className="sg-lede">was ejected</p>
        <p className="sg-big sg-h3" style={{ minHeight: '2.2em', maxWidth: '13ch', lineHeight: 1.05, letterSpacing: '-0.02em' }}>
          {revealed && (
            <Letters
              text={wasIntruder ? 'They were an intruder.' : 'They were not an intruder.'}
              delay={wasIntruder ? 500 : 900}
              step={wasIntruder ? 30 : 55}
            />
          )}
        </p>
        {phase === 'complete' && wasIntruder && (
          <p className="sg-lede sg-a sg-fade">
            {intrudersLeft === 0 ? 'No intruders left' : `${intrudersLeft} ${intrudersLeft === 1 ? 'intruder' : 'intruders'} left`}
          </p>
        )}
        {phase === 'complete' && votedOutPlayer?.death_message && (
          <p className="sg-small sg-a sg-fade" style={{ maxWidth: '28ch', fontStyle: 'italic' }}>
            "{votedOutPlayer.death_message}"
          </p>
        )}
      </>
    );
  };

  const onDark = ejected && revealed;

  return (
    <div className="sg-screen sg-meet" style={{ overflow: 'hidden', paddingBottom: 120 }}>
      {/* The flood behind everything: a red wave rising, or the colour draining away */}
      {onDark && wasIntruder && (
        <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden' }}>
          <div className="sg-wave" style={{ position: 'absolute', inset: '0 0 -30% 0' }}>
            <div className="sg-wave-x" style={{ width: '200%', height: '100%' }}>
              <svg viewBox="0 0 720 1600" preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}>
                <path fill="#e0263a" d="M0 60 Q90 0 180 60 T360 60 T540 60 T720 60 V1600 H0Z" />
              </svg>
            </div>
          </div>
        </div>
      )}
      {onDark && !wasIntruder && (
        <div aria-hidden="true" className="sg-drain" style={{ position: 'fixed', inset: 0, zIndex: -1, background: 'var(--sg-dark)' }} />
      )}

      {!tutorialMode && <LeaveGameButton className="sg-corner" />}

      <div
        className={`sg-center ${onDark ? 'sg-color-white' : ''}`}
        style={{ gap: 12, color: 'var(--sg-ink)', ...(onDark && !wasIntruder ? { animation: 'sg-to-white .9s ease .2s both' } : null) }}
      >
        {renderVerdict()}
      </div>

      <div
        className="fixed left-0 right-0"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
          padding: '0 20px',
          opacity: phase === 'complete' ? 1 : 0,
          transform: phase === 'complete' ? 'none' : 'translateY(24px)',
          transition: 'opacity .5s, transform .5s',
          pointerEvents: phase === 'complete' ? 'auto' : 'none',
        }}
      >
        <div
          className={`max-w-sm mx-auto ${highlightContinue ? 'animate-pulse' : ''}`}
          style={highlightContinue ? { borderRadius: 22, outline: '4px solid currentColor', outlineOffset: 6 } : {}}
        >
          <button
            type="button"
            className="sg-btn"
            onClick={() => setMeetingState(undefined)}
            style={onDark ? { background: '#fff', color: wasIntruder ? 'var(--sg-out)' : 'var(--sg-dark)' } : { background: 'var(--sg-ink)', color: 'var(--sg-meet)' }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

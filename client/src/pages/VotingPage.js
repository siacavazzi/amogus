import React, { useState, useEffect, useContext, useRef } from "react";
import { DataContext, isObsoleteSession } from "../GameContext";
import LeaveGameButton from "../components/LeaveGameButton";
import { Face } from "../signal";
import { Skull } from "../signal/icons";
import { emitVolatileWithAck } from "../utils/socketCommand";
import { emitAsPlayer } from "../utils/playerCommand";
import { t, tn } from '../i18n';

export default function VotingPage({ tutorialMode = false, tutorialHighlightTarget = null }) {
  const game = useContext(DataContext);
  const { players, socket, setMessage, meetingState, vetoVotes, votes, playerState, roundId, connected, reclaimSeat } = game;
  const highlightPlayers = tutorialMode && (tutorialHighlightTarget === 'players' || tutorialHighlightTarget === 'vote-flow');
  const highlightActions = tutorialMode && (tutorialHighlightTarget === 'actions' || tutorialHighlightTarget === 'vote-flow');

  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [timeLeft, setTimeLeft] = useState(meetingState?.time_left);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedFor, setVotedFor] = useState(null);
  const [deathPending, setDeathPending] = useState(false);
  const deathPendingRef = useRef(false);
  const mountedRef = useRef(true);
  const playerId = playerState?.player_id || playerState?.playerId || localStorage.getItem('player_id');
  // The screen is picked one render after the room changes, so this page draws once more after the
  // meeting is gone (last stand, or a phone waking after the vote). Unguarded, that blanked phones on prod.
  const voting = meetingState?.stage === 'voting';
  const canVote = connected && playerState?.alive !== false && !deathPending && voting;
  // Intruders can't be killed, so they never get the button (on prod one tapped it by mistake).
  const showDeathReport = !tutorialMode && !playerState?.sus && playerState?.alive !== false && voting;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (selectedPlayer && !players.some(p => p.player_id === selectedPlayer.player_id && p.alive)) {
      setSelectedPlayer(null);
    }
    if (votedFor && votedFor !== 'veto' && !players.some(p => p.player_id === votedFor.player_id && p.alive)) {
      setHasVoted(false);
      setVotedFor(null);
    }
  }, [players, selectedPlayer, votedFor]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVote = () => {
    if (!canVote || deathPendingRef.current) return;
    if (selectedPlayer) {
      emitAsPlayer(game, "vote", {
        player_id: playerId,
        votedFor: selectedPlayer.player_id,
        round_id: meetingState?.round_id || roundId,
        meeting_id: meetingState?.id || meetingState?.meeting_id,
      });
      setMessage({ text: t('You voted for {name}', { name: selectedPlayer.username }), status: "success" });
      setHasVoted(true);
      setVotedFor(selectedPlayer);
    } else {
      setMessage({ text: t('Please select a player to vote for.'), status: "warning" });
    }
  };

  const handleVeto = () => {
    if (!canVote || deathPendingRef.current) return;
    emitAsPlayer(game, "veto", {
      player_id: playerId,
      round_id: meetingState?.round_id || roundId,
      meeting_id: meetingState?.id || meetingState?.meeting_id,
    });
    setMessage({ text: t('You voted to veto.'), status: "info" });
    setSelectedPlayer(null);
    setHasVoted(true);
    setVotedFor('veto');
  };

  const handleImDead = async () => {
    if (!canVote || deathPendingRef.current || tutorialMode || playerState?.sus) return;
    if (!window.confirm(t('Are you sure you want to mark yourself as dead?'))) return;
    deathPendingRef.current = true;
    setDeathPending(true);
    try {
      const report = {
        player_id: playerId,
        round_id: meetingState?.round_id || roundId,
        meeting_id: meetingState?.id || meetingState?.meeting_id,
      };
      let result = await emitVolatileWithAck(socket, 'player_dead', report);
      // Another tab of the game held the seat: take it back for this tap and report again.
      if (isObsoleteSession(result) && reclaimSeat && await reclaimSeat()) {
        result = await emitVolatileWithAck(socket, 'player_dead', report);
      }
      if (!result?.ok) throw new Error(result?.error ? t(result.error) : t('The death report failed. Try again.'));
    } catch (error) {
      if (!mountedRef.current) return;
      deathPendingRef.current = false;
      setDeathPending(false);
      setMessage({ text: t(error.message), status: 'error' });
    }
  };

  const totalTime = meetingState?.time_left;
  const progressPercentage = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0;
  const isLowTime = timeLeft <= 10;
  const alivePlayers = players.filter(p => p.alive);
  const voteLabel = hasVoted
    ? (votedFor === 'veto' ? t('You voted to VETO') : t('Voted for {name}', { name: votedFor?.username }))
    : t('Tap who you think it is');

  return (
    <div className="sg-screen sg-meet" style={{ padding: 0 }}>
      {!tutorialMode && <LeaveGameButton className="sg-corner" />}

      {/* Header: the word, the clock, what you did */}
      <div style={{ padding: 'calc(env(safe-area-inset-top, 0px) + 56px) 20px 10px' }}>
        <div className="flex items-end justify-between gap-3">
          <h1 className="sg-big sg-h1 sg-a sg-slam">{t('VOTE')}</h1>
          <span
            key={isLowTime ? timeLeft : 'clock'}
            className={`sg-big sg-num ${isLowTime ? 'sg-tick' : ''}`}
            style={{ fontSize: 'clamp(40px, 12vw, 60px)', color: isLowTime ? 'var(--sg-out)' : 'inherit' }}
            translate="no"
          >
            {timeLeft}s
          </span>
        </div>
        <div style={{ height: 8, borderRadius: 8, background: 'rgba(26,20,0,0.15)', marginTop: 12, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progressPercentage}%`, background: isLowTime ? 'var(--sg-out)' : 'var(--sg-ink)', borderRadius: 8, transition: 'width 1s linear' }} />
        </div>
        <p className="sg-lede" style={{ marginTop: 14 }}>{voteLabel}</p>
        <p className="sg-small" style={{ marginTop: 2 }}>
          {tn(alivePlayers.length, '{count} player voting', '{count} players voting')}
          {meetingState?.started_by_host && meetingState?.host_name ? ` · ${t('{name} started it early', { name: meetingState.host_name })}` : ''}
        </p>
      </div>

      {/* Players */}
      <div className="flex-1" style={{ padding: `6px 20px ${showDeathReport ? 250 : 190}px` }}>
        <div
          className={`max-w-2xl mx-auto grid grid-cols-3 sm:grid-cols-4 gap-2.5 ${highlightPlayers ? 'animate-pulse' : ''}`}
          style={highlightPlayers ? { borderRadius: 20, outline: '4px solid var(--sg-ink)', outlineOffset: 6 } : {}}
        >
          {players.map((player, i) => {
            const isMe = playerId === player.player_id;
            const isDead = !player.alive;
            const clickable = !isDead && !isMe;
            const selected = selectedPlayer?.player_id === player.player_id;
            const count = votes?.[player?.player_id] ?? 0;
            return (
              <div
                key={player.player_id}
                role={clickable ? 'button' : undefined}
                tabIndex={clickable ? 0 : undefined}
                aria-pressed={clickable ? selected : undefined}
                onClick={clickable ? () => setSelectedPlayer(player) : undefined}
                onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedPlayer(player); } } : undefined}
                className={`sg-a sg-pop relative flex flex-col items-center ${clickable ? 'cursor-pointer' : ''}`}
                style={{
                  animationDelay: `${i * 50}ms`,
                  gap: 6,
                  padding: '12px 6px 10px',
                  borderRadius: 18,
                  background: selected ? 'var(--sg-ink)' : 'rgba(255,255,255,0.55)',
                  color: selected ? 'var(--sg-meet)' : 'var(--sg-ink)',
                  opacity: isDead ? 0.4 : 1,
                  transition: 'background .15s, color .15s, transform .15s',
                  transform: selected ? 'scale(1.04)' : 'none',
                }}
              >
                <Face player={player} size={64} dead={isDead} />
                <span style={{ fontWeight: 900, fontSize: 15, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: isDead ? 'line-through' : 'none' }} translate="no">
                  {player.username}
                </span>
                {isMe && <span style={{ fontWeight: 700, fontSize: 11, opacity: 0.7, marginTop: -4 }}>{t('You')}</span>}
                {count > 0 && (
                  <span
                    key={count}
                    className="sg-a sg-pop sg-num"
                    style={{ position: 'absolute', top: 6, right: 6, minWidth: 24, height: 24, borderRadius: 12, padding: '0 6px', background: 'var(--sg-out)', color: '#fff', fontWeight: 900, fontSize: 13, display: 'grid', placeItems: 'center' }}
                  >
                    {count}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="fixed bottom-0 left-0 right-0 z-20" style={{ background: 'var(--sg-meet)', padding: '12px 20px calc(env(safe-area-inset-bottom, 0px) + 16px)' }}>
        <div
          className={`max-w-md mx-auto flex flex-col gap-2.5 ${highlightActions ? 'animate-pulse' : ''}`}
          style={highlightActions ? { borderRadius: 22, outline: '4px solid var(--sg-ink)', outlineOffset: 6 } : {}}
        >
          <button type="button" className="sg-btn sg-btn-ink" onClick={handleVote} disabled={!selectedPlayer || !canVote}>
            {selectedPlayer ? t('Vote for {name}', { name: selectedPlayer.username }) : t('Select a Player')}
          </button>
          <button type="button" className="sg-btn sg-btn-line" onClick={handleVeto} disabled={!canVote} style={{ minHeight: 52, padding: '12px 18px' }}>
            {t('Veto Meeting')}
            <span className="sg-num" style={{ background: 'var(--sg-ink)', color: 'var(--sg-meet)', borderRadius: 999, padding: '2px 9px', fontSize: 14 }}>{vetoVotes}</span>
          </button>
          {showDeathReport && (
            <button type="button" data-testid="im-dead" className="sg-btn sg-btn-line sg-dead-btn" onClick={handleImDead} disabled={!canVote}>
              <Skull size={24} />
              {deathPending ? t('Confirm death...') : t('I\'ve Been Killed')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

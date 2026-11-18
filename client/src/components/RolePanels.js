// The secret roles on the phone (server/assets/roles.py): the Hacker's glitch and card offer,
// the Detective's check and vote history, and the Hacker's trail on the meeting screens.
import React, { useContext, useEffect, useState } from 'react';
import { DataContext } from '../GameContext';
import { CardSheet } from './CardSheets';
import { Face } from '../signal';
import { Search, List, Cards, Check } from '../signal/icons';
import { cardCopy, cardName, parseCards } from '../utils/cardCopy';
import { checkResultText } from '../utils/roles';
import { t, tn } from '../i18n';

export const HACKER_GLITCH_MS = 3000;
export const HACKER_PLAY_GAP_SECONDS = 45;

// Red static over the Hacker's own screen for 3 s after each card: the tell anyone nearby can see.
export function HackerGlitch({ at }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!at || Date.now() - at > HACKER_GLITCH_MS) return undefined;
    setOn(true);
    const timer = setTimeout(() => setOn(false), HACKER_GLITCH_MS - (Date.now() - at));
    return () => clearTimeout(timer);
  }, [at]);
  return on ? <div className="sg-hacker-glitch" data-testid="hacker-glitch" aria-hidden="true" /> : null;
}

// Seconds until the Hacker may play again, counted from their last glitch.
export function useHackerWait(glitchAt) {
  const [now, setNow] = useState(() => Date.now());
  const until = glitchAt ? glitchAt + HACKER_PLAY_GAP_SECONDS * 1000 : 0;
  useEffect(() => {
    if (!until || until <= Date.now()) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [until]);
  return until > now ? Math.ceil((until - now) / 1000) : 0;
}

// Every 2 tasks the Hacker picks 1 of 2 cards.
export function CardOfferSheet() {
  const { playerState, pickCard } = useContext(DataContext);
  const offer = parseCards(playerState?.card_offer);
  const [busy, setBusy] = useState(false);
  if (playerState?.role !== 'hacker' || offer.length === 0 || playerState?.alive === false) return null;
  const pick = async (card) => {
    if (busy) return;
    setBusy(true);
    await pickCard(card.id);
    setBusy(false);
  };
  return (
    <div className="sg-sheet-scrim" role="dialog" aria-modal="true" aria-label={t('Pick a card')} data-testid="card-offer">
      <div className="sg-sheet sg-a sg-rise">
        <h3 className="sg-big sg-sheet__title"><Cards size={26} /> {t('Pick a card')}</h3>
        <p className="sg-small" style={{ opacity: 0.75 }}>{t('Your tasks earned a card. Keep one.')}</p>
        <div className="sg-pick-list">
          {offer.map((card) => {
            const copy = cardCopy(card);
            return (
              <button key={card.id} type="button" className="sg-pick" onClick={() => pick(card)} disabled={busy} data-testid="offer-card">
                <span>
                  {copy.name}
                  <small>{copy.does}</small>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// The Detective's two buttons, on the round screen and in meetings.
export function DetectiveBar({ tone = 'round', meeting = false }) {
  const { playerState, detectiveState } = useContext(DataContext);
  const [sheet, setSheet] = useState(null);
  if (playerState?.role !== 'detective' || playerState?.alive === false) return null;
  const ready = !!detectiveState?.check_ready && !meeting;
  const ink = tone === 'meet' ? ' sg-role-btn--ink' : '';
  return (
    <>
      <div className="sg-role-bar" data-testid="detective-bar">
        {!meeting && (
          <button
            type="button"
            className={`sg-role-btn${ready ? ' is-ready' : ''}${ink}`}
            onClick={() => setSheet('check')}
            disabled={!ready}
            data-testid="detective-check"
          >
            <Search size={18} />
            {ready ? t('Check a player') : t('Next check after a meeting')}
          </button>
        )}
        <button type="button" className={`sg-role-btn${ink}`} onClick={() => setSheet('votes')} data-testid="detective-votes">
          <List size={18} />
          {t('Who voted for whom')}
        </button>
      </div>
      {sheet === 'check' && <CheckSheet onClose={() => setSheet(null)} />}
      {sheet === 'votes' && <VotesSheet onClose={() => setSheet(null)} />}
    </>
  );
}

function CheckSheet({ onClose }) {
  const { players = [], playerState, detectiveCheck } = useContext(DataContext);
  const [target, setTarget] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const me = playerState?.player_id;
  const options = players.filter((p) => p.alive && p.player_id !== me && !p.waiting);

  if (result) {
    return (
      <div className="sg-sheet-scrim" role="dialog" aria-modal="true" aria-label={t('Check a player')}>
        <div className="sg-sheet sg-a sg-rise">
          <div className={`sg-verdict sg-verdict--${result.result}`} data-testid="check-result">
            {result.name}
            <b>{checkResultText(result.result)}</b>
          </div>
          <p className="sg-small" style={{ opacity: 0.75 }}>{t('Only you saw this. Now get the room to believe you.')}</p>
          <button type="button" className="sg-btn" style={{ background: 'var(--sg-ink)', color: '#fff' }} onClick={onClose}>{t('Got it')}</button>
        </div>
      </div>
    );
  }

  const run = async () => {
    if (!target || busy) return;
    setBusy(true);
    const answer = await detectiveCheck(target);
    setBusy(false);
    if (answer) setResult(answer);
    else onClose();
  };

  return (
    <CardSheet title={t('Check a player')} icon={Search} onClose={onClose} actionLabel={t('Check')} onSend={run} canSend={!!target && !busy}>
      <p className="sg-small" style={{ opacity: 0.75 }}>{t('One check until the next meeting. You learn if they are an intruder.')}</p>
      <div className="sg-pick-list">
        {options.map((player) => (
          <button
            key={player.player_id}
            type="button"
            className={`sg-pick ${target === player.player_id ? 'is-on' : ''}`}
            onClick={() => setTarget(player.player_id)}
            aria-pressed={target === player.player_id}
            data-testid="check-option"
          >
            <Face player={player} size={36} />
            <span translate="no">{player.username}</span>
          </button>
        ))}
      </div>
    </CardSheet>
  );
}

function VotesSheet({ onClose }) {
  const { detectiveState } = useContext(DataContext);
  const history = [...(detectiveState?.vote_history || [])].reverse();
  const checks = detectiveState?.checks || [];
  return (
    <div className="sg-sheet-scrim" role="dialog" aria-modal="true" aria-label={t('Who voted for whom')}>
      <div className="sg-sheet sg-a sg-rise" data-testid="vote-history">
        <h3 className="sg-big sg-sheet__title"><List size={26} /> {t('Who voted for whom')}</h3>
        <p className="sg-small" style={{ opacity: 0.75 }}>{t('Only you can see this. Votes show once a meeting ends.')}</p>
        {history.length === 0 && <p className="sg-lede">{t('No meeting has ended yet.')}</p>}
        <div className="sg-history">
          {history.map((entry) => (
            <section key={entry.meeting}>
              <h4>{t('Meeting {number}', { number: entry.meeting })}</h4>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {entry.votes.map((vote, index) => (
                  <li key={`v${index}`} translate="no">{t('{voter} voted {target}', { voter: vote.voter, target: vote.target })}</li>
                ))}
                {(entry.skipped || []).map((name, index) => (
                  <li key={`s${index}`} translate="no">{t('{voter} voted to skip', { voter: name })}</li>
                ))}
                {entry.votes.length === 0 && !(entry.skipped || []).length && <li>{t('Nobody voted')}</li>}
              </ul>
              <p className="sg-small" style={{ marginTop: 4, opacity: 0.7 }}>
                {entry.outcome === 'voted_out' ? t('{name} was voted out', { name: entry.voted_out })
                  : entry.outcome === 'veto' ? t('The meeting was skipped') : t('No one was voted out')}
              </p>
            </section>
          ))}
        </div>
        {checks.length > 0 && (
          <div className="sg-history">
            <h4>{t('Your checks')}</h4>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {checks.map((check, index) => (
                <li key={index}>
                  <span translate="no">{check.name}</span>: {checkResultText(check.result)}
                </li>
              ))}
            </ul>
          </div>
        )}
        <button type="button" className="sg-btn" style={{ background: 'var(--sg-ink)', color: '#fff' }} onClick={onClose}>
          <Check size={20} /> {t('Close')}
        </button>
      </div>
    </div>
  );
}

// "Hacker: EMP from the Kitchen, Fake Task from somewhere" on the meeting screens.
export function HackerTrail({ trail, big = false }) {
  if (!Array.isArray(trail) || trail.length === 0) return null;
  const items = trail.map((entry) => (entry.area
    ? t('{card} from {area}', { card: cardName(entry.card), area: entry.area })
    : t('{card} from somewhere', { card: cardName(entry.card) })));
  return (
    <div className="sg-trail" data-testid="hacker-trail" style={big ? { fontSize: 28 } : { fontSize: 16 }}>
      <small>{tn(trail.length, "THE HACKER'S CARD SINCE THE LAST MEETING", "THE HACKER'S {count} CARDS SINCE THE LAST MEETING")}</small>
      <span>{items.join(' · ')}</span>
    </div>
  );
}

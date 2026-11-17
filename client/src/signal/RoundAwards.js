import React, { useContext, useState } from 'react';
import { createPortal } from 'react-dom';
import { DataContext } from '../GameContext';
import { t } from '../i18n';
import { Face, vibrate } from './index';
import { MEDALS, Medal, medalLine } from './medals';
import './awards.css';

// End of a round: the medals the server handed out (stats.awards), each with the player's face.
// Shown only once the round is over, so they never give a role away.

function useAwards() {
  const { gameStats, players = [] } = useContext(DataContext) || {};
  const awards = (gameStats?.awards || []).filter((award) => MEDALS[award.medal]);
  const byId = Object.fromEntries(players.map((p) => [p.player_id, p]));
  return awards.map((award) => ({ ...award, player: byId[award.player_id] || { username: award.name } }));
}

export default function RoundAwards({ big = false }) {
  const awards = useAwards();
  if (!awards.length) return null;
  return (
    <section className={`aw-list${big ? ' aw-list--big' : ''}`} aria-label={t('Round awards')} data-testid="round-awards">
      <h3 className="aw-title">{t('Round awards')}</h3>
      <ul>
        {awards.map((award, i) => (
          <li key={award.medal} className="aw-row sg-a sg-rise" style={{ animationDelay: `${900 + i * 140}ms` }}>
            <span className="aw-who">
              <Face player={award.player} size={big ? 64 : 42} />
              <Medal id={award.medal} size={big ? 44 : 26} className="aw-badge" title="" />
            </span>
            <span className="aw-text">
              <b>{t(MEDALS[award.medal].name)} · <span translate="no">{award.player.username}</span></b>
              <span>{medalLine(award)}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A phone that won a medal sees its own first, full screen, before the round's results. */
export function MyMedal() {
  const awards = useAwards();
  const { playerState } = useContext(DataContext) || {};
  const myId = playerState?.player_id || playerState?.playerId || window.localStorage?.getItem('player_id');
  const mine = awards.find((award) => award.player_id && award.player_id === myId);
  const [closed, setClosed] = useState(null);
  React.useEffect(() => {
    if (mine) vibrate([60, 40, 120]);
  }, [mine?.medal]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!mine || closed === mine.medal) return null;
  // Rendered on <body>: the end screen's opening clip would otherwise cut this screen off too.
  return createPortal((
    <div className="sg-screen sg-round aw-mine" role="dialog" aria-modal="true" aria-label={t('You got a medal')} data-testid="my-medal">
      <div className="sg-center">
        <p className="sg-lede sg-a sg-rise">{t('You got a medal')}</p>
        <div className="aw-mine__art sg-a sg-pop" style={{ animationDelay: '250ms' }}>
          <Face player={mine.player} size={150} />
          <Medal id={mine.medal} size={70} className="aw-mine__medal" />
        </div>
        <h2 className="sg-big sg-h2 sg-a sg-rise" style={{ animationDelay: '450ms' }}>{t(MEDALS[mine.medal].name)}</h2>
        <p className="sg-lede sg-a sg-fade" style={{ opacity: 0.85, maxWidth: '28ch', animationDelay: '600ms' }}>{medalLine(mine)}</p>
      </div>
      <button type="button" className="aw-mine__next" onClick={() => setClosed(mine.medal)}>{t('See the round')}</button>
    </div>
  ), document.body);
}

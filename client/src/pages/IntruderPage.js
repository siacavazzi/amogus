// src/pages/IntruderPage.jsx
import React, { useContext, useEffect } from 'react';
import { DataContext } from '../GameContext';
import LeaveGameButton from '../components/LeaveGameButton';
import { LogOut, Zap, MapPin, AlertTriangle } from '../signal/icons';
import { useCardSheets } from '../components/CardSheets';
import CardCarousel from '../components/CardCarousel';
import { cardName, cardCopy, parseCards } from '../utils/cardCopy';
import { t } from '../i18n';

// ActionCard component defined OUTSIDE to prevent re-creation on every render
function ActionCard({ action, text, location, duration, id, time_left, active = false, countdown, requires_input, onPlay }) {
  if (time_left <= 0) {
    return null;
  }

  const formattedAction = cardName(action);
  const durationLabel = (() => {
    if (!duration) return null;
    if (countdown) return `${time_left}s left`;
    if (active && action === 'Shorten Meltdown') return `Next meltdown -${duration}s`;
    return `${duration}s`;
  })();

  return (
    <button onClick={() => onPlay(id, requires_input, action)} type="button" className="sg-effect">
      <span className="sg-effect__row">
        <span className="sg-effect__name">{formattedAction}</span>
        {active && <span className="sg-pill" style={{ background: 'var(--sg-ink)', color: '#fff', padding: '2px 10px' }}>{t('Active')}</span>}
        {durationLabel && <span className="sg-effect__time">{durationLabel}</span>}
      </span>
      <span className="sg-effect__text">{cardCopy({ action, text, location, duration }).does || text}</span>
      {location && <span className="sg-effect__text" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><MapPin size={14} /> {location}</span>}
    </button>
  );
}

const IntruderPage = ({
  setShowSusPage,
  tutorialMode = false,
  onTutorialCardFocusChange,
  tutorialHighlightTarget = null,
}) => {
  const game = useContext(DataContext);
  const {
    playerState,
    activeCards,
    intrudersRevealed,
    killCooldown = 0,
  } = game;

  // Check if intruders have been revealed (tasks 100%)
  const isCompromised = !!intrudersRevealed;
  const highlightCards = tutorialMode && tutorialHighlightTarget === 'cards';
  const highlightExit = tutorialMode && tutorialHighlightTarget === 'exit';

  // Cards that need a target, an area or some words open a sheet; the rest play at once.
  const { open: openCard, sheet } = useCardSheets(game);

  function playCard(id, requires_input, action) {
    openCard({ id, requires_input, action });
  }

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Auto-exit vent screen when intruders are revealed (tasks 100%)
  useEffect(() => {
    if (intrudersRevealed) {
      // Small delay so the player sees the "POSITION COMPROMISED" state briefly
      const timer = setTimeout(() => {
        setShowSusPage(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [intrudersRevealed, setShowSusPage]);

  const activeCardsList = activeCards.filter((card) => card.time_left === undefined || card.time_left === null || card.time_left > 0);

  const cards = parseCards(playerState.cards);

  return (
    <div className={`sg-screen ${isCompromised ? 'sg-out' : 'sg-dark'} sg-vent`}>
      {!tutorialMode && <LeaveGameButton className="sg-corner" />}

      {sheet}

      <div className="sg-vent__head">
        {isCompromised ? (
          <>
            <p className="sg-pill" style={{ justifySelf: 'start', background: '#fff', color: 'var(--sg-out)' }}>
              <AlertTriangle size={16} /> {t('Position compromised')}
            </p>
            <h1 className="sg-big sg-h1" style={{ margin: '8px 0 0' }}>{t('You\'ve been found out')}</h1>
            <p className="sg-lede">{t('Vents are locked. Everyone knows. Take out the rest of the crew.')}</p>
          </>
        ) : (
          <>
            <p className="sg-pill" style={{ justifySelf: 'start', background: 'var(--sg-out)', color: '#fff' }}>
              <span className="sg-vent__dot" /> {t('Vent network active')}
            </p>
            <p data-testid="kill-cooldown" className={`sg-vent__kill sg-num ${killCooldown > 0 ? '' : 'sg-vent__kill--ready'}`}>
              {killCooldown > 0
                ? <>{killCooldown}s <span className="sg-vent__killnote">{t('until your next kill')}</span></>
                : t('Kill ready')}
            </p>
          </>
        )}
      </div>

      {activeCardsList.length > 0 && (
        <div className="sg-vent__effects">
          <p className="sg-small" style={{ opacity: 1 }}>{t('Active Effects')}</p>
          {activeCardsList.map((card) => {
            const { action, text, location, duration, id, time_left, countdown, requires_input } = card;
            return (
              <ActionCard
                key={id}
                id={id}
                action={action}
                text={text}
                location={location}
                duration={duration}
                time_left={time_left}
                countdown={countdown}
                requires_input={requires_input}
                active
                onPlay={playCard}
              />
            );
          })}
        </div>
      )}

      <div className="sg-vent__deck">
        {cards.length === 0 ? (
          <div className="sg-vent__empty">
            <Zap size={40} style={{ justifySelf: 'center', opacity: 0.5 }} />
            <p className="sg-lede">{t('No cards right now')}</p>
            <p className="sg-small">{t('You draw a new card after each meeting.')}</p>
          </div>
        ) : (
          <div
            className={`flex-1 min-h-0 flex flex-col ${highlightCards ? 'animate-pulse' : ''}`}
            style={highlightCards ? { borderRadius: '2rem', outline: '4px solid var(--sg-meet)', outlineOffset: '4px' } : {}}
          >
            <CardCarousel
              cards={cards}
              onPlayCard={(card) => playCard(card.id, card.requires_input, card.action)}
              compact={activeCardsList.length > 0}
              onActiveIndexChange={onTutorialCardFocusChange}
            />
          </div>
        )}
      </div>

      <div className="sg-vent__exit">
        {isCompromised ? (
          <div className="sg-btn sg-btn-ghost" style={{ cursor: 'default' }}>
            <AlertTriangle size={22} /> <span style={{ textDecoration: 'line-through' }}>{t('Vents locked')}</span>
          </div>
        ) : (
          <div
            className={highlightExit ? 'animate-pulse' : ''}
            style={highlightExit ? { borderRadius: 22, outline: '4px solid var(--sg-meet)', outlineOffset: '4px' } : {}}
          >
            <button onClick={() => setShowSusPage(false)} type="button" className="sg-btn sg-btn-white" style={{ color: 'var(--sg-ink)' }}>
              <LogOut size={24} /> {t('Close vent')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default IntruderPage;

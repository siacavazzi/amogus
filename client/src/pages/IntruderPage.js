// src/pages/IntruderPage.jsx
import React, { useContext, useEffect, useState } from 'react';
import { DataContext } from '../GameContext';
import LeaveGameButton from '../components/LeaveGameButton';
import { LogOut, Zap, MapPin, AlertTriangle, Eye, X, Send, FileText, MessageSquare } from '../signal/icons';
import CardCarousel from '../components/CardCarousel';

// ActionCard component defined OUTSIDE to prevent re-creation on every render
function ActionCard({ action, text, location, duration, id, time_left, active = false, countdown, requires_input, onPlay }) {
  if (time_left <= 0) {
    return null;
  }

  const formattedAction = action.replace('_', ' ');
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
        {active && <span className="sg-pill" style={{ background: 'var(--sg-ink)', color: '#fff', padding: '2px 10px' }}>Active</span>}
        {durationLabel && <span className="sg-effect__time">{durationLabel}</span>}
      </span>
      <span className="sg-effect__text">{text}</span>
      {location && <span className="sg-effect__text" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><MapPin size={14} /> {location}</span>}
    </button>
  );
}

// A white sheet from the bottom for cards that need a target or some words.
function CardSheet({ title, icon: Icon, onClose, children, actionLabel, onSend, canSend }) {
  return (
    <div className="sg-sheet-scrim" role="dialog" aria-modal="true" aria-label={title}>
      <div className="sg-sheet sg-a sg-rise">
        <div className="sg-sheet__top">
          <h3 className="sg-big sg-sheet__title">
            <Icon size={26} /> {title}
          </h3>
          <button type="button" className="sg-sheet__close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        {children}
        <div className="sg-sheet__actions">
          <button type="button" className="sg-btn sg-btn-soft" style={{ width: 'auto', flex: 'none', padding: '18px 22px' }} onClick={onClose}>Cancel</button>
          <button type="button" className="sg-btn sg-btn-red" style={{ flex: 1, whiteSpace: 'nowrap' }} onClick={onSend} disabled={!canSend}>
            <Send size={20} /> {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function TargetField({ value, onChange, crewmates }) {
  return (
    <label className="sg-field">
      Who gets it
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Choose a crewmate...</option>
        {crewmates.map((player) => (
          <option key={player.player_id} value={player.player_id}>{player.username}</option>
        ))}
      </select>
      {crewmates.length === 0 && <span style={{ color: 'var(--sg-out)' }}>No alive crewmates to target!</span>}
    </label>
  );
}

const IntruderPage = ({
  setShowSusPage,
  tutorialMode = false,
  onTutorialCardFocusChange,
  tutorialHighlightTarget = null,
}) => {
  const {
    playerState,
    socket,
    activeCards,
    players,
    taskLocations,
    intrudersRevealed,
    killCooldown = 0,
  } = useContext(DataContext);

  // Check if intruders have been revealed (tasks 100%)
  const isCompromised = !!intrudersRevealed;
  const highlightCards = tutorialMode && tutorialHighlightTarget === 'cards';
  const highlightExit = tutorialMode && tutorialHighlightTarget === 'exit';

  // Fake Task modal state
  const [showFakeTaskModal, setShowFakeTaskModal] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [targetPlayerId, setTargetPlayerId] = useState('');
  const [fakeTaskText, setFakeTaskText] = useState('');
  const [fakeTaskLocation, setFakeTaskLocation] = useState('');
  const [showTauntModal, setShowTauntModal] = useState(false);
  const [tauntMessage, setTauntMessage] = useState('');

  // Get list of alive crewmates (non-intruders)
  const aliveCrewmates = players.filter(p => p.alive && !p.sus);
  
  // Get available locations
  const availableLocations = taskLocations.length > 0 ? taskLocations : ['Other'];

  function playCard(id, requires_input, action) {
    if (requires_input && action === 'Fake Task') {
      // Show modal for Fake Task
      setSelectedCardId(id);
      setTargetPlayerId('');
      setFakeTaskText('');
      setFakeTaskLocation(availableLocations[0] || 'Other');
      setShowFakeTaskModal(true);
    } else if (requires_input && action === 'Taunt Message') {
      setSelectedCardId(id);
      setTargetPlayerId('');
      setTauntMessage('');
      setShowTauntModal(true);
    } else {
      // Normal card play
      socket.emit('play_card', { player_id: localStorage.getItem('player_id'), card_id: id });
    }
  }

  function sendFakeTask() {
    if (!targetPlayerId || !fakeTaskText.trim()) {
      return;
    }
    
    socket.emit('play_card', {
      player_id: localStorage.getItem('player_id'),
      card_id: selectedCardId,
      extra_data: {
        target_player_id: targetPlayerId,
        task_text: fakeTaskText.trim(),
        task_location: fakeTaskLocation
      }
    });
    
    setShowFakeTaskModal(false);
    setSelectedCardId(null);
  }

  function sendTaunt() {
    if (!targetPlayerId || !tauntMessage.trim()) {
      return;
    }

    socket.emit('play_card', {
      player_id: localStorage.getItem('player_id'),
      card_id: selectedCardId,
      extra_data: {
        target_player_id: targetPlayerId,
        message: tauntMessage.trim()
      }
    });

    setShowTauntModal(false);
    setSelectedCardId(null);
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

  const cards = (playerState.cards || [])
    .map((cardJson) => {
      try { return JSON.parse(cardJson); }
      catch (e) { console.error('Error parsing game action card:', e); return null; }
    })
    .filter(Boolean);

  return (
    <div className={`sg-screen ${isCompromised ? 'sg-out' : 'sg-dark'} sg-vent`}>
      {!tutorialMode && <LeaveGameButton className="sg-corner" />}

      {showFakeTaskModal && (
        <CardSheet
          title="Send Fake Task"
          icon={FileText}
          onClose={() => setShowFakeTaskModal(false)}
          actionLabel="Send Task"
          onSend={sendFakeTask}
          canSend={!!targetPlayerId && !!fakeTaskText.trim()}
        >
          <TargetField value={targetPlayerId} onChange={setTargetPlayerId} crewmates={aliveCrewmates} />
          <label className="sg-field">
            The fake task
            <textarea
              value={fakeTaskText}
              onChange={(e) => setFakeTaskText(e.target.value)}
              placeholder="e.g., Go stand in the corner and count to 100..."
              rows={3}
              maxLength={200}
            />
            <small>{fakeTaskText.length}/200</small>
          </label>
          <label className="sg-field">
            Where
            <select value={fakeTaskLocation} onChange={(e) => setFakeTaskLocation(e.target.value)}>
              {availableLocations.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </label>
        </CardSheet>
      )}

      {showTauntModal && (
        <CardSheet
          title="Send Taunt"
          icon={MessageSquare}
          onClose={() => setShowTauntModal(false)}
          actionLabel="Send Taunt"
          onSend={sendTaunt}
          canSend={!!targetPlayerId && !!tauntMessage.trim()}
        >
          <TargetField value={targetPlayerId} onChange={setTargetPlayerId} crewmates={aliveCrewmates} />
          <label className="sg-field">
            Your message
            <textarea
              value={tauntMessage}
              onChange={(e) => setTauntMessage(e.target.value)}
              placeholder="e.g., You walked right past me."
              rows={3}
              maxLength={200}
            />
            <small>{tauntMessage.length}/200</small>
          </label>
        </CardSheet>
      )}

      <div className="sg-vent__head">
        {isCompromised ? (
          <>
            <p className="sg-pill" style={{ justifySelf: 'start', background: '#fff', color: 'var(--sg-out)' }}>
              <AlertTriangle size={16} /> Position compromised
            </p>
            <h1 className="sg-big sg-h1" style={{ margin: '8px 0 0' }}>You've been found out</h1>
            <p className="sg-lede">Vents are locked. Everyone knows. Take out the rest of the crew.</p>
          </>
        ) : (
          <>
            <p className="sg-pill" style={{ justifySelf: 'start', background: 'var(--sg-out)', color: '#fff' }}>
              <span className="sg-vent__dot" /> Vent network active
            </p>
            <p data-testid="kill-cooldown" className={`sg-vent__kill sg-num ${killCooldown > 0 ? '' : 'sg-vent__kill--ready'}`}>
              {killCooldown > 0
                ? <>{killCooldown}s <span className="sg-vent__killnote">until your next kill</span></>
                : 'Kill ready'}
            </p>
            <p className="sg-small" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Eye size={16} /> You are exposed - find safety!
            </p>
          </>
        )}
      </div>

      {activeCardsList.length > 0 && (
        <div className="sg-vent__effects">
          <p className="sg-small" style={{ opacity: 1 }}>Active Effects</p>
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
            <p className="sg-lede">No cards available</p>
            <p className="sg-small">Complete tasks to draw cards</p>
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
            <AlertTriangle size={22} /> <span style={{ textDecoration: 'line-through' }}>Vents locked</span>
          </div>
        ) : (
          <div
            className={highlightExit ? 'animate-pulse' : ''}
            style={highlightExit ? { borderRadius: 22, outline: '4px solid var(--sg-meet)', outlineOffset: '4px' } : {}}
          >
            <button onClick={() => setShowSusPage(false)} type="button" className="sg-btn sg-btn-white" style={{ color: 'var(--sg-ink)' }}>
              <LogOut size={24} /> Exit to safety
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default IntruderPage;

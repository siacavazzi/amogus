// Playing an intruder card: cards that need a target, an area or some words open a white
// sheet from the bottom; the rest play at once. Shared by the round screen and the vent.
import React, { useState } from 'react';
import { emitAsPlayer } from '../utils/playerCommand';
import { X, Send, FileText, MessageSquare, Eye, MapPin } from '../signal/icons';
import { t } from '../i18n';

export const FAKE_TASK_MAX = 200;

export function CardSheet({ title, icon: Icon, onClose, children, actionLabel, onSend, canSend }) {
  return (
    <div className="sg-sheet-scrim" role="dialog" aria-modal="true" aria-label={title}>
      <div className="sg-sheet sg-a sg-rise">
        <div className="sg-sheet__top">
          <h3 className="sg-big sg-sheet__title">
            <Icon size={26} /> {title}
          </h3>
          <button type="button" className="sg-sheet__close" onClick={onClose} aria-label={t('Close')}>
            <X size={20} />
          </button>
        </div>
        {children}
        <div className="sg-sheet__actions">
          <button type="button" className="sg-btn sg-btn-soft" style={{ width: 'auto', flex: 'none', padding: '18px 22px' }} onClick={onClose}>{t('Cancel')}</button>
          <button type="button" className="sg-btn sg-btn-red" style={{ flex: 1, whiteSpace: 'nowrap' }} onClick={onSend} disabled={!canSend}>
            <Send size={20} /> {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function TargetField({ value, onChange, crewmates }) {
  return (
    <label className="sg-field">
      {t('Who gets it')}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{t('Choose a crewmate...')}</option>
        {crewmates.map((player) => (
          <option key={player.player_id} value={player.player_id}>{player.username}</option>
        ))}
      </select>
      {crewmates.length === 0 && <span style={{ color: 'var(--sg-out)' }}>{t('No alive crewmates to target!')}</span>}
    </label>
  );
}

function AreaField({ value, onChange, areas }) {
  return (
    <label className="sg-field">
      {t('Where')}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {areas.map((loc) => (
          <option key={loc} value={loc}>{loc}</option>
        ))}
      </select>
    </label>
  );
}

// Cards that open a sheet before they play.
export const SHEET_CARDS = new Set(['Fake Task', 'Taunt Message', 'Steal Tasks', 'Rally']);

export function needsSheet(card) {
  return !!card?.requires_input && SHEET_CARDS.has(card.action);
}

// { open(card), sheet }: open(card) shows the card's sheet, or plays it at once if it needs none.
export function useCardSheets(game) {
  const { players = [], taskLocations = [] } = game;
  const [card, setCard] = useState(null);
  const [target, setTarget] = useState('');
  const [text, setText] = useState('');
  const [area, setArea] = useState('');

  // The Hacker can't tell sides apart, so their list is everyone else who is still in.
  const me = localStorage.getItem('player_id');
  const crewmates = players.filter((p) => p.alive && !p.sus && !p.waiting && p.player_id !== me);
  const areas = taskLocations.length > 0 ? taskLocations : ['Other'];
  const rallyAreas = areas.filter((loc) => loc && loc !== 'Other');

  const send = (cardId, extraData) => {
    emitAsPlayer(game, 'play_card', {
      player_id: localStorage.getItem('player_id'),
      card_id: cardId,
      ...(extraData ? { extra_data: extraData } : {}),
    });
  };

  const close = () => setCard(null);

  const open = (next) => {
    if (!needsSheet(next)) {
      send(next.id);
      return;
    }
    setTarget('');
    setText('');
    setArea(next.action === 'Rally' ? (rallyAreas[0] || '') : (areas[0] || 'Other'));
    setCard(next);
  };

  const submit = (extraData) => {
    send(card.id, extraData);
    close();
  };

  let sheet = null;
  if (card?.action === 'Fake Task') {
    sheet = (
      <CardSheet
        title={t('Send Fake Task')}
        icon={FileText}
        onClose={close}
        actionLabel={t('Send Task')}
        onSend={() => submit({ task_text: text.trim(), task_location: area })}
        canSend={!!text.trim()}
      >
        <p className="sg-small" style={{ opacity: 0.75 }}>
          {t('It arrives as a Priority task for the crewmate most due one. We tell you who.')}
        </p>
        <label className="sg-field">
          {t('The fake task')}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('e.g., Go stand in the corner and count to 100...')}
            rows={3}
            maxLength={FAKE_TASK_MAX}
          />
          <small>{text.length}/{FAKE_TASK_MAX}</small>
        </label>
        <AreaField value={area} onChange={setArea} areas={areas} />
      </CardSheet>
    );
  } else if (card?.action === 'Taunt Message') {
    sheet = (
      <CardSheet
        title={t('Send Taunt')}
        icon={MessageSquare}
        onClose={close}
        actionLabel={t('Send Taunt')}
        onSend={() => submit({ target_player_id: target, message: text.trim() })}
        canSend={!!target && !!text.trim()}
      >
        <TargetField value={target} onChange={setTarget} crewmates={crewmates} />
        <label className="sg-field">
          {t('Your message')}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('e.g., You walked right past me.')}
            rows={3}
            maxLength={200}
          />
          <small>{text.length}/200</small>
        </label>
      </CardSheet>
    );
  } else if (card?.action === 'Steal Tasks') {
    sheet = (
      <CardSheet
        title={t('Steal Tasks')}
        icon={Eye}
        onClose={close}
        actionLabel={t('Steal')}
        onSend={() => submit({ target_player_id: target })}
        canSend={!!target}
      >
        <p className="sg-small" style={{ opacity: 0.75 }}>
          {t('You see their tasks until the next meeting. They get new ones and never learn who took them.')}
        </p>
        <TargetField value={target} onChange={setTarget} crewmates={crewmates} />
      </CardSheet>
    );
  } else if (card?.action === 'Rally') {
    sheet = (
      <CardSheet
        title={t('Rally')}
        icon={MapPin}
        onClose={close}
        actionLabel={t('Rally')}
        onSend={() => submit({ location: area })}
        canSend={!!area}
      >
        <p className="sg-small" style={{ opacity: 0.75 }}>
          {t('Every crewmate gets a real Priority task there at once. Each one who makes it earns a point.')}
        </p>
        <AreaField value={area} onChange={setArea} areas={rallyAreas} />
      </CardSheet>
    );
  }

  return { open, sheet };
}

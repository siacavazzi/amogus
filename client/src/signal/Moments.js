import React, { useContext, useEffect, useState } from 'react';
import { DataContext } from '../GameContext';
import { Face, vibrate } from './index';
import { listCardNames } from '../utils/cardCopy';
import { t } from '../i18n';

// Role reveal. Both roles see the same blue screen and hold the card to peek; letting go
// hides it again, so nobody reads a role over a shoulder. Intruders also see which cards
// they hold, since most never found them in the vent on their own.
export function RoleReveal({ title, sus, otherIntruders = [], cards = [], onClose }) {
  const [peeking, setPeeking] = useState(false);
  const [seen, setSeen] = useState(false);
  const show = (e) => {
    e.preventDefault();
    setPeeking(true);
    setSeen(true);
  };
  const hide = () => setPeeking(false);

  return (
    <div className="sg-screen sg-round sg-a sg-fade" style={{ zIndex: 60 }}>
      <div className="sg-center" style={{ gap: 18 }}>
        <p className="sg-lede" style={{ opacity: 0.85 }} id="modal-title">{title}</p>
        <p className="sg-big sg-h1 sg-a sg-rise">{t('Your role')}</p>
        <button
          type="button"
          onPointerDown={show}
          onPointerUp={hide}
          onPointerLeave={hide}
          onPointerCancel={hide}
          onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') show(e); }}
          onKeyUp={hide}
          onContextMenu={(e) => e.preventDefault()}
          className="sg"
          style={{
            position: 'relative',
            width: 260,
            height: 190,
            borderRadius: 26,
            border: '3px dashed rgba(255,255,255,0.55)',
            background: 'rgba(0,0,0,0.15)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 18,
            touchAction: 'none',
            WebkitTouchCallout: 'none',
            userSelect: 'none',
            cursor: 'pointer',
          }}
        >
          {t('Hold to see it')}
          {peeking && (
            <span
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 23,
                background: '#fff',
                color: 'var(--sg-round)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                animation: 'sg-pop .22s ease-out both',
              }}
            >
              <span className="sg-big" style={{ fontSize: 40 }}>{sus ? t('Intruder') : t('Crewmate')}</span>
              <span style={{ fontWeight: 700, fontSize: 14, opacity: 0.75, padding: '0 14px' }}>
                {sus
                  ? otherIntruders.length
                    ? t('With {names}', { names: otherIntruders.map((p) => p.username).join(', ') })
                    : t('Get them before they finish their tasks')
                  : t('Finish your tasks. Find the intruders.')}
              </span>
              {sus && cards.length > 0 && (
                <span data-testid="role-cards" style={{ fontWeight: 700, fontSize: 13, opacity: 0.75, padding: '0 14px', lineHeight: 1.3 }}>
                  {t('Your cards: {cards}. Tap ENTER VENT to play them.', { cards: listCardNames(cards) })}
                </span>
              )}
            </span>
          )}
        </button>
        <p className="sg-small" style={{ maxWidth: '26ch' }}>{t('Every player sees this same screen.')}</p>
      </div>
      <div style={{ width: '100%', maxWidth: 420, margin: '0 auto' }}>
        <button type="button" className="sg-btn sg-btn-white" onClick={onClose} disabled={!seen}>
          {seen ? t('Got it') : t('Hold the card first')}
        </button>
      </div>
    </div>
  );
}

// Every task is done: everyone's phone flashes red and shows who the intruders are.
export function RevealedMoment({ intruderNames = [], onClose }) {
  const { players = [] } = useContext(DataContext) || {};
  useEffect(() => {
    vibrate([100, 80, 100]);
  }, []);
  const faces = intruderNames.map((name) => players.find((p) => p.username === name) || { username: name });
  return (
    <div className="sg-screen sg-round" style={{ zIndex: 60, overflow: 'hidden' }}>
      <div
        aria-hidden="true"
        className="sg-pulse-bright"
        style={{ position: 'fixed', inset: 0, zIndex: -1, background: 'var(--sg-out)', animation: 'sg-flood .52s cubic-bezier(.7,0,.2,1) both, sg-bright 1.4s ease-in-out .6s 2', '--fx': '50%', '--fy': '50%' }}
      />
      <div className="sg-center" style={{ gap: 16 }}>
        <p className="sg-lede sg-a sg-rise" style={{ animationDelay: '300ms' }}>{t('Every task is done')}</p>
        <h1 id="modal-title" className="sg-big sg-h2 sg-a sg-slam" style={{ animationDelay: '450ms' }}>
          {faces.length > 1 ? t('The intruders are') : t('The intruder is')}
        </h1>
        <div className="sg-row" style={{ gap: 18 }}>
          {faces.map((p, i) => (
            <div key={p.username} className="sg-a sg-pop flex flex-col items-center" style={{ gap: 6, animationDelay: `${800 + i * 420}ms` }}>
              <Face player={p} size={96} />
              <b style={{ fontSize: 22, fontWeight: 900 }}>{p.username}</b>
            </div>
          ))}
        </div>
        <p className="sg-lede sg-a sg-fade" style={{ maxWidth: '24ch', opacity: 0.9, animationDelay: '1400ms' }}>
          {t('Find them and vote them out before they get you.')}
        </p>
      </div>
      <div style={{ width: '100%', maxWidth: 420, margin: '0 auto' }}>
        <button type="button" className="sg-btn sg-btn-white sg-a sg-fade" style={{ color: 'var(--sg-out)', animationDelay: '1600ms' }} onClick={onClose}>
          {t('Got it')}
        </button>
      </div>
    </div>
  );
}

// A taunt drops in from the top and nudges the phone. The screen behind stays as it was.
export function TauntToast({ message, onClose }) {
  useEffect(() => {
    vibrate(60);
    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [onClose]);
  return (
    <button
      type="button"
      onClick={onClose}
      className="sg sg-a sg-drop"
      style={{
        position: 'fixed',
        left: 14,
        right: 14,
        top: 'calc(env(safe-area-inset-top, 0px) + 14px)',
        zIndex: 70,
        background: '#fff',
        color: 'var(--sg-ink)',
        borderRadius: 20,
        padding: '16px 18px',
        textAlign: 'left',
        border: 0,
        boxShadow: '0 10px 24px rgba(0,0,0,.25)',
      }}
    >
      <span className="sg-nudge" style={{ display: 'block', animationDelay: '420ms' }}>
        <b id="modal-title" style={{ display: 'block', fontSize: 13, opacity: 0.6, fontWeight: 700 }}>{t('Anonymous message')}</b>
        <span style={{ display: 'block', fontWeight: 900, fontSize: 21, lineHeight: 1.15, marginTop: 4 }}>{message}</span>
        <span style={{ display: 'block', fontSize: 12, opacity: 0.5, fontWeight: 700, marginTop: 8 }}>{t('Tap to dismiss')}</span>
      </span>
    </button>
  );
}

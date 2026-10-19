import React, { useContext, useMemo, useState } from 'react';
import './signal.css';
import { DataContext } from '../GameContext';
import { ENDPOINT } from '../ENDPOINT';
import Avatar, { getAvatar } from '../components/Avatar';

// Android phones buzz on shared moments. iPhones can't, so the colour has to do the work.
export function vibrate(pattern) {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch (e) {
    // Some browsers throw when vibrate is called without a user gesture.
  }
}

// Each word slams in after the one before it.
export function Words({ text, delay = 0, step = 140, className = 'sg-a sg-slam' }) {
  return text.split(' ').map((word, i) => (
    <React.Fragment key={`${word}-${i}`}>
      {i > 0 && ' '}
      <span className={className} style={{ display: 'inline-block', animationDelay: `${delay + i * step}ms` }}>
        {word}
      </span>
    </React.Fragment>
  ));
}

// Letters type in one by one; slower for sad news. Words never break mid-word.
export function Letters({ text = '', delay = 0, step = 28 }) {
  let n = 0;
  return (
    <span aria-label={text}>
      {text.split(' ').map((word, w) => (
        <React.Fragment key={w}>
          {w > 0 && ' '}
          <span aria-hidden="true" style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
            {[...word].map((c, i) => {
              const at = n++;
              return (
                <span
                  key={i}
                  className="sg-a sg-rise"
                  style={{ display: 'inline-block', animationDuration: '260ms', animationDelay: `${delay + at * step}ms` }}
                >
                  {c}
                </span>
              );
            })}
          </span>
        </React.Fragment>
      ))}
    </span>
  );
}

export function Confetti({ count = 18, colors = ['#1b4fd8', '#ffc21a', '#18171d'], top = '45%', delay = 340 }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const dist = 90 + Math.random() * 90;
        const size = 8 + Math.random() * 8;
        return {
          i,
          size,
          x: `${Math.cos(angle) * dist}px`,
          y: `${Math.sin(angle) * dist}px`,
          r1: `${Math.random() * 360}deg`,
          r2: `${Math.random() * 720}deg`,
          d: `${1000 + Math.random() * 400}ms`,
        };
      }),
    [count]
  );
  return (
    <div className="sg-confetti" aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {pieces.map((p) => (
        <i
          key={p.i}
          style={{
            top,
            width: p.size,
            height: p.size * 0.6,
            background: colors[p.i % colors.length],
            '--x': p.x,
            '--y': p.y,
            '--r1': p.r1,
            '--r2': p.r2,
            '--d': p.d,
            '--delay': `${delay}ms`,
          }}
        />
      ))}
    </div>
  );
}

function selfieUrl(filename, access) {
  if (!filename || !access?.sid || !access?.token) return null;
  const query = new URLSearchParams({ sid: access.sid, token: access.token });
  return `${ENDPOINT}/selfies/${encodeURIComponent(filename)}?${query}`;
}

// A player's face with no ring or glow: selfie if we have one, otherwise their avatar.
export function Face({ player, size = 96, className = '', style, dead = false }) {
  const { selfieAccess } = useContext(DataContext) || {};
  const url = selfieUrl(player?.selfie, selfieAccess);
  const [failed, setFailed] = useState(null);
  const box = { width: size, height: size, flex: 'none', ...style };
  const look = dead ? { filter: 'grayscale(1)', opacity: 0.6 } : null;
  if (url && url !== failed) {
    return (
      <img
        src={url}
        alt={player?.username || 'Player'}
        referrerPolicy="no-referrer"
        className={className}
        style={{ ...box, ...look, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
        onError={() => setFailed(url)}
      />
    );
  }
  if (getAvatar(player?.pic)) {
    return (
      <div className={className} style={{ ...box, ...look, borderRadius: '50%', overflow: 'hidden' }}>
        <Avatar id={player.pic} label={player?.username} className="w-full h-full" />
      </div>
    );
  }
  return (
    <div
      className={className}
      aria-label={player?.username}
      style={{ ...box, ...look, borderRadius: '50%', background: 'rgba(0,0,0,0.2)', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: size * 0.4 }}
    >
      {(player?.username || '?').slice(0, 1).toUpperCase()}
    </div>
  );
}

// Where a flood should start: the centre of the element the player pressed, as % of the screen.
export function originOf(el) {
  if (!el?.getBoundingClientRect) return null;
  const r = el.getBoundingClientRect();
  const w = window.innerWidth || 1;
  const h = window.innerHeight || 1;
  return { fx: `${((r.left + r.width / 2) / w) * 100}%`, fy: `${((r.top + r.height / 2) / h) * 100}%` };
}

// The last place a meeting button was pressed on this phone, so the yellow floods out of it.
let lastOrigin = null;
export function rememberOrigin(el) {
  lastOrigin = originOf(el);
}
export function takeOrigin() {
  const o = lastOrigin;
  lastOrigin = null;
  return o || { fx: '50%', fy: '14%' };
}

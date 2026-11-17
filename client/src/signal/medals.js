import React from 'react';
import { t, tk, tn } from '../i18n';

// Round awards. Each medal is a struck coin on a two-stripe ribbon: a ridged rim, a raised face
// with one emblem, and a flat highlight (no gradients). Same shape for all, so the colour and the
// emblem tell them apart, and they stay readable down to 20px.

export const MEDALS = {
  called_it: {
    name: tk('Called it'), how: tk('Called the meeting that caught an intruder'),
    face: '#ffc21a', rim: '#c98a00', ribbon: ['#1b4fd8', '#ffc21a'], ink: '#1a1400',
  },
  prankster: {
    name: tk('Prankster'), how: tk('Got someone to do a fake task'),
    face: '#ff7ac0', rim: '#bf3b84', ribbon: ['#7c3aed', '#ff7ac0'], ink: '#3a0a24',
  },
  task_machine: {
    name: tk('Task machine'), how: tk('Most tasks done'),
    face: '#34d399', rim: '#138a5c', ribbon: ['#1b4fd8', '#ffffff'], ink: '#05301f',
  },
  core_saver: {
    name: tk('Core saver'), how: tk('Their code helped stop a meltdown'),
    face: '#ff8a2a', rim: '#c2520b', ribbon: ['#1a1400', '#ff8a2a'], ink: '#3a1500',
  },
  undercover: {
    name: tk('Undercover'), how: tk('Intruder nobody voted for'),
    face: '#a47bff', rim: '#6235c9', ribbon: ['#1a1400', '#a47bff'], ink: '#1e0b4a',
  },
  card_shark: {
    name: tk('Card shark'), how: tk('Intruder who played the most cards'),
    face: '#ff5866', rim: '#b51f30', ribbon: ['#1a1400', '#ff5866'], ink: '#3d0710',
  },
  sharp_eye: {
    name: tk('Sharp eye'), how: tk('Voted for an intruder the most'),
    face: '#5b8cff', rim: '#2448b5', ribbon: ['#ffc21a', '#5b8cff'], ink: '#0b1c4d',
  },
  last_standing: {
    name: tk('Last one standing'), how: tk('Still in when almost all the crew was out'),
    face: '#e6eaf2', rim: '#8e98ad', ribbon: ['#e0263a', '#ffffff'], ink: '#1d2433',
  },
};

export const MEDAL_ORDER = Object.keys(MEDALS);

// Emblems are drawn in a 40x40 box centred on the coin face.
function Emblem({ id, ink, face }) {
  const s = { fill: 'none', stroke: ink, strokeWidth: 4, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (id) {
    case 'task_machine':
      return (
        <g>
          <rect x="6" y="5" width="28" height="31" rx="5" fill={ink} opacity="0.16" />
          <path d="M11 21 L18 28 L31 12" {...s} strokeWidth="5.5" />
        </g>
      );
    case 'called_it':
      // A megaphone with sound lines.
      return (
        <g>
          <path d="M7 17 L20 11 L20 29 L7 23 Z" fill={ink} />
          <rect x="3" y="16" width="6" height="8" rx="2" fill={ink} />
          <path d="M12 25 L14 33" {...s} strokeWidth="3.5" />
          <path d="M25 14 Q29 20 25 26" {...s} strokeWidth="3" />
          <path d="M30 10 Q37 20 30 30" {...s} strokeWidth="3" />
        </g>
      );
    case 'sharp_eye':
      return (
        <g>
          <path d="M3 20 Q20 4 37 20 Q20 36 3 20 Z" fill={ink} />
          <circle cx="20" cy="20" r="7.5" fill={face} />
          <circle cx="20" cy="20" r="3.5" fill={ink} />
          <path d="M20 2 V7 M20 33 V38" {...s} strokeWidth="3" />
        </g>
      );
    case 'core_saver':
      // The core's three blades, held inside a shield.
      return (
        <g>
          <path d="M20 2 L35 7.5 V19 Q35 31.5 20 38 Q5 31.5 5 19 V7.5 Z" fill={ink} />
          {[0, 120, 240].map((a) => (
            <path key={a} d="M14 9.6 A12 12 0 0 1 26 9.6 L22 16.5 A4 4 0 0 0 18 16.5 Z" fill={face} transform={`rotate(${a} 20 20)`} />
          ))}
          <circle cx="20" cy="20" r="2.4" fill={face} />
        </g>
      );
    case 'card_shark':
      return (
        <g>
          <rect x="6" y="9" width="17" height="24" rx="3" fill={ink} opacity="0.45" transform="rotate(-16 14 21)" />
          <rect x="15" y="7" width="17" height="24" rx="3" fill={ink} transform="rotate(10 23 19)" />
          <path d="M23.5 11 C23.5 11 18 16 18 19.5 C18 22 20.5 23 22.6 21.6 L21.6 25 H25.4 L24.4 21.6 C26.5 23 29 22 29 19.5 C29 16 23.5 11 23.5 11 Z"
            fill={face} transform="rotate(10 23 19)" />
        </g>
      );
    case 'undercover':
      // A domino mask.
      return (
        <g>
          <path d="M3 16 Q3 11 9 11 Q15 11 20 14 Q25 11 31 11 Q37 11 37 16 Q37 27 28 27 Q23 27 20 22 Q17 27 12 27 Q3 27 3 16 Z" fill={ink} />
          <ellipse cx="11.5" cy="18.5" rx="4" ry="3" fill={face} />
          <ellipse cx="28.5" cy="18.5" rx="4" ry="3" fill={face} />
        </g>
      );
    case 'prankster':
      // A winking grin.
      return (
        <g>
          <circle cx="20" cy="20" r="16" fill={ink} />
          <circle cx="13.5" cy="16" r="2.8" fill={face} />
          <path d="M23 16.5 Q26.5 13 30 16.5" fill="none" stroke={face} strokeWidth="3" strokeLinecap="round" />
          <path d="M11 23 Q20 32 29 23 Z" fill={face} />
        </g>
      );
    case 'last_standing':
      // One figure on a step.
      return (
        <g>
          <circle cx="20" cy="9" r="5" fill={ink} />
          <path d="M13 28 V20 Q13 15 20 15 Q27 15 27 20 V28 Z" fill={ink} />
          <rect x="7" y="29" width="26" height="7" rx="2" fill={ink} />
        </g>
      );
    default:
      return null;
  }
}

export function Medal({ id, size = 48, title, className, style }) {
  const m = MEDALS[id];
  if (!m) return null;
  const [a, b] = m.ribbon;
  const label = title === undefined ? t(m.name) : title;
  // viewBox: ribbon on top (0-30), coin below centred at (32, 54), radius 26.
  return (
    <svg
      className={className}
      style={style}
      width={size}
      height={size * 1.25}
      viewBox="0 0 64 80"
      role={label ? 'img' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : 'true'}
    >
      {/* Ribbon: two folded straps meeting behind the coin. */}
      <path d="M14 0 H28 L36 32 H22 Z" fill={a} />
      <path d="M50 0 H36 L28 32 H42 Z" fill={b} />
      <path d="M28 0 H36 L32 16 Z" fill="#000" opacity="0.18" />
      <path d="M14 0 H28 L36 32 H22 Z" fill="none" stroke="#000" strokeOpacity="0.2" strokeWidth="1" />
      <path d="M50 0 H36 L28 32 H42 Z" fill="none" stroke="#000" strokeOpacity="0.2" strokeWidth="1" />
      {/* Coin: ridged rim, then the face. */}
      <circle cx="32" cy="54" r="25.5" fill={m.rim} />
      <circle cx="32" cy="54" r="24" fill="none" stroke={m.face} strokeOpacity="0.45" strokeWidth="2.6" strokeDasharray="1.6 2.1" />
      <circle cx="32" cy="54" r="20.5" fill={m.face} />
      <path d="M15.5 48 A18 18 0 0 1 38 36.5" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="2.6" strokeLinecap="round" />
      <g transform="translate(17 39) scale(0.75)">
        <Emblem id={id} ink={m.ink} face={m.face} />
      </g>
    </svg>
  );
}

/** The line under a medal: who got it and the story ("caught Jules", "9 tasks"). */
export function medalLine(award) {
  const d = award.detail || {};
  switch (award.medal) {
    case 'task_machine': return tn(award.value, '{count} task done', '{count} tasks done');
    case 'card_shark': return tn(award.value, '{count} card played', '{count} cards played');
    case 'called_it': return d.caught ? t('Caught {name}', { name: d.caught }) : t('Caught an intruder');
    case 'sharp_eye': return t('{right} of {votes} votes on an intruder', { right: award.value, votes: d.votes || award.value });
    case 'core_saver': return t('Stopped a meltdown');
    case 'undercover': return t('Not one vote all round');
    case 'prankster': return d.target
      ? (d.task ? t('Got {name} to “{task}”', { name: d.target, task: d.task }) : t('Fooled {name} with a fake task', { name: d.target }))
      : t('Got someone to do a fake task');
    case 'last_standing': return t('Still in at the end');
    default: return '';
  }
}

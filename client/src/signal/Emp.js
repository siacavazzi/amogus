import React, { useEffect, useRef, useState } from 'react';
import { vibrate } from './index';

// The yellow lightning bolt the EMP card hits with. Flat Signal yellow with an ink edge,
// so it reads on blue, black or the laptop screen.
export function Bolt({ size = 160, className = '', style }) {
  return (
    <svg
      className={className}
      style={style}
      width={size}
      height={size * 1.5}
      viewBox="0 0 100 150"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M62 4 L14 84 H46 L34 146 L88 58 H54 L70 4 Z"
        fill="var(--sg-meet)"
        stroke="var(--sg-ink)"
        strokeWidth="6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Remembers the longest time a countdown has had left, so a bar or battery knows how far
// along it is (EMP battery, meltdown heat).
export function useCountdownProgress(secondsLeft) {
  const total = useRef(0);
  const left = Math.max(0, secondsLeft || 0);
  if (left > total.current) total.current = left;
  if (!total.current) return 1;
  return Math.min(1, Math.max(0, 1 - left / total.current));
}

export const useEmpProgress = useCountdownProgress;

const SEGMENTS = 5;

// A flat battery that recharges while the phones are down: one segment lights per fifth of
// the EMP, the next one breathes slowly. Small sparks jump off the end now and then.
export function EmpBattery({ progress = 0, width = 200 }) {
  const lit = Math.min(SEGMENTS, Math.floor(progress * SEGMENTS + 0.0001));
  return (
    <div className="sg-emp-batt" style={{ width }} aria-hidden="true">
      <div className="sg-emp-batt__body">
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <span
            key={i}
            className={`sg-emp-batt__seg${i < lit ? ' is-on' : ''}${i === lit ? ' is-next' : ''}`}
          />
        ))}
        <Bolt size={Math.round(width * 0.2)} className="sg-emp-batt__bolt" />
      </div>
      <span className="sg-emp-batt__nub" />
      <span className="sg-emp-spark sg-emp-spark--a" />
      <span className="sg-emp-spark sg-emp-spark--b" />
    </div>
  );
}

// How long the hit takes before the screen sits dark and recharges. Kept short so the
// countdown is up almost straight away.
const ZAP_MS = 560;
const OFF_MS = 1020;

function prefersReducedMotion() {
  try {
    return !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  } catch (e) {
    return false;
  }
}

// 'zap' (bolt lands, picture tears) -> 'off' (folds away like an old TV) -> 'down'.
// Phones set to reduce motion skip straight to 'down'.
export function useEmpIntro(buzz = true) {
  const [phase, setPhase] = useState(() => (prefersReducedMotion() ? 'down' : 'zap'));
  useEffect(() => {
    if (buzz) vibrate([60, 40, 60, 40, 160]);
    if (phase === 'down') return undefined;
    const off = setTimeout(() => setPhase('off'), ZAP_MS);
    const down = setTimeout(() => setPhase('down'), OFF_MS);
    return () => {
      clearTimeout(off);
      clearTimeout(down);
    };
    // Runs once, when the EMP lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return phase;
}

// Slices of the blue screen that jump sideways when the bolt lands.
const SLICES = [
  { top: 0, h: 22, dx: -24 },
  { top: 22, h: 12, dx: 40 },
  { top: 34, h: 8, dx: -46, dark: true },
  { top: 42, h: 18, dx: 30 },
  { top: 60, h: 10, dx: -36 },
  { top: 70, h: 30, dx: 20 },
];

// Yellow sparks thrown off where the bolt hits: [angle in degrees, distance in px].
const SPARKS = [[-150, 120], [-30, 130], [200, 110], [20, 140], [-90, 150], [100, 120]];

// The hit itself: a yellow bolt slams into the blue screen, the picture tears, then folds
// into a yellow line and a dot.
export function EmpHit({ phase, boltSize = 150 }) {
  if (phase === 'down') return null;
  return (
    <div className={`sg-emp-hit${phase === 'off' ? ' is-off' : ''}`} aria-hidden="true" data-testid="emp-hit">
      <div className="sg-emp-tv">
        {SLICES.map((sl) => (
          <span
            key={sl.top}
            className={`sg-emp-slice${sl.dark ? ' sg-emp-slice--dark' : ''}`}
            style={{ top: `${sl.top}%`, height: `${sl.h}%`, '--dx': `${sl.dx}px` }}
          />
        ))}
        {SPARKS.map(([angle, dist]) => (
          <i
            key={angle}
            className="sg-emp-zap"
            style={{ '--tx': `${Math.round(Math.cos((angle * Math.PI) / 180) * dist)}px`, '--ty': `${Math.round(Math.sin((angle * Math.PI) / 180) * dist)}px`, '--rot': `${angle}deg` }}
          />
        ))}
        <Bolt size={boltSize} className="sg-emp-strike" style={{ marginLeft: -boltSize / 2, marginTop: -boltSize * 0.75 }} />
      </div>
    </div>
  );
}

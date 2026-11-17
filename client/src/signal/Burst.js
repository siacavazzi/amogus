import React from 'react';

// Alarm rings: three ink rings that ripple out once from behind a headline, like a siren
// going off. One pass only; no repeat.
export function AlarmRings({ size = 220, delay = 350, color = 'var(--sg-ink)' }) {
  return (
    <span className="sg-rings" aria-hidden="true" style={{ width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2 }}>
      {[0, 1, 2].map((i) => (
        <i key={i} style={{ borderColor: color, animationDelay: `${delay + i * 230}ms` }} />
      ))}
    </span>
  );
}

// A comic "pow" burst: short thick lines that shoot out from a point and vanish.
export function ImpactBurst({ size = 220, delay = 0, color = '#fff', count = 10 }) {
  return (
    <span className="sg-burst" aria-hidden="true" style={{ width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2 }}>
      {Array.from({ length: count }, (_, i) => (
        <i
          key={i}
          style={{
            background: color,
            transform: `rotate(${(360 / count) * i + (i % 2 ? 9 : 0)}deg)`,
            animationDelay: `${delay + (i % 3) * 30}ms`,
            '--from': i % 2 ? '58%' : '48%',
          }}
        />
      ))}
    </span>
  );
}

// A "!" badge that pops onto the corner of a face: who called it.
export function CallBadge({ delay = 1000, size = 34 }) {
  return (
    <span className="sg-callbadge" aria-hidden="true" style={{ width: size, height: size, fontSize: size * 0.72, animationDelay: `${delay}ms` }}>
      !
    </span>
  );
}

// Heat rising toward a meltdown: a hazard bar that fills as the clock runs down and turns red
// in the last stretch.
export function HeatBar({ progress = 0, className = '', style }) {
  const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  return (
    <div className={`sg-heat${pct >= 80 ? ' is-hot' : ''} ${className}`} style={style} aria-hidden="true">
      <div className="sg-heat__fill" style={{ width: `${Math.max(4, pct)}%` }} />
      {[25, 50, 75].map((x) => <i key={x} className="sg-heat__tick" style={{ left: `${x}%` }} />)}
    </div>
  );
}

import React, { useState } from 'react';
import { formatNumber, percent } from './labels';

// Small hand-built charts for the dashboard. Flat marks, one hue per job, hairline grid,
// values in text ink. Every mark is focusable and shows its numbers on hover or focus.

function niceMax(value) {
  if (value <= 4) return 4;
  const step = 10 ** Math.floor(Math.log10(value));
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (m * step >= value) return m * step;
  }
  return 10 * step;
}

function Tooltip({ title, rows }) {
  return (
    <div className="adm-tip" role="tooltip">
      <p className="adm-tip__title">{title}</p>
      {rows.map(([label, value, swatch]) => (
        <p className="adm-tip__row" key={label}>
          {swatch && <span className={`adm-key adm-key--line adm-key--${swatch}`} aria-hidden="true" />}
          <strong>{value}</strong> <span>{label}</span>
        </p>
      ))}
    </div>
  );
}

/**
 * Columns over time or over buckets.
 * columns: [{ key, label, tick, segments: [{ series, value }], tooltip: [[label, value, series?]], partial }]
 * series: [{ key, label }] in stack order, bottom first. One series needs no legend.
 */
export function ColumnChart({ columns, series, height = 180, ariaLabel, tickEvery = 1, lastTick = true }) {
  const [active, setActive] = useState(null);
  const totals = columns.map(c => c.segments.reduce((sum, s) => sum + (s.value || 0), 0));
  const max = niceMax(Math.max(1, ...totals));
  const ticks = Number.isInteger(max / 2) ? [0, max / 2, max] : [0, max];

  return (
    <div className="adm-cols" aria-label={ariaLabel} role="group">
      {series.length > 1 && (
        <ul className="adm-legend">
          {series.map(s => (
            <li key={s.key}><span className={`adm-key adm-key--${s.key}`} aria-hidden="true" />{s.label}</li>
          ))}
        </ul>
      )}
      <div className="adm-cols__plot" style={{ height }}>
        {ticks.map(t => (
          <div key={t} className="adm-cols__grid" style={{ bottom: `${(t / max) * 100}%` }}>
            <span>{formatNumber(t)}</span>
          </div>
        ))}
        <div className="adm-cols__bars">
          {columns.map((column, i) => (
            <button
              type="button"
              key={column.key}
              className={`adm-cols__col${active === i ? ' is-active' : ''}${column.partial ? ' is-partial' : ''}`}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              aria-label={`${column.label}: ${column.tooltip.map(([l, v]) => `${v} ${l}`).join(', ')}`}
            >
              <span className="adm-cols__stack" style={{ height: `${(totals[i] / max) * 100}%` }}>
                {column.segments.filter(s => s.value > 0).map(s => (
                  <span key={s.series} className={`adm-cols__seg adm-fill--${s.series}`} style={{ flexGrow: s.value }} />
                ))}
              </span>
              {active === i && <Tooltip title={column.label} rows={column.tooltip} />}
            </button>
          ))}
        </div>
      </div>
      <div className="adm-cols__axis" aria-hidden="true">
        {columns.map((column, i) => (
          <span key={column.key}>{i % tickEvery === 0 || (lastTick && i === columns.length - 1) ? column.tick : ''}</span>
        ))}
      </div>
    </div>
  );
}

/**
 * Ranked horizontal bars. rows: [{ key, label, value, note, emphasis }]
 * With `emphasize`, rows marked emphasis take the accent and the rest go gray.
 */
export function BarList({ rows, total, emphasize = false, empty = 'Nothing yet.', showShare = true }) {
  const [active, setActive] = useState(null);
  if (!rows.length || rows.every(r => !r.value)) return <p className="adm-muted">{empty}</p>;
  const max = Math.max(...rows.map(r => r.value), 1);
  const whole = total ?? rows.reduce((s, r) => s + r.value, 0);
  return (
    <ul className="adm-bars">
      {rows.map((row, i) => (
        <li
          key={row.key}
          className={`adm-bars__row${active === i ? ' is-active' : ''}`}
          tabIndex={0}
          onMouseEnter={() => setActive(i)}
          onMouseLeave={() => setActive(null)}
          onFocus={() => setActive(i)}
          onBlur={() => setActive(null)}
        >
          <span className="adm-bars__label">{row.label}</span>
          <span className="adm-bars__value">
            {formatNumber(row.value)}
            {showShare && <span className="adm-bars__share"> {percent(row.value, whole)}</span>}
          </span>
          <span className="adm-bars__track" aria-hidden="true">
            <span
              className={`adm-bars__bar ${emphasize && !row.emphasis ? 'adm-fill--muted' : 'adm-fill--main'}`}
              style={{ width: `${row.value ? Math.max(1.5, (row.value / max) * 100) : 0}%` }}
            />
          </span>
          {row.note && <span className="adm-bars__note">{row.note}</span>}
        </li>
      ))}
    </ul>
  );
}

/** One line per group: how many of `of` became `count`, as a meter. */
export function RateList({ rows, countLabel, ofLabel, empty = 'Nothing yet.' }) {
  if (!rows.length) return <p className="adm-muted">{empty}</p>;
  return (
    <ul className="adm-rates">
      {rows.map(row => (
        <li key={row.key} className="adm-rates__row">
          <span className="adm-rates__label">{row.label}</span>
          <span className="adm-rates__value">
            <strong>{percent(row.count, row.of)}</strong>
            <span className="adm-muted"> {formatNumber(row.count)} of {formatNumber(row.of)} {ofLabel}</span>
          </span>
          <span
            className="adm-meter"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={row.of}
            aria-valuenow={row.count}
            aria-label={`${row.label}: ${row.count} of ${row.of} ${ofLabel} ${countLabel}`}
          >
            <span className="adm-meter__fill" style={{ width: `${row.of ? (row.count / row.of) * 100 : 0}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Stat({ label, value, previous, note, goodWhenUp = true, period }) {
  let delta = null;
  if (typeof value === 'number' && typeof previous === 'number') {
    const diff = value - previous;
    const up = diff > 0;
    const tone = diff === 0 ? 'flat' : up === goodWhenUp ? 'good' : 'bad';
    delta = (
      <span className={`adm-stat__delta adm-stat__delta--${tone}`}>
        <span aria-hidden="true">{diff === 0 ? '=' : up ? '▲' : '▼'}</span>{' '}
        {diff === 0 ? 'Same as' : `${up ? '+' : '−'}${formatNumber(Math.abs(diff))} vs`} {period}
      </span>
    );
  }
  return (
    <div className="adm-stat">
      <p className="adm-stat__label">{label}</p>
      <p className="adm-stat__value">{typeof value === 'number' ? formatNumber(value) : value}</p>
      {delta}
      {note && <p className="adm-stat__note">{note}</p>}
    </div>
  );
}

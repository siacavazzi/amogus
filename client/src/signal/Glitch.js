import React, { useEffect, useRef, useState } from 'react';

// The shared "this phone is being messed with" glitch. Any screen calls glitch() and the
// <GlitchHost /> mounted once at the top of the game plays it over whatever is showing.
//
// It works on the real screen, not a picture of one: an SVG filter tears the page into
// horizontal strips that slide sideways and splits the colour channels apart (red one way,
// blue/green the other), changing every few frames. A faint scanline sits on top. Nothing
// fills the screen with a colour and brightness barely changes, so it never strobes.
// Phones set to reduce motion skip it.
//
//   glitch()                        a light hit (taunts, small hacks)
//   glitch({ strength: 'heavy' })   a bigger, longer one (EMP and other hacks)
//   glitch({ ms: 1200 })            a custom length

const EVENT = 'sg-glitch';
const FILTER_ID = 'sg-glitch-filter';
const DEFAULT_MS = { light: 650, heavy: 1000 };
const FRAME_MS = 70;
const LOOK = {
  // [max strip slide px, max colour split px, chance a frame is clean]
  light: [26, 5, 0.3],
  heavy: [70, 10, 0.15],
};

export function glitch({ strength = 'light', ms } = {}) {
  try {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { strength, ms: ms || DEFAULT_MS[strength] || DEFAULT_MS.light } }));
  } catch (e) {
    // Very old browsers without CustomEvent just skip the effect.
  }
}

function prefersReducedMotion() {
  try {
    return !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  } catch (e) {
    return false;
  }
}

export function GlitchHost() {
  const [run, setRun] = useState(null);
  const refs = useRef({});

  useEffect(() => {
    const onGlitch = (e) => {
      if (prefersReducedMotion()) return;
      const detail = e.detail || {};
      setRun({ key: Date.now(), strength: LOOK[detail.strength] ? detail.strength : 'light', ms: detail.ms || DEFAULT_MS.light });
    };
    window.addEventListener(EVENT, onGlitch);
    return () => window.removeEventListener(EVENT, onGlitch);
  }, []);

  useEffect(() => {
    if (!run) return undefined;
    const root = document.documentElement;
    const [slide, split, calm] = LOOK[run.strength];
    const { noise, disp, red, cyan } = refs.current;
    const start = performance.now();
    root.classList.add('sg-glitching');

    const step = () => {
      const t = (performance.now() - start) / run.ms;
      // Strongest at the start, easing off toward the end.
      const power = Math.max(0, 1 - t * 0.8);
      const clean = Math.random() < calm;
      noise?.setAttribute('seed', String(Math.floor(Math.random() * 999)));
      noise?.setAttribute('baseFrequency', `0.00001 ${(0.004 + Math.random() * 0.022).toFixed(3)}`);
      disp?.setAttribute('scale', clean ? '0' : String(Math.round(slide * power * (0.4 + Math.random() * 0.6))));
      const dx = clean ? 0 : Math.round(split * power * (0.5 + Math.random() * 0.5));
      red?.setAttribute('dx', String(dx));
      cyan?.setAttribute('dx', String(-dx));
    };
    step();
    const tick = setInterval(step, FRAME_MS);
    const end = setTimeout(() => setRun(null), run.ms);
    return () => {
      clearInterval(tick);
      clearTimeout(end);
      root.classList.remove('sg-glitching');
    };
  }, [run]);

  return (
    <>
      {/* The filter lives in the page all the time so it is ready the moment it's needed. */}
      <svg width="0" height="0" style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true" focusable="false">
        <filter id={FILTER_ID} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence ref={(el) => { refs.current.noise = el; }} type="fractalNoise" baseFrequency="0.00001 0.03" numOctaves="1" seed="3" result="noise" />
          {/* Snap the noise into flat steps: whole strips slide the same distance. */}
          <feComponentTransfer in="noise" result="strips">
            <feFuncR type="discrete" tableValues="0 0.5 0.5 1 0.5 0.5 0.2 0.5 0.8" />
            <feFuncB type="linear" slope="0" intercept="0.5" />
          </feComponentTransfer>
          <feDisplacementMap ref={(el) => { refs.current.disp = el; }} in="SourceGraphic" in2="strips" scale="0" xChannelSelector="R" yChannelSelector="B" result="torn" />
          <feColorMatrix in="torn" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
          <feOffset ref={(el) => { refs.current.red = el; }} in="r" dx="0" result="r2" />
          <feColorMatrix in="torn" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="gb" />
          <feOffset ref={(el) => { refs.current.cyan = el; }} in="gb" dx="0" result="gb2" />
          <feBlend in="r2" in2="gb2" mode="screen" />
        </filter>
      </svg>
      {run && <div key={run.key} className="sg-glitch" style={{ '--ms': `${run.ms}ms` }} aria-hidden="true" data-testid="glitch" />}
    </>
  );
}

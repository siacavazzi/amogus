import { createElement, useMemo } from 'react';

// Signal has no glows, orbs, grids, scan lines or floating particles. These pieces keep their
// old names and props so existing screens still import them, but each one draws nothing: an
// empty, hidden placeholder. The particle hooks still return their data for any caller that
// uses it.
const Nothing = () => createElement('span', { hidden: true, 'aria-hidden': true, 'data-signal-flat': '' });

export const FloatingParticle = Nothing;

/**
 * Generates an array of particle descriptions (kept for callers; nothing draws them).
 */
export const useFloatingParticles = (count = 15, colorScheme = 'default') => {
  return useMemo(() => Array.from({ length: count }, (_, i) => ({
    id: i,
    delay: Math.random() * 8,
    duration: 6 + Math.random() * 6,
    size: 3 + Math.random() * 6,
    left: Math.random() * 100,
    color: colorScheme,
  })), [count, colorScheme]);
};

export const FloatingParticles = Nothing;
export const GlowingOrb = Nothing;
export const GridOverlay = Nothing;
export const ScanLine = Nothing;
export const RotatingRing = Nothing;
export const Vignette = Nothing;

export const useCelebrationParticles = (count = 30) => {
  return useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 3,
      size: 4 + Math.random() * 8,
      type: Math.random() > 0.5 ? 'star' : 'circle'
    }))
  , [count]);
};

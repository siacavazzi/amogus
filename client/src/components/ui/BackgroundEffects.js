import React, { useMemo } from 'react';

/**
 * Floating particle that rises from bottom to top
 */
export const FloatingParticle = ({ 
  delay = 0, 
  duration = 8, 
  size = 6, 
  left = 50, 
  color = 'bg-indigo-500/30' 
}) => (
  <div
    className={`absolute rounded-full ${color} pointer-events-none`}
    style={{
      width: size,
      height: size,
      left: `${left}%`,
      bottom: '-20px',
      animation: `floatUp ${duration}s ease-in-out infinite`,
      animationDelay: `${delay}s`,
      filter: 'blur(1px)',
    }}
  />
);

/**
 * Generates an array of floating particles with randomized properties
 */
export const useFloatingParticles = (count = 15, colorScheme = 'default') => {
  return useMemo(() => {
    const colorSchemes = {
      default: ['bg-indigo-500/30', 'bg-cyan-500/20', 'bg-purple-500/20'],
      cyan: ['bg-cyan-500/30', 'bg-blue-500/20', 'bg-teal-500/20'],
      red: ['bg-red-500/30', 'bg-orange-500/20', 'bg-pink-500/20'],
      purple: ['bg-purple-500/30', 'bg-pink-500/20', 'bg-indigo-500/20'],
    };
    const colors = colorSchemes[colorScheme] || colorSchemes.default;
    
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      delay: Math.random() * 8,
      duration: 6 + Math.random() * 6,
      size: 3 + Math.random() * 6,
      left: Math.random() * 100,
      color: colors[i % colors.length],
    }));
  }, [count, colorScheme]);
};

/**
 * Renders a grid of floating particles
 */
export const FloatingParticles = ({ particles }) => (
  <>
    {particles.map(p => (
      <FloatingParticle key={p.id} {...p} />
    ))}
  </>
);

/**
 * Glowing orb background effect
 */
export const GlowingOrb = ({ 
  top = '10%', 
  left = '10%', 
  size = '400px', 
  color = 'bg-indigo-600/10', 
  delay = 0,
  blur = 'blur-3xl'
}) => (
  <div
    className={`absolute rounded-full ${color} ${blur} animate-pulse pointer-events-none`}
    style={{
      width: size,
      height: size,
      top,
      left,
      animationDelay: `${delay}s`,
      animationDuration: '4s',
    }}
  />
);

/**
 * Grid overlay for sci-fi feel
 */
export const GridOverlay = ({ 
  color = 'rgba(99, 102, 241, 0.5)', 
  size = 60, 
  opacity = 0.03 
}) => (
  <div
    className="absolute inset-0 pointer-events-none"
    style={{
      opacity,
      backgroundImage: `
        linear-gradient(${color} 1px, transparent 1px),
        linear-gradient(90deg, ${color} 1px, transparent 1px)
      `,
      backgroundSize: `${size}px ${size}px`,
    }}
  />
);

/**
 * Animated scanning line effect
 */
export const ScanLine = ({ color = 'indigo' }) => (
  <div
    className={`absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-${color}-500/50 to-transparent pointer-events-none animate-scan-down`}
  />
);

/**
 * Rotating ring decorative element
 */
export const RotatingRing = ({ 
  size = '400px', 
  borderColor = 'border-cyan-500/10', 
  borderWidth = 'border',
  duration = 30,
  reverse = false 
}) => (
  <div
    className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ${borderWidth} ${borderColor} pointer-events-none`}
    style={{
      width: size,
      height: size,
      animation: `spin ${duration}s linear infinite`,
      animationDirection: reverse ? 'reverse' : 'normal',
    }}
  />
);

/**
 * Vignette effect overlay
 */
export const Vignette = ({ intensity = 50 }) => (
  <div 
    className="absolute inset-0 pointer-events-none"
    style={{
      background: `radial-gradient(ellipse at center, transparent 0%, transparent ${100 - intensity}%, rgba(0,0,0,${intensity/100}) 100%)`
    }}
  />
);

/**
 * Celebration/victory particles (stars and circles)
 */
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

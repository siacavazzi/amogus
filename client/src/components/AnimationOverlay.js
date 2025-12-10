// ./components/AnimationOverlay.jsx

import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { Check } from 'lucide-react';

const AnimationOverlay = ({ onComplete }) => {
  const [phase, setPhase] = useState('enter'); // 'enter', 'pulse', 'exit'
  const [particles, setParticles] = useState([]);
  const onCompleteRef = useRef(onComplete);
  const hasCompletedRef = useRef(false);

  // Keep the ref updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    // Generate subtle particles
    const newParticles = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      angle: (i / 12) * 360,
      delay: i * 0.02,
      distance: 50 + Math.random() * 30,
      size: 3 + Math.random() * 2,
    }));
    setParticles(newParticles);

    // Faster phase transitions
    const pulseTimer = setTimeout(() => setPhase('pulse'), 50);
    const exitTimer = setTimeout(() => setPhase('exit'), 600);
    const completeTimer = setTimeout(() => {
      if (!hasCompletedRef.current) {
        hasCompletedRef.current = true;
        onCompleteRef.current();
      }
    }, 900);

    return () => {
      clearTimeout(pulseTimer);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
      style={{
        backgroundColor: phase === 'pulse' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0)',
        transition: 'background-color 0.25s ease-out',
      }}
    >
      {/* Particle burst */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute rounded-full bg-cyan-400"
            style={{
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              opacity: phase === 'pulse' ? 0.8 : 0,
              transform: phase === 'pulse' 
                ? `rotate(${particle.angle}deg) translateY(-${particle.distance}px)` 
                : `rotate(${particle.angle}deg) translateY(0)`,
              transition: `all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) ${particle.delay}s`,
              boxShadow: '0 0 6px rgba(34, 211, 238, 0.8)',
            }}
          />
        ))}
      </div>

      {/* Central success icon */}
      <div 
        className="relative flex flex-col items-center"
        style={{
          opacity: phase === 'enter' ? 0 : phase === 'exit' ? 0 : 1,
          transform: phase === 'enter' ? 'scale(0.8)' : phase === 'exit' ? 'scale(1.05)' : 'scale(1)',
          transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Icon container */}
        <div 
          className="relative w-20 h-20 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #22d3ee, #0891b2)',
            boxShadow: '0 0 30px rgba(34, 211, 238, 0.6)',
          }}
        >
          <Check size={40} className="text-white" strokeWidth={3} />
        </div>

        {/* Simple text */}
        <p className="mt-4 text-lg font-semibold text-white drop-shadow-lg">
          Task Complete
        </p>
      </div>
    </div>
  );
};

AnimationOverlay.propTypes = {
  onComplete: PropTypes.func.isRequired,
};

export default AnimationOverlay;

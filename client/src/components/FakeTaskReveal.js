import React, { useEffect, useState, useRef } from 'react';
import { AlertTriangle, XCircle } from 'lucide-react';

/**
 * FakeTaskReveal - A dramatic reveal animation when a player completes a fake task
 * Shows them they were tricked by an intruder
 */
const FakeTaskReveal = ({ task, location, onComplete }) => {
  const [phase, setPhase] = useState('glitch'); // 'glitch', 'reveal', 'exit'
  const [glitchOffset, setGlitchOffset] = useState({ x: 0, y: 0 });
  const onCompleteRef = useRef(onComplete);
  const hasCompletedRef = useRef(false);

  // Keep the ref updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Glitch effect
  useEffect(() => {
    if (phase !== 'glitch') return;

    const glitchInterval = setInterval(() => {
      setGlitchOffset({
        x: (Math.random() - 0.5) * 20,
        y: (Math.random() - 0.5) * 10,
      });
    }, 50);

    return () => clearInterval(glitchInterval);
  }, [phase]);

  // Phase transitions - longer display time
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('reveal'), 500),
      setTimeout(() => setPhase('exit'), 2500),
      setTimeout(() => {
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true;
          onCompleteRef.current?.();
        }
      }, 3000),
    ];

    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
      style={{
        backgroundColor: phase === 'exit' ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,0.85)',
        transition: 'background-color 0.4s ease-out',
      }}
    >
      {/* Glitch scanlines */}
      {phase === 'glitch' && (
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{
            background: `repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                rgba(255, 0, 0, 0.05) 2px,
                rgba(255, 0, 0, 0.05) 4px
              )`,
          }}
        />
      )}

      {/* Red warning flashes */}
      {phase === 'glitch' && (
        <div
          className="absolute inset-0 bg-red-500/30 animate-pulse"
          style={{ animationDuration: '0.1s' }}
        />
      )}

      {/* Main content container */}
      <div
        className={`relative flex flex-col items-center transition-all duration-500 ${
          phase === 'exit' ? 'opacity-0 scale-90' : 'opacity-100 scale-100'
        }`}
        style={{
          transform: phase === 'glitch' 
            ? `translate(${glitchOffset.x}px, ${glitchOffset.y}px)` 
            : 'translate(0, 0)',
        }}
      >
        {/* Central icon */}
        <div
          className={`relative mb-6 transition-all duration-300 ${
            phase === 'glitch' ? 'scale-150 opacity-0' : 'scale-100 opacity-100'
          }`}
        >
          {/* Pulsing ring */}
          <div className="absolute inset-0 -m-6 border-4 border-red-500/40 rounded-full animate-ping" style={{ animationDuration: '1s' }} />

          {/* Icon background */}
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-2xl shadow-red-500/50">
            <XCircle size={44} className="text-white" />
          </div>
        </div>

        {/* FAKE TASK label */}
        <div
          className={`transition-all duration-300 ${
            phase === 'reveal' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <h1
            className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-red-400 via-red-500 to-red-700 tracking-tight text-center"
            style={{
              textShadow: '0 0 40px rgba(239, 68, 68, 0.5)',
            }}
          >
            FAKE TASK!
          </h1>
          
          <p className="text-red-400/80 text-sm text-center mt-3 flex items-center justify-center gap-2">
            <AlertTriangle size={14} />
            No points awarded
          </p>
        </div>
      </div>
    </div>
  );
};

export default FakeTaskReveal;

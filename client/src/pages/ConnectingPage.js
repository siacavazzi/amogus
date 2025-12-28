import React, { useEffect, useState, useMemo } from 'react';
import { Wifi, Radio, Zap, Signal, Activity } from 'lucide-react';

// Floating particle component
const FloatingParticle = ({ delay, duration, size, left, color }) => (
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

// Glowing orb background effect
const GlowingOrb = ({ top, left, size, color, delay }) => (
  <div
    className={`absolute rounded-full ${color} blur-3xl animate-pulse pointer-events-none`}
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

// Grid overlay
const GridOverlay = () => (
  <div
    className="absolute inset-0 opacity-[0.03] pointer-events-none"
    style={{
      backgroundImage: `
        linear-gradient(rgba(6, 182, 212, 0.5) 1px, transparent 1px),
        linear-gradient(90deg, rgba(6, 182, 212, 0.5) 1px, transparent 1px)
      `,
      backgroundSize: '60px 60px',
    }}
  />
);

// Data stream effect (vertical lines of "data")
const DataStream = ({ left, delay }) => (
  <div
    className="absolute w-px h-20 pointer-events-none"
    style={{
      left: `${left}%`,
      background: 'linear-gradient(to bottom, transparent, rgba(6, 182, 212, 0.6), transparent)',
      animation: `dataStream 2s linear infinite`,
      animationDelay: `${delay}s`,
    }}
  />
);

function ConnectingPage() {
  const [progress, setProgress] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const [statusText, setStatusText] = useState('Initializing...');
  const [isExtended, setIsExtended] = useState(false);

  // Generate floating particles
  const particles = useMemo(() =>
    Array.from({ length: 15 }, (_, i) => ({
      id: i,
      delay: Math.random() * 8,
      duration: 6 + Math.random() * 6,
      size: 3 + Math.random() * 6,
      left: Math.random() * 100,
      color: i % 3 === 0 ? 'bg-cyan-500/40' : i % 3 === 1 ? 'bg-blue-500/30' : 'bg-indigo-500/30',
    }))
  , []);

  // Generate data streams
  const dataStreams = useMemo(() =>
    Array.from({ length: 8 }, (_, i) => ({
      id: i,
      left: 10 + (i * 10) + Math.random() * 5,
      delay: Math.random() * 2,
    }))
  , []);

  // Animate progress bar
  useEffect(() => {
    setShowContent(true);
    
    // Fast initial progress (0-80% in ~800ms)
    const fastInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 80) {
          clearInterval(fastInterval);
          return 80;
        }
        return prev + 4;
      });
    }, 40);

    // Status text updates
    const statusUpdates = [
      { time: 100, text: 'Establishing secure connection...' },
      { time: 300, text: 'Authenticating protocols...' },
      { time: 500, text: 'Syncing with game server...' },
      { time: 700, text: 'Almost there...' },
    ];

    const statusTimers = statusUpdates.map(({ time, text }) =>
      setTimeout(() => setStatusText(text), time)
    );

    // Slower progress after 80% (for extended loading)
    const slowTimer = setTimeout(() => {
      const slowInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) {
            clearInterval(slowInterval);
            return 95;
          }
          return prev + 0.5;
        });
      }, 200);

      return () => clearInterval(slowInterval);
    }, 1000);

    // Mark as extended loading after 3 seconds
    const extendedTimer = setTimeout(() => {
      setIsExtended(true);
      setStatusText('Taking longer than expected...');
    }, 3000);

    // Reload after 6 seconds if still connecting
    const reloadTimer = setTimeout(() => {
      window.location.reload();
    }, 6000);

    return () => {
      clearInterval(fastInterval);
      clearTimeout(slowTimer);
      clearTimeout(extendedTimer);
      clearTimeout(reloadTimer);
      statusTimers.forEach(timer => clearTimeout(timer));
    };
  }, []);

  // Calculate fill level for reactor core
  const fillLevel = Math.min(progress, 100);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-950 overflow-hidden">
      {/* Animated background layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-cyan-950/20 to-gray-950" />

      {/* Glowing orbs */}
      <GlowingOrb top="20%" left="10%" size="350px" color="bg-cyan-600/10" delay={0} />
      <GlowingOrb top="60%" left="70%" size="300px" color="bg-blue-600/10" delay={1} />
      <GlowingOrb top="40%" left="50%" size="400px" color="bg-indigo-600/8" delay={2} />

      {/* Grid overlay */}
      <GridOverlay />

      {/* Floating particles */}
      {particles.map(p => (
        <FloatingParticle key={p.id} {...p} />
      ))}

      {/* Data streams */}
      {dataStreams.map(stream => (
        <DataStream key={stream.id} {...stream} />
      ))}

      {/* Vignette effect */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/60 pointer-events-none" />

      {/* Main content */}
      <div className={`relative z-10 flex flex-col items-center transition-all duration-700 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        
        {/* Reactor Core Container */}
        <div className="relative mb-8">
          {/* Outer rotating rings */}
          <div className="absolute inset-0 -m-8 border-2 border-cyan-500/20 rounded-full animate-spin" style={{ animationDuration: '8s' }} />
          <div className="absolute inset-0 -m-12 border border-cyan-500/10 rounded-full animate-spin" style={{ animationDuration: '12s', animationDirection: 'reverse' }} />
          <div className="absolute inset-0 -m-16 border border-blue-500/5 rounded-full animate-spin" style={{ animationDuration: '20s' }} />

          {/* Pulsing glow */}
          <div className="absolute inset-0 -m-4 bg-cyan-500/20 blur-2xl rounded-full animate-pulse" />

          {/* Core container */}
          <div className="relative w-32 h-32 rounded-full bg-gray-900/90 border-4 border-cyan-500/30 shadow-2xl shadow-cyan-500/20 overflow-hidden">
            {/* Fill level (rising from bottom) */}
            <div
              className="absolute bottom-0 left-0 right-0 transition-all duration-300 ease-out"
              style={{
                height: `${fillLevel}%`,
                background: `linear-gradient(to top, 
                  rgba(6, 182, 212, 0.8), 
                  rgba(6, 182, 212, 0.4) 50%, 
                  rgba(14, 165, 233, 0.2)
                )`,
              }}
            >
              {/* Animated wave on top of fill */}
              <div
                className="absolute top-0 left-1/2 w-[200%] h-3"
                style={{
                  background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.3) 0%, transparent 70%)',
                  animation: 'wave 2s ease-in-out infinite',
                  transform: 'translateX(-50%)',
                }}
              />
              
              {/* Bubbles effect */}
              <div className="absolute inset-0 overflow-hidden">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-2 h-2 bg-cyan-300/40 rounded-full"
                    style={{
                      left: `${15 + i * 15}%`,
                      animation: `bubble ${1 + Math.random()}s ease-in-out infinite`,
                      animationDelay: `${i * 0.2}s`,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Center icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <Wifi 
                  size={36} 
                  className={`text-cyan-400 ${progress < 80 ? 'animate-pulse' : ''}`}
                  style={{ filter: 'drop-shadow(0 0 8px rgba(6, 182, 212, 0.8))' }}
                />
                {/* Signal waves */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div 
                    className="absolute w-12 h-12 border-2 border-cyan-400/30 rounded-full animate-ping"
                    style={{ animationDuration: '1.5s' }}
                  />
                </div>
              </div>
            </div>

            {/* Scan line */}
            <div
              className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent"
              style={{
                animation: 'scanVertical 2s linear infinite',
              }}
            />
          </div>

          {/* Corner indicators */}
          {[0, 90, 180, 270].map((rotation, i) => (
            <div
              key={rotation}
              className="absolute w-3 h-3"
              style={{
                top: '50%',
                left: '50%',
                transform: `rotate(${rotation}deg) translate(70px, -50%)`,
              }}
            >
              <div className={`w-2 h-2 rounded-full ${progress > i * 25 ? 'bg-cyan-400' : 'bg-gray-600'} transition-colors duration-300`} 
                   style={{ boxShadow: progress > i * 25 ? '0 0 10px rgba(6, 182, 212, 0.8)' : 'none' }} />
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="w-64 mb-6">
          <div className="relative h-2 bg-gray-800/80 rounded-full overflow-hidden border border-gray-700/50">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-all duration-300"
              style={{ width: `${fillLevel}%` }}
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
            </div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>{Math.round(fillLevel)}%</span>
            <span className="flex items-center gap-1">
              <Activity size={10} className="text-cyan-400" />
              <span className="text-cyan-400">SYNC</span>
            </span>
          </div>
        </div>

        {/* Status text */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 mb-2">
            Connecting
          </h2>
          <p className={`text-sm transition-all duration-300 ${isExtended ? 'text-amber-400' : 'text-gray-400'}`}>
            {statusText}
          </p>
        </div>

        {/* Connection indicators */}
        <div className="flex items-center gap-4 mt-6">
          {[
            { icon: Radio, label: 'Signal', delay: 0 },
            { icon: Zap, label: 'Power', delay: 0.2 },
            { icon: Signal, label: 'Network', delay: 0.4 },
          ].map(({ icon: Icon, label, delay }, i) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1"
              style={{ animationDelay: `${delay}s` }}
            >
              <div className={`p-2 rounded-lg ${progress > (i + 1) * 25 ? 'bg-cyan-500/20 border-cyan-500/40' : 'bg-gray-800/50 border-gray-700/50'} border transition-all duration-500`}>
                <Icon size={16} className={`${progress > (i + 1) * 25 ? 'text-cyan-400' : 'text-gray-500'} transition-colors duration-500`} />
              </div>
              <span className={`text-[10px] ${progress > (i + 1) * 25 ? 'text-cyan-400' : 'text-gray-600'} transition-colors duration-500`}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Extended loading message */}
        {isExtended && (
          <div className="mt-6 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl animate-fadeIn">
            <p className="text-amber-400 text-xs text-center">
              Connection is taking longer than expected. Retrying...
            </p>
          </div>
        )}
      </div>

      {/* Inline styles for animations */}
      <style jsx="true">{`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(1); opacity: 0; }
          10% { opacity: 0.8; }
          90% { opacity: 0.4; }
          100% { transform: translateY(-100vh) scale(0.5); opacity: 0; }
        }
        
        @keyframes dataStream {
          0% { top: -80px; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100vh; opacity: 0; }
        }
        
        @keyframes wave {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-3px); }
        }
        
        @keyframes bubble {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-20px); opacity: 0.8; }
        }
        
        @keyframes scanVertical {
          0% { top: 0%; }
          100% { top: 100%; }
        }
        
        @keyframes animate-fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fadeIn {
          animation: animate-fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

export default ConnectingPage;

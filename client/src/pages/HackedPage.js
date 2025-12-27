// src/pages/HackedPage.jsx
import React, { useEffect, useState, useMemo } from "react";
import { Zap, Skull, AlertTriangle, Radio, Wifi, WifiOff } from "lucide-react";
import LeaveGameButton from "../components/LeaveGameButton";
import { Vignette } from "../components/ui";

// Matrix rain character component with typing effect that falls down the screen
const MatrixColumn = ({ delay, duration, left, maxChars = 20 }) => {
  const [position, setPosition] = useState(-100); // Start above screen
  const [visibleCount, setVisibleCount] = useState(0);
  const characters = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF";
  
  const chars = useMemo(() => {
    return Array.from({ length: maxChars }, () => characters[Math.floor(Math.random() * characters.length)]);
  }, [maxChars]);

  // Falling animation combined with typing
  useEffect(() => {
    const startDelay = delay * 1000;
    let animationFrame;
    let typeTimer;
    
    const startTimeout = setTimeout(() => {
      setPosition(-100);
      setVisibleCount(1);
      
      // Type out characters
      typeTimer = setInterval(() => {
        setVisibleCount(prev => {
          if (prev >= maxChars) {
            return prev;
          }
          return prev + 1;
        });
      }, 60);
      
      // Fall down the screen
      const startTime = Date.now();
      const fallDuration = duration * 1000;
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / fallDuration;
        
        if (progress >= 1) {
          // Reset and start again
          setPosition(-100);
          setVisibleCount(1);
          setTimeout(() => {
            const newStartTime = Date.now();
            const animateLoop = () => {
              const newElapsed = Date.now() - newStartTime;
              const newProgress = newElapsed / fallDuration;
              if (newProgress >= 1) {
                setPosition(-100);
                setVisibleCount(1);
                setTimeout(animateLoop, 100);
              } else {
                setPosition(-100 + (newProgress * 220)); // -100 to 120 (goes off bottom)
                animationFrame = requestAnimationFrame(animateLoop);
              }
            };
            animateLoop();
          }, 100);
        } else {
          setPosition(-100 + (progress * 220)); // -100 to 120 (goes off bottom)
          animationFrame = requestAnimationFrame(animate);
        }
      };
      
      animate();
    }, startDelay);
    
    return () => {
      clearTimeout(startTimeout);
      clearInterval(typeTimer);
      cancelAnimationFrame(animationFrame);
    };
  }, [delay, duration, maxChars]);

  // Cycle the last character for flickering effect
  const [lastCharIndex, setLastCharIndex] = useState(0);
  useEffect(() => {
    const flickerTimer = setInterval(() => {
      setLastCharIndex(Math.floor(Math.random() * characters.length));
    }, 50);
    return () => clearInterval(flickerTimer);
  }, []);
  
  return (
    <div 
      className="absolute text-green-500 font-mono text-sm pointer-events-none"
      style={{ 
        left: `${left}%`, 
        top: `${position}%`,
        transition: 'none'
      }}
    >
      {chars.slice(0, visibleCount).map((char, i) => (
        <div 
          key={i} 
          className="leading-tight"
          style={{ 
            opacity: i === visibleCount - 1 ? 1 : Math.max(0.15, 1 - ((visibleCount - 1 - i) * 0.06)),
            color: i === visibleCount - 1 ? '#4ade80' : '#22c55e',
            textShadow: i === visibleCount - 1 ? '0 0 10px #4ade80, 0 0 20px #22c55e' : 'none'
          }}
        >
          {i === visibleCount - 1 ? characters[lastCharIndex] : char}
        </div>
      ))}
    </div>
  );
};

// Floating hex symbols
const HexSymbol = ({ children, className, style }) => (
  <div className={`absolute text-cyan-500/30 font-mono text-xs animate-hex-float ${className}`} style={style}>
    {children}
  </div>
);

// Glitchy data blocks
const DataBlock = ({ top, left, delay }) => (
  <div 
    className="absolute bg-cyan-500/10 border border-cyan-500/30 rounded animate-flicker-fast"
    style={{ 
      top: `${top}%`, 
      left: `${left}%`, 
      width: `${Math.random() * 60 + 20}px`,
      height: `${Math.random() * 20 + 5}px`,
      animationDelay: `${delay}s`
    }}
  />
);

const HackedPage = ({ hackTime, setHackTime }) => {
  const [glitchIntensity, setGlitchIntensity] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setHackTime((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [setHackTime]);

  // Random glitch intensity for extra chaos
  useEffect(() => {
    const glitchTimer = setInterval(() => {
      setGlitchIntensity(Math.random());
    }, 200);
    return () => clearInterval(glitchTimer);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  // Generate matrix rain columns - more columns for intense Matrix effect
  // maxChars decreases as timer approaches 0
  // Update every 10 seconds for smooth transition
  const hackTimeBucket = Math.floor(hackTime / 10);
  const matrixColumns = useMemo(() => {
    // Calculate max chars based on time remaining (more time = more chars)
    const baseMaxChars = Math.max(3, Math.floor((hackTimeBucket * 10 / 60) * 25));
    
    return Array.from({ length: 25 }, (_, i) => ({
      id: i,
      left: (i * 4) + Math.random() * 2, // More evenly distributed
      delay: Math.random() * 3,
      duration: 3 + Math.random() * 2,
      maxChars: Math.max(3, baseMaxChars + Math.floor(Math.random() * 8) - 4) // Vary by ±4
    }));
  }, [hackTimeBucket]);

  // Generate hex symbols
  const hexSymbols = useMemo(() => [
    { content: "0x4F3A", top: "15%", left: "10%" },
    { content: "0xDEAD", top: "25%", left: "85%" },
    { content: "0xBEEF", top: "70%", left: "8%" },
    { content: "0xCAFE", top: "60%", left: "90%" },
    { content: "0xFF00", top: "40%", left: "5%" },
    { content: "0x1337", top: "80%", left: "75%" },
  ], []);

  // Generate data blocks
  const dataBlocks = useMemo(() => 
    Array.from({ length: 8 }, (_, i) => ({
      id: i,
      top: Math.random() * 80 + 10,
      left: Math.random() * 80 + 10,
      delay: Math.random() * 2
    })), []
  );

  const isUrgent = hackTime <= 10;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black overflow-hidden">
      {/* Leave Game Button */}
      <LeaveGameButton className="fixed top-4 right-4 z-50" />

      {/* Base gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-cyan-950/30 to-gray-950" />
      
      {/* Animated circuit pattern */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `
          linear-gradient(90deg, transparent 49%, rgba(0, 255, 255, 0.3) 50%, transparent 51%),
          linear-gradient(0deg, transparent 49%, rgba(0, 255, 255, 0.3) 50%, transparent 51%)
        `,
        backgroundSize: '60px 60px'
      }} />

      {/* Matrix rain effect - enhanced */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {matrixColumns.map(col => (
          <MatrixColumn 
            key={col.id} 
            left={col.left}
            delay={col.delay}
            duration={col.duration}
            maxChars={col.maxChars}
          />
        ))}
      </div>

      {/* Floating hex codes */}
      {hexSymbols.map((hex, i) => (
        <HexSymbol 
          key={i} 
          style={{ top: hex.top, left: hex.left, animationDelay: `${i * 0.5}s` }}
        >
          {hex.content}
        </HexSymbol>
      ))}

      {/* Random data blocks */}
      {dataBlocks.map(block => (
        <DataBlock key={block.id} {...block} />
      ))}

      {/* Scan line effect */}
      <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50 animate-scan-line pointer-events-none" />
      
      {/* Additional horizontal scan lines */}
      <div className="absolute left-0 right-0 h-px bg-cyan-500/20 top-1/4 animate-pulse" />
      <div className="absolute left-0 right-0 h-px bg-cyan-500/20 top-2/4 animate-pulse" style={{ animationDelay: '0.5s' }} />
      <div className="absolute left-0 right-0 h-px bg-cyan-500/20 top-3/4 animate-pulse" style={{ animationDelay: '1s' }} />

      {/* Static overlay */}
      <div 
        className="absolute inset-0 pointer-events-none mix-blend-overlay animate-static-flicker"
        style={{
          opacity: 0.1 + glitchIntensity * 0.1,
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0, 255, 255, 0.03) 2px,
            rgba(0, 255, 255, 0.03) 4px
          )`
        }}
      />

      {/* Corner decorations */}
      <div className="absolute top-4 left-4 flex items-center gap-2 text-cyan-500/50">
        <WifiOff size={16} className="animate-flicker-fast" />
        <span className="font-mono text-xs">SIGNAL LOST</span>
      </div>
      <div className="absolute top-4 right-4 flex items-center gap-2 text-red-500/50">
        <AlertTriangle size={16} className="animate-pulse" />
        <span className="font-mono text-xs">BREACH DETECTED</span>
      </div>
      <div className="absolute bottom-4 left-4 flex items-center gap-2 text-cyan-500/30">
        <Radio size={16} />
        <span className="font-mono text-xs">COMMS JAMMED</span>
      </div>
      <div className="absolute bottom-4 right-4 flex items-center gap-2 text-cyan-500/30">
        <span className="font-mono text-xs">SYS_OVERRIDE</span>
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center px-4">
        {/* Pulsing rings behind skull */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="w-40 h-40 border-2 border-cyan-500/30 rounded-full animate-pulse-ring" />
          <div className="absolute inset-0 w-40 h-40 border-2 border-cyan-500/20 rounded-full animate-pulse-ring" style={{ animationDelay: '0.5s' }} />
          <div className="absolute inset-0 w-40 h-40 border-2 border-cyan-500/10 rounded-full animate-pulse-ring" style={{ animationDelay: '1s' }} />
        </div>

        {/* Skull icon */}
        <div className="relative mb-6">
          <Skull 
            size={80} 
            className={`mx-auto text-cyan-400 ${glitchIntensity > 0.7 ? 'animate-glitch-intense' : 'animate-pulse'}`}
            style={{ 
              filter: `drop-shadow(0 0 20px rgba(34, 211, 238, 0.5)) drop-shadow(${glitchIntensity > 0.8 ? '3px' : '0'} 0 0 rgba(255, 0, 0, 0.5))` 
            }}
          />
          <Zap 
            size={24} 
            className="absolute -top-2 -right-2 text-yellow-400 animate-flicker-fast" 
          />
        </div>

        {/* Glitch Text - HACKED */}
        <div className="relative mb-8">
          <h1 
            className="text-7xl md:text-8xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-400 animate-glitch"
            style={{
              textShadow: glitchIntensity > 0.5 
                ? `${3 * glitchIntensity}px 0 #ff0000, ${-3 * glitchIntensity}px 0 #00ffff`
                : '0 0 30px rgba(34, 211, 238, 0.5)'
            }}
          >
            HACKED
          </h1>
          
          {/* Glitch layers */}
          <h1 
            className="absolute top-0 left-0 right-0 text-7xl md:text-8xl font-mono font-bold text-red-500/50 animate-glitch-intense pointer-events-none"
            style={{ clipPath: 'inset(10% 0 60% 0)' }}
          >
            HACKED
          </h1>
          <h1 
            className="absolute top-0 left-0 right-0 text-7xl md:text-8xl font-mono font-bold text-cyan-300/50 animate-glitch pointer-events-none"
            style={{ clipPath: 'inset(60% 0 10% 0)', animationDelay: '0.1s' }}
          >
            HACKED
          </h1>
        </div>

        {/* EMP Effect subtitle */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <Wifi size={20} className="text-red-500 animate-flicker-fast" />
          <span className="text-red-400 font-mono text-lg tracking-widest animate-flicker">
            ELECTROMAGNETIC PULSE ACTIVE
          </span>
          <Wifi size={20} className="text-red-500 animate-flicker-fast" style={{ animationDelay: '0.3s' }} />
        </div>

        {/* Countdown Timer */}
        <div className={`relative ${isUrgent ? 'animate-pulse' : ''}`}>
          <div className="inline-block bg-gray-900/80 backdrop-blur-sm px-8 py-6 rounded-2xl border-2 border-cyan-500/50">
            <p className="text-gray-400 font-mono text-sm mb-2">SYSTEM RECOVERY IN</p>
            <p 
              className={`text-5xl md:text-6xl font-mono font-bold ${isUrgent ? 'text-red-400' : 'text-cyan-400'}`}
              style={{
                textShadow: isUrgent 
                  ? '0 0 20px rgba(248, 113, 113, 0.5)' 
                  : '0 0 20px rgba(34, 211, 238, 0.3)'
              }}
            >
              {formatTime(hackTime)}
            </p>
            
            {/* Progress bar */}
            <div className="mt-4 h-1 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 ${isUrgent ? 'bg-red-500' : 'bg-cyan-500'}`}
                style={{ width: `${Math.max(0, (hackTime / 60) * 100)}%` }}
              />
            </div>
          </div>
          
          {/* Decorative corners */}
          <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-500" />
          <div className="absolute -top-2 -right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-500" />
          <div className="absolute -bottom-2 -left-2 w-4 h-4 border-b-2 border-l-2 border-cyan-500" />
          <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-cyan-500" />
        </div>

        {/* Status messages */}
        <div className="mt-8 space-y-2">
          <p className="text-cyan-500/60 font-mono text-sm animate-flicker">
            &gt; All systems compromised
          </p>
          <p className="text-cyan-500/40 font-mono text-xs" style={{ animationDelay: '0.5s' }}>
            &gt; Communications disabled
          </p>
          <p className="text-cyan-500/30 font-mono text-xs" style={{ animationDelay: '1s' }}>
            &gt; Awaiting system restore...
          </p>
        </div>
      </div>

      {/* Vignette effect */}
      <Vignette intensity={70} />
    </div>
  );
};

export default HackedPage;

// src/pages/HackedPage.jsx
import React, { useEffect } from "react";

const HackedPage = ({ hackTime, setHackTime }) => {
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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  return (
    <div className="relative flex items-center justify-center h-screen bg-gray-900 overflow-hidden">
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black opacity-50"></div>

      {/* Static-like Overlay */}
      <div className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-20 animate-static-flicker 
                      bg-[repeating-linear-gradient(
                        0deg,
                        #000,
                        #000 1px,
                        #111 1px,
                        #111 2px
                      )]">
      </div>

      {/* Glitch Container */}
      <div className="relative z-10 text-center">
        {/* Glitch Text */}
        <h1 className="text-6xl font-mono text-white relative inline-block">
          <span className="relative inline-block animate-glitch">
            HACKED
            <span className="absolute top-0 left-0 w-full h-full animate-glitch text-white blur-sm">
              HACKED
            </span>
            <span className="absolute top-0 left-0 w-full h-full animate-glitch text-red-500 blur-[2px] opacity-75">
              HACKED
            </span>
          </span>
        </h1>

        {/* Countdown Timer */}
        <div className="mt-8 text-3xl font-semibold text-yellow-400 animate-flicker">
          Hack ends in: {formatTime(hackTime)}
        </div>
      </div>
    </div>
  );
};

export default HackedPage;

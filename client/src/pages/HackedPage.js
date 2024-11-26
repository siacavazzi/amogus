import React, { useEffect } from "react";

const HackedPage = ({ hackTime, setHackTime }) => {

  useEffect(() => {
    // Update the timeLeft every second
    const timer = setInterval(() => {
      setHackTime((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Optionally, you can add any action here when the hack ends
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Clean up the interval on component unmount
    return () => clearInterval(timer);
  }, []);

  // Format timeLeft as mm:ss
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  return (
    <div className="flex items-center justify-center h-screen bg-red-600 overflow-hidden">
      <div className="relative">
        {/* Glitch Text */}
        <h1 className="text-6xl font-mono text-white relative z-10">
          HACKED
        </h1>
        {/* Overlay for glitch effect */}
        <div className="absolute top-0 left-0 w-full h-full">
          <h1 className="text-6xl font-mono text-white relative glitch" data-text="HACKED">
            HACKED
          </h1>
        </div>
        {/* Countdown Timer */}
        <div className="mt-8 text-2xl text-yellow-300">
          Hack ends in: {formatTime(hackTime)}
        </div>
      </div>
      <style jsx>{`
        .glitch {
          position: absolute;
          top: 0;
          left: 0;
          color: white;
          background: red;
          overflow: hidden;
          clip: rect(0, 900px, 0, 0);
          animation: glitch-animation 2s infinite;
          text-shadow: 0 0 5px #fff, 0 0 10px #fff, 0 0 20px #fff;
        }

        .glitch::before,
        .glitch::after {
          content: attr(data-text);
          position: absolute;
          top: 0;
          left: 0;
          color: white;
          background: red;
          overflow: hidden;
          clip: rect(0, 900px, 0, 0);
        }

        .glitch::before {
          left: 2px;
          text-shadow: -2px 0 blue;
          animation: glitch-top 1.5s infinite linear;
        }

        .glitch::after {
          left: -2px;
          text-shadow: -2px 0 green;
          animation: glitch-bottom 1.5s infinite linear;
        }

        @keyframes glitch-animation {
          0% {
            text-shadow: 0 0 5px #fff, 0 0 10px #fff, 0 0 20px #fff;
          }
          50% {
            text-shadow: 0 0 10px #fff, 0 0 15px #fff, 0 0 30px #fff;
          }
          100% {
            text-shadow: 0 0 5px #fff, 0 0 10px #fff, 0 0 20px #fff;
          }
        }

        @keyframes glitch-top {
          0% {
            clip: rect(0, 900px, 0, 0);
          }
          25% {
            clip: rect(0, 900px, 15px, 0);
          }
          50% {
            clip: rect(0, 900px, 0, 0);
          }
          75% {
            clip: rect(0, 900px, 20px, 0);
          }
          100% {
            clip: rect(0, 900px, 0, 0);
          }
        }

        @keyframes glitch-bottom {
          0% {
            clip: rect(0, 900px, 0, 0);
          }
          25% {
            clip: rect(20px, 900px, 100px, 0);
          }
          50% {
            clip: rect(0, 900px, 50px, 0);
          }
          75% {
            clip: rect(0, 900px, 70px, 0);
          }
          100% {
            clip: rect(0, 900px, 0, 0);
          }
        }
      `}</style>
    </div>
  );
};

export default HackedPage;

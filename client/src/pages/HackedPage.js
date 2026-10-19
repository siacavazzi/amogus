// src/pages/HackedPage.jsx
import React, { useEffect, useRef, useState } from "react";
import LeaveGameButton from "../components/LeaveGameButton";
import { vibrate } from "../signal";

const STATIC_MS = 900;

// EMP: the phone fills with static for a moment, then goes black with a countdown.
const HackedPage = ({ hackTime }) => {
  const canvasRef = useRef(null);
  const [staticDone, setStaticDone] = useState(false);

  useEffect(() => {
    vibrate([60, 40, 60, 40, 60]);
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    let ctx = null;
    try {
      if (!/jsdom/i.test(navigator.userAgent)) ctx = canvasRef.current?.getContext('2d');
    } catch (e) {
      ctx = null;
    }
    if (!ctx || reduce) {
      setStaticDone(true);
      return undefined;
    }
    const img = ctx.createImageData(72, 148);
    const start = performance.now();
    let frame;
    const draw = () => {
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() * 255;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      if (performance.now() - start < STATIC_MS) frame = requestAnimationFrame(draw);
      else setStaticDone(true);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  return (
    <div className="sg-screen sg-black" style={{ overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        width="72"
        height="148"
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          imageRendering: 'pixelated',
          opacity: staticDone ? 0 : 1,
          transition: 'opacity .25s',
          pointerEvents: 'none',
        }}
      />
      <LeaveGameButton className="sg-corner" />

      <div className="sg-center" style={{ gap: 10, opacity: staticDone ? 1 : 0, transition: 'opacity .25s .15s' }}>
        <p className="sg-pill" style={{ background: 'rgba(255,255,255,0.12)' }}>HACKED</p>
        <h1 className="sg-big sg-h1">Devices down</h1>
        <p className="sg-lede" style={{ opacity: 0.7 }}>An intruder played EMP</p>
        <p className="sg-small" style={{ marginTop: 18 }}>Back in</p>
        <p
          key={hackTime <= 10 ? hackTime : 'steady'}
          className={`sg-big sg-num ${hackTime <= 10 ? 'sg-tick' : ''}`}
          style={{ fontSize: 'clamp(64px, 22vw, 104px)' }}
        >
          {formatTime(Math.max(0, hackTime || 0))}
        </p>
      </div>
    </div>
  );
};

export default HackedPage;

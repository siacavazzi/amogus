import React, { useEffect, useState, useContext } from 'react';
import { DataContext } from '../GameContext';
import { Wifi } from '../signal/icons';
import '../signal/signal.css';
import '../signal/host.css';

function ConnectingPage() {
  const { roomCode } = useContext(DataContext);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Starting up...');
  const [isExtended, setIsExtended] = useState(false);

  useEffect(() => {
    // Fast to 80%, then a slow crawl while we wait for the server.
    const fastInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 80) {
          clearInterval(fastInterval);
          return 80;
        }
        return prev + 4;
      });
    }, 40);

    const statusTimers = [
      { time: 200, text: 'Finding the game server...' },
      { time: 600, text: 'Almost there...' },
    ].map(({ time, text }) => setTimeout(() => setStatusText(text), time));

    let slowInterval;
    const slowTimer = setTimeout(() => {
      slowInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) {
            clearInterval(slowInterval);
            return 95;
          }
          return prev + 0.5;
        });
      }, 200);
    }, 1000);

    const extendedTimer = setTimeout(() => {
      setIsExtended(true);
      setStatusText('Taking longer than expected...');
    }, 3000);

    // Reload after 6 seconds if still connecting. Not while the phone is offline: a reload then
    // lands on the browser's "no internet" page, which never comes back by itself. Wait for the
    // connection instead (the socket usually reconnects on its own first).
    let reloadTimer;
    const reloadWhenOnline = () => {
      if (navigator.onLine === false) {
        reloadTimer = setTimeout(reloadWhenOnline, 1000);
        return;
      }
      window.location.reload();
    };
    reloadTimer = setTimeout(reloadWhenOnline, 6000);

    return () => {
      clearInterval(fastInterval);
      clearInterval(slowInterval);
      clearTimeout(slowTimer);
      clearTimeout(extendedTimer);
      clearTimeout(reloadTimer);
      statusTimers.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const fillLevel = Math.min(progress, 100);

  return (
    <div className="sg-screen sg-round">
      <div className="sg-center sg-a sg-rise" style={{ gap: 18 }}>
        <Wifi size={56} />
        <h1 className="sg-big sg-h2">{roomCode ? 'Reconnect to your room' : 'Connect to Sus Party'}</h1>
        <div
          className="hs-conn__bar"
          role="progressbar"
          aria-label="Connecting"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(fillLevel)}
        >
          <div className="hs-conn__fill" style={{ width: `${fillLevel}%` }} />
        </div>
        <p className="sg-lede" style={{ opacity: 0.85 }}>
          {roomCode ? 'Connection lost. We will try to reconnect you.' : statusText}
        </p>
        {isExtended && (
          <p className="hs-notice sg-a sg-rise" style={{ background: 'var(--sg-meet)', color: 'var(--sg-ink)' }}>
            Connection is taking longer than expected. Retrying...
          </p>
        )}
        <p className="sg-small" style={{ opacity: 0.6 }}>
          Sus Party is a free party game played on your phones. No app needed.
        </p>
      </div>
    </div>
  );
}

export default ConnectingPage;

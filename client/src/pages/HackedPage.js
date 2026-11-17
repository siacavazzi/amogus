// src/pages/HackedPage.jsx
import React from "react";
import LeaveGameButton from "../components/LeaveGameButton";
import { EmpBattery, EmpHit, useEmpIntro, useEmpProgress } from "../signal/Emp";
import { t } from '../i18n';

// EMP: a yellow bolt strikes the blue screen, the picture tears sideways, then the phone
// switches off like an old TV (the picture folds into a yellow line, then a dot). What's
// left is a dark phone with a battery recharging until the countdown runs out.
const HackedPage = ({ hackTime }) => {
  const phase = useEmpIntro();
  const progress = useEmpProgress(hackTime);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const down = phase === 'down';

  return (
    <div className="sg-screen sg-black" style={{ overflow: 'hidden' }}>
      <EmpHit phase={phase} boltSize={190} />

      <LeaveGameButton className="sg-corner" />

      <div className={`sg-center${down ? ' sg-emp-on' : ''}`} style={{ gap: 10, opacity: down ? 1 : 0 }}>
        <EmpBattery progress={progress} />
        <p className="sg-pill" style={{ background: 'rgba(255,255,255,0.12)', marginTop: 14 }}>{t('HACKED')}</p>
        <h1 className="sg-big sg-h1">{t('Devices down')}</h1>
        <p className="sg-lede" style={{ opacity: 0.7 }}>{t('An intruder played EMP')}</p>
        <p className="sg-small" style={{ marginTop: 18 }}>{t('Back in')}</p>
        <p
          key={hackTime <= 10 ? hackTime : 'steady'}
          className={`sg-big sg-num ${hackTime <= 10 ? 'sg-tick' : ''}`}
          style={{ fontSize: 'clamp(56px, 19vw, 96px)' }}
        >
          {formatTime(Math.max(0, hackTime || 0))}
        </p>
      </div>
    </div>
  );
};

export default HackedPage;

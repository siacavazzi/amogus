import React, { useEffect, useState } from 'react';
import { DataContext } from '../GameContext';
import HackedPage from '../pages/HackedPage';
import { ReactorEmp } from '../pages/ReactorPage';
import FakeTaskReveal from '../components/FakeTaskReveal';
import { TauntToast } from '../signal/Moments';
import MeetingWaitingPage from '../pages/MeetingWaitingPage';
import MeetingDisplay from '../components/MeetingDisplay';
import MeetingResultPage from '../pages/MeetingResultsPage';
import MeltdownInfo from '../pages/MeltdownInfo';
import ReactorMeltdown from '../pages/MeltdownPage';
import { GlitchHost, glitch } from '../signal/Glitch';
import '../signal/reactor.css';

// Development only (/fx-preview?fx=emp): plays one game moment on a loop-free stage so it
// can be watched or recorded without a live room. Nothing here talks to the server.
const noop = () => {};
const players = ['Sam', 'Alex', 'Jules', 'Morgan', 'Riley', 'Casey'].map((username, i) => ({
  player_id: `p${i}`, username, pic: i + 1, alive: true, active: true, sus: i === 1, ready: i > 3,
}));
const baseContext = {
  socket: { emit: noop, on: noop, off: noop },
  roomCode: 'LUNA',
  running: true,
  connected: true,
  players,
  playerState: players[0],
  roundId: 'r1',
  setMeetingState: noop,
  setVotes: noop,
  setVetoVotes: noop,
  setCodesNeeded: noop,
  codesNeeded: 2,
  meltdownCode: '4821',
};

function TaskBackdrop() {
  return (
    <div className="sg-screen sg-round">
      <div className="sg-center" style={{ gap: 12, alignItems: 'flex-start', textAlign: 'left' }}>
        <span className="sg-pill">Kitchen</span>
        <p className="sg-big sg-h2" style={{ maxWidth: '12ch' }}>Stack three mugs into a tower</p>
        <p className="sg-small">Task 4 of 10</p>
      </div>
    </div>
  );
}

function ReactorBackdrop() {
  return (
    <div className="sg sg-screen sg-round sg-rx">
      <div className="sg-rx__bar"><p className="sg-rx__brand">Sus Party <span style={{ opacity: 0.7, fontWeight: 700 }}>· Room LUNA</span></p></div>
      <div className="sg-rx__main">
        <p className="sg-rx__label">Tasks done</p>
        <p className="sg-rx__pct">42<small>%</small></p>
        <div className="sg-rx__track"><div className="sg-rx__fill" style={{ width: '42%' }} /></div>
        <p className="sg-rx__lede">At 100% the intruders are revealed</p>
      </div>
    </div>
  );
}

export default function FxPreview() {
  const params = new URLSearchParams(window.location.search);
  const fx = params.get('fx') || 'emp';
  const start = Number(params.get('t')) || 30;
  const [on, setOn] = useState(false);
  const [left, setLeft] = useState(start);

  useEffect(() => {
    const timer = setTimeout(() => setOn(true), Number(params.get('wait')) || 700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!on || !fx.startsWith('emp') || left <= 0) return undefined;
    const timer = setTimeout(() => setLeft((s) => s - 1), Number(params.get('tick')) || 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, fx, left]);

  useEffect(() => {
    if (!on || !fx.startsWith('melt') || left <= 0) return undefined;
    const timer = setTimeout(() => setLeft((s) => s - 1), Number(params.get('tick')) || 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, fx, left]);

  useEffect(() => {
    if (on && fx.startsWith('glitch')) glitch({ strength: fx === 'glitch-heavy' ? 'heavy' : 'light' });
  }, [on, fx]);

  const laptop = fx.endsWith('-laptop');
  const meeting = { stage: 'waiting', player_who_started_it: 'Alex', id: 'm1' };
  const caught = params.get('who') === 'crew' ? 'p3' : 'p1';
  const context = {
    ...baseContext,
    meetingState: fx.startsWith('vote') ? { stage: 'over', voted_out: caught, intruders_left: 0, id: 'm1' } : meeting,
    meltdownTimer: left,
  };
  return (
    <DataContext.Provider value={context}>
      <GlitchHost />
      {laptop ? <ReactorBackdrop /> : <TaskBackdrop />}
      {on && fx === 'meeting' && <MeetingWaitingPage />}
      {on && fx === 'meeting-laptop' && <MeetingDisplay stage="waiting" callerName="Alex" meeting={meeting} players={players} />}
      {on && fx === 'vote' && <MeetingResultPage />}
      {on && fx === 'melt' && left > 0 && <MeltdownInfo />}
      {on && fx === 'melt-laptop' && left > 0 && <ReactorMeltdown />}
      {on && fx === 'emp' && left > 0 && <HackedPage hackTime={left} />}
      {on && fx === 'emp-laptop' && left > 0 && <ReactorEmp hackTime={left} roomCode="LUNA" leave={null} />}
      {on && fx === 'fake' && <FakeTaskReveal task="Stack three mugs into a tower" location="Kitchen" onComplete={() => setOn(false)} />}
      {on && fx === 'taunt' && <TauntToast message="I saw you skip that task 👀" onClose={() => setOn(false)} />}
    </DataContext.Provider>
  );
}

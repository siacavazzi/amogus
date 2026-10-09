import React, { useEffect, useMemo, useState } from 'react';
import { DataContext } from '../GameContext';
import PreGamePage from '../pages/PreGamePage';
import LoginPage from '../pages/Login';
import CrewPage from '../pages/CrewPage';
import ReactorPage from '../pages/ReactorPage';
import './style-preview.css';

const noop = () => {};
const players = ['Sam', 'Alex', 'Jules', 'Morgan', 'Riley', 'Casey'].map((username, i) => ({
  player_id: `preview-${i}`, username, pic: i + 1, alive: true, active: true, sus: false, ready: false,
}));
const locations = ['Kitchen', 'Living Room', 'Other'];
const sampleTasks = [
  'Stack three mugs into a tower', 'Find the smallest spoon', 'Put an ice cube in a glass',
  'Sort five pieces of cutlery', 'Find something with a barcode', 'Fill a glass halfway',
  'Find a red object', 'Balance a spoon on your hand', 'Count the fridge magnets',
  'Straighten three cushions', 'Find a book with a blue cover', 'Turn a picture upside down',
  'Make a paper airplane', 'Find a remote control', 'Stack three books',
  'Count the plants', 'Find something round', 'Fold a blanket',
].map((task, i) => ({ task, location: i < 9 ? 'Kitchen' : 'Living Room' }));

// Local event adapter: preview controls never contact the game server.
function makePreviewSocket(notify, nextTask) {
  const listeners = new Map();
  let tasks = [...sampleTasks];
  const send = (event, value) => listeners.get(event)?.forEach(fn => fn(value));
  return {
    connected: true,
    on(event, fn) { if (!listeners.has(event)) listeners.set(event, new Set()); listeners.get(event).add(fn); },
    off(event, fn) { if (fn) listeners.get(event)?.delete(fn); else listeners.delete(event); },
    emit(event, data = {}) {
      if (event === 'get_collaborative_tasks') send('collaborative_tasks', { tasks, min_tasks: 18, is_owner: true });
      else if (event === 'add_collaborative_task') {
        tasks = [...tasks, data.task];
        send('collaborative_task_added', { task: data.task, min_tasks: 18 });
      } else if (event === 'remove_collaborative_task') {
        tasks = tasks.filter((_, i) => i !== data.index);
        send('collaborative_task_removed', { index: data.index });
      } else if (event === 'toggle_collaborative_mode') send('collaborative_mode_changed', { enabled: data.enabled });
      else if (event === 'complete_task') nextTask();
      else if (event === 'save_collaborative_tasks') {
        send('collaborative_tasks_saved', { code: 'DEMO', name: data.name, is_owner: true });
        notify('Task list saved in this preview.');
      } else if (event === 'meltdown') notify('Sabotage triggered. This is a visual preview only.');
      else if (event === 'start_game') notify('Ready to start. This is a visual preview only.');
      else if (event === 'leave_room') notify('Preview only — no live room to leave.');
      else if (event === 'join') notify(`Joining as avatar ${data.pic}${data.selfie ? ' with a selfie' : ''}. This is a visual preview only.`);
    },
  };
}

function PreviewScreen({ screen, proposed }) {
  const [notice, setNotice] = useState('');
  const [taskIndex, setTaskIndex] = useState(0);
  const socket = useMemo(() => makePreviewSocket(setNotice, () => setTaskIndex(i => i + 1)), []);
  useEffect(() => {
    document.body.classList.toggle('style-prototype', proposed);
    document.body.dataset.previewScreen = screen;
    return () => { document.body.classList.remove('style-prototype'); delete document.body.dataset.previewScreen; };
  }, [proposed, screen]);
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(timer);
  }, [notice]);
  const context = {
    socket, players, roomCode: 'LUNA', taskLocations: locations,
    playerState: players[0], isRoomCreator: true, running: screen !== 'pregame' && screen !== 'login',
    setPlayerState: noop, roomEntryStatus: null, setRoomEntryStatus: noop,
    task: sampleTasks[taskIndex % sampleTasks.length], setTaskEntry: noop,
    setShowAnimation: noop, showAnimation: false, setAudio: noop,
    killCooldown: 0, setKillCooldown: noop, intrudersRevealed: null,
    meetingState: null, hackTime: 0, endState: null,
    handleCallMeeting: () => setNotice('Meeting called. This is a visual preview only.'),
  };
  return <DataContext.Provider value={context}>
    {screen === 'pregame' ? <PreGamePage /> : screen === 'login' ? <LoginPage /> : screen === 'reactor' ? <ReactorPage /> : <CrewPage setShowSusPage={noop} />}
    {notice && <div className="preview-notice" role="status">{notice}</div>}
  </DataContext.Provider>;
}

export default function StylePreview() {
  const query = new URLSearchParams(window.location.search);
  const [screen, setScreen] = useState('pregame');
  const [proposed, setProposed] = useState(true);
  const [size, setSize] = useState('phone');
  useEffect(() => { document.title = 'Sus Party · Style preview'; }, []);
  if (query.has('screen')) return <PreviewScreen screen={query.get('screen')} proposed={query.get('style') !== 'current'} />;
  return <main className="preview-workbench">
    <header className="preview-header">
      <div><h1>Sus Party <span>/ Style preview</span></h1><p>Pass 02 · More play, less noise. Sample data only.</p></div>
      <a href="/" className="preview-exit">Back to site ↗</a>
    </header>
    <div className="preview-controls">
      <div className="preview-group" aria-label="Page">
        {['login', 'pregame', 'crew', 'reactor'].map((page, i) => <button key={page} aria-pressed={screen === page}
          onClick={() => { setScreen(page); setSize(page === 'reactor' ? 'desktop' : 'phone'); }}>
          {['00 Join', '01 Pregame', '02 Crew task', '03 Reactor'][i]}</button>)}
      </div>
      <div className="preview-group" aria-label="Style">
        <button aria-pressed={!proposed} onClick={() => setProposed(false)}>Current</button>
        <button aria-pressed={proposed} onClick={() => setProposed(true)}>Proposed</button>
      </div>
      <div className="preview-group" aria-label="Viewport">
        <button aria-pressed={size === 'phone'} onClick={() => setSize('phone')}>Phone</button>
        <button aria-pressed={size === 'desktop'} onClick={() => setSize('desktop')}>Desktop</button>
      </div>
    </div>
    <div className="preview-caption"><span>{proposed ? 'PROPOSED' : 'CURRENT'} / {screen.toUpperCase()}</span>
      <span>{screen === 'login' ? 'Enter a name, then pick an avatar or a selfie.' : screen === 'pregame' ? 'Try the Players and Tasks tabs.' : screen === 'crew' ? 'Try the task slider and meeting button.' : 'Try the sabotage button.'}</span></div>
    <div className={`preview-stage preview-stage--${size}`}>
      <iframe title={`${screen} — ${proposed ? 'proposed' : 'current'} style`} key={`${screen}-${proposed}`}
        src={`/style-preview?screen=${screen}&style=${proposed ? 'proposed' : 'current'}`} />
    </div>
    <footer className="preview-footer">Soft atmosphere · Candy-colored controls · Crisp panels · A little motion</footer>
  </main>;
}

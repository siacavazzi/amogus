import React, { useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { emitAsPlayer } from '../utils/playerCommand';
import { DataContext } from "../GameContext";
import MUECustomSlider from "../components/swiper";
import LeaveGameButton from "../components/LeaveGameButton";
import TestModeBar from "../components/TestModeBar";
import Avatar from "../components/Avatar";
import { getSelfieUrl, useSelfieFallback } from "../components/PlayerCard";
import { useCardSheets, needsSheet } from "../components/CardSheets";
import { MapPin, Repeat, StarFilled, Lock } from "../signal/icons";
import { rememberOrigin } from "../signal";
import { cardCopy, parseCards } from "../utils/cardCopy";
import { HackerGlitch, CardOfferSheet, DetectiveBar, useHackerWait } from "../components/RolePanels";
import { roleName } from "../utils/roles";
import { t, tn } from '../i18n';

// Crewmates and intruders share this deep blue screen and it looks the same for both: a hand of
// tasks (an intruder's cards dress up as tasks), the crew's bar, the room code, their own photo
// and how many intruders are still among them. Only a card lets an intruder call a meeting, so
// their button opens the vent instead. A crewmate's tap calls a meeting; holding shows the role.
const HOLD_START_MS = 350;
const HOLD_MS = 1000;
const HAND_SIZE = 3;
const KILL_COOLDOWN = 15;
const LIFT_MS = 420;
const STEAL_MS = 1500;
const ARM_MS = 2000;
const URGENT_SECONDS = 10;

function MeetingButton({ label, onTap, onHold, onRelease, highlight, quiet }) {
  const startTimer = useRef(null);
  const holdTimer = useRef(null);
  const longPress = useRef(false);
  const [filling, setFilling] = useState(false);

  const clear = () => {
    clearTimeout(startTimer.current);
    clearTimeout(holdTimer.current);
    setFilling(false);
  };
  useEffect(() => clear, []);

  const down = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    longPress.current = false;
    rememberOrigin(e.currentTarget);
    startTimer.current = setTimeout(() => {
      longPress.current = true;
      setFilling(true);
    }, HOLD_START_MS);
    holdTimer.current = setTimeout(() => {
      setFilling(false);
      onHold?.();
    }, HOLD_MS);
  };
  const up = () => {
    clear();
    if (longPress.current) onRelease?.();
  };
  const click = (e) => {
    if (longPress.current) {
      longPress.current = false;
      return;
    }
    rememberOrigin(e.currentTarget);
    onTap();
  };

  return (
    <button
      type="button"
      onPointerDown={down}
      onPointerUp={up}
      onPointerLeave={up}
      onPointerCancel={up}
      onClick={click}
      onContextMenu={(e) => e.preventDefault()}
      className={`sg-btn ${highlight ? 'animate-pulse' : ''}`}
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: 'auto',
        padding: '16px 26px',
        fontSize: 19,
        background: quiet ? 'rgba(0,0,0,0.22)' : 'var(--sg-ink)',
        color: quiet ? '#fff' : 'var(--sg-meet)',
        WebkitTouchCallout: 'none',
        touchAction: 'manipulation',
        ...(highlight ? { outline: '4px solid #fff', outlineOffset: 6 } : null),
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'currentColor',
          opacity: 0.22,
          transformOrigin: 'left center',
          transform: `scaleX(${filling ? 1 : 0})`,
          transition: filling ? `transform ${HOLD_MS - HOLD_START_MS}ms linear` : 'none',
        }}
      />
      <span style={{ position: 'relative' }}>{label}</span>
    </button>
  );
}

function Face({ playerState, selfieAccess }) {
  const [selfieUrl, onSelfieError] = useSelfieFallback(getSelfieUrl(playerState?.selfie, selfieAccess));
  return (
    <span className="sg-rh__face" data-testid="round-face">
      {selfieUrl ? (
        <img src={selfieUrl} referrerPolicy="no-referrer" alt={t('You')} onError={onSelfieError} />
      ) : (
        <Avatar id={playerState?.pic} decorative />
      )}
    </span>
  );
}

// The top of the round screen: the crew's bar, then room code, intruders left and your photo.
function RoundHeader({ crewScore, taskGoal, tasksDone, roomCode, intrudersLeft, hackersLeft, playerState, selfieAccess, tutorialMode }) {
  const goal = Math.max(taskGoal || 0, 1);
  const percent = Math.max(0, Math.min(100, Math.round((crewScore / goal) * 100))) || 0;
  const known = Number.isFinite(intrudersLeft);
  return (
    <header className="sg-rh">
      <div className="sg-rh__bar-label">
        <span>{t('CREW TASKS')}</span>
        <span>{percent}%</span>
      </div>
      <div
        className="sg-rh__track"
        role="progressbar"
        aria-valuenow={crewScore}
        aria-valuemin="0"
        aria-valuemax={goal}
        aria-label={t('Progress: {percentage}%', { percentage: percent })}
      >
        <div key={crewScore} className={`sg-rh__fill ${crewScore > 0 ? 'sg-bounce' : ''}`} style={{ width: `${percent}%` }} />
      </div>
      <span className="sg-rh__mine sg-num" data-testid="tasks-you-did">
        {t("You've done {count}", { count: tasksDone || 0 })}
      </span>
      <div className="sg-rh__row">
        {!tutorialMode && <LeaveGameButton />}
        <span className="sg-rh__room">
          <small>{t('ROOM')}</small>
          <b translate="no">{roomCode || '—'}</b>
        </span>
        <span className="sg-rh__pill" data-testid="intruders-left">
          <b className="sg-num">
            {known
              ? tn(intrudersLeft, '{count} intruder', '{count} intruders')
              : t('? intruders')}
          </b>
          {Number.isFinite(hackersLeft) && (
            <b className="sg-num" data-testid="hackers-left">{tn(hackersLeft, '+ {count} hacker', '+ {count} hackers')}</b>
          )}
          <small>{t('STILL AMONG YOU')}</small>
        </span>
        <Face playerState={playerState} selfieAccess={selfieAccess} />
      </div>
    </header>
  );
}

// A task with no set place (the host's "Other") says Anywhere, so every card has a place line.
function Where({ location }) {
  const anywhere = !location || location === 'Other';
  return (
    <span data-testid="task-location" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, opacity: anywhere ? 0.7 : 1 }}>
      <MapPin size={15} strokeWidth={2.75} style={{ color: '#e0a400' }} />
      {anywhere ? t('Anywhere') : location}
    </span>
  );
}

function TaskCard({ task, picked, locked, canSwap, onPick, onSwap, current, className = '' }) {
  return (
    <div className={`sg-tcard ${picked ? 'is-picked' : ''} ${locked ? 'is-locked' : ''} ${className}`} data-testid="hand-task">
      <button
        type="button"
        className="sg-tcard__pick"
        onClick={onPick}
        disabled={locked}
        aria-pressed={picked}
      >
        <span className="sg-tcard__text" data-testid={current ? 'current-task' : undefined}>{task.task}</span>
        <span className="sg-tcard__meta">
          <Where location={task.location} />
          {picked && <span className="sg-tcard__tag">{t('DOING THIS')}</span>}
        </span>
      </button>
      {(locked || canSwap) && (
        <span className="sg-tcard__side">
          {locked && <span className="sg-tcard__lock"><Lock size={13} /> {t('Locked')}</span>}
          {canSwap && !locked && (
            <button type="button" className="sg-tcard__swap" onClick={onSwap} aria-label={t('Swap this task')} data-testid="swap-task">
              <Repeat size={20} strokeWidth={2.5} />
            </button>
          )}
        </span>
      )}
    </div>
  );
}

function PriorityCard({ task, timeLeft, seconds, picked, locked, onPick, current }) {
  const urgent = timeLeft <= URGENT_SECONDS;
  const mins = Math.floor(timeLeft / 60);
  const secs = String(timeLeft % 60).padStart(2, '0');
  return (
    <div className={`sg-pri ${picked ? 'is-picked' : ''} ${urgent ? 'is-urgent' : ''}`} data-testid="priority-task">
      <button type="button" className="sg-tcard__pick" onClick={onPick} disabled={locked} aria-pressed={picked} style={{ position: 'relative', zIndex: 3 }}>
        <span className="sg-pri__top">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <StarFilled size={14} /> {t('PRIORITY · +1 AND A SWAP')}
          </span>
          <span className="sg-pri__time">{mins}:{secs}</span>
        </span>
        <span className="sg-tcard__text" data-testid={current ? 'current-task' : undefined}>{task.task}</span>
        <span className="sg-tcard__meta">
          <Where location={task.location} />
          {picked && <span className="sg-tcard__tag">{t('DOING THIS')}</span>}
          {locked && <span className="sg-tcard__lock">{t('Locked')}</span>}
        </span>
      </button>
      <div className="sg-pri__bar"><div style={{ width: `${Math.max(0, Math.min(1, timeLeft / (seconds || 60))) * 100}%` }} /></div>
    </div>
  );
}

// An intruder's card, dressed as a task. Tap to play: a bar fills for 2 s and a second tap takes it back.
function IntruderCard({ card, armed, onTap }) {
  const copy = cardCopy(card);
  return (
    <div className={`sg-tcard t-in ${armed ? 'is-picked' : ''}`} data-testid="hand-card">
      <button type="button" className="sg-tcard__pick" onClick={onTap} aria-pressed={armed}>
        <span className="sg-tcard__text" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <StarFilled size={16} style={{ color: '#e0a400', flexShrink: 0 }} />
          {copy.name}
        </span>
        <span className="sg-tcard__meta">
          <span>{armed ? t('Playing… tap again to stop') : copy.does}</span>
        </span>
      </button>
      {armed && <span className="sg-tcard__arm" />}
    </div>
  );
}

// An intruder's "You've done" counter counts the cards they play and their kills, kept on this
// phone only, so a glance at their header looks like any crewmate's. It never reaches stats.
function useIntruderCount(roundId, active) {
  const key = `sp_done_${roundId || ''}`;
  const read = () => {
    try { return Number(sessionStorage.getItem(key)) || 0; } catch (e) { return 0; }
  };
  const [count, setCount] = useState(read);
  useEffect(() => { setCount(read()); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const bump = () => {
    if (!active) return;
    const next = read() + 1;
    try { sessionStorage.setItem(key, String(next)); } catch (e) { /* private mode */ }
    setCount(next);
  };
  return [count, bump];
}

// How many seconds the Priority task has left, counted down here between the server's updates.
function usePriorityClock(priority, receivedAt, paused) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!priority || paused) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [priority, paused]);
  if (!priority) return 0;
  const elapsed = receivedAt ? Math.max(0, Math.floor((now - receivedAt) / 1000)) : 0;
  return Math.max(0, (priority.time_left ?? priority.seconds ?? 60) - elapsed);
}

const sameArea = (a, b) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

const CrewmemberPage = ({
  setShowSusPage,
  tutorialMode = false,
  onTutorialCompleteTask = null,
  tutorialHighlightTarget = null,
}) => {
  const game = useContext(DataContext);
  const {
    task,
    handState,
    socket,
    handleCallMeeting,
    setAudio,
    playerState,
    killCooldown = 0,
    setKillCooldown,
    intrudersRevealed,
    lastStand,
    roundId,
    roomCode,
    crewScore = 0,
    taskGoal = 0,
    connected,
    completeTask,
    taskCompletionPending,
    taskCompletionError,
    deniedLocation,
    meetingState,
    intrudersLeft,
    hackersLeft,
    hackerGlitchAt = 0,
    selfieAccess,
    swapTask,
    selectTask,
    tasksStolenAt = 0,
    tasksReshuffledAt = 0,
  } = game;

  const sus = !!playerState?.sus;
  // The Hacker plays like a crewmate (tasks, slider, meetings) and also holds cards.
  const isHacker = playerState?.role === 'hacker';
  const hackerWait = useHackerWait(isHacker ? hackerGlitchAt : 0);
  // Once tasks hit 100% everyone knows who the intruders are.
  const tasksComplete = !!intrudersRevealed;
  // Last stand (3-player rounds at 1v1): both players know who's who, so meetings are off.
  // Kills normally get reported at a meeting, so the crewmate reports their own here.
  const meetingsOff = !!lastStand && !sus;
  const lastStandTasksLeft = Math.max(taskGoal - crewScore, 0);
  const highlightTopAction = tutorialMode && tutorialHighlightTarget === 'top-action';
  const highlightSlider = tutorialMode && tutorialHighlightTarget === 'slider';

  const [peekRole, setPeekRole] = useState(false);
  const [pickedId, setPickedId] = useState(null);
  const [frozen, setFrozen] = useState(null);
  const [stealing, setStealing] = useState(false);
  const [toast, setToast] = useState(null);
  const [armedId, setArmedId] = useState(null);
  const [swapping, setSwapping] = useState(false);
  const armTimer = useRef(null);
  const [intruderDone, bumpIntruderDone] = useIntruderCount(roundId, sus && !tutorialMode);
  const { open: openCardSheet, sheet } = useCardSheets(game);
  const openCard = (card) => {
    if (!needsSheet(card)) bumpIntruderDone();
    openCardSheet(card);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  useEffect(() => () => clearTimeout(armTimer.current), []);

  // The hand from the server, or the single task an older snapshot (or the tutorial) carries.
  const hand = handState?.hand?.length ? handState.hand : (task?.task ? [task] : []);
  const priority = handState?.priority || null;
  const swaps = handState?.swaps || 0;
  const tasksDone = handState?.tasks_done || 0;
  const stolen = handState?.stolen || null;
  const priorityLeft = usePriorityClock(priority, handState?.received_at, !!meetingState);
  const showPriority = !!priority && priorityLeft > 0;

  const live = { hand, priority: showPriority ? priority : null };
  const view = frozen || live;
  const lastShown = useRef(live);

  // An intruder stole this hand: keep the old tasks on screen while they shimmer, then deal.
  const stealSeen = useRef(tasksStolenAt);
  useLayoutEffect(() => {
    if (!tasksStolenAt || tasksStolenAt === stealSeen.current) return undefined;
    stealSeen.current = tasksStolenAt;
    setFrozen({ ...lastShown.current, lifted: null });
    setStealing(true);
    setPickedId(null);
    const timer = setTimeout(() => {
      setStealing(false);
      setFrozen(null);
      setToast(t('An intruder stole your tasks. Here are new ones.'));
    }, STEAL_MS);
    return () => clearTimeout(timer);
  }, [tasksStolenAt]);

  const shuffleSeen = useRef(tasksReshuffledAt);
  useEffect(() => {
    if (!tasksReshuffledAt || tasksReshuffledAt === shuffleSeen.current) return;
    shuffleSeen.current = tasksReshuffledAt;
    setPickedId(null);
    if (!sus) setToast(t('An intruder reshuffled everyone’s tasks.'));
  }, [tasksReshuffledAt, sus]);

  useEffect(() => {
    if (!frozen) lastShown.current = live;
  });

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Forget a pick once that task is gone (done, swapped, expired or stolen).
  const allTasks = [...(live.priority ? [live.priority] : []), ...live.hand];
  const liveIds = allTasks.map((item) => item.assignment_id).join('|');
  useEffect(() => {
    if (pickedId && !frozen && !liveIds.split('|').includes(pickedId)) setPickedId(null);
  }, [pickedId, frozen, liveIds]);

  const isLocked = (item) => sameArea(item?.location, deniedLocation);
  // Nothing is picked until the player taps. A lone task (the tutorial, an old snapshot) needs no tap.
  const picked = allTasks.find((item) => item.assignment_id === pickedId)
    || (!handState && allTasks.length === 1 ? allTasks[0] : null);

  const pick = (item) => {
    const next = pickedId === item.assignment_id ? null : item.assignment_id;
    setPickedId(next);
    selectTask?.(next ? item : null);
  };

  const reportEliminated = () => {
    if (!window.confirm('Did the intruder get you? This ends the game.')) return;
    emitAsPlayer(game, 'player_dead', {
      player_id: playerState?.player_id || localStorage.getItem('player_id'),
      round_id: roundId,
    });
  };

  const handleTap = () => {
    if (meetingsOff) {
      reportEliminated();
    } else if (sus) {
      setShowSusPage(true);
    } else {
      handleCallMeeting();
    }
  };

  const handleHold = () => {
    if (sus) setShowSusPage(true);
    else setPeekRole(true);
  };

  const handleCompleteTask = async () => {
    if (onTutorialCompleteTask) {
      onTutorialCompleteTask({
        isIntruder: sus,
        hasTask: !!task,
        killCooldown,
      });
      return true;
    }

    if (sus) {
      if (killCooldown > 0) return false;
      socket.emit("kill_player", { player_id: localStorage.getItem("player_id") });
      setKillCooldown(KILL_COOLDOWN);
      bumpIntruderDone();
      return true;
    }

    if (!picked) return false;
    const snapshot = { ...lastShown.current, lifted: picked.assignment_id };
    const accepted = await completeTask(picked);
    if (accepted) {
      setAudio("complete_task");
      // The done task lifts away, then the new one drops into its place.
      setFrozen(snapshot);
      setPickedId(null);
      setTimeout(() => setFrozen(null), LIFT_MS);
    }
    return accepted;
  };

  const handleSwap = async (item) => {
    if (swapping) return;
    setSwapping(true);
    const ok = await swapTask?.(item);
    setSwapping(false);
    if (!ok) setToast(t('You can’t swap right now.'));
  };

  // Intruder cards: tap, a bar fills for 2 s, then it plays. Cards that need a choice open a sheet.
  const tapCard = (card) => {
    clearTimeout(armTimer.current);
    if (isHacker && hackerWait > 0 && armedId !== card.id) {
      setToast(t('Your next card is ready in {seconds} s.', { seconds: hackerWait }));
      return;
    }
    if (armedId === card.id) {
      setArmedId(null);
      return;
    }
    if (needsSheet(card)) {
      setArmedId(null);
      openCard(card);
      return;
    }
    setArmedId(card.id);
    armTimer.current = setTimeout(() => {
      setArmedId(null);
      openCard(card);
    }, ARM_MS);
  };

  const buttonLabel = meetingsOff ? t("I WAS ELIMINATED") : sus ? t("ENTER VENT") : t("CALL MEETING");
  const showSlider = !(tasksComplete && !sus);
  // The task a tap would most likely go to: the picked one, else the Priority, else the first one not locked.
  const currentId = (picked || [...(view.priority ? [view.priority] : []), ...view.hand].find((item) => !isLocked(item)))?.assignment_id;

  const renderCrewHand = () => (
    <div className={`sg-hand ${stealing ? 'is-stolen' : ''}`} data-testid="task-hand">
      <div className="sg-hand__head">
        <h2>{t('Your tasks')}</h2>
        {swaps > 0 && (
          <span className="sg-hand__swaps" data-testid="swaps-left">
            {tn(swaps, '{count} swap', '{count} swaps')}
          </span>
        )}
      </div>
      {view.priority && (
        <PriorityCard
          key={view.priority.assignment_id}
          task={view.priority}
          timeLeft={priorityLeft}
          seconds={view.priority.seconds}
          picked={picked?.assignment_id === view.priority.assignment_id}
          locked={isLocked(view.priority)}
          onPick={() => pick(view.priority)}
          current={currentId === view.priority.assignment_id}
        />
      )}
      {view.hand.map((item, index) => (
        <TaskCard
          key={item.assignment_id || `${item.task}-${index}`}
          task={item}
          className={view.lifted === item.assignment_id ? 't-lift' : 't-in'}
          picked={picked?.assignment_id === item.assignment_id && !!item.assignment_id}
          locked={isLocked(item)}
          canSwap={swaps > 0 && !swapping && !frozen}
          onPick={() => pick(item)}
          onSwap={() => handleSwap(item)}
          current={currentId === item.assignment_id}
        />
      ))}
      {view.hand.length === 0 && !view.priority && (
        <div className="sg-tcard is-empty">{t('Awaiting task assignment…')}</div>
      )}
    </div>
  );

  // The Hacker's cards sit under their tasks. A card arrives every 2 finished tasks.
  const renderHackerCards = () => {
    const cards = parseCards(playerState?.cards);
    const empty = Math.max(0, HAND_SIZE - cards.length);
    return (
      <div className="sg-hand sg-hacker-cards" data-testid="hacker-cards" style={{ marginTop: 18 }}>
        <div className="sg-hand__head">
          <h2>{t('Hacker cards')}</h2>
          {hackerWait > 0 && <span className="sg-hand__swaps" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>{t('Next in {seconds} s', { seconds: hackerWait })}</span>}
        </div>
        {cards.map((card) => (
          <IntruderCard key={card.id} card={card} armed={armedId === card.id} onTap={() => tapCard(card)} />
        ))}
        {Array.from({ length: empty }, (_, index) => (
          <div key={`empty-${index}`} className="sg-tcard is-empty">{t('Every 2 tasks earns a card')}</div>
        ))}
      </div>
    );
  };

  // An intruder's hand looks like a crewmate's: cards as tasks, then stolen tasks, then empty slots.
  const renderIntruderHand = () => {
    const cards = parseCards(playerState?.cards);
    const stolenTasks = (stolen?.tasks || []).slice(0, Math.max(0, HAND_SIZE - cards.length));
    const empty = Math.max(0, HAND_SIZE - cards.length - stolenTasks.length);
    return (
      <div className="sg-hand" data-testid="task-hand">
        <div className="sg-hand__head">
          <h2>{t('Your tasks')}</h2>
        </div>
        {cards.map((card) => (
          <IntruderCard key={card.id} card={card} armed={armedId === card.id} onTap={() => tapCard(card)} />
        ))}
        {stolenTasks.map((item, index) => (
          <div key={`stolen-${index}`} className="sg-tcard t-in" data-testid="stolen-task">
            <span className="sg-tcard__pick" style={{ cursor: 'default' }}>
              <span className="sg-tcard__text">{item.task}</span>
              <span className="sg-tcard__meta">
                <Where location={item.location} />
                <span>{t('· from {name}', { name: stolen.from })}</span>
              </span>
            </span>
          </div>
        ))}
        {Array.from({ length: empty }, (_, index) => (
          <div key={`empty-${index}`} className="sg-tcard is-empty">{t('You may draw a card after a meeting')}</div>
        ))}
      </div>
    );
  };

  const crewSliderText = () => {
    if (taskCompletionPending) return t('Confirming task…');
    if (!allTasks.length) return t('No task assigned');
    if (!picked) return t('Tap a task first');
    if (isLocked(picked)) return t('That area is locked');
    return t('Slide to complete task');
  };

  return (
    <div className={`sg-screen sg-round sg-deep ${stealing ? 'is-glitching' : ''}`} style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)', paddingBottom: 130, gap: 14 }}>
      {sheet}
      {isHacker && <HackerGlitch at={hackerGlitchAt} />}
      {isHacker && !tutorialMode && <CardOfferSheet />}
      <RoundHeader
        crewScore={crewScore}
        taskGoal={taskGoal}
        tasksDone={sus ? intruderDone : tasksDone}
        roomCode={roomCode}
        intrudersLeft={intrudersLeft}
        hackersLeft={hackersLeft}
        playerState={playerState}
        selfieAccess={selfieAccess}
        tutorialMode={tutorialMode}
      />

      <div className="flex flex-col items-center" style={{ gap: 10 }}>
        <MeetingButton
          label={buttonLabel}
          onTap={handleTap}
          onHold={handleHold}
          onRelease={() => setPeekRole(false)}
          highlight={highlightTopAction}
          quiet={meetingsOff}
        />
        {meetingsOff && (
          <p data-testid="last-stand-tasks-left" className="sg-lede">
            {tn(lastStandTasksLeft, 'Last stand: {count} task to win', 'Last stand: {count} tasks to win')}
          </p>
        )}
        <TestModeBar />
        {!tutorialMode && <DetectiveBar />}
      </div>

      <div className="w-full max-w-xl mx-auto">
        {peekRole ? (
          <div className="sg-a sg-pop" style={{ background: '#fff', color: 'var(--sg-deep)', borderRadius: 24, padding: '34px 22px', textAlign: 'center' }}>
            <p className="sg-small" style={{ opacity: 0.6 }}>{t('Your role')}</p>
            <p className="sg-big sg-h2" style={{ marginTop: 8 }}>{roleName(playerState?.role, false)}</p>
            <p className="sg-small" style={{ marginTop: 12, opacity: 0.6 }}>{t('Let go to hide it')}</p>
          </div>
        ) : tasksComplete && !sus ? (
          <div key="hunt" className="sg-a sg-rise">
            <p className="sg-small">{t('Every task is done')}</p>
            <h3 className="sg-big sg-h2" style={{ margin: '10px 0 18px' }}>{t('Find the intruders')}</h3>
            {intrudersRevealed?.intruder_names?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {intrudersRevealed.intruder_names.map((name, i) => (
                  <span key={i} className="sg-pill" style={{ background: '#fff', color: 'var(--sg-out)', fontSize: 18, padding: '9px 16px' }} translate="no">
                    {name}
                  </span>
                ))}
              </div>
            )}
            <p className="sg-lede" style={{ marginTop: 18, opacity: 0.85 }}>{t('Call a meeting and vote them out.')}</p>
            {isHacker && renderHackerCards()}
          </div>
        ) : sus ? renderIntruderHand() : (
          <>
            {renderCrewHand()}
            {isHacker && renderHackerCards()}
          </>
        )}
      </div>

      {showSlider && (
        <div className="fixed bottom-0 left-0 right-0 z-20">
          <div
            className={`max-w-xl mx-auto ${highlightSlider ? 'animate-pulse' : ''}`}
            style={highlightSlider ? { borderRadius: 999, outline: '4px solid #fff', outlineOffset: -8 } : {}}
          >
            <MUECustomSlider
              text={
                sus
                  ? killCooldown > 0 ? t('Next kill in {killCooldown}s', { killCooldown }) : t('Slide to eliminate')
                  : crewSliderText()
              }
              onSuccess={handleCompleteTask}
              disabled={sus ? killCooldown > 0 : !connected || taskCompletionPending || !picked || isLocked(picked)}
              pending={!sus && taskCompletionPending}
              meter={sus && killCooldown > 0 ? { fraction: (KILL_COOLDOWN - killCooldown) / KILL_COOLDOWN, color: 'var(--sg-out)' } : null}
            />
          </div>
          {!sus && taskCompletionError && (
            <p
              role="alert"
              className="sg fixed left-0 right-0 text-center"
              style={{ bottom: 104, fontWeight: 700, fontSize: 15, color: '#fff' }}
            >
              {taskCompletionError}
            </p>
          )}
        </div>
      )}

      {toast && <div className="sg-round-toast sg-a sg-rise" role="status">{toast}</div>}
    </div>
  );
};

CrewmemberPage.propTypes = {
  setShowSusPage: PropTypes.func,
  tutorialMode: PropTypes.bool,
  onTutorialCompleteTask: PropTypes.func,
  tutorialHighlightTarget: PropTypes.oneOf(['top-action', 'slider']),
};

export default CrewmemberPage;

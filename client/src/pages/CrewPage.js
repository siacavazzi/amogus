import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { DataContext } from "../GameContext";
import AnimationOverlay from "../components/AnimationOverlay";
import MUECustomSlider from "../components/swiper";
import LeaveGameButton from "../components/LeaveGameButton";
import TestModeBar from "../components/TestModeBar";
import { MapPin } from "../signal/icons";
import { rememberOrigin } from "../signal";

// Crewmates and intruders get this same blue screen with the same words on it. An intruder
// is shown a cover task from the room's task list, so a glance at their phone gives nothing away.
const COVER_TASKS = [
  { task: "Straighten three cushions", location: "Living room" },
  { task: "Count the fridge magnets", location: "Kitchen" },
  { task: "Find a book with a blue cover", location: "Living room" },
  { task: "Fold a towel and leave it on a bed", location: "Bedroom" },
  { task: "Line up the shoes by the door", location: "Hallway" },
];

// A tap calls a meeting. Holding for a second does something private: intruders open the
// vent, crewmates see their role. The fill looks the same for both.
const HOLD_START_MS = 350;
const HOLD_MS = 1000;

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
        padding: '18px 28px',
        fontSize: 20,
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

const CrewmemberPage = ({
  setShowSusPage,
  tutorialMode = false,
  onTutorialCompleteTask = null,
  tutorialHighlightTarget = null,
}) => {
  const {
    task,
    socket,
    setShowAnimation,
    showAnimation,
    handleCallMeeting,
    setAudio,
    playerState,
    killCooldown,
    setKillCooldown,
    intrudersRevealed,
    lastStand,
    roundId,
    crewScore = 0,
    taskGoal = 0,
    connected,
    completeTask,
    taskCompletionPending,
    taskCompletionError,
    lobbyState,
    taskLocations,
  } = useContext(DataContext);

  const sus = !!playerState?.sus;
  // Once tasks hit 100% everyone knows who the intruders are.
  const tasksComplete = !!intrudersRevealed;
  // Last stand (3-player rounds at 1v1): both players know who's who, so meetings are off.
  // Kills normally get reported at a meeting, so the crewmate reports their own here.
  const meetingsOff = !!lastStand && !sus;
  const lastStandTasksLeft = Math.max(taskGoal - crewScore, 0);
  const highlightTopAction = tutorialMode && tutorialHighlightTarget === 'top-action';
  const highlightSlider = tutorialMode && tutorialHighlightTarget === 'slider';

  const [peekRole, setPeekRole] = useState(false);
  const [coverIndex, setCoverIndex] = useState(() => Math.floor(Math.random() * 1000));

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // The intruder's cover task: a real task from this room's list, so it reads like everyone else's.
  const coverTask = useMemo(() => {
    const roomTasks = (lobbyState?.tasks || []).filter((t) => t?.task);
    const pool = roomTasks.length ? roomTasks : COVER_TASKS;
    const picked = pool[coverIndex % pool.length];
    const location = picked.location || (taskLocations?.length ? taskLocations[coverIndex % taskLocations.length] : 'Other');
    return { task: picked.task, location, assignment_id: `cover-${coverIndex}` };
  }, [lobbyState, taskLocations, coverIndex]);

  const shownTask = sus ? coverTask : task;

  const reportEliminated = () => {
    if (!window.confirm('Did the intruder get you? This ends the game.')) return;
    socket?.emit('player_dead', {
      player_id: playerState?.player_id || localStorage.getItem('player_id'),
      round_id: roundId,
    });
  };

  const handleTap = () => {
    if (meetingsOff) {
      reportEliminated();
    } else if (sus && (lastStand || tutorialMode)) {
      // Nobody is fooled at a last stand, and the tutorial still teaches the vent with a tap.
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
      // An intruder's swipe logs a kill, but looks and sounds exactly like finishing a task.
      if (killCooldown <= 0) {
        socket.emit("kill_player", { player_id: localStorage.getItem("player_id") }); // doesnt do anything yet...
        setKillCooldown(15);
      }
      setAudio("complete_task");
      setShowAnimation(true);
      return true;
    }

    if (!task) return false;
    const accepted = await completeTask(task);
    if (accepted) {
      setAudio("complete_task");
      setShowAnimation(true);
    }
    return accepted;
  };

  const handleAnimationComplete = () => {
    setShowAnimation(false);
    if (sus) setCoverIndex((i) => i + 1);
  };

  const buttonLabel = meetingsOff ? "I WAS ELIMINATED" : "CALL MEETING";
  const showSlider = !(tasksComplete && !sus);

  return (
    <div className="sg-screen sg-round" style={{ paddingBottom: 130 }}>
      {!tutorialMode && <LeaveGameButton className="sg-corner" />}

      <div className="flex flex-col items-center" style={{ marginTop: 18, gap: 12 }}>
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
            Last stand: {lastStandTasksLeft} {lastStandTasksLeft === 1 ? 'task' : 'tasks'} to win
          </p>
        )}
        <TestModeBar />
      </div>

      <div className="flex-1 flex flex-col justify-center w-full max-w-xl mx-auto" style={{ paddingTop: 28 }}>
        {peekRole ? (
          <div className="sg-a sg-pop" style={{ background: '#fff', color: 'var(--sg-round)', borderRadius: 24, padding: '34px 22px', textAlign: 'center' }}>
            <p className="sg-small" style={{ opacity: 0.6 }}>Your role</p>
            <p className="sg-big sg-h2" style={{ marginTop: 8 }}>Crewmate</p>
            <p className="sg-small" style={{ marginTop: 12, opacity: 0.6 }}>Let go to hide it</p>
          </div>
        ) : tasksComplete && !sus ? (
          <div key="hunt" className="sg-a sg-rise">
            <p className="sg-small">Every task is done</p>
            <h3 className="sg-big sg-h2" style={{ margin: '10px 0 18px' }}>Find the intruders</h3>
            {intrudersRevealed?.intruder_names?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {intrudersRevealed.intruder_names.map((name, i) => (
                  <span key={i} className="sg-pill" style={{ background: '#fff', color: 'var(--sg-out)', fontSize: 18, padding: '9px 16px' }}>
                    {name}
                  </span>
                ))}
              </div>
            )}
            <p className="sg-lede" style={{ marginTop: 18, opacity: 0.85 }}>Call a meeting and vote them out.</p>
          </div>
        ) : shownTask ? (
          <div key={shownTask.assignment_id || shownTask.task} className="sg-a sg-drop" style={{ animationDelay: '120ms' }}>
            <p className="sg-small">Current task</p>
            <h3 className="sg-big" style={{ fontSize: 'clamp(32px, 10.5vw, 46px)', margin: '12px 0 18px', lineHeight: 1 }}>
              {shownTask.task}
            </h3>
            {shownTask.location && (
              <span className="sg-pill" data-testid="task-location">
                <MapPin size={16} strokeWidth={2.75} />
                {shownTask.location}
              </span>
            )}
          </div>
        ) : (
          <div>
            <p className="sg-small">Current task</p>
            <h3 className="sg-big sg-h3" style={{ marginTop: 12, opacity: 0.8 }}>Awaiting task assignment…</h3>
          </div>
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
                !sus && taskCompletionPending
                  ? "Confirming task…"
                  : shownTask
                  ? "Slide to complete task"
                  : "No task assigned"
              }
              onSuccess={handleCompleteTask}
              disabled={sus ? (tutorialMode && killCooldown > 0) : !connected || taskCompletionPending || !task}
              pending={!sus && taskCompletionPending}
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

      {showAnimation && <AnimationOverlay onComplete={handleAnimationComplete} />}
    </div>
  );
};

CrewmemberPage.propTypes = {
  task: PropTypes.shape({
    assignment_id: PropTypes.string,
    round_id: PropTypes.string,
    task: PropTypes.string,
    location: PropTypes.string,
  }),
  tutorialMode: PropTypes.bool,
  onTutorialCompleteTask: PropTypes.func,
  tutorialHighlightTarget: PropTypes.oneOf(['top-action', 'slider']),
};

CrewmemberPage.defaultProps = {
  task: { task: "", location: "" },
  tutorialMode: false,
  onTutorialCompleteTask: null,
  tutorialHighlightTarget: null,
};

export default CrewmemberPage;

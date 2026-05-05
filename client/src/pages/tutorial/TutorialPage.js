import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, GraduationCap } from 'lucide-react';
import { DataContext } from '../../GameContext';
import CrewmemberPage from '../CrewPage';
import MeetingWaitingPage from '../MeetingWaitingPage';
import VotingPage from '../VotingPage';
import MeetingResultPage from '../MeetingResultsPage';
import IntruderPage from '../IntruderPage';
import {
  TUTORIAL_PLAYER_ID,
  crewTutorialPlayers,
  intruderTutorialPlayers,
  tutorialCoachCopy,
  tutorialLocations,
  tutorialTask,
  tutorialTrainingCards,
} from './tutorialData';
import { markTutorialCompleted } from '../../tutorial/tutorialStorage';

function clonePlayers(players) {
  return players.map((player) => ({ ...player }));
}

function cloneCards(cards) {
  return cards.map((card) => ({ ...card }));
}

// safeBottom = px from screen bottom where the compact coach card sits
// modal = true means full-screen centred modal (intro / complete)
const tutorialCoachLayout = {
  intro:           { modal: true },
  crewTask:        { safeBottom: 110 },
  crewCallMeeting: { safeBottom: 12 },
  meetingWaiting:  { safeBottom: 110 },
  voting:          { safeBottom: 195 },
  results:         { safeBottom: 100 },
  intruderIntro:   { modal: true },
  intruderKill:    { safeBottom: 110 },
  intruderCooldown:{ safeBottom: 110 },
  intruderVent:    { safeBottom: 110 },
  intruderCards:   { safeBottom: 90 },
  complete:        { modal: true },
};

function TutorialCoach({ accent, title, body, step, modal = false, safeBottom = 12, children, returnTo }) {
  const accentClasses = {
    cyan: 'border-cyan-400/30 bg-cyan-500/15 text-cyan-200',
    amber: 'border-amber-400/30 bg-amber-500/15 text-amber-200',
    purple: 'border-purple-400/30 bg-purple-500/15 text-purple-200',
    rose: 'border-rose-400/30 bg-rose-500/15 text-rose-200',
    orange: 'border-orange-400/30 bg-orange-500/15 text-orange-200',
    emerald: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200',
  };

  const exitLink = (
    <a
      href={returnTo}
      className="shrink-0 inline-flex items-center gap-1 rounded-xl border border-gray-700/70 bg-gray-900/80 px-2.5 py-1.5 text-xs font-semibold text-gray-300 transition-colors hover:border-gray-600 hover:text-white"
    >
      <ArrowLeft size={12} />
      <span>Exit</span>
    </a>
  );

  if (modal) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
        <div className="pointer-events-auto w-full max-w-md rounded-3xl border border-gray-800/80 bg-gray-950/95 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${accentClasses[accent] || accentClasses.cyan}`}>
                <GraduationCap size={14} />
                <span>{step}</span>
              </div>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-white">{title}</h2>
            </div>
            {exitLink}
          </div>
          <p className="mt-4 text-sm leading-7 text-gray-300">{body}</p>
          {children ? <div className="mt-4">{children}</div> : null}
        </div>
      </div>
    );
  }

  // Compact floating card anchored above the active controls
  return (
    <div
      className="fixed inset-x-0 z-[70] flex justify-center px-3 pointer-events-none"
      style={{ bottom: `${safeBottom}px` }}
    >
      <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-gray-700/50 bg-gray-950/92 px-4 py-3 shadow-xl backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] mb-1.5 ${accentClasses[accent] || accentClasses.cyan}`}>
              <GraduationCap size={11} />
              <span>{step}</span>
            </div>
            <p className="text-sm leading-6 text-gray-200">{body}</p>
          </div>
          {exitLink}
        </div>
        {children ? <div className="mt-3">{children}</div> : null}
      </div>
    </div>
  );
}

function StatusBullet({ done, children }) {
  return (
    <div className={`rounded-2xl border px-3 py-2 text-xs font-medium transition-colors ${done ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100' : 'border-gray-800/80 bg-gray-950/70 text-gray-400'}`}>
      {done ? 'Done' : 'Next'}: {children}
    </div>
  );
}

function TutorialPage() {
  const [phase, setPhase] = useState('intro');
  const [players, setPlayers] = useState(() => clonePlayers(crewTutorialPlayers));
  const [meetingState, setMeetingStateState] = useState(undefined);
  const [votes, setVotes] = useState({});
  const [vetoVotes, setVetoVotes] = useState(0);
  const [, setMessage] = useState(undefined);
  const [showAnimation, setShowAnimation] = useState(false);
  const [crewTaskCompleted, setCrewTaskCompleted] = useState(false);
  const [killCooldown, setKillCooldown] = useState(0);
  const [killTriggered, setKillTriggered] = useState(false);
  const [showSusPage, setShowSusPage] = useState(false);
  const [intruderCards, setIntruderCards] = useState(() => cloneCards(tutorialTrainingCards));
  const [activeCards, setActiveCards] = useState([]);
  const [cardLessonPhase, setCardLessonPhase] = useState('swipe');
  const timeoutRefs = useRef([]);
  const coachLayout = tutorialCoachLayout[phase] || tutorialCoachLayout.intro;

  const returnTo = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('returnTo') === 'how-to-play' ? '/how-to-play' : '/play';
  }, []);

  const queueTimeout = useCallback((callback, delay) => {
    const timeoutId = window.setTimeout(callback, delay);
    timeoutRefs.current.push(timeoutId);
  }, []);

  const clearQueuedTimeouts = useCallback(() => {
    timeoutRefs.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutRefs.current = [];
  }, []);

  const resetCrewState = useCallback(() => {
    setPlayers(clonePlayers(crewTutorialPlayers));
    setMeetingStateState(undefined);
    setVotes({});
    setVetoVotes(0);
    setMessage(undefined);
    setShowAnimation(false);
    setCrewTaskCompleted(false);
  }, []);

  const resetIntruderState = useCallback(() => {
    setPlayers(clonePlayers(intruderTutorialPlayers));
    setKillCooldown(0);
    setKillTriggered(false);
    setShowSusPage(false);
    setIntruderCards(cloneCards(tutorialTrainingCards));
    setActiveCards([]);
    setCardLessonPhase('swipe');
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    return () => clearQueuedTimeouts();
  }, [clearQueuedTimeouts]);

  useEffect(() => {
    if (crewTaskCompleted && !showAnimation && phase === 'crewTask') {
      setCrewTaskCompleted(false);
      setPhase('crewCallMeeting');
    }
  }, [crewTaskCompleted, phase, showAnimation]);

  useEffect(() => {
    if (phase === 'intruderCooldown' && killTriggered && killCooldown === 0) {
      setKillTriggered(false);
      setPhase('intruderVent');
    }
  }, [killCooldown, killTriggered, phase]);

  useEffect(() => {
    if (phase === 'complete') {
      markTutorialCompleted();
    }
  }, [phase]);

  useEffect(() => {
    if (activeCards.length === 0) return undefined;

    const intervalId = window.setInterval(() => {
      setActiveCards((existingCards) => existingCards
        .map((card) => ({
          ...card,
          time_left: typeof card.time_left === 'number' ? Math.max(0, card.time_left - 1) : card.time_left,
        }))
        .filter((card) => !(typeof card.time_left === 'number' && card.time_left <= 0)));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [activeCards.length]);

  // Countdown the kill cooldown in tutorial mode (real game does this server-side)
  useEffect(() => {
    if (phase !== 'intruderCooldown') return undefined;
    const id = window.setInterval(() => {
      setKillCooldown((k) => Math.max(0, k - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  const isIntruderSurface = ['intruderIntro', 'intruderKill', 'intruderCooldown', 'intruderVent', 'intruderCards', 'complete'].includes(phase);
  const me = useMemo(() => (
    players.find((player) => player.player_id === TUTORIAL_PLAYER_ID) || {
      player_id: TUTORIAL_PLAYER_ID,
      username: 'You',
      alive: true,
      ready: false,
      sus: isIntruderSurface,
    }
  ), [isIntruderSurface, players]);

  const handleCallMeeting = useCallback(() => {
    if (phase !== 'crewCallMeeting') return;
    setMeetingStateState({
      stage: 'waiting',
      time_left: 30,
      player_who_started_it: 'You',
      voted_out: null,
      reason: null,
    });
    setPhase('meetingWaiting');
  }, [phase]);

  const handleVoteProgression = useCallback((selectedPlayerId) => {
    setVotes({ [selectedPlayerId]: 1 });
    queueTimeout(() => {
      setMeetingStateState({
        stage: 'over',
        time_left: 0,
        voted_out: selectedPlayerId,
        reason: 'votes',
      });
      setPhase('results');
    }, 900);
  }, [queueTimeout]);

  const handlePlayCard = useCallback((payload) => {
    if (phase !== 'intruderCards') return;

    if (payload.card_id === 'tutorial-fake-task' && payload.extra_data) {
      setIntruderCards((cards) => cards.filter((card) => card.id !== payload.card_id));
      setCardLessonPhase('areaDenial');
      return;
    }

    if (payload.card_id === 'tutorial-area-denial') {
      setIntruderCards((cards) => cards.filter((card) => card.id !== payload.card_id));
      const areaDenialCard = intruderCards.find((card) => card.id === payload.card_id);
      if (areaDenialCard) {
        setActiveCards((cards) => [
          ...cards,
          {
            ...areaDenialCard,
            active: true,
            time_left: areaDenialCard.duration || areaDenialCard.time_left || 60,
          },
        ]);
      }
      setCardLessonPhase('complete');
      setPhase('complete');
    }
  }, [intruderCards, phase]);

  const handleTutorialCrewAction = useCallback(({ isIntruder, killCooldown: currentCooldown }) => {
    if (!isIntruder) {
      if (phase !== 'crewTask') return;
      setCrewTaskCompleted(true);
      setShowAnimation(true);
      return;
    }

    if (phase !== 'intruderKill' || currentCooldown > 0) return;
    setKillTriggered(true);
    setKillCooldown(3);
    setPhase('intruderCooldown');
  }, [phase]);

  const socket = useMemo(() => ({
    connected: true,
    emit: (eventName, payload) => {
      if (eventName === 'ready' && phase === 'meetingWaiting') {
        setPlayers((currentPlayers) => currentPlayers.map((player) => (
          player.player_id === TUTORIAL_PLAYER_ID ? { ...player, ready: true } : player
        )));
        queueTimeout(() => {
          setPlayers((currentPlayers) => currentPlayers.map((player) => ({ ...player, ready: true })));
        }, 500);
        queueTimeout(() => {
          setMeetingStateState((currentState) => ({
            ...currentState,
            stage: 'voting',
            time_left: 45,
          }));
          setPhase('voting');
        }, 1200);
        return;
      }

      if (eventName === 'vote' && phase === 'voting' && payload?.votedFor) {
        handleVoteProgression(payload.votedFor);
        return;
      }

      if (eventName === 'veto' && phase === 'voting') {
        setVetoVotes((currentVotes) => currentVotes + 1);
        queueTimeout(() => {
          setMeetingStateState({
            stage: 'over',
            time_left: 0,
            voted_out: null,
            reason: 'veto',
          });
          setPhase('results');
        }, 900);
        return;
      }

      if (eventName === 'play_card' && phase === 'intruderCards') {
        handlePlayCard(payload || {});
      }
    },
  }), [handlePlayCard, handleVoteProgression, phase, queueTimeout]);

  const setMeetingState = useCallback((value) => {
    if (phase === 'results' && value === undefined) {
      clearQueuedTimeouts();
      resetIntruderState();
      setMeetingStateState(undefined);
      setVotes({});
      setVetoVotes(0);
      setPhase('intruderIntro');
      return;
    }

    setMeetingStateState(value);
  }, [clearQueuedTimeouts, phase, resetIntruderState]);

  const handleTutorialVentToggle = useCallback((nextValue) => {
    if (nextValue && phase === 'intruderVent') {
      setShowSusPage(true);
      setPhase('intruderCards');
      return;
    }

    if (!nextValue && phase === 'intruderCards') {
      setShowSusPage(false);
      setPhase('intruderVent');
    }
  }, [phase]);

  const handleTutorialCardFocusChange = useCallback((activeIndex, activeCard) => {
    if (phase !== 'intruderCards') return;

    if (cardLessonPhase === 'swipe' && activeIndex !== 0) {
      setCardLessonPhase('fakeTask');
      return;
    }

    if (cardLessonPhase === 'areaDenial' && activeCard?.action === 'Area Denial') {
      setCardLessonPhase('areaDenial-ready');
    }
  }, [cardLessonPhase, phase]);

  const playerState = useMemo(() => ({
    ...me,
    playerId: TUTORIAL_PLAYER_ID,
    player_id: TUTORIAL_PLAYER_ID,
    sus: isIntruderSurface,
    cards: intruderCards.map((card) => JSON.stringify(card)),
  }), [intruderCards, isIntruderSurface, me]);

  const contextValue = useMemo(() => ({
    task: ['intro', 'crewTask', 'crewCallMeeting'].includes(phase) ? tutorialTask : undefined,
    socket,
    setShowAnimation,
    showAnimation,
    handleCallMeeting,
    setAudio: () => {},
    playerState,
    killCooldown,
    setKillCooldown,
    killCooldownMax: 3,
    intrudersRevealed: null,
    players,
    meetingState,
    setMessage,
    vetoVotes,
    votes,
    setMeetingState,
    setVotes,
    setVetoVotes,
    activeCards,
    taskLocations: tutorialLocations,
    showSusPage,
    setShowSusPage: handleTutorialVentToggle,
  }), [activeCards, handleCallMeeting, handleTutorialVentToggle, killCooldown, meetingState, phase, playerState, players, setMeetingState, showAnimation, showSusPage, socket, vetoVotes, votes]);

  const coachCopy = tutorialCoachCopy[phase];
  const areaDenialDone = ['areaDenial', 'areaDenial-ready', 'complete'].includes(cardLessonPhase) || phase === 'complete';

  const renderSurface = () => {
    if (['intro', 'crewTask', 'crewCallMeeting'].includes(phase)) {
      return (
        <CrewmemberPage
          tutorialMode
          tutorialHighlightTarget={phase === 'crewTask' ? 'slider' : phase === 'crewCallMeeting' ? 'top-action' : null}
          setShowSusPage={() => {}}
          onTutorialCompleteTask={handleTutorialCrewAction}
        />
      );
    }

    if (phase === 'meetingWaiting') {
      return <MeetingWaitingPage tutorialMode tutorialHighlightTarget="ready-slider" />;
    }

    if (phase === 'voting') {
      return <VotingPage tutorialMode tutorialHighlightTarget="vote-flow" />;
    }

    if (phase === 'results') {
      return <MeetingResultPage tutorialMode tutorialHighlightTarget="continue" />;
    }

    if (['intruderIntro', 'intruderKill', 'intruderCooldown', 'intruderVent'].includes(phase)) {
      return (
        <CrewmemberPage
          tutorialMode
          tutorialHighlightTarget={phase === 'intruderKill' ? 'slider' : phase === 'intruderVent' ? 'top-action' : null}
          setShowSusPage={handleTutorialVentToggle}
          onTutorialCompleteTask={handleTutorialCrewAction}
        />
      );
    }

    return (
      <IntruderPage
        tutorialMode
        tutorialHighlightTarget="cards"
        setShowSusPage={handleTutorialVentToggle}
        onTutorialCardFocusChange={handleTutorialCardFocusChange}
      />
    );
  };

  const renderCoachChildren = () => {
    if (phase === 'intro') {
      return (
        <button
          type="button"
          onClick={() => {
            clearQueuedTimeouts();
            resetCrewState();
            setPhase('crewTask');
          }}
          className="inline-flex w-full items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-500/20 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-cyan-500/30"
        >
          Start crew training
        </button>
      );
    }

    if (phase === 'intruderIntro') {
      return (
        <button
          type="button"
          onClick={() => setPhase('intruderKill')}
          className="inline-flex w-full items-center justify-center rounded-2xl border border-rose-400/30 bg-rose-500/20 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-500/30"
        >
          Start intruder training
        </button>
      );
    }

    if (phase === 'intruderCooldown') {
      return (
        <div className="rounded-2xl border border-orange-400/20 bg-orange-500/10 px-4 py-3 text-sm font-semibold text-orange-100">
          Cooldown remaining: {killCooldown}s
        </div>
      );
    }

    if (phase === 'intruderCards') {
      return (
        <div className="space-y-2">
          <div className="grid gap-2">
            <StatusBullet done={cardLessonPhase !== 'swipe'}>Swipe left past the EMP card</StatusBullet>
            <StatusBullet done={areaDenialDone}>Press and hold Area Denial to play it</StatusBullet>
          </div>
        </div>
      );
    }

    if (phase === 'complete') {
      return (
        <div className="flex flex-col gap-3">
          <div className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100">
            <CheckCircle2 size={18} />
            Tutorial completion saved locally
          </div>
          <button
            type="button"
            onClick={() => {
              clearQueuedTimeouts();
              resetCrewState();
              resetIntruderState();
              setPhase('intro');
            }}
            className="inline-flex w-full items-center justify-center rounded-2xl border border-gray-700/80 bg-gray-900 px-4 py-3 text-sm font-semibold text-gray-300 transition-colors hover:border-gray-600 hover:text-white"
          >
            Replay tutorial
          </button>
          <a
            href="/how-to-play"
            className="inline-flex w-full items-center justify-center rounded-2xl border border-gray-700/80 bg-gray-900 px-4 py-3 text-sm font-semibold text-gray-300 transition-colors hover:border-gray-600 hover:text-white"
          >
            How to Play
          </a>
          <a
            href={returnTo}
            className="inline-flex w-full items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-500/20 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-cyan-500/30"
          >
            Play now
          </a>
        </div>
      );
    }

    return null;
  };

  return (
    <DataContext.Provider value={contextValue}>
      {renderSurface()}
      <TutorialCoach
        accent={coachCopy.accent}
        title={coachCopy.title}
        body={coachCopy.body}
        step={coachCopy.step}
        modal={coachLayout.modal || false}
        safeBottom={coachLayout.safeBottom || 12}
        returnTo={returnTo}
      >
        {renderCoachChildren()}
      </TutorialCoach>
    </DataContext.Provider>
  );
}

export default TutorialPage;
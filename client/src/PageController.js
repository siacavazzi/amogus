// PageController.jsx
import React, { useContext, useEffect, useState, memo } from "react";
import { DataContext } from "./GameContext";
import LoginPage from "./pages/Login";
import ConnectingPage from "./pages/ConnectingPage";
import PlayersPage from "./pages/PlayersPage";
import Modal from "./components/Modal";
import ImposterPage from "./pages/ImposterPage";
import CrewmemberPage from "./pages/CrewPage";
import ProgressBar from "./components/ProgressBar";
import MeetingWaitingPage from "./pages/MeetingWaitingPage";
import DeadPage from "./pages/DeadPage";
import HackedPage from "./pages/HackedPage";
import GameRunningPage from "./pages/GameRunning";
import ReactorMeltdown from "./pages/MeltdownPage";
import ReactorNormal from "./pages/ReactorPage";
import { isMobile } from "react-device-detect";
import MeltdownInfo from "./pages/MeltdownInfo";
import CrewVictoryScreen from "./pages/CrewVictory";
import ImposterVictoryScreen from "./pages/ImposterVictory";
import NuclearMeltdownScreen from "./pages/MeltdownEnd";
import ReactorWaiting from "./pages/ReactorWaiting";
import TaskEntryPage from "./pages/TaskEntryPage";
import VotingPage from "./pages/VotingPage";
import MeetingResultPage from "./pages/MeetingResultsPage";

const PageController = () => {
    const {
        playerState,
        connected,
        running,
        crewScore,
        meetingState,
        taskGoal,
        hackTime,
        setHackTime,
        meltdownCode,
        meltdownTimer,
        endState,
        taskEntry,
        showSusPage,
        setShowSusPage,
    } = useContext(DataContext);

    const [currentPage, setCurrentPage] = useState("connecting");

    useEffect(() => {
        if (!connected) {
            setCurrentPage("connecting");
            return;
        }

        if (endState && meetingState?.stage !== 'over') {
            setCurrentPage(endState)
            return;
        }

        if (!isMobile) {
            if(!running) {
                setCurrentPage("reactorWaiting");
                return;
            }
            if (meltdownTimer > 0) {
                setCurrentPage("meltdown");
            } else {
                setCurrentPage("reactorNormal");
            }
            return;
        }

        if (running && !playerState?.username) {
            setCurrentPage("gameRunning");
            return;
        }

        if (taskEntry) {
            console.log("task entry")
            setCurrentPage("taskEntry")
            return;
        }

        if ((!playerState || !playerState?.username) && !running) {
            setCurrentPage("login");
            return;
        }

        if (playerState && !running) {
            setCurrentPage("players");
            return;
        }

        if (playerState?.alive === false && meetingState?.stage !== 'over') {
            setCurrentPage("dead");
            return;
        }

        if (meltdownCode) {
            setCurrentPage("meltdownCode");
            return;
        }

        if (hackTime > 0) {
            setCurrentPage("hacked");
            return;
        }

        if (meetingState) {
            console.log("MEETING STATE")
            console.log(meetingState.stage)
            if (meetingState.stage === 'waiting') {
                setCurrentPage("meetingWaiting");
                return;
            } else if (meetingState.stage === 'voting') {
                console.log("players page")
                setCurrentPage("votingPage");
                return;
            } else if (meetingState.stage === 'over') {
                setCurrentPage("resultsPage");
                return;
            }

        }

        if (running) {
            console.log(showSusPage)
            if (showSusPage) {
                setCurrentPage("imposter");
                return;
            } else {
                setCurrentPage("crewmember");
                return;
            }
        }

        setCurrentPage("unknown");
    }, [
        connected,
        isMobile,
        meltdownTimer,
        running,
        playerState,
        meltdownCode,
        hackTime,
        meetingState,
        endState,
        taskEntry,
        showSusPage,

    ]);

    const pages = {
        connecting: <ConnectingPage />,
        meltdown: <ReactorMeltdown />,
        reactorNormal: <ReactorNormal />,
        gameRunning: <GameRunningPage />,
        login: <LoginPage />,
        players: <PlayersPage />,
        dead: <DeadPage />,
        meltdownCode: <MeltdownInfo />,
        hacked: <HackedPage hackTime={hackTime} setHackTime={setHackTime} />,
        meetingWaiting: <MeetingWaitingPage />,
        votingPage: <VotingPage />,
        resultsPage: <MeetingResultPage />,
        imposter: <ImposterPage setShowSusPage={setShowSusPage}/>,
        crewmember: <CrewmemberPage setShowSusPage={setShowSusPage} />,
        sus_victory: <ImposterVictoryScreen />,
        victory: <CrewVictoryScreen />,
        meltdown_fail: <NuclearMeltdownScreen />,
        reactorWaiting: <ReactorWaiting />,
        taskEntry: <TaskEntryPage />,
        unknown: (
            <p>
                You're really not supposed to see this... Uhhh please go talk to
                Sam and tell him he fucked up somewhere
            </p>
        ),
    };

    return (
        <div>
            <Modal />
            {running && isMobile && !endState && (
                <ProgressBar
                    score={crewScore}
                    goalScore={taskGoal}
                    sus={playerState?.sus}
                />
            )}
            {pages[currentPage]}
        </div>
    );
};

export default memo(PageController);

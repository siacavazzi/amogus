// PageController.jsx
import React, { useContext, useEffect, useState, memo } from "react";
import { DataContext } from "./GameContext";
import LoginPage from "./pages/Login";
import ConnectingPage from "./pages/ConnectingPage";
import PlayersPage from "./pages/PlayersPage";
import Alert from "./components/Alert";
import Modal from "./components/Modal";
import ImposterPage from "./pages/ImposterPage";
import CrewmemberPage from "./pages/CrewPage";
import ProgressBar from "./components/ProgressBar";
import EmergencyMeetingPage from "./pages/MeetingPage";
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

const PageController = () => {
    const {
        playerState,
        connected,
        message,
        running,
        crewScore,
        meeting,
        taskGoal,
        hackTime,
        setHackTime,
        meltdownCode,
        meltdownTimer,
        endState,
    } = useContext(DataContext);

    const [currentPage, setCurrentPage] = useState("connecting");

    useEffect(() => {
        console.log("GAME ENDED!!!!")
        console.log(endState)
    },[endState])

    useEffect(() => {
        if (!connected) {
            setCurrentPage("connecting");
            return;
        }

        if(endState) {
            console.log(endState)
            setCurrentPage(endState)
            return;
        }

        if (!isMobile) {
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

        if ((!playerState || !playerState.username) && !running) {
            setCurrentPage("login");
            return;
        }

        if (playerState && !running) {
            setCurrentPage("players");
            return;
        }

        if (playerState?.alive === false) {
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

        if (meeting) {
            setCurrentPage("meeting");
            return;
        }

        if (running && playerState?.sus) {
            setCurrentPage("imposter");
            return;
        }

        if (running && !playerState?.sus) {
            setCurrentPage("crewmember");
            return;
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
        meeting,
        endState,
    ]);

    // Mapping of page identifiers to components
    const pages = {
        connecting: <ConnectingPage />,
        meltdown: <ReactorMeltdown />,
        reactorNormal: <ReactorNormal />,
        gameRunning: <GameRunningPage />,
        login: <LoginPage />,
        players: <PlayersPage />,
        dead: <DeadPage />,
        meltdownCode: <MeltdownInfo/>,
        hacked: <HackedPage hackTime={hackTime} setHackTime={setHackTime} />,
        meeting: <EmergencyMeetingPage />,
        imposter: <ImposterPage />,
        crewmember: <CrewmemberPage />,
        sus_victory: <ImposterVictoryScreen/>,
        victory: <CrewVictoryScreen />,
        meltdown_fail: <NuclearMeltdownScreen />,
        unknown: (
            <p>
                You're really not supposed to see this... Uhhh please go talk to
                Sam and tell him he fucked up somewhere
            </p>
        ),
    };

    return (
        <div>
            {message && (
                <Alert size="lg" status={message.status} title={message.text} />
            )}
            <Modal />
            {running && (
                <ProgressBar
                    score={crewScore}
                    goalScore={taskGoal}
                    sus={playerState?.sus}
                />
            )}
            {pages[currentPage]}
            {/* <div style={{ height: "70px" }}></div> */}
        </div>
    );
};

export default memo(PageController);


import React, { useContext } from "react";
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

export default function PageController() {

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
    } = useContext(DataContext); // Use DataContext here

    function PageHandler() {
        if (!connected) {
            return <ConnectingPage />;
        }

        if(!isMobile) {
            return <ReactorNormal />;
        }

        if(running && !playerState.username) {
            return <GameRunningPage/>
        }
    
        if ((!playerState || !playerState.username) && !running) { // Check for playerState.name
            return <LoginPage />;
        } 
    
        if(playerState && !running) {
            return <PlayersPage />
        }

        if(playerState.alive === false) {
            return <DeadPage />
        }

        if(hackTime > 0 ) {
            return <HackedPage hackTime={hackTime}  setHackTime={setHackTime}/>
        }

        if(meeting) {
            return <EmergencyMeetingPage />
        }

        if(running && playerState.sus) {
            return <ImposterPage/>
        }

        if(running && !playerState.sus) {
            return <CrewmemberPage/>
        }
    
        // Render Dashboard or other components when connected and playerState exists
        return <p>You're really not supposed to see this... Uhhh please go talk to sam and tell him he fucked up somewhere</p>
    }

    // hi
    return(
        <div>
            {message && <Alert size="lg" status={message.status} title={message.text}/>}
            <Modal/>
            {running && <ProgressBar score={crewScore} goalScore={taskGoal} sus={playerState.sus}/>}
            <PageHandler/>
            <div style={{ height: '70px' }}></div>
        </div>
    )

}

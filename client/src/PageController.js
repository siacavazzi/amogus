
import React, { useContext } from "react";
import { DataContext } from "./GameContext";
import LoginPage from "./pages/Login";
import ConnectingPage from "./pages/ConnectingPage";
import PlayersPage from "./pages/PlayersPage";
import { Alert } from "./components/ui/alert";
import Modal from "./Modal";
import ImposterPage from "./pages/ImposterPage";
import CrewmemberPage from "./pages/CrewPage";
import ProgressBar from "./ProgressBar";
import EmergencyMeetingPage from "./pages/MeetingPage";
import DeadPage from "./pages/DeadPage";

export default function PageController() {

    const { 
        playerState, 
        connected,
        gameState,
        message,
        running,
        crewScore,
        meeting,
    } = useContext(DataContext); // Use DataContext here

    function PageHandler() {
        if (!connected) {
            return <ConnectingPage />;
        }
    
        if (!playerState || !playerState.username) { // Check for playerState.name
            return <LoginPage />;
        }
    
        if(playerState && !running) {
            return <PlayersPage />
        }

        if(playerState.alive === false) {
            return <DeadPage />
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
        return <p>Hi</p>
    }

    // hi
    return(
        <div>
            {message && <Alert size="lg" status={message.status} title={message.text}/>}
            <Modal/>
            {running && <ProgressBar score={crewScore} goalScore={10} sus={playerState.sus}/>}
            <PageHandler/>
        </div>
    )

}

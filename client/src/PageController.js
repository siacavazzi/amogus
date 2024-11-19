
import React, { useContext } from "react";
import { DataContext } from "./GameContext";
import LoginPage from "./pages/Login";
import ConnectingPage from "./pages/ConnectingPage";
import PlayersPage from "./pages/PlayersPage";
import { Alert } from "./components/ui/alert";
import Modal from "./Modal";

export default function PageController() {

    const { 
        playerState, 
        connected,
        gameState,
        message
    } = useContext(DataContext); // Use DataContext here

    console.log(message)

    function PageHandler() {
        if (!connected) {
            return <ConnectingPage />;
        }
    
        if (!playerState || !playerState.username) { // Check for playerState.name
            return <LoginPage />;
        }
    
        if(playerState && !gameState.isRunning) {
            return <PlayersPage />
        }
    
        // Render Dashboard or other components when connected and playerState exists
        return <p>Hi</p>
    }

    // hi
    return(
        <div>
            {message && <Alert size="lg" status={message.status} title={message.text}/>}
            <Modal/>
            <PageHandler/>
        </div>
    )

}

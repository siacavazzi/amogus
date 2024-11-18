
import React, { useContext } from "react";
import { DataContext } from "./GameContext";
import LoginPage from "./pages/Login";
import ConnectingPage from "./pages/ConnectingPage";

export default function PageController() {
    const { 
        playerState, 
        connected,
        gameState,
    } = useContext(DataContext); // Use DataContext here

    if (!connected) {
        return <ConnectingPage />;
    }

    if (!playerState || !playerState.name) { // Check for playerState.name
        return <LoginPage />;
    }

    // Render Dashboard or other components when connected and playerState exists
    return <p>Hi</p>
}

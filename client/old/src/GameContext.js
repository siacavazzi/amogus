// ./path-to-your-context-file.jsx

import { createContext, useState, useEffect, useRef, useMemo } from 'react';
import { io } from "socket.io-client";
import { ENDPOINT } from './ENDPOINT';

const DataContext = createContext();

export default function GameContext({ children }) {
    // Define your state here with initial values
    const [playerState, setPlayerState] = useState({ name: '' }); // Example initial state
    const [gameState, setGameState] = useState({ /* initial game state */ });
    const [connected, setConnected] = useState(false);

    const socketRef = useRef(null); // Use useRef to persist socket instance

    useEffect(() => {
        // Initialize the socket connection only once
        socketRef.current = io(ENDPOINT, {
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 2000,
            transports: ['websocket'],
        });

        socketRef.current.on('connect', () => {
            console.log("WebSocket connection established");
            setConnected(true);
        });

        socketRef.current.on('disconnect', () => {
            console.log("WebSocket connection disconnected");
            setConnected(false);
        });

        // Example of listening for a custom event
        socketRef.current.on('gameUpdate', (data) => {
            setGameState(data);
        });

        // Cleanup the socket connection when the component unmounts
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []); // Empty dependency array ensures this runs once

    // Memoize the context value to prevent unnecessary re-renders
    const contextValue = useMemo(() => ({
        playerState,
        setPlayerState,
        gameState,
        setGameState,
        socket: socketRef.current,
        connected,
    }), [playerState, gameState, connected]);

    return (
        <DataContext.Provider value={contextValue}>
            {children}
        </DataContext.Provider>
    );
}

export { DataContext };

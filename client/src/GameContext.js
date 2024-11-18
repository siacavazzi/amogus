import { createContext, useState, useEffect, useRef, useMemo } from 'react';
import { io } from "socket.io-client";
import { ENDPOINT } from './ENDPOINT';
import { startSound } from './utils';

const DataContext = createContext();

export default function GameContext({ children }) {
    const [playerState, setPlayerState] = useState({
        name: '',
        playerId: localStorage.getItem('player_id') || '',
    });
    const [gameState, setGameState] = useState({});
    const [connected, setConnected] = useState(false);
    const [players, setPlayers] = useState([]);
    const [message, setMessage] = useState(undefined)

    const resetMessage = (delay) => {
        if (message !== undefined) {
            const timer = setTimeout(() => {
                setMessage(undefined);
            }, delay);

            // Cleanup to prevent memory leaks if the component unmounts
            return () => clearTimeout(timer);
        }
    };

    useEffect(() => {
        console.log(message)
        const reset = resetMessage(5000)
        return reset;
    }, [message])

    const socketRef = useRef(null);

    useEffect(() => {
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

        socketRef.current.on('start_game', () => {
            startSound();
        });

        // Handle 'player_id' event
        socketRef.current.on('player_id', (data) => {
            if (data && data.player_id) {
                localStorage.setItem('player_id', data.player_id);
                setPlayerState(prevState => ({ ...prevState, playerId: data.player_id }));
            }
        });

        socketRef.current.on('player_list', (data) => {
            if (Array.isArray(data.list)) {
                // Safely parse each player from a JSON string to an object
                const parsedPlayers = data.list.map(player => {
                    try {
                        return JSON.parse(player);
                    } catch (err) {
                        console.error("Failed to parse player:", player, err);
                        return null; // Handle malformed JSON
                    }
                }).filter(player => player !== null); // Filter out any failed parses

                console.log("Active players:", parsedPlayers);
                setPlayers(parsedPlayers);
                console.log("Updated players state:", parsedPlayers);
            } else {
                console.error("Unexpected data format:", data);
            }
        });


        // Cleanup on unmount
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    const contextValue = useMemo(() => ({
        playerState,
        setPlayerState,
        gameState,
        setGameState,
        socket: socketRef.current,
        connected,
        players,
        message,
        setMessage,
    }), [playerState, gameState, connected, players, message]);

    return (
        <DataContext.Provider value={contextValue}>
            {children}
        </DataContext.Provider>
    );
}

export { DataContext };

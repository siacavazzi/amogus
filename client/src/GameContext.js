import { createContext, useState, useEffect, useRef, useMemo } from 'react';
import { io } from "socket.io-client";
import { ENDPOINT } from './ENDPOINT';
import { AudioHandler } from './AudioHandler';
import PlayerRole from './components/PlayerRole';
import MeetingDisplay from './components/MeetingDisplay';

const DataContext = createContext();

export default function GameContext({ children }) {
    const [playerState, setPlayerState] = useState({
        username: '',
        playerId: localStorage.getItem('player_id') || '',
    });

    // united states
    const [gameState, setGameState] = useState({});
    const [connected, setConnected] = useState(false);
    const [players, setPlayers] = useState([]);
    const [message, setMessage] = useState(undefined)
    const [dialog, setDialog] = useState(undefined)
    const [audio, setAudio] = useState(undefined);
    const [audioEnabled, setAudioEnabled] = useState(false);
    const [running, setRunning] = useState(false);
    const [task, setTask] = useState(undefined);
    const [crewScore, setCrewScore] = useState(0);
    const [susPoints, setSusPoints] = useState(0);
    const [showAnimation, setShowAnimation] = useState(false);
    const [meeting, setMeeting] = useState(false);
    const [taskGoal, setTaskGoal] = useState(1);
    const [hackTime, setHackTime] = useState(0);

    useEffect(() => {
        console.log("player state debug")
        console.log(playerState)
        if (playerState.sus && !running) {
            setRunning(true);
        }
    }, [playerState])

    const resetState = () => {
        setGameState({})
        setConnected(false)
        setPlayers([])
        setPlayerState({
            username: '',
            playerId: localStorage.getItem('player_id') || '',
        })
        setTask(undefined)
        setRunning(false)
        setCrewScore(0);
        setMeeting(false)
        setDialog(undefined)
    }

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
            socketRef.current.emit('rejoin', {
                player_id: playerState.playerId,
            });
        });

        socketRef.current.on('disconnect', () => {
            console.log("WebSocket connection disconnected");
            resetState();
        });

        socketRef.current.on('reset', () => {
            resetState();
        });

        socketRef.current.on('sus_score', (data) => {
            setSusPoints(data);
        });

        socketRef.current.on('task', (data) => {
            if (!running) {
                setRunning(true)
            }
            setTask(data.task);
        });

        socketRef.current.on('crew_score', (data) => {
            console.log("# Completed tasks: ", data.score)
            setCrewScore(data.score);
        });

        socketRef.current.on('game_start', () => {
            setRunning(true)
        });

        socketRef.current.on('meeting', () => {
            console.log("MEEEEETING CALLLED = = = =  = = = = = = =  = = = = =")
            setAudio('meeting')
            console.log(audioEnabled)
            setMeeting(true);
            setDialog({ title: "Emergency Meeting Called!", body: <MeetingDisplay /> });

        });

        socketRef.current.on('end_meeting', () => {
            setMeeting(false);
        });

        socketRef.current.on('hack', (data) => {
            setHackTime(data);
            setAudio('hack')
        });

        socketRef.current.on('task_goal', (data) => {
            console.log(data)
            setTaskGoal(data)
        });

        // Handle 'player_id' event
        socketRef.current.on('player_id', (data) => {
            console.log("NEW ID ==")
            console.log(data.player_id)
            if (data && data.player_id) {
                console.log("setting new id ?")
                localStorage.setItem('player_id', data.player_id);
                setPlayerState(prevState => ({ ...prevState, playerId: data.player_id }));
            }
        });

        socketRef.current.on('game_data', (data) => {
            console.log("SOCKET DATA!!!")
            console.log(data)
            if (!playerState && data.action != "rejoin") {
                return;
            }
            console.log(data)
            let me;
            if (data.action === "player_list" || data.action === "start_game" || data.action === "rejoin") {
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
                    if (playerState.playerId) {
                        me = parsedPlayers.find((player) => player.player_id === localStorage.getItem('player_id'))
                        if (me) {
                            setPlayerState(me)
                            console.log(me)
                            console.log("found me")
                        } else {
                            console.log("not found")
                        }
                    } else {
                        console.log("not found")
                        setMessage({ status: "error", text: "Idk who i am :(" })
                    }
                    setPlayers(parsedPlayers);
                    console.log("Updated players state:", parsedPlayers);
                } else {
                    console.error("Unexpected data format:", data);
                }

                if (data.action === "start_game" && me) {
                    console.log("start game")
                    setAudio('start');
                    setRunning(true);
                    audioEnabled && setDialog({ title: "Game Started", body: <PlayerRole sus={me.sus} /> });

                }
            }
        });


        // Cleanup on unmount
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    function handleCallMeeting() {
        socketRef.current.emit("meeting");
    }


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
        setAudio,
        dialog,
        setDialog,
        running,
        task,
        setTask,
        crewScore,
        showAnimation,
        setShowAnimation,
        handleCallMeeting,
        meeting,
        taskGoal,
        setAudioEnabled,
        audioEnabled,
        audio,
        susPoints,
        setHackTime,
        hackTime
    }), [hackTime, audio, playerState, gameState, connected, players, message, dialog, running, task, crewScore, showAnimation, meeting, taskGoal, susPoints]);

    return (
        <DataContext.Provider value={contextValue}>
            <AudioHandler />
            {children}
        </DataContext.Provider>
    );
}

export { DataContext };

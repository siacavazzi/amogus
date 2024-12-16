import { createContext, useState, useEffect, useRef, useMemo } from 'react';
import { io } from "socket.io-client";
import { ENDPOINT } from './ENDPOINT';
import { AudioHandler } from './AudioHandler';
import PlayerRole from './components/PlayerRole';
import MeetingDisplay from './components/MeetingDisplay';
import MeltdownAvertedDisplay from './components/MeltdownAverted';
import { isMobile } from 'react-device-detect';

const DataContext = createContext();

export default function GameContext({ children }) {
    const [playerState, setPlayerState] = useState({
        username: '',
        playerId: localStorage.getItem('player_id') || '',
    });

    // united states
    const [gameState, setGameState] = useState({}); // <--- USE this PLEASE we need to refactor this shit
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
    const [meetingState, setMeetingState] = useState(undefined);
    const [taskGoal, setTaskGoal] = useState(1);
    const [hackTime, setHackTime] = useState(0);
    const [meltdownCode, setMeltdownCode] = useState(undefined);
    const [meltdownTimer, setMeltdownTimer] = useState(false);
    const [codesNeeded, setCodesNeeded] = useState(undefined);
    const [endState, setEndState] = useState(undefined);
    const [taskEntry , setTaskEntry] = useState(false);
    const [taskLocations, setTaskLocations] = useState([]);
    const [deniedLocation, setDeniedLocation] = useState(undefined)

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
        setSusPoints(0);
        setMeetingState(undefined)
        setDialog(undefined);
        setHackTime(0);
        setCodesNeeded(undefined);
        setMeltdownTimer(undefined);
        setMeltdownCode(undefined);
        setEndState(undefined);
        setDeniedLocation(undefined);
        setTaskLocations([])
    }

    const resetMessage = (delay) => {
        if (message !== undefined) {
            const timer = setTimeout(() => {
                setMessage(undefined);
            }, delay);

            return () => clearTimeout(timer);
        }
    };

    useEffect(() => {
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
            setConnected(true);
            socketRef.current.emit('rejoin', {
                player_id: playerState.playerId,
            });
        });

        socketRef.current.on('task_locations', (data) => {
            console.log(data)
            setTaskLocations(data)
        })

        socketRef.current.on('disconnect', () => {
            resetState();
        });

        socketRef.current.on('end_game', (data) => {
            setEndState(data);
        });

        socketRef.current.on('codes_needed', (data) => {
            setCodesNeeded(data)
        });

        socketRef.current.on('meltdown_end', () => {
            setCodesNeeded(undefined);
            setMeltdownTimer(undefined);
            setMeltdownCode(undefined);
            isMobile && setDialog({ title: "Meltdown Averted!", body: <MeltdownAvertedDisplay /> });
        });

        socketRef.current.on('reset', () => {
            resetState();
        });

        socketRef.current.on('meltdown_code', (data) => {
            setMeltdownCode(data)
        });

        socketRef.current.on('meltdown_update', (data) => {
            setMeltdownTimer(data)
        });

        socketRef.current.on('sus_score', (data) => {
            setSusPoints(data);
        });

        socketRef.current.on('task', (data) => {
            console.log(data)
            if (!running) {
                setRunning(true)
            }
            setTask(data.task);
        });

        socketRef.current.on('crew_score', (data) => {
            setCrewScore(data.score);
        });

        socketRef.current.on('game_start', () => {
            setRunning(true)
        });

        socketRef.current.on('meeting', (data) => {
            try {
                // If data is a JSON string, parse it
                const meetingData = typeof data === 'string' ? JSON.parse(data) : data;
        
                setAudio('meeting');
                console.log(meetingData);
                setMeetingState(meetingData);
        
                if (isMobile) {
                    setDialog({ 
                        title: "Emergency Meeting Called!", 
                        body: <MeetingDisplay meetingData={meetingData} /> 
                    });
                }
            } catch (error) {
                console.error("Error parsing meeting data:", error);
            }
        });
        

        socketRef.current.on('active_denial', (location) => {
            console.log("DENIAL")
            console.log(location)
            if(location === 'none') {
              setDeniedLocation(undefined);
              return
            }

            setDeniedLocation(location);
          });

        socketRef.current.on('end_meeting', () => {
            setMeetingState(undefined);
        });

        socketRef.current.on('hack', (data) => {
            setHackTime(data);
        });

        socketRef.current.on('task_goal', (data) => {
            setTaskGoal(data)
        });

        // Handle 'player_id' event
        socketRef.current.on('player_id', (data) => {
            if (data && data.player_id) {
                console.log("setting new id ?")
                localStorage.setItem('player_id', data.player_id);
                setPlayerState(prevState => ({ ...prevState, playerId: data.player_id }));
            }
        });

        socketRef.current.on('game_data', (data) => {
            if (!playerState && data.action != "rejoin") {
                return;
            }
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
                        } else {
                            console.log("not found")
                        }
                    } else {
                        console.log("not found")
                        // setMessage({ status: "error", text: "Idk who i am :(" })
                    }
                    if (me) {
                        setPlayers(parsedPlayers);
                        console.log(parsedPlayers)
                    }
                    console.log("Updated players state:", parsedPlayers);
                } else {
                    console.error("Unexpected data format:", data);
                }

                if (data.action === "start_game" && me) {
                    setAudio('start');
                    setRunning(true);
                    isMobile && setDialog({ title: "Game Started", body: <PlayerRole sus={me.sus} /> });

                } else if (data.action === "start_game") {
                    setRunning(true);
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
        socketRef.current.emit("meeting", { player_id: localStorage.getItem('player_id') });
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
        meetingState,
        taskGoal,
        setAudioEnabled,
        audioEnabled,
        audio,
        susPoints,
        setHackTime,
        hackTime,
        meltdownCode,
        meltdownTimer,
        codesNeeded,
        endState,
        setCodesNeeded,
        taskEntry,
        setTaskEntry,
        taskLocations,
        deniedLocation
    }), [
        endState,
        meltdownCode,
        codesNeeded,
        meltdownTimer,
        hackTime, 
        audio,
        playerState,
        gameState,
        connected,
        players,
        message,
        dialog,
        running,
        task,
        crewScore,
        showAnimation,
        meetingState,
        taskGoal,
        susPoints,
        taskEntry,
        deniedLocation
    ]);

    return (
        <DataContext.Provider value={contextValue}>
            <AudioHandler />
            {children}
        </DataContext.Provider>
    );
}

export { DataContext };

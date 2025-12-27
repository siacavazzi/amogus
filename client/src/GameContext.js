import { createContext, useState, useEffect, useRef, useMemo } from 'react';
import { io } from "socket.io-client";
import { ENDPOINT } from './ENDPOINT';
import { AudioHandler } from './AudioHandler';
import PlayerRole from './components/PlayerRole';
import MeetingDisplay from './components/MeetingDisplay';
import MeltdownAvertedDisplay from './components/MeltdownAverted';
import { isMobile as isMobileDevice } from 'react-device-detect';

// Allow URL param override for testing: ?mobile=true or ?mobile=false
const urlParams = new URLSearchParams(window.location.search);
const mobileOverride = urlParams.get('mobile');
const isMobile = mobileOverride !== null ? mobileOverride === 'true' : isMobileDevice;

const DataContext = createContext();

export default function GameContext({ children }) {
    const [playerState, setPlayerState] = useState({
        username: '',
        playerId: localStorage.getItem('player_id') || '',
    });

    // Room/lobby state
    const [roomCode, setRoomCode] = useState(localStorage.getItem('room_code') || '');
    const [inRoom, setInRoom] = useState(false);
    const [isRoomCreator, setIsRoomCreator] = useState(() => {
        // Initialize from sessionStorage for persistence across page reloads (within same session)
        return sessionStorage.getItem('is_room_creator') === 'true';
    });
    const [roomOpen, setRoomOpen] = useState(false);

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
    const [gameStats, setGameStats] = useState(undefined);
    const [taskEntry , setTaskEntry] = useState(false);
    const [taskLocations, setTaskLocations] = useState([]);
    const [deniedLocation, setDeniedLocation] = useState(undefined)
    const [votes, setVotes] = useState({})
    const [vetoVotes, setVetoVotes] = useState(0); 
    const [showSusPage, setShowSusPage] = useState(false)
    const [killCooldown, setKillCooldown] = useState(0);
    const [activeCards, setActiveCards] = useState([])
    const [modalOpen, setModalOpen] = useState(false)
    const [taskCreationMode, setTaskCreationMode] = useState(false)
    const [resetVotes, setResetVotes] = useState({ current: 0, needed: 0, voters: [] })
    let otherIntruders = [];
    // const [meetineTimeLeft, setMee]

    // Reset all state to initial values (keeps connection)
    const resetGameState = () => {
        setGameState({})
        setPlayers([])
        setPlayerState({
            username: '',
            playerId: '',
        })
        setRoomCode('')
        setInRoom(false)
        setIsRoomCreator(false)
        setRoomOpen(false)
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
        setGameStats(undefined);
        setDeniedLocation(undefined);
        setTaskLocations([])
        setVotes({})
        setVetoVotes(0)
        setShowSusPage(false)
        setActiveCards([])
        setModalOpen(false)
        setTaskCreationMode(false)
        setKillCooldown(0)
        setResetVotes({ current: 0, needed: 0, voters: [] })
    }

    const resetState = () => {
        setConnected(false)
        resetGameState()
        sessionStorage.removeItem('is_room_creator')
        localStorage.removeItem('room_code')
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
        // Set intervals only for cards with 'time_left'
        const countdownIntervals = activeCards.map((card, index) => {
            if (card.time_left && card.time_left > 0 && card.countdown) {
                return setInterval(() => {
                    setActiveCards((prevCards) => {
                        const updatedCards = [...prevCards];
                        if (updatedCards[index].time_left > 0) {
                            updatedCards[index] = {
                                ...updatedCards[index],
                                time_left: updatedCards[index].time_left - 1,
                            };
                        }
                        return updatedCards;
                    });
                }, 1000);
            }
            return null;
        });
    
        // Cleanup intervals on unmount or activeCards change
        return () => {
            countdownIntervals.forEach((interval) => {
                if (interval) clearInterval(interval);
            });
        };
    }, [activeCards]);

    useEffect(() => {
        let timer;
        if (killCooldown > 0) {
          timer = setInterval(() => {
            setKillCooldown((prev) => (prev > 0 ? prev - 1 : 0));
          }, 1000); // Reduce cooldown every second
        }
        return () => clearInterval(timer); // Cleanup interval
      }, [killCooldown]);
    

    useEffect(() => {
        const reset = resetMessage(5000)
        return reset;
    }, [message])

    const socketRef = useRef(null);

    // Handle page visibility changes (mobile browser suspension/resume)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && socketRef.current) {
                console.log('Page became visible, checking connection...');
                // If socket is disconnected, try to reconnect
                if (!socketRef.current.connected) {
                    console.log('Socket disconnected, attempting to reconnect...');
                    socketRef.current.connect();
                } else {
                    // Socket is connected but we might need to rejoin the room
                    const playerId = localStorage.getItem('player_id');
                    if (playerId && !playerState?.username) {
                        console.log('Connected but no player state, attempting rejoin...');
                        socketRef.current.emit('rejoin', { player_id: playerId });
                    }
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [playerState?.username]);

    useEffect(() => {
        socketRef.current = io(ENDPOINT, {
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 2000,
            transports: ['websocket'],
        });

        socketRef.current.on('connect', () => {
            setConnected(true);
            // Try to rejoin existing game if we have a player_id
            const playerId = localStorage.getItem('player_id');
            const roomCode = localStorage.getItem('room_code');
            if (playerId) {
                socketRef.current.emit('rejoin', {
                    player_id: playerId,
                });
            } else if (!isMobile && roomCode) {
                // Reactor reconnecting - re-register as reactor
                socketRef.current.emit('register_reactor', { room_code: roomCode });
            }
        });

        // Room management events
        socketRef.current.on('game_created', (data) => {
            console.log('Game created:', data);
            setRoomCode(data.room_code);
            setInRoom(true);
            const isCreator = data.is_creator || false;
            setIsRoomCreator(isCreator);
            sessionStorage.setItem('is_room_creator', isCreator.toString());
            setRoomOpen(false);  // Room not open until creator opens it
            localStorage.setItem('room_code', data.room_code);
            
            // Desktop clients register as reactor
            if (!isMobile) {
                socketRef.current.emit('register_reactor', { room_code: data.room_code });
            }
        });

        socketRef.current.on('room_opened', (data) => {
            console.log('Room opened:', data);
            setRoomOpen(true);
        });

        socketRef.current.on('game_joined', (data) => {
            console.log('Joined game:', data, 'is_creator:', data.is_creator);
            setRoomCode(data.room_code);
            setInRoom(true);
            const isCreator = data.is_creator || false;
            setIsRoomCreator(isCreator);
            sessionStorage.setItem('is_room_creator', isCreator.toString());
            console.log('Setting isRoomCreator to:', isCreator);
            setRoomOpen(true);  // If we joined, the room must be open
            localStorage.setItem('room_code', data.room_code);
            
            // Desktop clients register as reactor
            if (!isMobile) {
                socketRef.current.emit('register_reactor', { room_code: data.room_code });
            }
        });

        socketRef.current.on('reactor_registered', (data) => {
            console.log('Reactor registered:', data);
            setRoomCode(data.room_code);
            setInRoom(true);
        });

        socketRef.current.on('rejoin_failed', (data) => {
            console.log('Rejoin failed:', data);
            // Clear stale session data
            localStorage.removeItem('player_id');
            localStorage.removeItem('room_code');
            sessionStorage.removeItem('is_room_creator');
            resetGameState();
        });

        socketRef.current.on('error', (data) => {
            console.error('Socket error:', data);
            // Check if this is a "game/room not found" error - clear stale data
            const msg = (data.message || '').toLowerCase();
            if (msg.includes('game not found') || msg.includes('not in a game room')) {
                localStorage.removeItem('player_id');
                localStorage.removeItem('room_code');
                sessionStorage.removeItem('is_room_creator');
                resetGameState();
            }
            isMobile && setDialog({ title: "Error", body: data.message });
        });

        socketRef.current.on('task_locations', (data) => {
            setTaskLocations(data)
        })

        socketRef.current.on('disconnect', () => {
            // Only mark as disconnected, don't clear state
            // Socket.io will auto-reconnect and we'll rejoin with our player_id
            setConnected(false);
            console.log('Socket disconnected, will attempt to reconnect...');
        });

        socketRef.current.on('message', (data) => {
            if(data.player === localStorage.getItem("player_id")) {
                isMobile && setDialog({ title: "Message", body: data.message });
            }
        });

        socketRef.current.on('end_game', (data) => {
            // Handle both old format (string) and new format (object with result and stats)
            if (typeof data === 'string') {
                setEndState(data);
            } else {
                setEndState(data.result);
                setGameStats(data.stats);
            }
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

        // Game reset - back to players page, same room
        socketRef.current.on('game_reset', (data) => {
            console.log('Game reset:', data);
            setRunning(false);
            setEndState(undefined);
            setTask(undefined);
            setCrewScore(0);
            setTaskGoal(1);
            setMeetingState(undefined);
            setMeltdownCode(undefined);
            setMeltdownTimer(undefined);
            setCodesNeeded(undefined);
            setHackTime(0);
            setActiveCards([]);
            setShowSusPage(false);
            setDeniedLocation(undefined);
            setVotes({});
            setVetoVotes(0);
            setSusPoints(0);
            setKillCooldown(0);
            setTaskCreationMode(false);
            setResetVotes({ current: 0, needed: 0, voters: [] });
            // Clear any open modals/dialogs
            setModalOpen(false);
            setDialog(undefined);
            setMessage(undefined);
        });

        // Reset vote update - track who wants to play again
        socketRef.current.on('reset_vote_update', (data) => {
            console.log('Reset vote update:', data);
            setResetVotes({
                current: data.current_votes,
                needed: data.votes_needed,
                voters: data.voters || []
            });
        });

        // Room disbanded - go back to lobby
        socketRef.current.on('room_disbanded', (data) => {
            console.log('Room disbanded:', data);
            localStorage.removeItem('player_id');
            localStorage.removeItem('room_code');
            sessionStorage.removeItem('is_room_creator');
            resetGameState();
        });

        // Left room voluntarily
        socketRef.current.on('left_room', () => {
            console.log('Left room');
            localStorage.removeItem('player_id');
            localStorage.removeItem('room_code');
            sessionStorage.removeItem('is_room_creator');
            resetGameState();
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
            setTaskCreationMode(false)  // Exit task creation mode when game starts
        });

        // Collaborative task creation mode
        socketRef.current.on('enter_task_creation', (data) => {
            console.log('Entering task creation mode:', data);
            setTaskCreationMode(true);
            setTaskLocations(data.locations || []);
        });

        socketRef.current.on('exit_task_creation', () => {
            console.log('Exiting task creation mode');
            setTaskCreationMode(false);
        });

        socketRef.current.on('meeting', (data) => {
            try {
                const meetingData = typeof data === 'string' ? JSON.parse(data) : data;
                
                setMeetingState(meetingData);
                setShowSusPage(false)
                
                if (meetingData.stage === 'waiting') {
                    setAudio('meeting');
                    isMobile && setDialog({ 
                        title: "Emergency Meeting Called!", 
                        body: <MeetingDisplay meetingData={meetingData} /> 
                    });
                } else {
                    setDialog(undefined)
                }
            } catch (error) {
                console.error("Error parsing meeting data:", error);
            }
        });

        socketRef.current.on("vote_update", (data) => {
            console.log(data)
            setVotes(data.votes || {});
            setVetoVotes(data.vetoVotes || 0);
        });

        socketRef.current.on("meeting_ended", (data) => {
            console.log(data)
        })
        
        socketRef.current.on('active_cards', (data) => {
            console.log("ACTIVE CARDS:");
            console.log(data);
        
            try {
                // Parse each element of the array
                const parsedData = data.map((item) => {
                    return typeof item === 'string' ? JSON.parse(item) : item;
                });
                setActiveCards(parsedData);
            } catch (error) {
                console.error("Failed to parse active cards data:", error);
            }
        });
        

        socketRef.current.on('active_denial', (location) => {
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
            console.log('Received player_id:', data);
            if (data && data.player_id) {
                localStorage.setItem('player_id', data.player_id);
                setPlayerState(prevState => ({ ...prevState, playerId: data.player_id }));
                // Update creator status if provided (for reconnection)
                if (data.is_creator !== undefined) {
                    console.log('Setting isRoomCreator from player_id event:', data.is_creator);
                    setIsRoomCreator(data.is_creator);
                    sessionStorage.setItem('is_room_creator', data.is_creator.toString());
                }
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
                    
                    // Always use localStorage for player_id to avoid race conditions
                    const myPlayerId = localStorage.getItem('player_id');
                    otherIntruders = parsedPlayers.filter((player) => player.sus && player.player_id !== myPlayerId)
                    console.log("Active players:", parsedPlayers);
                    console.log({otherIntruders})
                    
                    if (myPlayerId) {
                        me = parsedPlayers.find((player) => player.player_id === myPlayerId)
                        if (me) {
                            setPlayerState(me)
                            console.log(me)
                        } else {
                            console.log("Player not found in list")
                        }
                    } else {
                        console.log("No player_id in localStorage yet")
                    }
                    
                    // Always update players list - don't gate on finding ourselves
                    // This fixes the race condition where player_list arrives before player_id is set
                    setPlayers(parsedPlayers);
                    console.log("Updated players state:", parsedPlayers);
                } else {
                    console.error("Unexpected data format:", data);
                }

                if (data.action === "start_game" && me) {
                    setAudio('start');
                    setRunning(true);
                    setTaskCreationMode(false);  // Exit task creation mode
                    
                    isMobile && setDialog({ title: "Game Started", body: <PlayerRole sus={me.sus} otherIntruders={otherIntruders}/> });

                } else if (data.action === "start_game") {
                    setRunning(true);
                    setTaskCreationMode(false);  // Exit task creation mode
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
        gameStats,
        setCodesNeeded,
        taskEntry,
        setTaskEntry,
        taskLocations,
        deniedLocation,
        votes,
        vetoVotes,
        setMeetingState,
        setVotes,
        setVetoVotes,
        showSusPage,
        setShowSusPage,
        killCooldown,
        setKillCooldown,
        activeCards,
        modalOpen,
        setModalOpen,
        // Task creation mode
        taskCreationMode,
        setTaskCreationMode,
        // Room management
        roomCode,
        setRoomCode,
        inRoom,
        setInRoom,
        isRoomCreator,
        setIsRoomCreator,
        roomOpen,
        setRoomOpen,
        resetState,
        // Reset votes for play again
        resetVotes,
    }), [
        endState,
        gameStats,
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
        deniedLocation,
        votes,
        vetoVotes,
        showSusPage,
        killCooldown,
        activeCards,
        modalOpen,
        roomCode,
        inRoom,
        isRoomCreator,
        roomOpen,
        taskCreationMode,
        resetVotes,
    ]);

    return (
        <DataContext.Provider value={contextValue}>
            <AudioHandler />
            {children}
        </DataContext.Provider>
    );
}

export { DataContext };

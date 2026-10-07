import { createContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { io } from "socket.io-client";
import { ENDPOINT } from './ENDPOINT';
import { AudioHandler } from './AudioHandler';
import PlayerRole from './components/PlayerRole';
import MeetingDisplay from './components/MeetingDisplay';
import MeltdownAvertedDisplay from './components/MeltdownAverted';
import FakeTaskReveal from './components/FakeTaskReveal';
import IntrudersRevealedDisplay from './components/IntrudersRevealedDisplay';
import TauntNotification from './components/TauntNotification';
import { markHasPlayedGame } from './tutorial/tutorialStorage';
import { isMobile as isMobileDevice } from 'react-device-detect';
import { getRoomCodeFromSearch, clearRoomCodeFromUrl } from './utils/inviteLinks';
import { createRequestId, emitVolatileWithAck, SOCKET_COMMAND_TIMEOUT_MS } from './utils/socketCommand';

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
    const inRoomRef = useRef(false);
    const [isRoomCreator, setIsRoomCreator] = useState(() => {
        // Initialize from sessionStorage for persistence across page reloads (within same session)
        return sessionStorage.getItem('is_room_creator') === 'true';
    });
    const [roomOpen, setRoomOpen] = useState(false);
    const [roomRevision, setRoomRevision] = useState(-1);
    const [roundId, setRoundId] = useState(null);
    const [lobbyState, setLobbyState] = useState(null);
    const [roomEntryStatus, setRoomEntryStatus] = useState(null);

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
    const [taskCompletionPending, setTaskCompletionPending] = useState(false);
    const [taskCompletionError, setTaskCompletionError] = useState(null);
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
    const [fakeTaskReveal, setFakeTaskReveal] = useState(null) // { task, location } when showing fake task animation
    const [intrudersRevealed, setIntrudersRevealed] = useState(null) // { intruder_names, intruder_ids, message } when tasks 100%
    let otherIntruders = [];
    // const [meetineTimeLeft, setMee]

    // Keep inRoomRef in sync so socket handlers (set up with [] deps) can read current value
    useEffect(() => { inRoomRef.current = inRoom; }, [inRoom]);

    useEffect(() => {
        if (hackTime <= 0) {
            return;
        }
        const timer = setTimeout(() => setHackTime(time => Math.max(0, time - 1)), 1000);
        return () => clearTimeout(timer);
    }, [hackTime]);

    // Reset all state to initial values (keeps connection)
    const resetGameState = () => {
        setRoomEntryStatus(null);
        setGameState({})
        setPlayers([])
        setPlayerState({
            username: '',
            playerId: '',
        })
        setRoomCode('')
        setInRoom(false)
        inRoomRef.current = false;
        setIsRoomCreator(false)
        setRoomOpen(false)
        setRoomRevision(-1)
        setRoundId(null)
        setLobbyState(null)
        roomVersionRef.current = { roomCode: '', revision: -1, roundId: null };
        taskCompletionRef.current = null;
        setTaskCompletionPending(false);
        setTaskCompletionError(null);
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
        setIntrudersRevealed(null)
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
    const autoJoinInviteRef = useRef(null);
    const roomVersionRef = useRef({
        roomCode: localStorage.getItem('room_code') || '',
        revision: -1,
        roundId: null,
    });
    const taskCompletionRef = useRef(null);

    const acceptRoomData = useCallback((data) => {
        if (!data || typeof data !== 'object') return true;
        const current = roomVersionRef.current;
        const incomingRoomCode = data.room_code;
        if (incomingRoomCode && current.roomCode && incomingRoomCode !== current.roomCode) {
            return false;
        }

        const incomingRevision = Number.isFinite(Number(data.revision)) ? Number(data.revision) : null;
        if (incomingRevision !== null && current.revision >= 0) {
            if (incomingRevision < current.revision) return false;
            if (incomingRevision === current.revision && data.round_id && current.roundId && data.round_id !== current.roundId) {
                return false;
            }
        } else if (data.round_id && current.roundId && data.round_id !== current.roundId) {
            return false;
        }

        if (incomingRoomCode && !current.roomCode) current.roomCode = incomingRoomCode;
        if (incomingRevision !== null && incomingRevision > current.revision) {
            current.revision = incomingRevision;
            current.roundId = data.round_id || current.roundId;
            setRoomRevision(incomingRevision);
            if (data.round_id) setRoundId(data.round_id);
        } else if (data.round_id && !current.roundId) {
            current.roundId = data.round_id;
            setRoundId(data.round_id);
        }
        return true;
    }, []);

    const applyRoomSnapshot = useCallback((snapshot) => {
        if (!snapshot || !acceptRoomData(snapshot)) return false;

        const snapshotRoomCode = snapshot.room_code || roomVersionRef.current.roomCode;
        if (snapshotRoomCode) {
            roomVersionRef.current.roomCode = snapshotRoomCode;
            setRoomCode(snapshotRoomCode);
            setInRoom(true);
            inRoomRef.current = true;
            localStorage.setItem('room_code', snapshotRoomCode);
        }
        if (snapshot.room_open !== undefined) setRoomOpen(snapshot.room_open);
        if (snapshot.is_creator !== undefined) {
            setIsRoomCreator(snapshot.is_creator);
            sessionStorage.setItem('is_room_creator', String(snapshot.is_creator));
        }
        if (Array.isArray(snapshot.players)) {
            setPlayers(snapshot.players);
            const myPlayerId = localStorage.getItem('player_id');
            const me = snapshot.players.find((player) => player.player_id === myPlayerId);
            if (me) setPlayerState(me);
        }
        setRunning(!!snapshot.running);
        setTask(snapshot.task || undefined);
        setCrewScore(snapshot.crew_score ?? 0);
        setTaskGoal(snapshot.task_goal ?? 1);
        setMeetingState(snapshot.meeting || undefined);
        setVotes(snapshot.votes || {});
        setVetoVotes(snapshot.veto_votes ?? snapshot.vetoVotes ?? 0);
        setEndState(snapshot.end_state || undefined);
        setGameStats(snapshot.stats || undefined);
        setTaskCreationMode(!!snapshot.task_creation_mode);
        setTaskLocations(Array.isArray(snapshot.locations) ? snapshot.locations : []);
        setHackTime(snapshot.active_hack ?? 0);
        setDeniedLocation(snapshot.denied_location || undefined);
        setIntrudersRevealed(snapshot.intruders_revealed
            ? (typeof snapshot.intruders_revealed === 'object' ? snapshot.intruders_revealed : true)
            : null);
        setActiveCards(Array.isArray(snapshot.active_cards) ? snapshot.active_cards : []);
        setMeltdownTimer(snapshot.meltdown?.time_left ?? undefined);
        setCodesNeeded(snapshot.meltdown?.codes_needed ?? undefined);
        setMeltdownCode(snapshot.meltdown_code || undefined);
        setLobbyState(snapshot.collaborative_tasks || null);
        setTaskCompletionError(null);
        return true;
    }, [acceptRoomData]);

    const requestRoomState = useCallback((socket, requestedRoomCode, playerId) => {
        if (!socket?.connected || !requestedRoomCode) return Promise.resolve(false);
        const payload = { room_code: requestedRoomCode };
        if (playerId) payload.player_id = playerId;
        return emitVolatileWithAck(socket, 'get_room_state', payload).then((response) => {
            if (response?.ok && response.state) return applyRoomSnapshot(response.state);
            if (response?.state) applyRoomSnapshot(response.state);
            return false;
        }).catch((error) => {
            console.log('Room state refresh failed:', error.message || error);
            return false;
        });
    }, [applyRoomSnapshot]);

    const completeTask = useCallback(async (assignment = task) => {
        if (taskCompletionRef.current) return taskCompletionRef.current;

        const socket = socketRef.current;
        const playerId = playerState?.player_id || playerState?.playerId || localStorage.getItem('player_id');
        const assignmentId = assignment?.assignment_id;
        const assignmentRoundId = assignment?.round_id || roundId;
        const fail = (error) => {
            setTaskCompletionError(error);
            return false;
        };

        setTaskCompletionError(null);
        if (!socket?.connected || !connected) {
            return fail('You are offline. Reconnect before you complete this task.');
        }
        if (!running) {
            return fail('No game is running. Rejoin the active room before you complete a task.');
        }
        if (!playerId) {
            return fail('Your player session is missing. Rejoin the room before you complete this task.');
        }
        if (!assignmentId || !assignmentRoundId) {
            return fail('This task has no current assignment. Wait for a new task, then try again.');
        }
        if (roundId && assignmentRoundId !== roundId) {
            return fail('This task belongs to an earlier round. Wait for a current task assignment.');
        }

        const request = {
            player_id: playerId,
            request_id: createRequestId(),
            assignment_id: assignmentId,
            round_id: assignmentRoundId,
        };
        setTaskCompletionPending(true);

        const completion = (async () => {
            let response;
            let commandError;
            for (let attempt = 0; attempt < 2; attempt += 1) {
                if (!socket.connected) {
                    commandError = new Error('Socket disconnected before the task was confirmed.');
                    break;
                }
                try {
                    response = await emitVolatileWithAck(socket, 'complete_task', request, SOCKET_COMMAND_TIMEOUT_MS);
                    commandError = null;
                    break;
                } catch (error) {
                    commandError = error;
                    if (attempt === 0 && /timeout|timed out/i.test(error?.message || '')) continue;
                    break;
                }
            }

            if (commandError) {
                await requestRoomState(socket, roomVersionRef.current.roomCode || roomCode, playerId);
                return fail('Task completion is unconfirmed. Reconnect to refresh your task. Try again.');
            }

            if (response?.state) applyRoomSnapshot(response.state);
            if (response?.ok !== true) {
                return fail(response?.error
                    ? `Task was not recorded: ${response.error}`
                    : 'Task was not recorded. Check your connection and try again.');
            }
            if (response.request_id !== request.request_id) {
                await requestRoomState(socket, roomVersionRef.current.roomCode || roomCode, playerId);
                return fail('The server did not confirm this task request. Refresh the room state. Try again.');
            }
            if (roomVersionRef.current.roundId && roomVersionRef.current.roundId !== request.round_id) {
                return fail('This task belongs to an earlier round. Wait for a current task assignment.');
            }
            return true;
        })();
        taskCompletionRef.current = completion;

        try {
            return await completion;
        } finally {
            if (taskCompletionRef.current === completion) taskCompletionRef.current = null;
            setTaskCompletionPending(false);
        }
    }, [connected, playerState, roundId, running, task, requestRoomState, roomCode, applyRoomSnapshot]);

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
                    const playerId = localStorage.getItem('player_id');
                    const savedRoomCode = localStorage.getItem('room_code') || roomVersionRef.current.roomCode;
                    if (playerId && savedRoomCode) {
                        console.log('Refreshing the room after returning to the page...');
                        socketRef.current.emit('rejoin', { player_id: playerId });
                        requestRoomState(socketRef.current, savedRoomCode, playerId);
                    } else if (!isMobile && savedRoomCode) {
                        socketRef.current.emit('register_reactor', { room_code: savedRoomCode });
                        requestRoomState(socketRef.current, savedRoomCode, null);
                    }
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [playerState?.username, requestRoomState]);

    useEffect(() => {
        socketRef.current = io(ENDPOINT, {
            auth: (callback) => callback({ utc_offset_minutes: -new Date().getTimezoneOffset() }),
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 2000,
            transports: ['websocket'],
        });

        socketRef.current.on('connect', () => {
            setConnected(true);
            // Try to rejoin existing game if we have a player_id
            let playerId = localStorage.getItem('player_id');
            let roomCode = localStorage.getItem('room_code');
            const inviteRoomCode = getRoomCodeFromSearch();

            if (inviteRoomCode && inviteRoomCode !== roomCode) {
                localStorage.removeItem('player_id');
                localStorage.removeItem('room_code');
                sessionStorage.removeItem('is_room_creator');
                playerId = null;
                roomCode = null;
                setPlayerState({ username: '', playerId: '' });
                setRoomCode('');
                setInRoom(false);
                setIsRoomCreator(false);
                setRoomOpen(false);
                roomVersionRef.current = { roomCode: '', revision: -1, roundId: null };
                setRoomRevision(-1);
                setRoundId(null);
                setLobbyState(null);
            }

            if (inviteRoomCode && !playerId && autoJoinInviteRef.current !== inviteRoomCode) {
                autoJoinInviteRef.current = inviteRoomCode;
                socketRef.current.emit('join_game', {
                    room_code: inviteRoomCode,
                    player_id: undefined,
                });
            } else if (playerId) {
                socketRef.current.emit('rejoin', {
                    player_id: playerId,
                });
                requestRoomState(socketRef.current, roomCode || localStorage.getItem('room_code'), playerId);
            } else if (!isMobile && roomCode) {
                // Reactor reconnecting - re-register as reactor
                socketRef.current.emit('register_reactor', { room_code: roomCode });
                requestRoomState(socketRef.current, roomCode, null);
            }
        });

        // Room management events
        socketRef.current.on('game_created', (data) => {
            setRoomEntryStatus(null);
            autoJoinInviteRef.current = null;
            clearRoomCodeFromUrl();
            console.log('Game created:', data);
            if (data.room_code && data.room_code !== roomVersionRef.current.roomCode) {
                roomVersionRef.current = { roomCode: data.room_code, revision: -1, roundId: null };
                setRoomRevision(-1);
                setRoundId(null);
                setLobbyState(null);
            }
            setRoomCode(data.room_code);
            setInRoom(true);
            inRoomRef.current = true;
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
            setRoomEntryStatus(null);
            clearRoomCodeFromUrl();
            console.log('Joined game:', data, 'is_creator:', data.is_creator);
            if (data.room_code && data.room_code !== roomVersionRef.current.roomCode) {
                roomVersionRef.current = { roomCode: data.room_code, revision: -1, roundId: null };
                setRoomRevision(-1);
                setRoundId(null);
                setLobbyState(null);
            }
            setRoomCode(data.room_code);
            setInRoom(true);
            inRoomRef.current = true;
            const isCreator = data.is_creator || false;
            setIsRoomCreator(isCreator);
            sessionStorage.setItem('is_room_creator', isCreator.toString());
            console.log('Setting isRoomCreator to:', isCreator);
            setRoomOpen(true);  // If we joined, the room must be open
            localStorage.setItem('room_code', data.room_code);
            autoJoinInviteRef.current = null;
            
            // Desktop clients register as reactor
            if (!isMobile) {
                socketRef.current.emit('register_reactor', { room_code: data.room_code });
            }
        });

        socketRef.current.on('reactor_registered', (data) => {
            console.log('Reactor registered:', data);
            if (data.room_code && data.room_code !== roomVersionRef.current.roomCode) {
                roomVersionRef.current = { roomCode: data.room_code, revision: -1, roundId: null };
                setRoomRevision(-1);
                setRoundId(null);
                setLobbyState(null);
            }
            setRoomCode(data.room_code);
            setInRoom(true);
            inRoomRef.current = true;
            setRoomOpen(data.is_open || false);
            setIsRoomCreator(data.is_creator || false);
            localStorage.setItem('room_code', data.room_code);
            sessionStorage.setItem('is_room_creator', String(data.is_creator || false));
        });

        socketRef.current.on('rejoin_failed', (data) => {
            console.log('Rejoin failed:', data);
            const previousRoomCode = localStorage.getItem('room_code');
            // Clear stale session data
            localStorage.removeItem('player_id');
            localStorage.removeItem('room_code');
            sessionStorage.removeItem('is_room_creator');
            resetGameState();
            setRoomEntryStatus({ code: 'session_not_found', room_code: previousRoomCode,
                message: data.message || 'Your previous session is no longer available. Ask the host for a new invite.' });
        });

        socketRef.current.on('error', (data) => {
            console.error('Socket error:', data);
            const inviteRoomCode = autoJoinInviteRef.current;
            if (data.scope === 'room_entry') {
                setRoomEntryStatus({ ...data, room_code: data.room_code || inviteRoomCode });
                return;
            }
            // Check if this is a "game/room not found" error - clear stale data
            const msg = (data.message || '').toLowerCase();
            if (msg.includes('game not found') || msg.includes('not in a game room')) {
                const previousRoomCode = roomVersionRef.current.roomCode;
                localStorage.removeItem('player_id');
                localStorage.removeItem('room_code');
                sessionStorage.removeItem('is_room_creator');
                resetGameState();
                if (previousRoomCode) {
                    setRoomEntryStatus({ code: 'room_not_found', room_code: previousRoomCode,
                        message: 'Your room is no longer available. Ask the host for a new invite.' });
                }
            }
            // Only show the error dialog if we're actually still in a room.
            // Suppresses spurious "Game not found" errors that fire after the
            // client has already left (the game may have been deleted on the server).
            if (isMobile && inRoomRef.current) {
                setDialog({ title: "Error", body: data.message });
            }
        });

        socketRef.current.on('task_locations', (data) => {
            setTaskLocations(data)
        })

        socketRef.current.on('room_state', (data) => {
            applyRoomSnapshot(data);
        });

        socketRef.current.on('lobby_state', (data) => {
            if (!acceptRoomData(data)) return;
            setLobbyState(data);
            if (Array.isArray(data.locations)) setTaskLocations(data.locations);
        });

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

        socketRef.current.on('taunt_received', (data) => {
            isMobile && setDialog({
                title: "You've received a message...",
                body: <TauntNotification message={data.message || ""} />
            });
        });

        socketRef.current.on('end_game', (data) => {
            if (data && typeof data === 'object' && !acceptRoomData(data)) return;
            // Handle both old format (string) and new format (object with result and stats)
            if (typeof data === 'string') {
                setEndState(data);
            } else {
                setEndState(data.result);
                setGameStats(data.stats);
            }
        });

        // Intruders revealed - tasks 100% complete!
        socketRef.current.on('intruders_revealed', (data) => {
            if (!acceptRoomData(data)) return;
            console.log('Intruders revealed:', data);
            setIntrudersRevealed(data);
            
            // Check if current player is an intruder
            const myPlayerId = localStorage.getItem('player_id');
            const isIntruder = data.intruder_ids?.includes(myPlayerId);
            
            isMobile && setDialog({ 
                title: isIntruder ? "🚨 EXPOSED! 🚨" : "🚨 TASKS COMPLETE! 🚨", 
                body: <IntrudersRevealedDisplay 
                    intruderNames={data.intruder_names || []} 
                    isIntruder={isIntruder}
                />
            });
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
            if (!acceptRoomData(data)) return;
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
            setIntrudersRevealed(null);
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
            if (!acceptRoomData(data)) return;
            console.log(data)
            if (!running) {
                setRunning(true)
            }
            setTask(data.task);
        });

        // Handle fake task completion - show reveal animation
        socketRef.current.on('fake_task_completed', (data) => {
            console.log('Fake task completed:', data);
            setFakeTaskReveal({
                task: data.task,
                location: data.location
            });
        });

        socketRef.current.on('crew_score', (data) => {
            if (!acceptRoomData(data)) return;
            setCrewScore(data.score);
        });

        socketRef.current.on('game_start', (data) => {
            if (data && !acceptRoomData(data)) return;
            markHasPlayedGame();
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
                if (!acceptRoomData(meetingData)) return;
                
                setMeetingState(meetingData);
                setShowSusPage(false)
                
                if (meetingData.stage === 'waiting') {
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
            if (!acceptRoomData(data)) return;
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
            setRoomEntryStatus(null);
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
            if (!acceptRoomData(data)) return;
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
        socketRef.current.emit("meeting", {
            player_id: playerState?.player_id || playerState?.playerId || localStorage.getItem('player_id'),
            round_id: roundId,
        });
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
        roomRevision,
        roundId,
        lobbyState,
        roomEntryStatus,
        setRoomEntryStatus,
        resetState,
        completeTask,
        taskCompletionPending,
        taskCompletionError,
        // Reset votes for play again
        resetVotes,
        // Intruder reveal (tasks 100%)
        intrudersRevealed,
    }), [
        endState,
        gameStats,
        meltdownCode,
        codesNeeded,
        meltdownTimer,
        hackTime, 
        audio,
        audioEnabled,
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
        taskLocations,
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
        roomRevision,
        roundId,
        lobbyState,
        roomEntryStatus,
        taskCreationMode,
        resetVotes,
        intrudersRevealed,
        completeTask,
        taskCompletionPending,
        taskCompletionError,
    ]);

    return (
        <DataContext.Provider value={contextValue}>
            <AudioHandler />
            {children}
            {/* Fake Task Reveal Animation */}
            {fakeTaskReveal && (
                <FakeTaskReveal
                    task={fakeTaskReveal.task}
                    location={fakeTaskReveal.location}
                    onComplete={() => setFakeTaskReveal(null)}
                />
            )}
        </DataContext.Provider>
    );
}

export { DataContext };

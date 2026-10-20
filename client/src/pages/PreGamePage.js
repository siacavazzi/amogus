import React, { useState, useContext, useEffect, useRef, useCallback } from 'react';
import { DataContext } from '../GameContext';
import { Plus, X, Check, Send, MapPin, Copy, Save, Play, LogOut, ToggleLeft, ToggleRight, Pencil, Share2 } from '../signal/icons';
import { Face } from '../signal';
import '../signal/host.css';
import { buildRoomInviteUrl } from '../utils/inviteLinks';

function sameLocations(left, right) {
    return left.length === right.length && left.every((location, index) => location === right[index]);
}

// Get or create a persistent device ID for task list ownership
function getDeviceId() {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
        deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
        localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
}

/**
 * Pre-game page with tabs for Players and Task Creation
 */
function PreGamePage() {
    const { socket, roomCode, players, taskLocations, running, setTaskEntry, isRoomCreator, lobbyState } = useContext(DataContext);
    const [activeTab, setActiveTab] = useState('players'); // 'players' or 'tasks'
    const [showContent, setShowContent] = useState(false);
    
    // Debug logging for host status
    useEffect(() => {
        console.log('PreGamePage: isRoomCreator =', isRoomCreator);
    }, [isRoomCreator]);
    
    // Task creation state
    const [tasks, setTasks] = useState([]);
    const [serverMinTasks, setServerMinTasks] = useState(null);
    const [serverLobbyState, setServerLobbyState] = useState(null);
    const lobbyVersionRef = useRef({ roomCode, revision: -1 });
    const [newTaskText, setNewTaskText] = useState('');
    const [selectedLocation, setSelectedLocation] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputRef = useRef(null);
    
    // Location management state
    const [localLocations, setLocalLocations] = useState([]);
    const [newLocationInput, setNewLocationInput] = useState('');
    const [showLocationSetup, setShowLocationSetup] = useState(false);
    const [locationsInitialized, setLocationsInitialized] = useState(false);
    
    // Task list saving state
    const [taskListCode, setTaskListCode] = useState(null);
    const [taskListName, setTaskListName] = useState('');
    const [isEditingName, setIsEditingName] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [codeCopied, setCodeCopied] = useState(false);
    const [roomCodeCopied, setRoomCodeCopied] = useState(false);
    const [inviteShared, setInviteShared] = useState(false);
    const [isTaskListOwner, setIsTaskListOwner] = useState(true); // Track if user owns the loaded task list
    const deviceId = useRef(getDeviceId()).current;
    const autoSaveTimeoutRef = useRef(null);
    const pendingSaveRef = useRef(false);
    
    // Collaborative mode - whether all players can add tasks
    const [collaborativeMode, setCollaborativeMode] = useState(false);

    const replaceLobbyState = useCallback((data) => {
        if (!data || typeof data !== 'object') return;
        if (data.room_code && roomCode && data.room_code !== roomCode) return;

        if (lobbyVersionRef.current.roomCode !== roomCode) {
            lobbyVersionRef.current = { roomCode, revision: -1 };
        }
        const incomingRevision = Number(data.revision);
        if (Number.isFinite(incomingRevision) && incomingRevision < lobbyVersionRef.current.revision) return;
        if (Number.isFinite(incomingRevision)) {
            lobbyVersionRef.current = { roomCode, revision: incomingRevision };
        }

        setServerLobbyState(data);
        if (Array.isArray(data.tasks)) {
            setTasks((previous) => (
                JSON.stringify(previous) === JSON.stringify(data.tasks) ? previous : data.tasks
            ));
        }
        setServerMinTasks(typeof data.min_tasks === 'number' && Number.isFinite(data.min_tasks) ? data.min_tasks : null);
        if (Object.prototype.hasOwnProperty.call(data, 'task_list_code')) setTaskListCode(data.task_list_code || null);
        if (Object.prototype.hasOwnProperty.call(data, 'task_list_name')) setTaskListName(data.task_list_name || '');
        if (data.collaborative_mode !== undefined) setCollaborativeMode(data.collaborative_mode);
    }, [roomCode]);

    useEffect(() => {
        lobbyVersionRef.current = { roomCode, revision: -1 };
        setServerLobbyState(null);
        setServerMinTasks(null);
        setTasks([]);
        setTaskListCode(null);
        setTaskListName('');
        setCollaborativeMode(false);
        setIsTaskListOwner(true);
    }, [roomCode]);

    useEffect(() => {
        if (lobbyState) replaceLobbyState(lobbyState);
    }, [lobbyState, roomCode, replaceLobbyState]);
    
    // Permissions: host can always add tasks, others only if collaborative mode is on
    const canAddTasks = isRoomCreator || collaborativeMode;
    const canEditLocations = isRoomCreator;
    const canSaveTaskList = isRoomCreator;
    const isHost = isRoomCreator;
    
    const playerId = localStorage.getItem('player_id');
    const playerName = players.find(p => p.player_id === playerId)?.username || 'You';
    
    // Real locations are user-added ones (excluding 'Other')
    const realLocations = localLocations.filter(l => l !== 'Other');
    
    // Full location list for task creation includes 'Other' at the end
    const locations = realLocations.length > 0 ? [...realLocations, 'Other'] : ['Other'];
    
    // Need location setup if less than 2 real locations
    const needsLocationSetup = realLocations.length < 2;

    useEffect(() => {
        window.scrollTo(0, 0);
        const timer = setTimeout(() => setShowContent(true), 100);
        return () => clearTimeout(timer);
    }, []);

    // Auto-save function with debounce - only auto-saves AFTER initial save with a name
    // AND only if the current user owns the task list
    const triggerAutoSave = (currentTasks, currentLocations, currentTaskListCode, ownsTaskList) => {
        // Only auto-save if we already have a task list code (i.e., it was saved with a name)
        // AND the current user is the owner of the task list
        if (!currentTaskListCode || isSaving || !ownsTaskList) return;
        
        // Mark that we have a pending save
        pendingSaveRef.current = true;
        
        // Clear any existing timeout
        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
        }
        
        // Debounce: wait 2 seconds after last change before saving
        autoSaveTimeoutRef.current = setTimeout(() => {
            if (pendingSaveRef.current && socket) {
                console.log('Auto-saving task list...');
                setIsSaving(true);
                socket.emit('save_collaborative_tasks', {
                    room_code: roomCode,
                    device_id: deviceId,
                    name: taskListName.trim() || 'Task List'
                });
                pendingSaveRef.current = false;
            }
        }, 2000);
    };

    // Cleanup auto-save timeout on unmount
    useEffect(() => {
        return () => {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }
        };
    }, []);

    // Auto-save when tasks change (after initial load)
    const tasksInitializedRef = useRef(false);
    useEffect(() => {
        if (tasks.length > 0) {
            if (tasksInitializedRef.current) {
                triggerAutoSave(tasks, localLocations, taskListCode, isTaskListOwner);
            } else {
                tasksInitializedRef.current = true;
            }
        }
    }, [tasks, localLocations, taskListCode, isTaskListOwner]);

    // Auto-save when locations change (after initial setup)
    const locationsAutoSaveRef = useRef(false);
    useEffect(() => {
        if (locationsInitialized && localLocations.length > 0) {
            if (locationsAutoSaveRef.current) {
                triggerAutoSave(tasks, localLocations, taskListCode, isTaskListOwner);
            } else {
                locationsAutoSaveRef.current = true;
            }
        }
    }, [localLocations, locationsInitialized, tasks, taskListCode, isTaskListOwner]);
    
    // Show location setup if needed and no tasks yet (only for host)
    useEffect(() => {
        if (needsLocationSetup && tasks.length === 0 && activeTab === 'tasks' && isRoomCreator) {
            setShowLocationSetup(true);
        }
    }, [needsLocationSetup, tasks.length, activeTab, isRoomCreator]);
    
    // Keep local locations synced to the latest server view so a late
    // task_locations payload can repair any earlier stale snapshot.
    useEffect(() => {
        const realFromServer = taskLocations.filter(l => l !== 'Other');
        setLocalLocations((previous) => (
            sameLocations(previous, realFromServer) ? previous : realFromServer
        ));
        setLocationsInitialized(taskLocations.length > 0);
    }, [taskLocations]);
    
    // Set default location when locations are available
    useEffect(() => {
        if (realLocations.length > 0 && !selectedLocation) {
            // Set initial selection to first real location
            setSelectedLocation(realLocations[0]);
        } else if (selectedLocation && selectedLocation !== 'Other' && !realLocations.includes(selectedLocation)) {
            // Selected location was removed, reset to first real location
            setSelectedLocation(realLocations[0]);
        }
    }, [realLocations, selectedLocation]);

    // Listen for collaborative task updates
    useEffect(() => {
        if (!socket) return;

        const handleTasksUpdate = (data) => {
            console.log('Collaborative tasks updated:', data);
            console.log('My device_id:', deviceId, 'is_owner from server:', data.is_owner);
            if (lobbyVersionRef.current.revision < 0) {
                setTasks(data.tasks || []);
                if (data.min_tasks !== undefined) setServerMinTasks(data.min_tasks);
                if (Object.prototype.hasOwnProperty.call(data, 'task_list_code')) setTaskListCode(data.task_list_code || null);
                if (Object.prototype.hasOwnProperty.call(data, 'task_list_name')) setTaskListName(data.task_list_name || '');
                if (data.collaborative_mode !== undefined) setCollaborativeMode(data.collaborative_mode);
            }
            // Track ownership
            if (data.is_owner !== undefined) {
                setIsTaskListOwner(data.is_owner);
            }
        };

        const handleTaskAdded = (data) => {
            console.log('Task added:', data);
            if (lobbyVersionRef.current.revision < 0) {
                setTasks(prev => [...prev, data.task]);
                if (data.min_tasks !== undefined) setServerMinTasks(data.min_tasks);
            }
            setIsSubmitting(false);
        };

        const handleTaskRemoved = (data) => {
            console.log('Task removed:', data);
            if (lobbyVersionRef.current.revision < 0) {
                setTasks(prev => prev.filter((task, i) => data.task_id ? task.task_id !== data.task_id : i !== data.index));
            }
        };

        const handleLobbyState = (data) => replaceLobbyState(data);

        const handleTasksSaved = (data) => {
            console.log('Collaborative tasks saved:', data);
            setTaskListCode(data.code);
            if (data.name) {
                setTaskListName(data.name);
            }
            // Track ownership - if is_owner is provided, use it; for new saves, we are the owner
            if (data.is_owner !== undefined) {
                setIsTaskListOwner(data.is_owner);
            } else if (!data.updated) {
                // New list created means we are the owner
                setIsTaskListOwner(true);
            }
            setIsSaving(false);
        };

        const handleCollaborativeModeChanged = (data) => {
            console.log('Collaborative mode changed:', data);
            setCollaborativeMode(data.enabled);
        };

        socket.on('collaborative_tasks', handleTasksUpdate);
        socket.on('lobby_state', handleLobbyState);
        socket.on('collaborative_task_added', handleTaskAdded);
        socket.on('collaborative_task_removed', handleTaskRemoved);
        socket.on('collaborative_tasks_saved', handleTasksSaved);
        socket.on('collaborative_mode_changed', handleCollaborativeModeChanged);

        // Request current tasks (include device_id for ownership check)
        console.log('Requesting collaborative tasks with device_id:', deviceId);
        socket.emit('get_collaborative_tasks', { room_code: roomCode, device_id: deviceId });

        return () => {
            socket.off('collaborative_tasks', handleTasksUpdate);
            socket.off('lobby_state', handleLobbyState);
            socket.off('collaborative_task_added', handleTaskAdded);
            socket.off('collaborative_task_removed', handleTaskRemoved);
            socket.off('collaborative_tasks_saved', handleTasksSaved);
            socket.off('collaborative_mode_changed', handleCollaborativeModeChanged);
        };
    }, [socket, roomCode, deviceId, replaceLobbyState]);

    // Location management functions
    const addLocation = () => {
        const loc = newLocationInput.trim();
        if (loc && loc !== 'Other' && !localLocations.includes(loc)) {
            const newLocs = [...localLocations, loc];
            setLocalLocations(newLocs);
            setNewLocationInput('');
            
            socket.emit('update_game_locations', {
                room_code: roomCode,
                locations: [...newLocs, 'Other']
            });
        }
    };

    // Helper to get task count for a location
    const getTaskCountForLocation = (loc) => {
        return tasks.filter(t => t.location === loc).length;
    };
    
    // Check if a location can be removed (no tasks and more than 2 real locations)
    const canRemoveLocation = (loc) => {
        if (loc === 'Other') return false;
        const realCount = localLocations.filter(l => l !== 'Other').length;
        if (realCount <= 2) return false;
        return getTaskCountForLocation(loc) === 0;
    };

    const removeLocation = (loc) => {
        if (!canRemoveLocation(loc)) return;
        
        const newLocs = localLocations.filter(l => l !== loc);
        setLocalLocations(newLocs);
        
        socket.emit('update_game_locations', {
            room_code: roomCode,
            locations: [...newLocs.filter(l => l !== 'Other'), 'Other']
        });
    };

    const confirmLocations = () => {
        const realCount = localLocations.filter(l => l !== 'Other').length;
        if (realCount >= 2) {
            setShowLocationSetup(false);
            socket.emit('update_game_locations', {
                room_code: roomCode,
                locations: [...localLocations.filter(l => l !== 'Other'), 'Other']
            });
        }
    };

    const handleAddTask = () => {
        if (!newTaskText.trim() || !selectedLocation) return;
        
        setIsSubmitting(true);
        socket.emit('add_collaborative_task', {
            room_code: roomCode,
            player_id: playerId,
            task: {
                task: newTaskText.trim(),
                location: selectedLocation,
                added_by: playerName
            }
        });
        setNewTaskText('');
        inputRef.current?.focus();
    };

    const handleRemoveTask = (index) => {
        const task = tasks[index];
        socket.emit('remove_collaborative_task', {
            room_code: roomCode,
            player_id: playerId,
            task_index: index,
            ...(task?.task_id ? { task_id: task.task_id } : {}),
        });
    };

    const handleToggleCollaborativeMode = () => {
        socket.emit('toggle_collaborative_mode', {
            room_code: roomCode,
            enabled: !collaborativeMode
        });
    };

    const handleSaveTaskList = () => {
        if (tasks.length === 0) return;
        if (!taskListName.trim() && !taskListCode) {
            alert('Please enter a name for your task list');
            return;
        }
        setIsSaving(true);
        socket.emit('save_collaborative_tasks', {
            room_code: roomCode,
            device_id: deviceId,
            name: taskListName.trim() || undefined
        });
    };

    // Save as new copy (for when user doesn't own the current list)
    const handleSaveAsNew = () => {
        if (tasks.length === 0) return;
        const newName = prompt('Enter a name for your copy of this task list:', taskListName ? `${taskListName} (Copy)` : 'My Task List');
        if (!newName || !newName.trim()) return;
        
        setIsSaving(true);
        socket.emit('save_collaborative_tasks', {
            room_code: roomCode,
            device_id: deviceId,
            name: newName.trim(),
            force_new: true  // Force creating a new list
        });
    };

    const copyTaskListCode = async () => {
        if (!taskListCode) return;
        try {
            await navigator.clipboard.writeText(taskListCode);
            setCodeCopied(true);
            setTimeout(() => setCodeCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const copyRoomCode = async () => {
        try {
            await navigator.clipboard.writeText(roomCode);
            setRoomCodeCopied(true);
            setTimeout(() => setRoomCodeCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const copyInviteLink = async (inviteUrl) => {
        await navigator.clipboard.writeText(inviteUrl);
        setInviteShared(true);
        setTimeout(() => setInviteShared(false), 2000);
    };

    const shareInviteLink = async () => {
        const inviteUrl = buildRoomInviteUrl(roomCode);
        if (!inviteUrl) return;

        const shareData = {
            title: 'Join my Sus Party room',
            text: `Join my Sus Party room ${roomCode}`,
            url: inviteUrl,
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
                setInviteShared(true);
                setTimeout(() => setInviteShared(false), 2000);
                return;
            }
            await copyInviteLink(inviteUrl);
        } catch (err) {
            if (err?.name === 'AbortError') {
                return;
            }
            try {
                await copyInviteLink(inviteUrl);
            } catch (copyErr) {
                console.error('Failed to share invite:', err, copyErr);
            }
        }
    };

    const handleLeaveRoom = () => {
        if (window.confirm('Are you sure you want to leave this room?')) {
            socket.emit('leave_room', { player_id: playerId });
        }
    };

    const [showTestConfirm, setShowTestConfirm] = useState(false);

    const handleStartGame = () => {
        if (canStartTestGame) {
            setShowTestConfirm(true);
            return;
        }
        socket.emit('start_game', { player_id: playerId });
    };

    const handleStartTestGame = () => {
        setShowTestConfirm(false);
        socket.emit('start_game', { player_id: playerId, test_mode: true });
    };

    // Calculate tasks per location requirement
    const tasksByLocation = tasks.reduce((acc, task, index) => {
        const loc = task.location || 'Other';
        if (!acc[loc]) acc[loc] = [];
        acc[loc].push({ ...task, originalIndex: index });
        return acc;
    }, {});

    // Show per-location counts as advice. The server checks the start rules.
    const MIN_TASKS_PER_LOCATION = 5;
    const requiredTotalTasks = serverMinTasks ?? Math.max(players.length * 3, 10);
    const missingTotalTasks = Math.max(0, requiredTotalTasks - tasks.length);
    const hasEnoughTotalTasks = missingTotalTasks === 0;

    const fallbackCanStartGame = players.length >= 3 && realLocations.length >= 2 && hasEnoughTotalTasks;
    const fullGameReady = isHost && (serverLobbyState?.can_start ?? fallbackCanStartGame);
    // One or two players can start a test game to try it out. The server decides.
    const fallbackCanStartTest = players.length >= 1 && players.length < 3 && realLocations.length >= 2 && hasEnoughTotalTasks;
    const canStartTestGame = isHost && !fullGameReady && (serverLobbyState?.can_start_test ?? fallbackCanStartTest);
    const canStartGame = fullGameReady || canStartTestGame;
    
    // Calculate what's missing
    const getTasksNeededMessage = () => {
        if (serverLobbyState?.start_error) return serverLobbyState.start_error;
        if (realLocations.length < 2) {
            return `Add at least ${2 - realLocations.length} more location${2 - realLocations.length !== 1 ? 's' : ''} first`;
        }
        if (!hasEnoughTotalTasks) {
            return `Need ${missingTotalTasks} more task${missingTotalTasks !== 1 ? 's' : ''} total`;
        }
        if (players.length < 3) return 'Need at least 3 players for one intruder.';
        return '';
    };

    if (!players || players.length === 0) {
        return (
            <div className="sg-screen sg-round">
                <div className="sg-center">
                    <span className="hs-dot" style={{ width: 16, height: 16, background: '#fff' }} aria-hidden="true" />
                    <p className="sg-big sg-h3">Waiting for players...</p>
                </div>
            </div>
        );
    }

    // Empty seats fill out the last row of the roll call so the grid reads as a room with space.
    const openSeats = players.length < 9 ? (3 - (players.length % 3)) % 3 : 0;

    return (
        <div className="sg-screen sg-round hs hs-lobby">
            <div className={`hs-wrap hs-lobby__scroll ${showContent ? 'sg-a sg-rise' : ''}`}>
                <div className="hs-bar">
                    <span className="hs-live"><span className="hs-dot" aria-hidden="true" />Live</span>
                    <button type="button" onClick={handleLeaveRoom} className="hs-round" title="Leave room" aria-label="Leave room">
                        <LogOut size={20} />
                    </button>
                </div>

                {/* Room code: tap to copy, invite to share */}
                {roomCode && (
                    <div style={{ display: 'grid', gap: 14 }}>
                        <button type="button" onClick={copyRoomCode} className="hs-code" title="Copy room code" aria-label="Copy room code">
                            <span className="hs-label">Room code</span>
                            <span className="hs-code__value" data-testid="room-code">{roomCode}</span>
                            <span className="hs-code__tap" aria-live="polite">
                                {roomCodeCopied ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Tap to copy</>}
                            </span>
                        </button>
                        <button type="button" onClick={shareInviteLink} className="sg-btn sg-btn-ghost" aria-label="Invite players to room">
                            {inviteShared ? <><Check size={22} /> Link copied!</> : <><Share2 size={22} /> Invite Players</>}
                        </button>
                    </div>
                )}

                <div className="hs-tabs" role="group" aria-label="Lobby view">
                    <button type="button" className="hs-tab" aria-pressed={activeTab === 'players'} onClick={() => setActiveTab('players')}
                        aria-label={`Players (${players.length})`}>
                        <span className="hs-tab__label">Players</span>
                        <span className="hs-tab__num">{players.length}</span>
                    </button>
                    <button type="button" className="hs-tab" aria-pressed={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')}
                        aria-label={`Tasks (${tasks.length})`}>
                        <span className="hs-tab__label">Tasks</span>
                        <span className="hs-tab__num">{tasks.length}</span>
                    </button>
                </div>

                {/* ========== PLAYERS TAB ========== */}
                {activeTab === 'players' && (
                    <>
                        <ul className="hs-roll" aria-label="Players in the room">
                            {players.map((player, index) => (
                                <li key={player.player_id || player.id || index} className="sg-a sg-pop" style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}>
                                    <Face player={player} size={84} className="hs-roll__face" />
                                    <span className="hs-roll__name">{player.username}</span>
                                    {player.player_id === playerId && <span className="hs-roll__you">You</span>}
                                </li>
                            ))}
                            {Array.from({ length: openSeats }, (_, i) => (
                                <li key={`open-${i}`} aria-hidden="true">
                                    <span className="hs-roll__empty"><Plus size={26} /></span>
                                    <span className="hs-roll__emptyname">Open seat</span>
                                </li>
                            ))}
                        </ul>

                        {players.length < 4 && (
                            <p className="hs-hint hs-muted">Waiting for more players to join...</p>
                        )}

                        {/* 3-player rounds use last-stand rules (server: Game.assignRoles) */}
                        {players.length === 3 && (
                            <div data-testid="small-group-note" className="hs-panel hs-panel--tight">
                                <p className="hs-title" style={{ fontSize: 20 }}>Best with 4 or more players</p>
                                <p className="sg-small" style={{ opacity: 0.85, fontWeight: 600, fontSize: 15, lineHeight: 1.35 }}>
                                    With 3, it&rsquo;s a last stand: once it&rsquo;s down to one crewmate and the intruder, there are no more meetings.
                                    The crewmate wins by finishing 3 more tasks. The intruder wins by eliminating them.
                                </p>
                            </div>
                        )}
                    </>
                )}

                {/* ========== TASKS TAB ========== */}
                {activeTab === 'tasks' && (
                    <>
                        {/* List name, task list code, save controls and auto-save status */}
                        <div className="hs-panel hs-panel--tight">
                            <div className="hs-listhead">
                                {!taskListCode && canSaveTaskList && (
                                    <div className="hs-inline" style={{ width: '100%' }}>
                                        <input
                                            type="text"
                                            value={taskListName}
                                            onChange={(e) => setTaskListName(e.target.value)}
                                            placeholder="Name your task list…"
                                            aria-label="Task list name"
                                            className="hs-input"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleSaveTaskList}
                                            disabled={isSaving || !taskListName.trim() || tasks.length === 0}
                                            className="sg-btn sg-btn-line hs-btn-sm"
                                            title={tasks.length === 0 ? 'Add tasks first' : !taskListName.trim() ? 'Enter a name first' : 'Save and get a code'}
                                        >
                                            <Save size={18} />
                                            <span>{isSaving ? '…' : 'Save'}</span>
                                        </button>
                                    </div>
                                )}
                                {taskListCode && !isEditingName && (
                                    <>
                                        <span className="hs-listhead__name">{taskListName || 'Untitled list'}</span>
                                        {canSaveTaskList && isTaskListOwner && (
                                            <button type="button" onClick={() => setIsEditingName(true)} className="hs-round" style={{ width: 40, height: 40 }} title="Rename" aria-label="Rename task list">
                                                <Pencil size={16} />
                                            </button>
                                        )}
                                        {!isTaskListOwner && <span className="hs-tag">copy</span>}
                                    </>
                                )}
                                {taskListCode && isEditingName && canSaveTaskList && (
                                    <div className="hs-inline" style={{ flex: 1, minWidth: 200 }}>
                                        <input
                                            type="text"
                                            value={taskListName}
                                            autoFocus
                                            aria-label="Task list name"
                                            onChange={(e) => setTaskListName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') { setIsEditingName(false); handleSaveTaskList(); }
                                                if (e.key === 'Escape') setIsEditingName(false);
                                            }}
                                            className="hs-input"
                                        />
                                        <button type="button" onClick={() => { setIsEditingName(false); handleSaveTaskList(); }} className="sg-btn sg-btn-line hs-btn-sm" title="Done">
                                            <Check size={18} /> <span>Done</span>
                                        </button>
                                    </div>
                                )}
                                {taskListCode && (
                                    <button type="button" onClick={copyTaskListCode} className="hs-chipbtn" title="Copy task list code">
                                        <span>{taskListCode}</span>
                                        {codeCopied ? <Check size={16} /> : <Copy size={16} />}
                                    </button>
                                )}
                                {taskListCode && !isTaskListOwner && (
                                    <button type="button" onClick={handleSaveAsNew} disabled={isSaving || tasks.length === 0} className="sg-btn sg-btn-line hs-btn-sm hs-btn-auto" title="Save as your own copy">
                                        <Save size={18} />
                                        <span>{isSaving ? '…' : 'Save copy'}</span>
                                    </button>
                                )}
                            </div>
                            {taskListCode && isTaskListOwner && (
                                <p className="sg-small" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {isSaving ? 'Saving…' : <><Check size={14} /> Auto-saved</>}
                                </p>
                            )}
                        </div>

                        {/* Collaborative mode (host only) */}
                        {isHost && (
                            <button
                                type="button"
                                onClick={handleToggleCollaborativeMode}
                                className="hs-switch"
                                aria-pressed={collaborativeMode}
                                title={collaborativeMode ? 'Tap to make host-only' : 'Tap to let everyone add tasks'}
                            >
                                <span className="hs-switch__text">
                                    <b>Collaborative mode</b>
                                    <span>{collaborativeMode ? 'Everyone can add tasks' : 'Only the host can add tasks'}</span>
                                </span>
                                <span className="hs-switch__state">
                                    {collaborativeMode ? <><ToggleRight size={18} /> On</> : <><ToggleLeft size={18} /> Off</>}
                                </span>
                            </button>
                        )}

                        {/* Location editor (host only) */}
                        {showLocationSetup && canEditLocations && (
                            <div className="hs-panel">
                                <div className="hs-bar" style={{ minHeight: 0 }}>
                                    <h3 className="hs-title">{needsLocationSetup ? 'Set up locations' : 'Edit locations'}</h3>
                                    {!needsLocationSetup && (
                                        <button type="button" onClick={() => setShowLocationSetup(false)} className="hs-round" title="Done" aria-label="Done">
                                            <X size={18} />
                                        </button>
                                    )}
                                </div>
                                <p className="sg-small" style={{ opacity: 0.85, fontWeight: 600, fontSize: 15, lineHeight: 1.35 }}>
                                    Add at least 2 locations where tasks happen (for example, "Kitchen" and "Backyard"). Recommended: {MIN_TASKS_PER_LOCATION} tasks per location.
                                </p>

                                {realLocations.length > 0 && (
                                    <div className="hs-locs">
                                        {realLocations.map((loc) => {
                                            const taskCount = getTaskCountForLocation(loc);
                                            const removable = canRemoveLocation(loc);
                                            return (
                                                <span key={loc} title={taskCount > 0 ? `${taskCount} tasks — remove tasks first to delete` : ''}>
                                                    {loc}
                                                    {taskCount > 0 && <small style={{ opacity: 0.7 }}>({taskCount})</small>}
                                                    {realLocations.length > 2 && (
                                                        <button type="button" onClick={() => removeLocation(loc)} disabled={!removable}
                                                            title={!removable && taskCount > 0 ? 'Remove tasks first' : 'Remove'} aria-label={`Remove ${loc}`}>
                                                            <X size={14} />
                                                        </button>
                                                    )}
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}

                                <div className="hs-inline">
                                    <input
                                        type="text"
                                        value={newLocationInput}
                                        onChange={(e) => setNewLocationInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && addLocation()}
                                        placeholder="Add a location…"
                                        aria-label="New location"
                                        className="hs-input"
                                    />
                                    <button type="button" onClick={addLocation} disabled={!newLocationInput.trim()} className="sg-btn sg-btn-line hs-btn-sm" title="Add location" aria-label="Add location">
                                        <Plus size={20} />
                                    </button>
                                </div>
                                {realLocations.length >= 2 && needsLocationSetup && (
                                    <button type="button" onClick={confirmLocations} className="sg-btn sg-btn-white hs-btn-sm">
                                        <Check size={20} /> Done
                                    </button>
                                )}
                                {realLocations.length < 2 && (
                                    <p className="hs-hint" style={{ color: 'var(--sg-meet)' }}>
                                        Add {2 - realLocations.length} more location{2 - realLocations.length !== 1 ? 's' : ''} to continue
                                    </p>
                                )}
                            </div>
                        )}

                        {needsLocationSetup && !canEditLocations && (
                            <div className="hs-panel" style={{ textAlign: 'center', justifyItems: 'center' }}>
                                <MapPin size={30} />
                                <p className="hs-title" style={{ fontSize: 20 }}>Waiting for host to set up locations…</p>
                                <p className="sg-small">They need to add at least 2 locations before tasks can be created.</p>
                            </div>
                        )}

                        {/* Add a task: location, text, send */}
                        {!showLocationSetup && canAddTasks && realLocations.length > 0 && (
                            <div className="hs-panel hs-panel--tight">
                                <label className="hs-label" htmlFor="new-task-text">Add a task</label>
                                <input
                                    id="new-task-text"
                                    ref={inputRef}
                                    type="text"
                                    value={newTaskText}
                                    onChange={(e) => setNewTaskText(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
                                    placeholder="Add a task… (e.g. 10 jumping jacks)"
                                    className="hs-input"
                                    disabled={isSubmitting}
                                />
                                <div className="hs-inline">
                                    <select
                                        value={selectedLocation}
                                        onChange={(e) => setSelectedLocation(e.target.value)}
                                        className="hs-select"
                                        style={{ flex: 1, maxWidth: 'none' }}
                                        title="Choose a location for this task"
                                        aria-label="Location for this task"
                                    >
                                        {locations.map(loc => (
                                            <option key={loc} value={loc}>{loc}</option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={handleAddTask}
                                        disabled={!newTaskText.trim() || isSubmitting}
                                        className="sg-btn sg-btn-line hs-btn-sm"
                                        title="Add task"
                                    >
                                        <Send size={18} /> Add
                                    </button>
                                </div>
                            </div>
                        )}

                        {!showLocationSetup && !canAddTasks && (
                            <div className="hs-panel hs-panel--tight" style={{ textAlign: 'center' }}>
                                <p className="hs-title" style={{ fontSize: 19 }}>Only the host can add tasks right now</p>
                                <p className="sg-small">Ask the host to turn on collaborative mode if you want to help.</p>
                            </div>
                        )}

                        {/* Every location, plus the optional Other section */}
                        {!showLocationSetup && locations.map((location) => {
                            const locationTasks = tasksByLocation[location] || [];
                            const isOther = location === 'Other';
                            const enough = !isOther && locationTasks.length >= MIN_TASKS_PER_LOCATION;
                            const canDelete = !isOther && canEditLocations && locationTasks.length === 0 && realLocations.length > 2;
                            const canShowRemove = isHost || collaborativeMode;
                            return (
                                <section key={location} aria-label={`${location} tasks`} className="hs-loc">
                                    <div className="hs-loc__head">
                                        <span className="hs-loc__name">{location}</span>
                                        <span className={`hs-loc__count ${!isOther && !enough ? 'hs-loc__count--short' : ''}`}>
                                            {isOther
                                                ? `${locationTasks.length} task${locationTasks.length === 1 ? '' : 's'}`
                                                : `${locationTasks.length}/${MIN_TASKS_PER_LOCATION}`}
                                            {enough && <Check size={16} />}
                                        </span>
                                        {canDelete && (
                                            <button type="button" onClick={() => removeLocation(location)} className="hs-loc__del" title="Delete this location">
                                                <X size={14} /> Delete
                                            </button>
                                        )}
                                    </div>
                                    {locationTasks.length > 0 ? (
                                        <ul className="hs-tasks">
                                            {locationTasks.map((task) => (
                                                <li key={task.originalIndex} className="hs-task">
                                                    <div className="hs-task__body">
                                                        <p className="hs-task__text">{task.task}</p>
                                                        {task.added_by && <p className="hs-task__by">Added by {task.added_by}</p>}
                                                    </div>
                                                    {canShowRemove && (
                                                        <button type="button" onClick={() => handleRemoveTask(task.originalIndex)} className="hs-task__x" title="Remove task" aria-label="Remove task">
                                                            <X size={18} />
                                                        </button>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="hs-empty">{isOther ? 'Optional. Tasks that fit anywhere.' : 'No tasks here yet'}</p>
                                    )}
                                </section>
                            );
                        })}

                        {/* Add a new location (host only), at the end and out of the way */}
                        {!showLocationSetup && canEditLocations && realLocations.length > 0 && (
                            <div className="hs-panel hs-panel--tight">
                                <label className="hs-label" htmlFor="new-location">Add a new location</label>
                                <div className="hs-inline">
                                    <input
                                        id="new-location"
                                        type="text"
                                        value={newLocationInput}
                                        onChange={(e) => setNewLocationInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && addLocation()}
                                        placeholder="e.g. Garage, Backyard…"
                                        className="hs-input"
                                    />
                                    <button type="button" onClick={addLocation} disabled={!newLocationInput.trim()} className="sg-btn sg-btn-line hs-btn-sm" title="Add location">
                                        <Plus size={18} /> Add
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Start game, pinned to the bottom */}
            {!running && (
                <div className="hs-dock">
                    <div className="hs-dock__inner">
                        {canStartGame ? (
                            <>
                                <button type="button" onClick={handleStartGame} className="sg-btn sg-btn-white hs-start">
                                    <Play size={26} /> <span>Start Game</span>
                                </button>
                                {canStartTestGame && (
                                    <p className="hs-hint">
                                        Only {players.length} player{players.length !== 1 ? 's' : ''} so far. Starting now runs a test game.
                                    </p>
                                )}
                            </>
                        ) : isHost ? (
                            <p className="hs-notice" style={{ textAlign: 'center' }}>{getTasksNeededMessage()}</p>
                        ) : (
                            <p className="hs-notice hs-wait">
                                <span className="hs-dot hs-dot--still" style={{ background: '#fff' }} aria-hidden="true" />
                                Waiting for host to start the game...
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Test game confirmation for one or two players */}
            {showTestConfirm && (
                <div className="sg-sheet-scrim" role="dialog" aria-modal="true" aria-labelledby="test-game-title">
                    <div className="sg-sheet sg-a sg-rise">
                        <h2 id="test-game-title" className="sg-big sg-h3">Not enough players for a real game</h2>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 16, lineHeight: 1.4 }}>
                            Sus Party needs at least 3 players. We'll start a test game anyway so you can see how it plays.
                        </p>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 15, lineHeight: 1.4, opacity: 0.7 }}>
                            In a test game anyone can switch between crewmate and intruder from the top of their screen. Test games don't count toward stats.
                        </p>
                        <button type="button" onClick={handleStartTestGame} className="sg-btn sg-btn-blue">
                            <Play size={22} /> Start test game
                        </button>
                        <button type="button" onClick={() => setShowTestConfirm(false)} className="sg-btn sg-btn-soft">
                            Wait for more players
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PreGamePage;

import React, { useState, useContext, useEffect, useRef, useMemo } from 'react';
import { DataContext } from '../GameContext';
import PlayerCard from '../components/PlayerCard';
import { Plus, X, Check, Send, ThumbsDown, MapPin, Copy, Save, Play, LogOut, Users, ClipboardList, ToggleLeft, ToggleRight, Pencil, Zap, Wifi } from 'lucide-react';
import { FloatingParticles, useFloatingParticles, GlowingOrb, GridOverlay } from '../components/ui';

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
    const { socket, roomCode, players, taskLocations, running, setTaskEntry, isRoomCreator } = useContext(DataContext);
    const [activeTab, setActiveTab] = useState('players'); // 'players' or 'tasks'
    const [showContent, setShowContent] = useState(false);
    
    // Use shared floating particles hook
    const particles = useFloatingParticles(15, 'default');
    
    // Debug logging for host status
    useEffect(() => {
        console.log('PreGamePage: isRoomCreator =', isRoomCreator);
    }, [isRoomCreator]);
    
    // Task creation state
    const [tasks, setTasks] = useState([]);
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
    const [isTaskListOwner, setIsTaskListOwner] = useState(true); // Track if user owns the loaded task list
    const deviceId = useRef(getDeviceId()).current;
    const autoSaveTimeoutRef = useRef(null);
    const pendingSaveRef = useRef(false);
    
    // Collaborative mode - whether all players can add tasks
    const [collaborativeMode, setCollaborativeMode] = useState(false);
    
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
    
    // Initialize local locations from server locations
    useEffect(() => {
        if (taskLocations.length > 0 && !locationsInitialized) {
            const realFromServer = taskLocations.filter(l => l !== 'Other');
            setLocalLocations(realFromServer);
            setLocationsInitialized(true);
        }
    }, [taskLocations, locationsInitialized]);
    
    // Listen for location updates from other devices
    useEffect(() => {
        if (!socket) return;
        
        const handleLocationUpdate = (newLocations) => {
            console.log('Locations updated from server:', newLocations);
            const realFromServer = newLocations.filter(l => l !== 'Other');
            setLocalLocations(realFromServer);
            setLocationsInitialized(true);  // Mark as initialized when we get an update
        };
        
        socket.on('task_locations', handleLocationUpdate);
        
        return () => {
            socket.off('task_locations', handleLocationUpdate);
        };
    }, [socket]);
    
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
            setTasks(data.tasks || []);
            if (data.task_list_code) {
                setTaskListCode(data.task_list_code);
            }
            if (data.task_list_name) {
                setTaskListName(data.task_list_name);
            }
            if (data.collaborative_mode !== undefined) {
                setCollaborativeMode(data.collaborative_mode);
            }
            // Track ownership
            if (data.is_owner !== undefined) {
                setIsTaskListOwner(data.is_owner);
            }
        };

        const handleTaskAdded = (data) => {
            console.log('Task added:', data);
            setTasks(prev => [...prev, data.task]);
            setIsSubmitting(false);
        };

        const handleTaskRemoved = (data) => {
            console.log('Task removed:', data);
            setTasks(prev => prev.filter((_, i) => i !== data.index));
        };

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
        socket.on('collaborative_task_added', handleTaskAdded);
        socket.on('collaborative_task_removed', handleTaskRemoved);
        socket.on('collaborative_tasks_saved', handleTasksSaved);
        socket.on('collaborative_mode_changed', handleCollaborativeModeChanged);

        // Request current tasks (include device_id for ownership check)
        console.log('Requesting collaborative tasks with device_id:', deviceId);
        socket.emit('get_collaborative_tasks', { room_code: roomCode, device_id: deviceId });

        return () => {
            socket.off('collaborative_tasks', handleTasksUpdate);
            socket.off('collaborative_task_added', handleTaskAdded);
            socket.off('collaborative_task_removed', handleTaskRemoved);
            socket.off('collaborative_tasks_saved', handleTasksSaved);
            socket.off('collaborative_mode_changed', handleCollaborativeModeChanged);
        };
    }, [socket, roomCode]);

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
        socket.emit('remove_collaborative_task', {
            room_code: roomCode,
            player_id: playerId,
            task_index: index
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

    const handleLeaveRoom = () => {
        if (window.confirm('Are you sure you want to leave this room?')) {
            socket.emit('leave_room', { player_id: playerId });
        }
    };

    const handleStartGame = () => {
        socket.emit('start_game', { player_id: playerId });
    };

    // Calculate tasks per location requirement
    const tasksByLocation = tasks.reduce((acc, task, index) => {
        const loc = task.location || 'Other';
        if (!acc[loc]) acc[loc] = [];
        acc[loc].push({ ...task, originalIndex: index });
        return acc;
    }, {});

    // Check if we have at least 5 tasks per real location
    const MIN_TASKS_PER_LOCATION = 5;
    const locationsWithEnoughTasks = realLocations.filter(loc => 
        (tasksByLocation[loc]?.length || 0) >= MIN_TASKS_PER_LOCATION
    );
    const hasEnoughTasks = realLocations.length >= 2 && 
        locationsWithEnoughTasks.length === realLocations.length;
    
    // Only host can start game, and only when there are enough tasks
    const canStartGame = isHost && hasEnoughTasks;
    
    // Calculate what's missing
    const getTasksNeededMessage = () => {
        if (realLocations.length < 2) {
            return `Add at least ${2 - realLocations.length} more location${2 - realLocations.length !== 1 ? 's' : ''} first`;
        }
        if (!hasEnoughTasks) {
            return `Need ${MIN_TASKS_PER_LOCATION} tasks per location`;
        }
        return '';
    };

    if (!players || players.length === 0) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-gray-950 p-6">
                <div className="text-center text-gray-400">
                    <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-lg">Waiting for players...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-gray-950 overflow-hidden">
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/50 via-gray-950 to-purple-950/30"></div>
            
            {/* Floating particles */}
            <FloatingParticles particles={particles} />
            
            {/* Glowing orbs */}
            <GlowingOrb top="80px" left="calc(100% - 296px)" size="256px" color="bg-indigo-600/10" delay={0} />
            <GlowingOrb top="calc(100% - 352px)" left="40px" size="192px" color="bg-purple-600/10" delay={1} />
            
            {/* Grid overlay */}
            <GridOverlay color="rgba(255,255,255,0.1)" size={50} opacity={0.03} />

            {/* Scrollable content */}
            <div className="relative z-10 h-full overflow-y-auto pb-32">
                <div className={`max-w-2xl mx-auto px-4 pt-4 transition-all duration-700 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    
                {/* Room Code Display */}
                {roomCode && (
                    <div className="flex justify-center mb-6">
                        <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800/80 rounded-2xl px-6 py-4 flex items-center gap-4">
                            {/* Live indicator */}
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                                </div>
                                <span className="text-green-400 text-xs font-medium uppercase tracking-wider">Live</span>
                            </div>
                            
                            <div className="w-px h-8 bg-gray-700"></div>
                            
                            {/* Room code */}
                            <div className="flex items-center gap-3">
                                <span className="text-gray-500 text-sm">Room</span>
                                <span className="text-2xl font-mono font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent tracking-widest">
                                    {roomCode}
                                </span>
                            </div>
                            
                            <button
                                onClick={copyRoomCode}
                                className="p-2 hover:bg-gray-800 rounded-xl transition-all group"
                                title="Copy room code"
                            >
                                {roomCodeCopied ? (
                                    <Check className="text-green-400" size={18} />
                                ) : (
                                    <Copy className="text-gray-500 group-hover:text-indigo-400 transition-colors" size={18} />
                                )}
                            </button>
                            
                            <div className="w-px h-8 bg-gray-700"></div>
                            
                            <button
                                onClick={handleLeaveRoom}
                                className="p-2 hover:bg-red-500/10 rounded-xl transition-all group"
                                title="Leave room"
                            >
                                <LogOut className="text-gray-500 group-hover:text-red-400 transition-colors" size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Tab Navigation */}
                <div className="flex justify-center mb-6">
                    <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800/60 rounded-2xl p-1.5 flex gap-1.5">
                        <button
                            onClick={() => setActiveTab('players')}
                            className={`px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all font-medium ${
                                activeTab === 'players' 
                                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' 
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                            }`}
                        >
                            <Users size={18} />
                            <span>Players ({players.length})</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('tasks')}
                            className={`px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all font-medium ${
                                activeTab === 'tasks' 
                                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' 
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                            }`}
                        >
                            <ClipboardList size={18} />
                            <span>Tasks ({tasks.length})</span>
                        </button>
                    </div>
                </div>

                {/* ========== PLAYERS TAB ========== */}
                {activeTab === 'players' && (
                    <>
                        {/* Players Grid - 2 columns on mobile */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                            {players.map((player, index) => (
                                <div 
                                    key={player.id}
                                    className="transition-all duration-500"
                                    style={{ 
                                        animationDelay: `${index * 50}ms`,
                                        animation: showContent ? 'fadeInScale 0.5s ease-out forwards' : 'none'
                                    }}
                                >
                                    <PlayerCard player={player} />
                                </div>
                            ))}
                        </div>
                        
                        {/* Waiting message */}
                        {players.length < 4 && (
                            <div className="mt-6 text-center">
                                <div className="inline-flex items-center gap-2 bg-gray-900/60 backdrop-blur-sm border border-gray-800/60 rounded-full px-4 py-2">
                                    <Wifi className="text-indigo-400 animate-pulse" size={16} />
                                    <span className="text-gray-400 text-sm">Waiting for more players to join...</span>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* ========== TASKS TAB ========== */}
                {activeTab === 'tasks' && (
                    <>
                        {/* Host Controls - Collaborative Mode Toggle */}
                        {isHost && (
                            <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800/60 rounded-2xl p-4 mb-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-gray-200 text-sm font-medium">Collaborative Mode</span>
                                        <p className="text-gray-400 text-xs">
                                            {collaborativeMode 
                                                ? 'All players can add tasks' 
                                                : 'Only you (host) can add tasks'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleToggleCollaborativeMode}
                                        className="p-1 transition-colors"
                                        title={collaborativeMode ? 'Disable collaborative mode' : 'Enable collaborative mode'}
                                    >
                                        {collaborativeMode ? (
                                            <ToggleRight className="text-green-400" size={32} />
                                        ) : (
                                            <ToggleLeft className="text-gray-500" size={32} />
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Task Progress Header */}
                        <div className="text-center mb-5">
                            <div className="inline-flex items-center justify-center gap-3 mb-3">
                                <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl border border-indigo-500/30">
                                    <ClipboardList size={24} className="text-indigo-400" />
                                </div>
                            </div>
                            <h2 className="text-xl font-bold text-white mb-1">Create Tasks</h2>
                            {taskListCode && taskListName && !isEditingName && (
                                <div className="flex items-center justify-center gap-1 mb-2">
                                    <p className="text-indigo-400 text-sm">"{taskListName}"</p>
                                    {canSaveTaskList && (
                                        <button
                                            onClick={() => setIsEditingName(true)}
                                            className="p-1 text-gray-500 hover:text-indigo-400 transition-colors"
                                            title="Edit name"
                                        >
                                            <Pencil size={12} />
                                        </button>
                                    )}
                                </div>
                            )}
                            {taskListCode && isEditingName && canSaveTaskList && (
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <input
                                        type="text"
                                        value={taskListName}
                                        onChange={(e) => setTaskListName(e.target.value)}
                                        className="px-2 py-1 bg-gray-800/80 border-2 border-gray-700/80 rounded-lg text-gray-100 text-sm focus:outline-none focus:border-indigo-500/50 w-40"
                                        autoFocus
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                setIsEditingName(false);
                                                handleSaveTaskList();
                                            }
                                        }}
                                    />
                                    <button
                                        onClick={() => {
                                            setIsEditingName(false);
                                            handleSaveTaskList();
                                        }}
                                        className="p-1 text-green-400 hover:text-green-300 transition-colors"
                                        title="Save name"
                                    >
                                        <Check size={16} />
                                    </button>
                                    <button
                                        onClick={() => setIsEditingName(false)}
                                        className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
                                        title="Cancel"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            )}
                            {/* Per-location task counts */}
                            {realLocations.length > 0 && (
                                <div className="flex flex-wrap justify-center gap-2">
                                    {realLocations.map(loc => {
                                        const count = tasksByLocation[loc]?.length || 0;
                                        const enough = count >= MIN_TASKS_PER_LOCATION;
                                        return (
                                            <div 
                                                key={loc}
                                                className={`px-3 py-1.5 rounded-xl text-sm border ${
                                                    enough 
                                                        ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                                                        : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                                                }`}
                                            >
                                                {loc}: {count}/{MIN_TASKS_PER_LOCATION}
                                                {enough && <Check size={14} className="inline ml-1" />}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Save/Share Task List Section */}
                        {tasks.length > 0 && !showLocationSetup && (
                            <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800/60 rounded-2xl p-4 mb-5">
                                {/* Host who owns the task list - show Update button */}
                                {canSaveTaskList && taskListCode && isTaskListOwner && (
                                    <div className="flex items-center justify-center gap-3 flex-wrap">
                                        <span className="text-gray-400 text-sm">Task List Code:</span>
                                        <div className="flex items-center gap-2 bg-gray-800/80 px-3 py-1.5 rounded-xl border border-gray-700/50">
                                            <span className="font-mono font-bold text-indigo-400">{taskListCode}</span>
                                            <button
                                                onClick={copyTaskListCode}
                                                className="p-1 hover:bg-gray-700 rounded-lg transition-colors"
                                                title="Copy code"
                                            >
                                                {codeCopied ? (
                                                    <Check className="text-green-400" size={16} />
                                                ) : (
                                                    <Copy className="text-gray-500 hover:text-indigo-400" size={16} />
                                                )}
                                            </button>
                                        </div>
                                        <button
                                            onClick={handleSaveTaskList}
                                            disabled={isSaving}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl hover:from-indigo-500 hover:to-indigo-600 transition-all text-sm disabled:opacity-50 font-medium"
                                        >
                                            <Save size={14} />
                                            <span>{isSaving ? '...' : 'Update'}</span>
                                        </button>
                                    </div>
                                )}
                                
                                {/* Host who doesn't own the task list (loaded someone else's) - show Save As New */}
                                {canSaveTaskList && taskListCode && !isTaskListOwner && (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="flex items-center gap-2 text-sm text-gray-400">
                                            <span>Loaded: {taskListName || taskListCode}</span>
                                            <span className="text-xs text-gray-500">(not your list)</span>
                                        </div>
                                        <button
                                            onClick={handleSaveAsNew}
                                            disabled={isSaving}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl hover:from-green-500 hover:to-emerald-500 transition-all text-sm disabled:opacity-50 font-medium"
                                        >
                                            <Save size={14} />
                                            <span>{isSaving ? '...' : 'Save As Your Own Copy'}</span>
                                        </button>
                                    </div>
                                )}
                                
                                {/* Host with no task list yet - show name input and Save button */}
                                {canSaveTaskList && !taskListCode && (
                                    <div className="flex items-center justify-center gap-2 flex-wrap">
                                        <input
                                            type="text"
                                            value={taskListName}
                                            onChange={(e) => setTaskListName(e.target.value)}
                                            placeholder="Enter task list name..."
                                            className="px-4 py-2 bg-gray-800/80 border-2 border-gray-700/80 rounded-xl text-gray-100 text-sm focus:outline-none focus:border-indigo-500/50 w-48 transition-colors"
                                        />
                                        <button
                                            onClick={handleSaveTaskList}
                                            disabled={isSaving || !taskListName.trim()}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl hover:from-indigo-500 hover:to-indigo-600 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                        >
                                            <Save size={14} />
                                            <span>{isSaving ? '...' : 'Save & Get Code'}</span>
                                        </button>
                                    </div>
                                )}
                                
                                {/* Non-host player - show Save As Your Own Copy button */}
                                {!canSaveTaskList && (
                                    <div className="flex flex-col items-center gap-2">
                                        {taskListCode && (
                                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                                <span>Current list: {taskListName || taskListCode}</span>
                                            </div>
                                        )}
                                        <button
                                            onClick={handleSaveAsNew}
                                            disabled={isSaving}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl hover:from-green-500 hover:to-emerald-500 transition-all text-sm disabled:opacity-50 font-medium"
                                        >
                                            <Save size={14} />
                                            <span>{isSaving ? '...' : 'Save To My Lists'}</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Location Setup - Host only */}
                        {showLocationSetup && canEditLocations && (
                            <div className="bg-indigo-900/30 backdrop-blur-xl rounded-2xl p-5 mb-5 border border-indigo-500/50">
                                <div className="flex items-center gap-2 mb-3">
                                    <MapPin className="text-indigo-400" size={20} />
                                    <h2 className="text-lg font-bold text-white">Set Up Locations</h2>
                                </div>
                                <p className="text-gray-400 text-sm mb-4">
                                    Add at least 2 locations where tasks will happen (e.g., "Kitchen", "Backyard", "Garage")
                                </p>
                                
                                {realLocations.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {realLocations.map((loc) => {
                                            const taskCount = getTaskCountForLocation(loc);
                                            const removable = canRemoveLocation(loc);
                                            return (
                                                <div
                                                    key={loc}
                                                    className="flex items-center gap-1 bg-indigo-600 px-3 py-1 rounded-full"
                                                    title={taskCount > 0 ? `${taskCount} tasks - remove tasks first to delete location` : ''}
                                                >
                                                    <span className="text-gray-100 text-sm">{loc}</span>
                                                    {taskCount > 0 && (
                                                        <span className="text-indigo-200 text-xs ml-1">({taskCount})</span>
                                                    )}
                                                    {realLocations.length > 2 && (
                                                        <button
                                                            onClick={() => removeLocation(loc)}
                                                            disabled={!removable}
                                                            className={`ml-1 ${removable ? 'text-gray-300 hover:text-white' : 'text-gray-500 cursor-not-allowed opacity-50'}`}
                                                            title={!removable && taskCount > 0 ? 'Remove all tasks first' : ''}
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                
                                <div className="flex gap-2 mb-4">
                                    <input
                                        type="text"
                                        value={newLocationInput}
                                        onChange={(e) => setNewLocationInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && addLocation()}
                                        placeholder="Add a location..."
                                        className="flex-1 px-4 py-3 bg-gray-800/80 border-2 border-gray-700/80 rounded-xl text-gray-100 focus:outline-none focus:border-indigo-500/50 transition-colors"
                                    />
                                    <button
                                        onClick={addLocation}
                                        disabled={!newLocationInput.trim()}
                                        className="px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl hover:from-indigo-500 hover:to-indigo-600 transition-all disabled:opacity-50"
                                    >
                                        <Plus size={20} className="text-white" />
                                    </button>
                                </div>
                                
                                {realLocations.length >= 2 ? (
                                    <button
                                        onClick={confirmLocations}
                                        className="w-full relative group"
                                    >
                                        <div className="absolute -inset-1 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity"></div>
                                        <div className="relative px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl transition-all flex items-center justify-center gap-2 font-medium group-hover:scale-[1.02]">
                                            <Check size={20} />
                                            <span>Continue to Tasks</span>
                                        </div>
                                    </button>
                                ) : (
                                    <p className="text-yellow-400 text-sm text-center bg-yellow-500/10 rounded-xl py-2 border border-yellow-500/30">
                                        Add {Math.max(0, 2 - realLocations.length)} more location{2 - realLocations.length !== 1 ? 's' : ''} to continue
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Message for non-hosts waiting for location setup */}
                        {needsLocationSetup && !canEditLocations && (
                            <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800/60 rounded-2xl p-5 mb-5 text-center">
                                <MapPin className="text-indigo-400 mx-auto mb-2" size={32} />
                                <p className="text-gray-300">
                                    Waiting for host to set up locations...
                                </p>
                                <p className="text-gray-500 text-sm mt-1">
                                    The host needs to add at least 2 locations before tasks can be created.
                                </p>
                            </div>
                        )}

                        {/* Location pills - quick view/edit when not in setup mode */}
                        {!showLocationSetup && realLocations.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 mb-5">
                                {realLocations.map((loc) => (
                                    <span
                                        key={loc}
                                        className="bg-gray-800/60 px-3 py-1.5 rounded-xl text-gray-400 text-sm border border-gray-700/50 flex items-center gap-1"
                                    >
                                        <MapPin size={12} className="text-indigo-400" />
                                        {loc}
                                    </span>
                                ))}
                                {canEditLocations && (
                                    <button
                                        onClick={() => setShowLocationSetup(true)}
                                        className="p-2 text-gray-500 hover:text-indigo-400 hover:bg-gray-800/50 rounded-xl transition-colors"
                                        title="Edit locations"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Add Task Form - only show if user can add tasks */}
                        {!showLocationSetup && canAddTasks && (
                            <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800/60 rounded-2xl p-4 mb-5">
                                <div className="flex flex-col gap-3">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={newTaskText}
                                        onChange={(e) => setNewTaskText(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
                                        placeholder="Enter a task (e.g., 'Do 10 jumping jacks')"
                                        className="w-full px-4 py-3 bg-gray-800/80 border-2 border-gray-700/80 rounded-xl text-gray-100 text-lg focus:outline-none focus:border-indigo-500/50 transition-colors"
                                        disabled={isSubmitting}
                                    />
                                    <div className="flex gap-2">
                                        <select
                                            value={selectedLocation}
                                            onChange={(e) => setSelectedLocation(e.target.value)}
                                            className="flex-1 px-3 py-2.5 bg-gray-800/80 border-2 border-gray-700/80 rounded-xl text-gray-100 focus:outline-none focus:border-indigo-500/50 transition-colors"
                                        >
                                            {locations.map(loc => (
                                                <option key={loc} value={loc}>{loc}</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={handleAddTask}
                                            disabled={!newTaskText.trim() || isSubmitting}
                                            className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl hover:from-indigo-500 hover:to-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Send size={20} className="text-white" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Message for non-hosts when collaborative mode is off */}
                        {!showLocationSetup && !canAddTasks && (
                            <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800/60 rounded-2xl p-5 mb-5 text-center">
                                <p className="text-gray-400">
                                    👀 Only the host can add tasks right now
                                </p>
                                <p className="text-gray-500 text-sm mt-1">
                                    Ask the host to enable collaborative mode if you want to help!
                                </p>
                            </div>
                        )}

                        {/* Task List - Grouped by Location */}
                        {!showLocationSetup && (
                            <div className="space-y-4 mb-6">
                                {Object.entries(tasksByLocation).map(([location, locationTasks]) => (
                                    <div key={location} className="bg-gray-900/60 backdrop-blur-xl border border-gray-800/60 rounded-2xl overflow-hidden">
                                        <div className="bg-gray-800/50 px-4 py-3 flex justify-between items-center border-b border-gray-700/50">
                                            <span className="font-medium text-white flex items-center gap-2">
                                                <MapPin size={14} className="text-indigo-400" />
                                                {location}
                                            </span>
                                            <span className="text-gray-500 text-sm">{locationTasks.length} tasks</span>
                                        </div>
                                        <div className="divide-y divide-gray-800/50">
                                            {locationTasks.map((task) => (
                                                <div 
                                                    key={task.originalIndex}
                                                    className="px-4 py-3 flex items-center justify-between hover:bg-gray-800/30 transition-colors group"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-gray-200 truncate">{task.task}</p>
                                                        {task.added_by && (
                                                            <p className="text-gray-500 text-xs">
                                                                Added by {task.added_by}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemoveTask(task.originalIndex)}
                                                        className={`p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all ${(isHost || collaborativeMode) ? 'opacity-0 group-hover:opacity-100' : 'hidden'}`}
                                                        title="Remove task"
                                                    >
                                                        <ThumbsDown size={18} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                
                                {tasks.length === 0 && (
                                    <div className="text-center py-12 text-gray-500">
                                        <ClipboardList size={48} className="mx-auto mb-4 text-gray-700" />
                                        <p className="text-lg mb-2">No tasks yet!</p>
                                        <p className="text-sm">Add the first task above ☝️</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
                </div>
            </div>

            {/* Fixed bottom area for start game button */}
            {!running && (
                <div className="fixed bottom-0 left-0 right-0 z-20">
                    <div className="bg-gradient-to-t from-gray-950 via-gray-950/95 to-transparent pt-8 pb-6 px-4">
                        <div className="max-w-md mx-auto">
                            {canStartGame ? (
                                <button
                                    onClick={handleStartGame}
                                    className="w-full relative group"
                                >
                                    <div className="absolute -inset-1 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl blur opacity-40 group-hover:opacity-60 transition-opacity"></div>
                                    <div className="relative py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold text-lg rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 group-hover:scale-[1.02]">
                                        <Play size={24} fill="currentColor" />
                                        <span>Start Game</span>
                                        <Zap size={18} className="opacity-60" />
                                    </div>
                                </button>
                            ) : isHost ? (
                                <div className="text-center py-4 bg-gray-900/80 backdrop-blur-xl border border-gray-800/80 rounded-2xl">
                                    <p className="text-gray-400 text-sm">
                                        {getTasksNeededMessage()}
                                    </p>
                                </div>
                            ) : (
                                <div className="text-center py-4 bg-gray-900/80 backdrop-blur-xl border border-gray-800/80 rounded-2xl">
                                    <p className="text-gray-400 text-sm flex items-center justify-center gap-2">
                                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                                        Waiting for host to start the game...
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PreGamePage;

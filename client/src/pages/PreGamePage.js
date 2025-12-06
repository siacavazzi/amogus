import React, { useState, useContext, useEffect, useRef } from 'react';
import { DataContext } from '../GameContext';
import PlayerCard from '../components/PlayerCard';
import { Plus, X, Check, Send, ThumbsDown, MapPin, Copy, Save, Play, LogOut, Users, ClipboardList, ChevronLeft, ToggleLeft, ToggleRight, Pencil } from 'lucide-react';

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
    const { socket, roomCode, players, taskLocations, running, setTaskEntry, setAudio, isRoomCreator } = useContext(DataContext);
    const [activeTab, setActiveTab] = useState('players'); // 'players' or 'tasks'
    
    // Task creation state
    const [tasks, setTasks] = useState([]);
    const [newTaskText, setNewTaskText] = useState('');
    const [selectedLocation, setSelectedLocation] = useState('');
    const [selectedDifficulty, setSelectedDifficulty] = useState(2);
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
    }, []);

    // Auto-save function with debounce - only auto-saves AFTER initial save with a name
    const triggerAutoSave = (currentTasks, currentLocations, currentTaskListCode) => {
        // Only auto-save if we already have a task list code (i.e., it was saved with a name)
        // This prevents auto-saving before the user has named the list
        if (!currentTaskListCode || isSaving) return;
        
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
                triggerAutoSave(tasks, localLocations, taskListCode);
            } else {
                tasksInitializedRef.current = true;
            }
        }
    }, [tasks, localLocations, taskListCode]);

    // Auto-save when locations change (after initial setup)
    const locationsAutoSaveRef = useRef(false);
    useEffect(() => {
        if (locationsInitialized && localLocations.length > 0) {
            if (locationsAutoSaveRef.current) {
                triggerAutoSave(tasks, localLocations, taskListCode);
            } else {
                locationsAutoSaveRef.current = true;
            }
        }
    }, [localLocations, locationsInitialized, tasks, taskListCode]);
    
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
        };
        
        socket.on('task_locations', handleLocationUpdate);
        
        return () => {
            socket.off('task_locations', handleLocationUpdate);
        };
    }, [socket]);
    
    // Set default location when locations are available
    useEffect(() => {
        if (realLocations.length > 0) {
            // Always prefer a real location over 'Other'
            if (!selectedLocation || selectedLocation === 'Other') {
                setSelectedLocation(realLocations[0]);
            } else if (!realLocations.includes(selectedLocation) && selectedLocation !== 'Other') {
                // Selected location was removed, reset to first real location
                setSelectedLocation(realLocations[0]);
            }
        }
    }, [realLocations, selectedLocation]);

    // Listen for collaborative task updates
    useEffect(() => {
        if (!socket) return;

        const handleTasksUpdate = (data) => {
            console.log('Collaborative tasks updated:', data);
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

        // Request current tasks
        socket.emit('get_collaborative_tasks', { room_code: roomCode });

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
                difficulty: selectedDifficulty,
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
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-tr from-gray-800 to-gray-900 p-6">
                <div className="text-center text-gray-400">
                    <p className="text-lg">No players available</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-tr from-gray-800 to-gray-900 p-4 pb-32">

            <div className="max-w-2xl mx-auto">
                {/* Room Code Display */}
                {roomCode && (
                    <div className="flex items-center justify-center mb-4">
                        <div className="bg-gray-800 bg-opacity-80 px-6 py-3 rounded-lg flex items-center gap-3">
                            <span className="text-gray-400 text-sm">Room:</span>
                            <span className="text-2xl font-mono font-bold text-indigo-400 tracking-widest">
                                {roomCode}
                            </span>
                            <button
                                onClick={copyRoomCode}
                                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                                title="Copy room code"
                            >
                                {roomCodeCopied ? (
                                    <Check className="text-green-400" size={18} />
                                ) : (
                                    <Copy className="text-gray-400" size={18} />
                                )}
                            </button>
                            <div className="w-px h-6 bg-gray-600 mx-1"></div>
                            <button
                                onClick={handleLeaveRoom}
                                className="p-2 hover:bg-red-600 hover:bg-opacity-20 rounded-lg transition-colors group"
                                title="Leave room"
                            >
                                <LogOut className="text-gray-400 group-hover:text-red-400" size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Tab Navigation */}
                <div className="flex justify-center mb-4">
                    <div className="bg-gray-800 rounded-lg p-1 flex gap-1">
                        <button
                            onClick={() => setActiveTab('players')}
                            className={`px-4 py-2 rounded-md flex items-center gap-2 transition-colors ${
                                activeTab === 'players' 
                                    ? 'bg-indigo-600 text-white' 
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            <Users size={18} />
                            <span>Players ({players.length})</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('tasks')}
                            className={`px-4 py-2 rounded-md flex items-center gap-2 transition-colors ${
                                activeTab === 'tasks' 
                                    ? 'bg-indigo-600 text-white' 
                                    : 'text-gray-400 hover:text-white'
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
                        <div className="flex flex-col items-center mb-4">
                            <button
                                className="bg-indigo-600 text-white py-2 px-6 rounded-full shadow-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                onClick={() => setAudio('test')}
                            >
                                Test Sound
                            </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {players.map((player) => (
                                <PlayerCard key={player.id} player={player} />
                            ))}
                        </div>
                    </>
                )}

                {/* ========== TASKS TAB ========== */}
                {activeTab === 'tasks' && (
                    <>
                        {/* Host Controls - Collaborative Mode Toggle */}
                        {isHost && (
                            <div className="bg-gray-700 rounded-lg p-3 mb-4">
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
                        <div className="text-center mb-4">
                            <h2 className="text-xl font-bold text-gray-100 mb-1">📝 Create Tasks</h2>
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
                                        className="px-2 py-1 bg-gray-600 border border-gray-500 rounded text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-40"
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
                                                className={`px-3 py-1 rounded-full text-sm ${
                                                    enough 
                                                        ? 'bg-green-600 bg-opacity-30 text-green-400' 
                                                        : 'bg-yellow-600 bg-opacity-30 text-yellow-400'
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

                        {/* Save/Share Task List Section - Host only */}
                        {tasks.length > 0 && !showLocationSetup && canSaveTaskList && (
                            <div className="bg-gray-700 rounded-lg p-3 mb-4">
                                {taskListCode ? (
                                    <div className="flex items-center justify-center gap-3 flex-wrap">
                                        <span className="text-gray-300 text-sm">Task List Code:</span>
                                        <div className="flex items-center gap-2 bg-gray-800 px-3 py-1 rounded-lg">
                                            <span className="font-mono font-bold text-indigo-400">{taskListCode}</span>
                                            <button
                                                onClick={copyTaskListCode}
                                                className="p-1 hover:bg-gray-700 rounded transition-colors"
                                                title="Copy code"
                                            >
                                                {codeCopied ? (
                                                    <Check className="text-green-400" size={16} />
                                                ) : (
                                                    <Copy className="text-gray-400" size={16} />
                                                )}
                                            </button>
                                        </div>
                                        <button
                                            onClick={handleSaveTaskList}
                                            disabled={isSaving}
                                            className="flex items-center gap-1 px-3 py-1 bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors text-sm disabled:opacity-50"
                                        >
                                            <Save size={14} />
                                            <span>{isSaving ? '...' : 'Update'}</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center gap-2 flex-wrap">
                                        <input
                                            type="text"
                                            value={taskListName}
                                            onChange={(e) => setTaskListName(e.target.value)}
                                            placeholder="Enter task list name..."
                                            className="px-3 py-1 bg-gray-600 border border-gray-500 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-48"
                                        />
                                        <button
                                            onClick={handleSaveTaskList}
                                            disabled={isSaving || !taskListName.trim()}
                                            className="flex items-center gap-1 px-3 py-1 bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Save size={14} />
                                            <span>{isSaving ? '...' : 'Save & Get Code'}</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Location Setup - Host only */}
                        {showLocationSetup && canEditLocations && (
                            <div className="bg-indigo-900 bg-opacity-50 rounded-lg p-4 mb-4 border border-indigo-500">
                                <div className="flex items-center gap-2 mb-3">
                                    <MapPin className="text-indigo-400" size={20} />
                                    <h2 className="text-lg font-bold text-gray-100">Set Up Locations</h2>
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
                                        className="flex-1 px-4 py-2 bg-gray-700 border border-gray-500 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    />
                                    <button
                                        onClick={addLocation}
                                        disabled={!newLocationInput.trim()}
                                        className="px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                    >
                                        <Plus size={20} className="text-white" />
                                    </button>
                                </div>
                                
                                {realLocations.length >= 2 ? (
                                    <button
                                        onClick={confirmLocations}
                                        className="w-full px-4 py-3 bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Check size={20} />
                                        <span>Continue to Tasks</span>
                                    </button>
                                ) : (
                                    <p className="text-yellow-400 text-sm text-center">
                                        Add {Math.max(0, 2 - realLocations.length)} more location{2 - realLocations.length !== 1 ? 's' : ''} to continue
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Message for non-hosts waiting for location setup */}
                        {needsLocationSetup && !canEditLocations && (
                            <div className="bg-gray-700 rounded-lg p-4 mb-4 text-center">
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
                            <div className="flex flex-wrap items-center gap-2 mb-4">
                                {realLocations.map((loc) => (
                                    <span
                                        key={loc}
                                        className="bg-gray-700 px-3 py-1 rounded-full text-gray-300 text-sm"
                                    >
                                        {loc}
                                    </span>
                                ))}
                                {canEditLocations && (
                                    <button
                                        onClick={() => setShowLocationSetup(true)}
                                        className="p-1.5 text-gray-500 hover:text-indigo-400 hover:bg-gray-700 rounded-full transition-colors"
                                        title="Edit locations"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Add Task Form - only show if user can add tasks */}
                        {!showLocationSetup && canAddTasks && (
                            <div className="bg-gray-700 rounded-lg p-4 mb-4">
                                <div className="flex flex-col gap-3">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={newTaskText}
                                        onChange={(e) => setNewTaskText(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
                                        placeholder="Enter a task (e.g., 'Do 10 jumping jacks')"
                                        className="w-full px-4 py-3 bg-gray-600 border border-gray-500 rounded-lg text-gray-100 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                        disabled={isSubmitting}
                                    />
                                    <div className="flex gap-2">
                                        <select
                                            value={selectedLocation}
                                            onChange={(e) => setSelectedLocation(e.target.value)}
                                            className="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                        >
                                            {locations.map(loc => (
                                                <option key={loc} value={loc}>{loc}</option>
                                            ))}
                                        </select>
                                        <select
                                            value={selectedDifficulty}
                                            onChange={(e) => setSelectedDifficulty(parseInt(e.target.value))}
                                            className="w-24 px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                        >
                                            <option value={1}>Easy</option>
                                            <option value={2}>Medium</option>
                                            <option value={3}>Hard</option>
                                        </select>
                                        <button
                                            onClick={handleAddTask}
                                            disabled={!newTaskText.trim() || isSubmitting}
                                            className="px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Send size={20} className="text-white" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Message for non-hosts when collaborative mode is off */}
                        {!showLocationSetup && !canAddTasks && (
                            <div className="bg-gray-700 rounded-lg p-4 mb-4 text-center">
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
                                    <div key={location} className="bg-gray-700 rounded-lg overflow-hidden">
                                        <div className="bg-gray-600 px-4 py-2 flex justify-between items-center">
                                            <span className="font-medium text-gray-200">{location}</span>
                                            <span className="text-gray-400 text-sm">{locationTasks.length} tasks</span>
                                        </div>
                                        <div className="divide-y divide-gray-600">
                                            {locationTasks.map((task) => (
                                                <div 
                                                    key={task.originalIndex}
                                                    className="px-4 py-3 flex items-center justify-between hover:bg-gray-600 transition-colors group"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-gray-200 truncate">{task.task}</p>
                                                        <p className="text-gray-500 text-xs">
                                                            {'⭐'.repeat(task.difficulty || 2)} 
                                                            {task.added_by && ` • Added by ${task.added_by}`}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemoveTask(task.originalIndex)}
                                                        className={`p-2 text-gray-500 hover:text-red-400 transition-all ${(isHost || collaborativeMode) ? 'opacity-0 group-hover:opacity-100' : 'hidden'}`}
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
                                        <p className="text-lg mb-2">No tasks yet!</p>
                                        <p className="text-sm">Add the first task above ☝️</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Fixed bottom area for start game button */}
            {!running && (
                <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900 via-gray-900 to-transparent pt-8 pb-6 px-4">
                    <div className="max-w-md mx-auto">
                        {canStartGame ? (
                            <button
                                onClick={handleStartGame}
                                className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold text-lg rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <Play size={24} fill="currentColor" />
                                <span>Start Game</span>
                            </button>
                        ) : isHost ? (
                            <div className="text-center py-4 bg-gray-800 rounded-lg">
                                <p className="text-gray-400 text-sm">
                                    {getTasksNeededMessage()}
                                </p>
                            </div>
                        ) : (
                            <div className="text-center py-4 bg-gray-800 rounded-lg">
                                <p className="text-gray-400 text-sm">
                                    Waiting for host to start the game...
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default PreGamePage;

import React, { useState, useContext, useEffect, useRef } from 'react';
import { DataContext } from '../GameContext';
import { Plus, X, Check, Send, ThumbsDown, MapPin, Copy, Save, Play, LogOut } from 'lucide-react';

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
 * Collaborative task creation page - Jackbox style!
 * All players can add tasks, and anyone can remove tasks they don't like.
 * When there are enough tasks, the host can start the game.
 */
function TaskCreationPage() {
    const { socket, roomCode, players, taskLocations } = useContext(DataContext);
    const [tasks, setTasks] = useState([]);
    const [newTaskText, setNewTaskText] = useState('');
    const [selectedLocation, setSelectedLocation] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [minTasks, setMinTasks] = useState(10);
    const inputRef = useRef(null);
    
    // Location management state - stores only user-added locations (not 'Other')
    const [localLocations, setLocalLocations] = useState([]);
    const [newLocationInput, setNewLocationInput] = useState('');
    const [showLocationSetup, setShowLocationSetup] = useState(false);
    const [locationsInitialized, setLocationsInitialized] = useState(false);
    
    // Task list saving state
    const [taskListCode, setTaskListCode] = useState(null);
    const [taskListName, setTaskListName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [showSaveSuccess, setShowSaveSuccess] = useState(false);
    const [codeCopied, setCodeCopied] = useState(false);
    const [roomCodeCopied, setRoomCodeCopied] = useState(false);
    const deviceId = useRef(getDeviceId()).current;
    
    const playerId = localStorage.getItem('player_id');
    const playerName = players.find(p => p.player_id === playerId)?.username || 'You';
    
    // Real locations are user-added ones (excluding 'Other')
    // 'Other' is always available but added automatically when needed
    const realLocations = localLocations.filter(l => l !== 'Other');
    
    // Full location list for task creation includes 'Other' at the end
    const locations = realLocations.length > 0 ? [...realLocations, 'Other'] : ['Other'];
    
    // Need location setup if less than 2 real locations
    const needsLocationSetup = realLocations.length < 2;
    
    // Show location setup if needed and no tasks yet
    useEffect(() => {
        if (needsLocationSetup && tasks.length === 0) {
            setShowLocationSetup(true);
        }
    }, [needsLocationSetup, tasks.length]);
    
    // Initialize local locations from server locations (only real ones, not 'Other')
    useEffect(() => {
        if (taskLocations.length > 0 && !locationsInitialized) {
            const realFromServer = taskLocations.filter(l => l !== 'Other');
            setLocalLocations(realFromServer);
            setLocationsInitialized(true);
        }
    }, [taskLocations, locationsInitialized]);
    
    // Set default location when locations are available
    useEffect(() => {
        if (locations.length > 0 && !selectedLocation) {
            // Prefer a real location over 'Other' if available
            const defaultLoc = realLocations.length > 0 ? realLocations[0] : 'Other';
            setSelectedLocation(defaultLoc);
        }
    }, [locations, selectedLocation, realLocations]);

    // Location management functions
    const addLocation = () => {
        const loc = newLocationInput.trim();
        if (loc && loc !== 'Other' && !localLocations.includes(loc)) {
            const newLocs = [...localLocations, loc];
            setLocalLocations(newLocs);
            setNewLocationInput('');
            
            // Emit to server with 'Other' included
            socket.emit('update_game_locations', {
                room_code: roomCode,
                locations: [...newLocs, 'Other']
            });
        }
    };

    const removeLocation = (loc) => {
        if (loc === 'Other') return; // Can't remove 'Other'
        
        // Don't remove if it would leave less than 2 real locations
        const realCount = localLocations.filter(l => l !== 'Other').length;
        if (realCount <= 2) return;
        
        const newLocs = localLocations.filter(l => l !== loc);
        setLocalLocations(newLocs);
        
        // Emit to server with 'Other' included
        socket.emit('update_game_locations', {
            room_code: roomCode,
            locations: [...newLocs.filter(l => l !== 'Other'), 'Other']
        });
    };

    const confirmLocations = () => {
        const realCount = localLocations.filter(l => l !== 'Other').length;
        if (realCount >= 2) {
            setShowLocationSetup(false);
            // Make sure server has locations with 'Other'
            socket.emit('update_game_locations', {
                room_code: roomCode,
                locations: [...localLocations.filter(l => l !== 'Other'), 'Other']
            });
        }
    };

    // Listen for collaborative task updates
    useEffect(() => {
        if (!socket) return;

        const handleTasksUpdate = (data) => {
            console.log('Collaborative tasks updated:', data);
            setTasks(data.tasks || []);
            if (data.min_tasks) {
                setMinTasks(data.min_tasks);
            }
            if (data.task_list_code) {
                setTaskListCode(data.task_list_code);
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
            setIsSaving(false);
            setShowSaveSuccess(true);
            setTimeout(() => setShowSaveSuccess(false), 3000);
        };

        socket.on('collaborative_tasks', handleTasksUpdate);
        socket.on('collaborative_task_added', handleTaskAdded);
        socket.on('collaborative_task_removed', handleTaskRemoved);
        socket.on('collaborative_tasks_saved', handleTasksSaved);

        // Request current tasks
        socket.emit('get_collaborative_tasks', { room_code: roomCode });

        return () => {
            socket.off('collaborative_tasks', handleTasksUpdate);
            socket.off('collaborative_task_added', handleTaskAdded);
            socket.off('collaborative_task_removed', handleTaskRemoved);
            socket.off('collaborative_tasks_saved', handleTasksSaved);
        };
    }, [socket, roomCode]);

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
        // Keep focus on input for rapid entry
        inputRef.current?.focus();
    };

    const handleRemoveTask = (index) => {
        socket.emit('remove_collaborative_task', {
            room_code: roomCode,
            player_id: playerId,
            task_index: index
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
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(taskListCode);
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = taskListCode;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            setCodeCopied(true);
            setTimeout(() => setCodeCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const copyRoomCode = async () => {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(roomCode);
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = roomCode;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
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
        socket.emit('finalize_collaborative_tasks', {
            room_code: roomCode,
            player_id: playerId
        });
    };

    const hasEnoughTasks = tasks.length >= minTasks;
    const tasksNeeded = Math.max(0, minTasks - tasks.length);

    // Group tasks by location for display
    const tasksByLocation = tasks.reduce((acc, task, index) => {
        const loc = task.location || 'Other';
        if (!acc[loc]) acc[loc] = [];
        acc[loc].push({ ...task, originalIndex: index });
        return acc;
    }, {});

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

                {/* Header */}
                <div className="text-center mb-4">
                    <h1 className="text-2xl font-bold text-gray-100 mb-2">📝 Create Tasks Together!</h1>
                    <p className="text-gray-400 text-sm">
                        Everyone add tasks for the game. Be creative!
                    </p>
                    <div className="mt-3 inline-flex items-center gap-2 bg-gray-700 px-4 py-2 rounded-full">
                        <span className={`text-lg font-bold ${hasEnoughTasks ? 'text-green-400' : 'text-yellow-400'}`}>
                            {tasks.length}
                        </span>
                        <span className="text-gray-400">tasks</span>
                        {!hasEnoughTasks && (
                            <span className="text-gray-500 text-sm">
                                (need {tasksNeeded} more)
                            </span>
                        )}
                        {hasEnoughTasks && (
                            <Check className="text-green-400" size={18} />
                        )}
                    </div>
                </div>

                {/* Save/Share Task List Section */}
                {tasks.length > 0 && !showLocationSetup && (
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
                                    <span>{isSaving ? 'Saving...' : 'Update'}</span>
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
                                    <span>{isSaving ? 'Saving...' : 'Save & Get Code'}</span>
                                </button>
                            </div>
                        )}
                        {showSaveSuccess && (
                            <p className="text-green-400 text-xs text-center mt-2">
                                ✓ Task list saved! Share the code to reuse these tasks.
                            </p>
                        )}
                    </div>
                )}

                {/* Location Setup (shown if needed or manually opened) */}
                {showLocationSetup && (
                    <div className="bg-indigo-900 bg-opacity-50 rounded-lg p-4 mb-4 border border-indigo-500">
                        <div className="flex items-center gap-2 mb-3">
                            <MapPin className="text-indigo-400" size={20} />
                            <h2 className="text-lg font-bold text-gray-100">Set Up Locations</h2>
                        </div>
                        <p className="text-gray-400 text-sm mb-4">
                            Add at least 2 locations where tasks will happen (e.g., "Kitchen", "Backyard", "Garage")
                        </p>
                        
                        {/* Current locations */}
                        {realLocations.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                                {realLocations.map((loc) => (
                                    <div
                                        key={loc}
                                        className="flex items-center gap-1 bg-indigo-600 px-3 py-1 rounded-full"
                                    >
                                        <span className="text-gray-100 text-sm">{loc}</span>
                                        {realLocations.length > 2 && (
                                            <button
                                                onClick={() => removeLocation(loc)}
                                                className="text-gray-300 hover:text-white ml-1"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {/* Add location input */}
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
                        
                        {/* Confirm button */}
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

                {/* Location pills - quick view/edit when not in setup mode */}
                {!showLocationSetup && realLocations.length > 0 && (
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-400 text-sm">Locations:</span>
                            <button
                                onClick={() => setShowLocationSetup(true)}
                                className="text-indigo-400 text-sm hover:text-indigo-300"
                            >
                                Edit
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {realLocations.map((loc) => (
                                <span
                                    key={loc}
                                    className="bg-gray-700 px-3 py-1 rounded-full text-gray-300 text-sm"
                                >
                                    {loc}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Add Task Form - only show when locations are set up */}
                {!showLocationSetup && (
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
                                            {task.added_by && (
                                                <p className="text-gray-500 text-xs">
                                                    Added by {task.added_by}
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleRemoveTask(task.originalIndex)}
                                            className="p-2 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
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
            </div>

            {/* Fixed bottom area for start game button */}
            <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900 via-gray-900 to-transparent pt-8 pb-6 px-4">
                <div className="max-w-md mx-auto">
                    {!showLocationSetup && hasEnoughTasks ? (
                        <button
                            onClick={handleStartGame}
                            className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold text-lg rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <Play size={24} fill="currentColor" />
                            <span>Start Game</span>
                        </button>
                    ) : !showLocationSetup ? (
                        <div className="text-center py-4 bg-gray-800 rounded-lg">
                            <p className="text-gray-400">
                                Add {tasksNeeded} more {tasksNeeded === 1 ? 'task' : 'tasks'} to start
                            </p>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

export default TaskCreationPage;

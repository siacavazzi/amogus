// ./pages/PlayersPage.jsx

import React, { useContext, useEffect, useState, useRef, useMemo } from "react";
import { DataContext } from "../GameContext";
import PlayerCard from "../components/PlayerCard";
import { ChevronLeft, Copy, Check, Users, ClipboardList, Send, ThumbsDown, Save, Play, LogOut } from 'lucide-react';

// Get or create a persistent device ID for task list ownership
function getDeviceId() {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
        deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
        localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
}

export default function PlayersPage() {
    const { players, socket, setAudio, running, setTaskEntry, roomCode, taskLocations, taskCreationMode } = useContext(DataContext);
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState('players'); // 'players' or 'tasks'
    
    // Task creation state
    const [tasks, setTasks] = useState([]);
    const [newTaskText, setNewTaskText] = useState('');
    const [selectedLocation, setSelectedLocation] = useState('');
    const [selectedDifficulty, setSelectedDifficulty] = useState(2);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [minTasks, setMinTasks] = useState(10);
    const inputRef = useRef(null);
    
    // Task list saving state
    const [taskListCode, setTaskListCode] = useState(null);
    const [taskListName, setTaskListName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [showSaveSuccess, setShowSaveSuccess] = useState(false);
    const [codeCopied, setCodeCopied] = useState(false);
    const deviceId = useRef(getDeviceId()).current;
    
    const playerId = localStorage.getItem('player_id');
    const playerName = players.find(p => p.player_id === playerId)?.username || 'You';
    
    // Ensure we have locations with 'Other' as fallback - memoized to avoid useEffect dependency issues
    const locations = useMemo(() => {
        return taskLocations && taskLocations.length > 0 ? taskLocations : ['Other'];
    }, [taskLocations]);

    useEffect(() => {
        window.scrollTo(0, 0)
    }, [])
    
    // Set default location when taskLocations loads
    useEffect(() => {
        if (locations.length > 0 && !selectedLocation) {
            setSelectedLocation(locations[0]);
        }
    }, [locations, selectedLocation]);

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

        // Request current tasks when in task creation mode
        if (taskCreationMode) {
            socket.emit('get_collaborative_tasks', { room_code: roomCode });
        }

        return () => {
            socket.off('collaborative_tasks', handleTasksUpdate);
            socket.off('collaborative_task_added', handleTaskAdded);
            socket.off('collaborative_task_removed', handleTaskRemoved);
            socket.off('collaborative_tasks_saved', handleTasksSaved);
        };
    }, [socket, roomCode, taskCreationMode]);

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
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
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

    const handleSaveTaskList = () => {
        if (tasks.length === 0) return;
        if (!taskListName.trim()) {
            alert('Please enter a name for your task list');
            return;
        }
        setIsSaving(true);
        socket.emit('save_collaborative_tasks', {
            room_code: roomCode,
            device_id: deviceId,
            name: taskListName.trim()
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

    const handleStartGame = () => {
        if (taskCreationMode) {
            // Finalize collaborative tasks and start
            socket.emit('finalize_collaborative_tasks', {
                room_code: roomCode,
                player_id: playerId
            });
        } else {
            // Normal start (will trigger task creation mode if needed)
            socket.emit('start_game', { player_id: playerId });
        }
    };

    const handleToggleTaskCreation = (enable) => {
        // This is client-side only - just switch tabs
        // The actual task creation mode is controlled by server (enter_task_creation/exit_task_creation events)
        console.log('Switching to tab:', enable ? 'tasks' : 'players');
        setActiveTab(enable ? 'tasks' : 'players');
        
        // If entering tasks tab and not already in task creation mode, request it from server
        if (enable && !taskCreationMode) {
            socket.emit('toggle_task_creation_mode', {
                room_code: roomCode,
                enable: true
            });
        }
    };

    const handleLeaveRoom = () => {
        if (window.confirm('Are you sure you want to leave this room?')) {
            socket.emit('leave_room', { player_id: playerId });
        }
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
            {/* Back button - only show if not in task creation mode */}
            {!running && !taskCreationMode && (
                <button
                    type="button"
                    onClick={() => setTaskEntry(true)}
                    className="absolute top-4 left-4 flex items-center text-gray-300 hover:text-white transition-colors z-10"
                >
                    <ChevronLeft className="mr-1" />
                    <span className="text-sm">Task Entry</span>
                </button>
            )}
            
            <div className="max-w-4xl mx-auto">
                {/* Room Code Display */}
                {roomCode && !running && (
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
                                {copied ? (
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

                {/* Task Creation Mode Banner */}
                {taskCreationMode && (
                    <div className="bg-yellow-600 bg-opacity-20 border border-yellow-500 rounded-lg px-4 py-3 mb-4">
                        <div className="text-center">
                            <p className="text-yellow-300 font-medium">
                                📝 Task Creation Mode - Add tasks together before starting!
                            </p>
                            <p className="text-yellow-200 text-sm mt-1">
                                {hasEnoughTasks 
                                    ? `✅ ${tasks.length} tasks ready - you can start the game!`
                                    : `Need ${tasksNeeded} more ${tasksNeeded === 1 ? 'task' : 'tasks'} to start`
                                }
                            </p>
                        </div>
                        
                        {/* Save/Share Task List Section */}
                        {tasks.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-yellow-500 border-opacity-30">
                                {taskListCode ? (
                                    <div className="flex items-center justify-center gap-3">
                                        <span className="text-yellow-200 text-sm">Task List Code:</span>
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
                                    <div className="flex items-center justify-center gap-2">
                                        <input
                                            type="text"
                                            value={taskListName}
                                            onChange={(e) => setTaskListName(e.target.value)}
                                            placeholder="Enter task list name..."
                                            className="px-3 py-1 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-48"
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
                    </div>
                )}

                {/* Tab Navigation - show when not running */}
                {!running && (
                    <div className="flex justify-center mb-4">
                        <div className="bg-gray-800 rounded-lg p-1 flex gap-1">
                            <button
                                onClick={() => {
                                    if (taskCreationMode) {
                                        handleToggleTaskCreation(false);
                                    } else {
                                        setActiveTab('players');
                                    }
                                }}
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
                                onClick={() => {
                                    if (!taskCreationMode) {
                                        handleToggleTaskCreation(true);
                                    } else {
                                        setActiveTab('tasks');
                                    }
                                }}
                                className={`px-4 py-2 rounded-md flex items-center gap-2 transition-colors ${
                                    activeTab === 'tasks' 
                                        ? 'bg-indigo-600 text-white' 
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                <ClipboardList size={18} />
                                <span>Add Tasks</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Players Tab Content */}
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

                {/* Tasks Tab Content - Loading state while waiting for task creation mode */}
                {activeTab === 'tasks' && !taskCreationMode && (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-gray-400">Loading task creation...</div>
                    </div>
                )}

                {/* Tasks Tab Content - Active task creation */}
                {activeTab === 'tasks' && taskCreationMode && (
                    <div className="space-y-4">
                        {/* Add Task Form */}
                        <div className="bg-gray-700 rounded-lg p-4">
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

                        {/* Task List - Grouped by Location */}
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
                                                className="p-2 text-gray-500 hover:text-red-400 opacity-50 group-hover:opacity-100 transition-all"
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
                            <div className="text-center py-12 text-gray-500 bg-gray-700 rounded-lg">
                                <p className="text-lg mb-2">No tasks yet!</p>
                                <p className="text-sm">Add the first task above ☝️</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Fixed bottom area for start game button */}
            {!running && (
                <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900 via-gray-900 to-transparent pt-8 pb-6 px-4">
                    <div className="max-w-md mx-auto">
                        {/* Show button only if we have enough tasks OR not in task creation mode */}
                        {(!taskCreationMode || hasEnoughTasks) ? (
                            <button
                                onClick={handleStartGame}
                                className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold text-lg rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <Play size={24} fill="currentColor" />
                                <span>{taskCreationMode ? "Start Game" : "Start Game"}</span>
                            </button>
                        ) : (
                            <div className="text-center py-4 bg-gray-800 rounded-lg">
                                <p className="text-gray-400">
                                    Add {tasksNeeded} more {tasksNeeded === 1 ? 'task' : 'tasks'} to start
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

import React, { useState, useContext, useEffect, useRef } from 'react';
import { DataContext } from '../GameContext';
import { Plus, X, Check, Send, ThumbsDown, Play } from 'lucide-react';
import MUECustomSlider from '../components/swiper';

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
    const [selectedDifficulty, setSelectedDifficulty] = useState(2);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [minTasks, setMinTasks] = useState(10);
    const inputRef = useRef(null);
    
    const playerId = localStorage.getItem('player_id');
    const playerName = players.find(p => p.player_id === playerId)?.username || 'You';
    
    // Ensure we have locations with 'Other' as fallback
    const locations = taskLocations.length > 0 ? taskLocations : ['Other'];
    
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

        socket.on('collaborative_tasks', handleTasksUpdate);
        socket.on('collaborative_task_added', handleTaskAdded);
        socket.on('collaborative_task_removed', handleTaskRemoved);

        // Request current tasks
        socket.emit('get_collaborative_tasks', { room_code: roomCode });

        return () => {
            socket.off('collaborative_tasks', handleTasksUpdate);
            socket.off('collaborative_task_added', handleTaskAdded);
            socket.off('collaborative_task_removed', handleTaskRemoved);
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
                difficulty: selectedDifficulty,
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
        <div className="min-h-screen bg-gradient-to-tr from-gray-800 to-gray-900 p-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-6">
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

                {/* Add Task Form */}
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

                {/* Task List - Grouped by Location */}
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

                {/* Start Game Button (only when enough tasks) */}
                {hasEnoughTasks && (
                    <div className="mt-8">
                        <MUECustomSlider 
                            text="Swipe to start game" 
                            onSuccess={handleStartGame} 
                        />
                    </div>
                )}

                {!hasEnoughTasks && (
                    <div className="text-center py-4">
                        <p className="text-gray-400">
                            Add {tasksNeeded} more {tasksNeeded === 1 ? 'task' : 'tasks'} to start the game
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default TaskCreationPage;

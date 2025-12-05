import React, { useState, useContext, useEffect, useRef } from 'react';
import { DataContext } from '../GameContext';
import { Settings, Users, Clock, Target, Zap, Play, ChevronDown, ChevronUp, MapPin, Plus, X, List, Download, Copy, Trash2, Save, FileText, LogOut } from 'lucide-react';

// Get or create a persistent device ID for task list ownership
function getDeviceId() {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
        deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
        localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
}

function GameConfigPage() {
    const { socket, roomCode } = useContext(DataContext);
    
    const [config, setConfig] = useState({
        locations: ['Basement', '1st Floor', '2nd Floor', '3rd Floor'],
        vote_time: 180,
        vote_threshold: 0.66,
        meltdown_time: 60,
        code_percent: 0.6,
        num_imposters: 2,
        card_draw_probability: 0.9,
        starting_cards: 2,
        task_ratio: 12,
    });
    
    const [expandedSection, setExpandedSection] = useState('locations');
    const [newLocation, setNewLocation] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    
    // Task list state
    const [myTaskLists, setMyTaskLists] = useState([]);
    const [loadTaskListCode, setLoadTaskListCode] = useState('');
    const [currentTaskList, setCurrentTaskList] = useState(null);
    const [newTaskListName, setNewTaskListName] = useState('');
    const [newTask, setNewTask] = useState({ task: '', location: 'Other', difficulty: 2 });
    const [taskListLoading, setTaskListLoading] = useState(false);
    
    // Use device ID instead of player ID for task list ownership
    const deviceId = useRef(getDeviceId()).current;

    // Request current config when component mounts (only once)
    useEffect(() => {
        if (socket && roomCode) {
            socket.emit('get_game_config', { room_code: roomCode });
        }
        if (socket && deviceId) {
            socket.emit('get_my_task_lists', { player_id: deviceId });
        }
    }, [socket, roomCode, deviceId]);

    // Listen for config updates from server
    useEffect(() => {
        if (!socket) return;

        const handleConfig = (data) => {
            console.log('Received game config:', data);
            setConfig(data);
        };

        socket.on('game_config', handleConfig);

        return () => {
            socket.off('game_config', handleConfig);
        };
    }, [socket]);

    // Listen for task list events - stable handlers
    useEffect(() => {
        if (!socket) return;

        const handleMyTaskLists = (data) => {
            console.log('Received my task lists:', data);
            setMyTaskLists(data.lists || []);
        };

        const handleTaskListLoaded = (data) => {
            console.log('Task list loaded:', data);
            setCurrentTaskList(data.task_list);
            setTaskListLoading(false);
        };

        const handleTaskListCreated = (data) => {
            console.log('Task list created:', data);
            setCurrentTaskList(data.task_list);
            setTaskListLoading(false);
            socket.emit('get_my_task_lists', { player_id: deviceId });
        };

        const handleTaskListUpdated = (data) => {
            console.log('Task list updated:', data);
            setCurrentTaskList(data.task_list);
            setTaskListLoading(false);
            socket.emit('get_my_task_lists', { player_id: deviceId });
        };

        const handleTaskListApplied = (data) => {
            console.log('Task list applied to game:', data);
            setTaskListLoading(false);
        };

        const handleTaskListDeleted = (data) => {
            console.log('Task list deleted:', data);
            setCurrentTaskList(prev => prev && prev.code === data.code ? null : prev);
            socket.emit('get_my_task_lists', { player_id: deviceId });
        };

        const handleError = (data) => {
            console.error('Error:', data);
            setTaskListLoading(false);
        };

        socket.on('my_task_lists', handleMyTaskLists);
        socket.on('task_list_loaded', handleTaskListLoaded);
        socket.on('task_list_created', handleTaskListCreated);
        socket.on('task_list_updated', handleTaskListUpdated);
        socket.on('task_list_applied', handleTaskListApplied);
        socket.on('task_list_deleted', handleTaskListDeleted);
        socket.on('error', handleError);

        return () => {
            socket.off('my_task_lists', handleMyTaskLists);
            socket.off('task_list_loaded', handleTaskListLoaded);
            socket.off('task_list_created', handleTaskListCreated);
            socket.off('task_list_updated', handleTaskListUpdated);
            socket.off('task_list_applied', handleTaskListApplied);
            socket.off('task_list_deleted', handleTaskListDeleted);
            socket.off('error', handleError);
        };
    }, [socket, deviceId]);

    const updateConfig = (key, value) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const addLocation = () => {
        if (newLocation.trim() && !config.locations.includes(newLocation.trim())) {
            updateConfig('locations', [...config.locations, newLocation.trim()]);
            setNewLocation('');
        }
    };

    const removeLocation = (location) => {
        updateConfig('locations', config.locations.filter(l => l !== location));
    };

    // Task list handlers
    const loadTaskListByCode = () => {
        if (!loadTaskListCode.trim()) return;
        setTaskListLoading(true);
        socket.emit('load_task_list', { code: loadTaskListCode.trim().toUpperCase() });
        setLoadTaskListCode('');
    };

    const createTaskListFromDefaults = () => {
        const name = newTaskListName.trim() || 'My Task List';
        setTaskListLoading(true);
        socket.emit('create_task_list', { 
            player_id: deviceId, 
            name: name,
            from_default: true 
        });
        setNewTaskListName('');
    };

    const createEmptyTaskList = () => {
        const name = newTaskListName.trim() || 'New Task List';
        setTaskListLoading(true);
        socket.emit('create_task_list', { 
            player_id: deviceId, 
            name: name,
            tasks: [],
            locations: config.locations 
        });
        setNewTaskListName('');
    };

    const addTaskToList = () => {
        if (!currentTaskList || !newTask.task.trim()) return;
        socket.emit('add_task_to_list', {
            player_id: deviceId,
            code: currentTaskList.code,
            task: { ...newTask, task: newTask.task.trim() }
        });
        setNewTask({ task: '', location: 'Other', difficulty: 2 });
    };

    const removeTaskFromList = (index) => {
        if (!currentTaskList) return;
        socket.emit('remove_task_from_list', {
            player_id: deviceId,
            code: currentTaskList.code,
            task_index: index
        });
    };

    const applyTaskListToGame = () => {
        if (!currentTaskList) return;
        setTaskListLoading(true);
        socket.emit('apply_task_list_to_game', {
            room_code: roomCode,
            task_list_code: currentTaskList.code
        });
    };

    const deleteTaskList = (code) => {
        if (window.confirm('Are you sure you want to delete this task list?')) {
            socket.emit('delete_task_list', { player_id: deviceId, code });
        }
    };

    const duplicateTaskList = (code) => {
        socket.emit('duplicate_task_list', { 
            player_id: deviceId, 
            code,
            new_name: null 
        });
    };

    const handleOpenRoom = () => {
        setIsSaving(true);
        socket.emit('update_game_config', { 
            room_code: roomCode, 
            config: config 
        });
        socket.emit('open_room', { room_code: roomCode });
    };

    const handleLeaveRoom = () => {
        if (window.confirm('Are you sure you want to leave this room? The room will be deleted.')) {
            const playerId = localStorage.getItem('player_id');
            socket.emit('leave_room', { player_id: playerId });
        }
    };

    const toggleSection = (section) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    const Section = ({ id, icon: Icon, title, children }) => (
        <div className="bg-gray-700 rounded-lg overflow-hidden mb-3">
            <button
                onClick={() => toggleSection(id)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-600 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <Icon size={20} className="text-indigo-400" />
                    <span className="font-medium text-gray-100">{title}</span>
                </div>
                {expandedSection === id ? (
                    <ChevronUp size={20} className="text-gray-400" />
                ) : (
                    <ChevronDown size={20} className="text-gray-400" />
                )}
            </button>
            {expandedSection === id && (
                <div className="px-4 pb-4 pt-2 border-t border-gray-600">
                    {children}
                </div>
            )}
        </div>
    );

    const SliderInput = ({ label, value, onChange, min, max, step = 1, unit = '', description }) => (
        <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
                <label className="text-gray-300 text-sm">{label}</label>
                <span className="text-indigo-400 font-mono font-bold">
                    {typeof value === 'number' && value < 1 && value > 0 
                        ? `${Math.round(value * 100)}%` 
                        : `${value}${unit}`}
                </span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            {description && (
                <p className="text-gray-500 text-xs mt-1">{description}</p>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-tr from-gray-800 to-gray-900 p-4">
            <div className="max-w-lg mx-auto">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <Settings size={28} className="text-indigo-400" />
                        <h1 className="text-2xl font-bold text-gray-100">Game Settings</h1>
                    </div>
                    <div className="bg-gray-700 px-4 py-2 rounded-lg inline-flex items-center gap-3">
                        <span className="text-gray-400 text-sm">Room Code: </span>
                        <span className="text-indigo-400 font-mono font-bold text-xl">{roomCode}</span>
                        <div className="w-px h-5 bg-gray-500"></div>
                        <button
                            onClick={handleLeaveRoom}
                            className="p-1 hover:bg-red-600 hover:bg-opacity-20 rounded transition-colors group"
                            title="Leave room"
                        >
                            <LogOut className="text-gray-400 group-hover:text-red-400" size={18} />
                        </button>
                    </div>
                </div>

                {/* Configuration Sections */}
                <div className="mb-6">
                    {/* Locations */}
                    <Section id="locations" icon={MapPin} title="Locations">
                        <p className="text-gray-400 text-sm mb-3">
                            Add the locations in your venue where tasks can be assigned.
                        </p>
                        <div className="flex flex-wrap gap-2 mb-3">
                            {config.locations.map((location) => (
                                <div
                                    key={location}
                                    className="flex items-center gap-1 bg-gray-600 px-3 py-1 rounded-full"
                                >
                                    <span className="text-gray-200 text-sm">{location}</span>
                                    <button
                                        onClick={() => removeLocation(location)}
                                        className="text-gray-400 hover:text-red-400 transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newLocation}
                                onChange={(e) => setNewLocation(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && addLocation()}
                                placeholder="Add location..."
                                className="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                            <button
                                onClick={addLocation}
                                className="px-3 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                <Plus size={20} className="text-white" />
                            </button>
                        </div>
                    </Section>

                    {/* Imposters */}
                    <Section id="imposters" icon={Users} title="Imposters">
                        <SliderInput
                            label="Number of Imposters"
                            value={config.num_imposters}
                            onChange={(v) => updateConfig('num_imposters', v)}
                            min={1}
                            max={5}
                            description="Adjust based on group size. 1-2 for small groups, 2-3 for larger."
                        />
                        <SliderInput
                            label="Starting Cards"
                            value={config.starting_cards}
                            onChange={(v) => updateConfig('starting_cards', v)}
                            min={0}
                            max={5}
                            description="Cards each imposter starts with."
                        />
                        <SliderInput
                            label="Card Draw Chance"
                            value={config.card_draw_probability}
                            onChange={(v) => updateConfig('card_draw_probability', v)}
                            min={0}
                            max={1}
                            step={0.05}
                            description="Probability of drawing a card after task completion."
                        />
                    </Section>

                    {/* Meetings & Voting */}
                    <Section id="meetings" icon={Clock} title="Meetings & Voting">
                        <SliderInput
                            label="Voting Time"
                            value={config.vote_time}
                            onChange={(v) => updateConfig('vote_time', v)}
                            min={60}
                            max={300}
                            step={15}
                            unit="s"
                            description="Time allowed for voting during meetings."
                        />
                        <SliderInput
                            label="Vote Threshold"
                            value={config.vote_threshold}
                            onChange={(v) => updateConfig('vote_threshold', v)}
                            min={0.5}
                            max={1}
                            step={0.05}
                            description="Fraction of votes needed to eject someone."
                        />
                    </Section>

                    {/* Meltdown */}
                    <Section id="meltdown" icon={Zap} title="Meltdown">
                        <SliderInput
                            label="Meltdown Time"
                            value={config.meltdown_time}
                            onChange={(v) => updateConfig('meltdown_time', v)}
                            min={30}
                            max={120}
                            step={5}
                            unit="s"
                            description="Time to stop a meltdown before imposters win."
                        />
                        <SliderInput
                            label="Codes Required"
                            value={config.code_percent}
                            onChange={(v) => updateConfig('code_percent', v)}
                            min={0.3}
                            max={1}
                            step={0.05}
                            description="Fraction of players who must enter codes to stop meltdown."
                        />
                    </Section>

                    {/* Tasks */}
                    <Section id="tasks" icon={Target} title="Tasks">
                        <SliderInput
                            label="Tasks Per Player"
                            value={config.task_ratio}
                            onChange={(v) => updateConfig('task_ratio', v)}
                            min={5}
                            max={25}
                            description="Average tasks each crewmate needs to complete for crew to win."
                        />
                    </Section>

                    {/* Task Lists */}
                    <Section id="tasklists" icon={List} title="Task Lists">
                        <p className="text-gray-400 text-sm mb-3">
                            Load or create custom task lists. Task lists are saved and can be reused.
                        </p>

                        {/* Load by code */}
                        <div className="mb-4">
                            <label className="text-gray-300 text-sm block mb-2">Load Task List by Code</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={loadTaskListCode}
                                    onChange={(e) => setLoadTaskListCode(e.target.value.toUpperCase())}
                                    onKeyPress={(e) => e.key === 'Enter' && loadTaskListByCode()}
                                    placeholder="Enter code..."
                                    maxLength={6}
                                    className="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono uppercase"
                                />
                                <button
                                    onClick={loadTaskListByCode}
                                    disabled={taskListLoading}
                                    className="px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors text-sm disabled:opacity-50"
                                >
                                    <Download size={18} />
                                </button>
                            </div>
                        </div>

                        {/* My saved task lists */}
                        {myTaskLists.length > 0 && (
                            <div className="mb-4">
                                <label className="text-gray-300 text-sm block mb-2">Your Saved Task Lists</label>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {myTaskLists.map((list) => (
                                        <div 
                                            key={list.code} 
                                            className="flex items-center justify-between bg-gray-600 px-3 py-2 rounded-lg"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <span className="text-gray-200 text-sm block truncate">{list.name}</span>
                                                <span className="text-gray-400 text-xs">{list.task_count} tasks • <span className="font-mono">{list.code}</span></span>
                                            </div>
                                            <div className="flex gap-1 ml-2">
                                                <button
                                                    onClick={() => {
                                                        setTaskListLoading(true);
                                                        socket.emit('load_task_list', { code: list.code });
                                                    }}
                                                    className="p-1 text-indigo-400 hover:text-indigo-300"
                                                    title="Load"
                                                >
                                                    <Download size={16} />
                                                </button>
                                                <button
                                                    onClick={() => deleteTaskList(list.code)}
                                                    className="p-1 text-red-400 hover:text-red-300"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Create new task list */}
                        <div className="mb-4 border-t border-gray-600 pt-4">
                            <label className="text-gray-300 text-sm block mb-2">Create New Task List</label>
                            <input
                                type="text"
                                value={newTaskListName}
                                onChange={(e) => setNewTaskListName(e.target.value)}
                                placeholder="Task list name..."
                                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-2"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={createTaskListFromDefaults}
                                    disabled={taskListLoading}
                                    className="flex-1 px-3 py-2 bg-green-600 rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <FileText size={16} />
                                    From Defaults
                                </button>
                                <button
                                    onClick={createEmptyTaskList}
                                    disabled={taskListLoading}
                                    className="flex-1 px-3 py-2 bg-gray-500 rounded-lg hover:bg-gray-400 transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <Plus size={16} />
                                    Empty List
                                </button>
                            </div>
                        </div>

                        {/* Currently loaded task list */}
                        {currentTaskList && (
                            <div className="border-t border-gray-600 pt-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <span className="text-gray-200 font-medium">{currentTaskList.name}</span>
                                        <span className="text-gray-400 text-xs block">
                                            Code: <span className="font-mono text-indigo-400">{currentTaskList.code}</span>
                                            {' • '}{currentTaskList.tasks.length} tasks
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => duplicateTaskList(currentTaskList.code)}
                                            className="p-2 bg-gray-600 rounded-lg hover:bg-gray-500 transition-colors"
                                            title="Duplicate"
                                        >
                                            <Copy size={16} />
                                        </button>
                                        <button
                                            onClick={applyTaskListToGame}
                                            disabled={taskListLoading}
                                            className="px-3 py-2 bg-green-600 rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50 flex items-center gap-2"
                                        >
                                            <Save size={16} />
                                            Apply to Game
                                        </button>
                                    </div>
                                </div>

                                {/* Add new task */}
                                {currentTaskList.creator_id === deviceId && (
                                    <div className="mb-3 bg-gray-600 p-3 rounded-lg">
                                        <label className="text-gray-300 text-xs block mb-2">Add Task</label>
                                        <input
                                            type="text"
                                            value={newTask.task}
                                            onChange={(e) => setNewTask({ ...newTask, task: e.target.value })}
                                            onKeyPress={(e) => e.key === 'Enter' && addTaskToList()}
                                            placeholder="Task description..."
                                            className="w-full px-3 py-2 bg-gray-700 border border-gray-500 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-2"
                                        />
                                        <div className="flex gap-2">
                                            <select
                                                value={newTask.location}
                                                onChange={(e) => setNewTask({ ...newTask, location: e.target.value })}
                                                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-500 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                            >
                                                {(currentTaskList.locations || config.locations).map(loc => (
                                                    <option key={loc} value={loc}>{loc}</option>
                                                ))}
                                            </select>
                                            <select
                                                value={newTask.difficulty}
                                                onChange={(e) => setNewTask({ ...newTask, difficulty: parseInt(e.target.value) })}
                                                className="w-20 px-3 py-2 bg-gray-700 border border-gray-500 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                            >
                                                <option value={1}>Easy</option>
                                                <option value={2}>Med</option>
                                                <option value={3}>Hard</option>
                                            </select>
                                            <button
                                                onClick={addTaskToList}
                                                className="px-3 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                                            >
                                                <Plus size={18} />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Task list */}
                                <div className="max-h-60 overflow-y-auto space-y-1">
                                    {currentTaskList.tasks.map((task, index) => (
                                        <div 
                                            key={index}
                                            className="flex items-center justify-between bg-gray-600 px-3 py-2 rounded text-sm"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <span className="text-gray-200 block truncate">{task.task}</span>
                                                <span className="text-gray-400 text-xs">
                                                    {task.location}
                                                    {task.difficulty && ` • ${'⭐'.repeat(task.difficulty)}`}
                                                </span>
                                            </div>
                                            {currentTaskList.creator_id === deviceId && (
                                                <button
                                                    onClick={() => removeTaskFromList(index)}
                                                    className="p-1 text-red-400 hover:text-red-300 ml-2"
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {currentTaskList.tasks.length === 0 && (
                                        <p className="text-gray-500 text-sm text-center py-4">No tasks yet. Add some above!</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </Section>
                </div>

                {/* Open Room Button */}
                <button
                    onClick={handleOpenRoom}
                    disabled={isSaving || config.locations.length === 0}
                    className="w-full bg-green-600 text-white py-4 px-6 rounded-lg hover:bg-green-700 transition-all focus:outline-none focus:ring-2 focus:ring-green-400 transform hover:scale-105 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg"
                >
                    {isSaving ? (
                        <span className="animate-pulse">Opening Room...</span>
                    ) : (
                        <>
                            <Play size={24} />
                            <span>Open Room for Players</span>
                        </>
                    )}
                </button>

                <p className="text-center text-gray-500 text-sm mt-4">
                    Once opened, other players can join with code <span className="text-indigo-400 font-mono">{roomCode}</span>
                </p>
            </div>
        </div>
    );
}

export default GameConfigPage;

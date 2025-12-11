import React, { useState, useContext, useEffect, useRef } from 'react';
import { DataContext } from '../GameContext';
import { Users, Play, ChevronDown, ChevronUp, List, Download, Trash2, Check, LogOut, MapPin, Settings, ArrowRight, ArrowLeft, X } from 'lucide-react';

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
    
    // Two-step wizard: 'tasklist' or 'settings'
    const [step, setStep] = useState('tasklist');
    
    const [config, setConfig] = useState({
        locations: ['Basement', '1st Floor', '2nd Floor', '3rd Floor'],
        vote_time: 180,
        vote_threshold: 0.66,
        meltdown_time: 60,
        code_percent: 0.6,
        num_intruders: 2,
        card_draw_probability: 0.9,
        starting_cards: 2,
        task_ratio: 12,
    });
    
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Task list state
    const [myTaskLists, setMyTaskLists] = useState([]);
    const [loadTaskListCode, setLoadTaskListCode] = useState('');
    const [currentTaskList, setCurrentTaskList] = useState(null);
    const [taskListLoading, setTaskListLoading] = useState(false);
    const [taskListApplied, setTaskListApplied] = useState(false);
    
    // Use device ID instead of player ID for task list ownership
    const deviceId = useRef(getDeviceId()).current;

    // Request current config when component mounts
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

    // Listen for task list events
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
            setTaskListApplied(true);
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

    // Task list handlers
    const loadTaskListByCode = () => {
        if (!loadTaskListCode.trim()) return;
        setTaskListLoading(true);
        const code = loadTaskListCode.trim().toUpperCase();
        socket.emit('load_task_list', { code });
        // Auto-save to user's list when loading by code
        socket.emit('save_task_list_to_user', { player_id: deviceId, code });
        setLoadTaskListCode('');
    };

    const applyTaskListToGame = () => {
        if (!currentTaskList) return;
        setTaskListLoading(true);
        socket.emit('apply_task_list_to_game', {
            room_code: roomCode,
            task_list_code: currentTaskList.code
        });
    };

    const clearTaskListSelection = () => {
        setCurrentTaskList(null);
        setTaskListApplied(false);
    };

    const deleteTaskList = (code) => {
        if (window.confirm('Are you sure you want to delete this task list?')) {
            socket.emit('delete_task_list', { player_id: deviceId, code });
        }
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

    const proceedToSettings = () => {
        // Apply task list if one is loaded but not yet applied
        if (currentTaskList && !taskListApplied) {
            applyTaskListToGame();
        }
        setStep('settings');
    };

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

    // Step 1: Task List Selection
    const renderTaskListStep = () => (
        <>
            <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                    <List size={28} className="text-indigo-400" />
                    <h1 className="text-2xl font-bold text-gray-100">Task List</h1>
                </div>
                <p className="text-gray-400 text-sm">
                    Load a saved task list, or skip to create tasks with your group
                </p>
            </div>

            <div className="bg-gray-700 rounded-lg p-4 mb-4">
                {/* Load by code */}
                <div className="mb-4">
                    <label className="text-gray-300 text-sm block mb-2">Load by Code</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={loadTaskListCode}
                            onChange={(e) => setLoadTaskListCode(e.target.value.toUpperCase())}
                            onKeyPress={(e) => e.key === 'Enter' && loadTaskListByCode()}
                            placeholder="Enter 6-letter code..."
                            maxLength={6}
                            className="flex-1 px-4 py-3 bg-gray-600 border border-gray-500 rounded-lg text-gray-100 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono uppercase text-center tracking-widest"
                        />
                        <button
                            onClick={loadTaskListByCode}
                            disabled={taskListLoading || loadTaskListCode.length < 6}
                            className="px-4 py-3 bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                        >
                            <Download size={20} />
                        </button>
                    </div>
                </div>

                {/* My saved task lists */}
                {myTaskLists.length > 0 && (
                    <div className="mb-4">
                        <label className="text-gray-300 text-sm block mb-2">Your Saved Lists</label>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {myTaskLists.map((list) => (
                                <div 
                                    key={list.code} 
                                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                                        currentTaskList?.code === list.code 
                                            ? 'bg-indigo-600 bg-opacity-30 border border-indigo-500' 
                                            : 'bg-gray-600 hover:bg-gray-550'
                                    }`}
                                    onClick={() => {
                                        setTaskListLoading(true);
                                        setTaskListApplied(false);
                                        socket.emit('load_task_list', { code: list.code });
                                    }}
                                >
                                    <div className="flex-1 min-w-0">
                                        <span className="text-gray-200 text-sm block truncate">{list.name}</span>
                                        <span className="text-gray-400 text-xs">
                                            {list.task_count} tasks • <span className="font-mono">{list.code}</span>
                                        </span>
                                    </div>
                                    <div className="flex gap-1 ml-2">
                                        {currentTaskList?.code === list.code && (
                                            <Check size={18} className="text-green-400 mr-1" />
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteTaskList(list.code);
                                            }}
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

                {/* Currently loaded task list preview */}
                {currentTaskList && (
                    <div className="border-t border-gray-600 pt-4 mt-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-200 font-medium">{currentTaskList.name}</span>
                            <div className="flex items-center gap-2">
                                {taskListApplied && (
                                    <span className="flex items-center gap-1 text-green-400 text-sm">
                                        <Check size={16} /> Applied
                                    </span>
                                )}
                                <button
                                    onClick={clearTaskListSelection}
                                    className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-600 rounded transition-colors"
                                    title="Clear selection"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>
                        <p className="text-gray-400 text-sm mb-3">
                            {currentTaskList.tasks.length} tasks • 
                            {(currentTaskList.locations || []).filter(l => l !== 'Other').length} locations
                        </p>
                        
                        {/* Locations preview */}
                        {currentTaskList.locations && currentTaskList.locations.filter(l => l !== 'Other').length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                                {currentTaskList.locations.filter(l => l !== 'Other').map((loc) => (
                                    <span
                                        key={loc}
                                        className="bg-gray-600 px-2 py-1 rounded-full text-gray-300 text-xs flex items-center gap-1"
                                    >
                                        <MapPin size={10} />
                                        {loc}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Task preview */}
                        <div className="max-h-32 overflow-y-auto space-y-1 text-sm">
                            {currentTaskList.tasks.slice(0, 5).map((task, index) => (
                                <div 
                                    key={index}
                                    className="bg-gray-600 px-3 py-2 rounded text-gray-300 truncate"
                                >
                                    {task.task}
                                </div>
                            ))}
                            {currentTaskList.tasks.length > 5 && (
                                <p className="text-gray-500 text-xs text-center py-1">
                                    + {currentTaskList.tasks.length - 5} more
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
                <button
                    onClick={proceedToSettings}
                    className="w-full bg-indigo-600 text-white py-4 px-6 rounded-lg hover:bg-indigo-700 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 flex items-center justify-center gap-3 font-bold text-lg"
                >
                    {currentTaskList ? (
                        <>
                            <span>Use This Task List</span>
                            <ArrowRight size={20} />
                        </>
                    ) : (
                        <>
                            <span>Create Tasks with Group</span>
                            <ArrowRight size={20} />
                        </>
                    )}
                </button>
                
                <p className="text-center text-gray-500 text-xs">
                    {currentTaskList 
                        ? "You can still add more tasks after opening the room"
                        : "All players can add tasks together after joining"
                    }
                </p>
            </div>
        </>
    );

    // Step 2: Game Settings (Intruders + Advanced)
    const renderSettingsStep = () => (
        <>
            <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                    <Users size={28} className="text-indigo-400" />
                    <h1 className="text-2xl font-bold text-gray-100">Game Settings</h1>
                </div>
                {currentTaskList && taskListApplied && (
                    <p className="text-green-400 text-sm flex items-center justify-center gap-1">
                        <Check size={16} />
                        Using task list: {currentTaskList.name}
                    </p>
                )}
            </div>

            {/* Number of Intruders - Primary Setting */}
            <div className="bg-gray-700 rounded-lg p-6 mb-4">
                <div className="text-center mb-4">
                    <h2 className="text-lg font-bold text-gray-100 mb-1">Number of Intruders</h2>
                    <p className="text-gray-400 text-sm">Choose based on group size</p>
                </div>
                
                <div className="flex justify-center gap-3 mb-4">
                    {[1, 2, 3, 4].map((num) => (
                        <button
                            key={num}
                            onClick={() => updateConfig('num_intruders', num)}
                            className={`w-16 h-16 rounded-xl text-2xl font-bold transition-all ${
                                config.num_intruders === num
                                    ? 'bg-red-600 text-white scale-110 shadow-lg'
                                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                            }`}
                        >
                            {num}
                        </button>
                    ))}
                </div>
                
                <p className="text-center text-gray-500 text-xs">
                    {config.num_intruders === 1 && "Best for 4-6 players"}
                    {config.num_intruders === 2 && "Best for 6-10 players"}
                    {config.num_intruders === 3 && "Best for 10-15 players"}
                    {config.num_intruders === 4 && "Best for 15+ players (chaos mode!)"}
                </p>
            </div>

            {/* Advanced Settings (collapsed by default) */}
            <div className="bg-gray-700 rounded-lg overflow-hidden mb-6">
                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-600 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <Settings size={20} className="text-gray-400" />
                        <span className="text-gray-300">Advanced Settings</span>
                    </div>
                    {showAdvanced ? (
                        <ChevronUp size={20} className="text-gray-400" />
                    ) : (
                        <ChevronDown size={20} className="text-gray-400" />
                    )}
                </button>
                
                {showAdvanced && (
                    <div className="px-4 pb-4 pt-2 border-t border-gray-600 space-y-6">
                        {/* Intruder Cards */}
                        <div>
                            <h3 className="text-gray-200 font-medium mb-3">Intruder Cards</h3>
                            <SliderInput
                                label="Starting Cards"
                                value={config.starting_cards}
                                onChange={(v) => updateConfig('starting_cards', v)}
                                min={0}
                                max={5}
                                description="Cards each intruder starts with"
                            />
                            <SliderInput
                                label="Card Draw Chance"
                                value={config.card_draw_probability}
                                onChange={(v) => updateConfig('card_draw_probability', v)}
                                min={0}
                                max={1}
                                step={0.05}
                                description="Chance to draw a card after task completion"
                            />
                        </div>

                        {/* Meetings */}
                        <div>
                            <h3 className="text-gray-200 font-medium mb-3">Meetings & Voting</h3>
                            <SliderInput
                                label="Voting Time"
                                value={config.vote_time}
                                onChange={(v) => updateConfig('vote_time', v)}
                                min={60}
                                max={300}
                                step={15}
                                unit="s"
                                description="Time allowed for voting"
                            />
                            <SliderInput
                                label="Vote Threshold"
                                value={config.vote_threshold}
                                onChange={(v) => updateConfig('vote_threshold', v)}
                                min={0.5}
                                max={1}
                                step={0.05}
                                description="Votes needed to eject"
                            />
                        </div>

                        {/* Meltdown */}
                        <div>
                            <h3 className="text-gray-200 font-medium mb-3">Meltdown Sabotage</h3>
                            <SliderInput
                                label="Meltdown Time"
                                value={config.meltdown_time}
                                onChange={(v) => updateConfig('meltdown_time', v)}
                                min={30}
                                max={120}
                                step={5}
                                unit="s"
                                description="Time to stop meltdown"
                            />
                            <SliderInput
                                label="Codes Required"
                                value={config.code_percent}
                                onChange={(v) => updateConfig('code_percent', v)}
                                min={0.3}
                                max={1}
                                step={0.05}
                                description="% of players needed"
                            />
                        </div>

                        {/* Tasks */}
                        <div>
                            <h3 className="text-gray-200 font-medium mb-3">Tasks</h3>
                            <SliderInput
                                label="Tasks Per Player"
                                value={config.task_ratio}
                                onChange={(v) => updateConfig('task_ratio', v)}
                                min={5}
                                max={25}
                                description="Tasks to complete for crew victory"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
                <button
                    onClick={handleOpenRoom}
                    disabled={isSaving}
                    className="w-full bg-green-600 text-white py-4 px-6 rounded-lg hover:bg-green-700 transition-all focus:outline-none focus:ring-2 focus:ring-green-400 transform hover:scale-105 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg"
                >
                    {isSaving ? (
                        <span className="animate-pulse">Opening Room...</span>
                    ) : (
                        <>
                            <Play size={24} />
                            <span>Open Room</span>
                        </>
                    )}
                </button>

                <button
                    onClick={() => setStep('tasklist')}
                    className="w-full py-3 text-gray-400 hover:text-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                    <ArrowLeft size={18} />
                    <span>Back to Task List</span>
                </button>
            </div>
        </>
    );

    return (
        <div className="min-h-screen bg-gradient-to-tr from-gray-800 to-gray-900 p-4">
            <div className="max-w-lg mx-auto">
                {/* Room code header */}
                <div className="flex items-center justify-center mb-6">
                    <div className="bg-gray-700 px-4 py-2 rounded-lg inline-flex items-center gap-3">
                        <span className="text-gray-400 text-sm">Room:</span>
                        <span className="text-indigo-400 font-mono font-bold text-xl tracking-widest">{roomCode}</span>
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

                {/* Step indicator */}
                <div className="flex items-center justify-center gap-2 mb-6">
                    <div className={`w-3 h-3 rounded-full ${step === 'tasklist' ? 'bg-indigo-500' : 'bg-gray-600'}`}></div>
                    <div className="w-8 h-0.5 bg-gray-600"></div>
                    <div className={`w-3 h-3 rounded-full ${step === 'settings' ? 'bg-indigo-500' : 'bg-gray-600'}`}></div>
                </div>

                {/* Render current step */}
                {step === 'tasklist' ? renderTaskListStep() : renderSettingsStep()}

                <p className="text-center text-gray-500 text-sm mt-6">
                    Share code <span className="text-indigo-400 font-mono">{roomCode}</span> to invite players
                </p>
            </div>
        </div>
    );
}

export default GameConfigPage;

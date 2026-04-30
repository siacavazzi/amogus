import React, { useState, useContext, useEffect, useRef, useMemo } from 'react';
import { DataContext } from '../GameContext';
import { Users, Play, ChevronDown, ChevronUp, List, Download, Trash2, Check, LogOut, MapPin, Settings, ArrowRight, ArrowLeft, X, Zap, Copy, Sparkles } from 'lucide-react';

// Floating particle component
const FloatingParticle = ({ delay, duration, size, left, color }) => (
    <div
        className={`absolute rounded-full ${color} pointer-events-none`}
        style={{
            width: size,
            height: size,
            left: `${left}%`,
            bottom: '-20px',
            animation: `floatUp ${duration}s ease-in-out infinite`,
            animationDelay: `${delay}s`,
            filter: 'blur(1px)',
        }}
    />
);

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
    const [showContent, setShowContent] = useState(false);
    const [copied, setCopied] = useState(false);

    // Generate floating particles
    const particles = useMemo(() => 
        Array.from({ length: 12 }, (_, i) => ({
            id: i,
            delay: Math.random() * 8,
            duration: 6 + Math.random() * 6,
            size: 3 + Math.random() * 5,
            left: Math.random() * 100,
            color: i % 3 === 0 ? 'bg-indigo-500/30' : i % 3 === 1 ? 'bg-cyan-500/20' : 'bg-purple-500/20',
        }))
    , []);
    
    const [config, setConfig] = useState({
        locations: ['Basement', '1st Floor', '2nd Floor', '3rd Floor'],
        vote_time: 180,
        vote_threshold: 0.66,
        meltdown_time: 60,
        code_percent: 0.6,
        num_intruders: 2,
        card_draw_probability: 1,
        starting_cards: 2,
        task_ratio: 10,
    });
    
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Task list state
    const [myTaskLists, setMyTaskLists] = useState([]);
    const [starterTemplate, setStarterTemplate] = useState(null);
    const [starterTemplateDismissed, setStarterTemplateDismissed] = useState(false);
    const [loadTaskListCode, setLoadTaskListCode] = useState('');
    const [currentTaskList, setCurrentTaskList] = useState(null);
    const [taskListLoading, setTaskListLoading] = useState(false);
    const [taskListApplied, setTaskListApplied] = useState(false);
    
    // Use device ID instead of player ID for task list ownership
    const deviceId = useRef(getDeviceId()).current;

    useEffect(() => {
        const timer = setTimeout(() => setShowContent(true), 100);
        return () => clearTimeout(timer);
    }, []);

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
            setStarterTemplate(data.starter_template || null);
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
        setTaskListApplied(false);
        const code = loadTaskListCode.trim().toUpperCase();
        socket.emit('load_task_list', { code });
        // Auto-save to user's list when loading by code
        socket.emit('save_task_list_to_user', { player_id: deviceId, code });
        setLoadTaskListCode('');
    };

    const starterListCopy = starterTemplate
        ? myTaskLists.find((list) => list.source_template === starterTemplate.template_key)
        : null;
    const starterLocationCount = (starterTemplate?.locations || []).filter((location) => location !== 'Other').length;
    const showStarterTemplatePromo = starterTemplate && !starterListCopy && !starterTemplateDismissed;

    const useStarterTaskList = () => {
        if (!socket || !starterTemplate) return;

        setTaskListLoading(true);
        setTaskListApplied(false);

        if (starterListCopy) {
            socket.emit('load_task_list', { code: starterListCopy.code });
            return;
        }

        socket.emit('create_task_list', {
            player_id: deviceId,
            name: starterTemplate.name,
            from_default: true,
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
        const configToSave = {
            ...config,
            locations: currentTaskList?.locations
                ? currentTaskList.locations.filter((location) => location !== 'Other')
                : config.locations,
        };
        socket.emit('update_game_config', { 
            room_code: roomCode, 
            config: configToSave 
        });
        socket.emit('open_room', { room_code: roomCode });
    };

    const handleLeaveRoom = () => {
        if (window.confirm('Are you sure you want to leave this room? The room will be deleted.')) {
            // Clear local storage first
            localStorage.removeItem('player_id');
            localStorage.removeItem('room_code');
            sessionStorage.removeItem('is_room_creator');
            // Send leave_room with room_code (during setup, player_id may not exist yet)
            socket.emit('leave_room', { room_code: roomCode });
        }
    };

    const copyRoomCode = async () => {
        try {
            await navigator.clipboard.writeText(roomCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
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
        <div className="mb-5">
            <div className="flex justify-between items-center mb-2">
                <label className="text-gray-300 text-sm font-medium">{label}</label>
                <span className="text-indigo-400 font-mono font-bold bg-gray-800/50 px-2 py-1 rounded-lg">
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
                className="w-full h-2 bg-gray-700/50 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            {description && (
                <p className="text-gray-500 text-xs mt-1.5">{description}</p>
            )}
        </div>
    );

    // Step 1: Task List Selection
    const renderTaskListStep = () => (
        <>
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center gap-3 mb-3">
                    <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl border border-indigo-500/30">
                        <List size={28} className="text-indigo-400" />
                    </div>
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Task List</h1>
                <p className="text-gray-400 text-sm">
                    Load a saved task list, or skip to create tasks with your group
                </p>
            </div>

            {showStarterTemplatePromo && (
                <div className="bg-gradient-to-r from-indigo-500/10 via-gray-900/80 to-cyan-500/10 backdrop-blur-xl border border-indigo-500/20 rounded-xl p-3 mb-4 shadow-lg shadow-indigo-950/20">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-indigo-500/15 rounded-xl border border-indigo-500/20 shrink-0">
                            <Sparkles size={16} className="text-indigo-300" />
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-indigo-300/80 text-[11px] font-semibold uppercase tracking-[0.22em] mb-1">Example List</p>
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                        <h2 className="text-white text-sm font-semibold">{starterTemplate.name}</h2>
                                        <span className="text-gray-500 text-xs">
                                            {starterTemplate.task_count} tasks • {starterLocationCount} locations
                                        </span>
                                    </div>
                                    <p className="text-gray-400 text-xs mt-1">{starterTemplate.description}</p>
                                </div>

                                <button
                                    onClick={() => setStarterTemplateDismissed(true)}
                                    className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800/80 rounded-lg transition-all shrink-0"
                                    title="Dismiss example list"
                                    aria-label="Dismiss example list"
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-3">
                                <button
                                    onClick={useStarterTaskList}
                                    disabled={taskListLoading}
                                    className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg text-white text-sm font-semibold hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                >
                                    Add Example List
                                </button>
                                <p className="text-gray-500 text-xs">
                                    A starting point you can fully edit. Add, remove, or rewrite tasks to fit your space.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800/80 rounded-2xl p-5 mb-5">
                {/* Load by code */}
                <div className="mb-5">
                    <label className="text-gray-300 text-sm block mb-2 font-medium">Load by Code</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={loadTaskListCode}
                            onChange={(e) => setLoadTaskListCode(e.target.value.toUpperCase())}
                            onKeyPress={(e) => e.key === 'Enter' && loadTaskListByCode()}
                            placeholder="Enter 6-letter code..."
                            maxLength={6}
                            className="flex-1 px-4 py-3 bg-gray-800/80 border-2 border-gray-700/80 rounded-xl text-gray-100 text-lg focus:outline-none focus:border-indigo-500/50 font-mono uppercase text-center tracking-widest transition-colors"
                        />
                        <button
                            onClick={loadTaskListByCode}
                            disabled={taskListLoading || loadTaskListCode.length < 6}
                            className="px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl hover:from-indigo-500 hover:to-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Download size={20} className="text-white" />
                        </button>
                    </div>
                </div>

                {/* My saved task lists */}
                {myTaskLists.length > 0 && (
                    <div className="mb-4">
                        <label className="text-gray-300 text-sm block mb-2 font-medium">Your Saved Lists</label>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {myTaskLists.map((list) => (
                                <div 
                                    key={list.code} 
                                    className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all ${
                                        currentTaskList?.code === list.code 
                                            ? 'bg-indigo-600/20 border-2 border-indigo-500/50' 
                                            : 'bg-gray-800/60 border-2 border-transparent hover:border-gray-700/80'
                                    }`}
                                    onClick={() => {
                                        setTaskListLoading(true);
                                        setTaskListApplied(false);
                                        socket.emit('load_task_list', { code: list.code });
                                    }}
                                >
                                    <div className="flex-1 min-w-0">
                                        <span className="text-gray-200 text-sm block truncate font-medium">{list.name}</span>
                                        <span className="text-gray-500 text-xs">
                                            {list.task_count} tasks • <span className="font-mono text-indigo-400/70">{list.code}</span>
                                        </span>
                                    </div>
                                    <div className="flex gap-2 ml-2 items-center">
                                        {currentTaskList?.code === list.code && (
                                            <div className="w-5 h-5 bg-green-500/20 rounded-full flex items-center justify-center">
                                                <Check size={14} className="text-green-400" />
                                            </div>
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteTaskList(list.code);
                                            }}
                                            className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
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
                    <div className="border-t border-gray-700/50 pt-4 mt-4">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-white font-medium">{currentTaskList.name}</span>
                            <div className="flex items-center gap-2">
                                {taskListApplied && (
                                    <span className="flex items-center gap-1 text-green-400 text-sm bg-green-500/10 px-2 py-1 rounded-lg">
                                        <Check size={14} /> Applied
                                    </span>
                                )}
                                <button
                                    onClick={clearTaskListSelection}
                                    className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-700/50 rounded-lg transition-all"
                                    title="Clear selection"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                        <p className="text-gray-500 text-sm mb-3">
                            {currentTaskList.tasks.length} tasks • 
                            {(currentTaskList.locations || []).filter(l => l !== 'Other').length} locations
                        </p>
                        
                        {/* Locations preview */}
                        {currentTaskList.locations && currentTaskList.locations.filter(l => l !== 'Other').length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                                {currentTaskList.locations.filter(l => l !== 'Other').map((loc) => (
                                    <span
                                        key={loc}
                                        className="bg-gray-800/60 px-2.5 py-1 rounded-full text-gray-400 text-xs flex items-center gap-1 border border-gray-700/50"
                                    >
                                        <MapPin size={10} className="text-indigo-400" />
                                        {loc}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Task preview */}
                        <div className="max-h-32 overflow-y-auto space-y-1.5 text-sm">
                            {currentTaskList.tasks.slice(0, 5).map((task, index) => (
                                <div 
                                    key={index}
                                    className="bg-gray-800/60 px-3 py-2 rounded-lg text-gray-400 truncate border border-gray-700/30"
                                >
                                    {task.task}
                                </div>
                            ))}
                            {currentTaskList.tasks.length > 5 && (
                                <p className="text-gray-600 text-xs text-center py-1">
                                    + {currentTaskList.tasks.length - 5} more
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Action buttons */}
            <div className="space-y-4">
                <button
                    onClick={proceedToSettings}
                    className="w-full relative group"
                >
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity"></div>
                    <div className="relative bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-3 font-bold text-lg group-hover:scale-[1.02]">
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
                    </div>
                </button>
                
                <p className="text-center text-gray-600 text-xs">
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
                <div className="inline-flex items-center justify-center gap-3 mb-3">
                    <div className="p-3 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-2xl border border-red-500/30">
                        <Users size={28} className="text-red-400" />
                    </div>
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Game Settings</h1>
                {currentTaskList && taskListApplied && (
                    <p className="text-green-400 text-sm flex items-center justify-center gap-1 bg-green-500/10 rounded-full px-3 py-1 w-fit mx-auto">
                        <Check size={16} />
                        Using: {currentTaskList.name}
                    </p>
                )}
            </div>

            {/* Number of Intruders - Primary Setting */}
            <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800/80 rounded-2xl p-6 mb-5">
                <div className="text-center mb-5">
                    <h2 className="text-lg font-bold text-white mb-1">Number of Intruders</h2>
                    <p className="text-gray-500 text-sm">Choose based on group size</p>
                </div>
                
                <div className="flex justify-center gap-3 mb-4">
                    {[1, 2, 3, 4].map((num) => (
                        <button
                            key={num}
                            onClick={() => updateConfig('num_intruders', num)}
                            className={`w-16 h-16 rounded-xl text-2xl font-bold transition-all ${
                                config.num_intruders === num
                                    ? 'bg-gradient-to-br from-red-600 to-red-700 text-white scale-110 shadow-lg shadow-red-500/30 border-2 border-red-400/50'
                                    : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/60 border-2 border-transparent hover:border-gray-600/50'
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
            <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800/80 rounded-2xl overflow-hidden mb-6">
                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-800/30 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <Settings size={20} className="text-gray-500" />
                        <span className="text-gray-300 font-medium">Advanced Settings</span>
                    </div>
                    {showAdvanced ? (
                        <ChevronUp size={20} className="text-gray-500" />
                    ) : (
                        <ChevronDown size={20} className="text-gray-500" />
                    )}
                </button>
                
                {showAdvanced && (
                    <div className="px-5 pb-5 pt-2 border-t border-gray-800/50 space-y-6">
                        {/* Intruder Cards */}
                        <div>
                            <h3 className="text-gray-300 font-medium mb-4 flex items-center gap-2">
                                <Sparkles size={16} className="text-purple-400" />
                                Intruder Cards
                            </h3>
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
                            <h3 className="text-gray-300 font-medium mb-4 flex items-center gap-2">
                                <Users size={16} className="text-indigo-400" />
                                Meetings & Voting
                            </h3>
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
                            <h3 className="text-gray-300 font-medium mb-4 flex items-center gap-2">
                                <Zap size={16} className="text-orange-400" />
                                Meltdown Sabotage
                            </h3>
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
                            <h3 className="text-gray-300 font-medium mb-4 flex items-center gap-2">
                                <List size={16} className="text-cyan-400" />
                                Tasks
                            </h3>
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
            <div className="space-y-4">
                <button
                    onClick={handleOpenRoom}
                    disabled={isSaving}
                    className="w-full relative group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <div className="absolute -inset-1 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl blur opacity-40 group-hover:opacity-60 transition-opacity"></div>
                    <div className="relative py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold text-lg rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 group-hover:scale-[1.02]">
                        {isSaving ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>Opening Room...</span>
                            </>
                        ) : (
                            <>
                                <Play size={24} fill="currentColor" />
                                <span>Open Room</span>
                            </>
                        )}
                    </div>
                </button>

                <button
                    onClick={() => setStep('tasklist')}
                    className="w-full py-3 text-gray-500 hover:text-gray-300 transition-colors flex items-center justify-center gap-2"
                >
                    <ArrowLeft size={18} />
                    <span>Back to Task List</span>
                </button>
            </div>
        </>
    );

    return (
        <div className="fixed inset-0 bg-gray-950 overflow-hidden">
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/50 via-gray-950 to-purple-950/30"></div>
            
            {/* Floating particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {particles.map(p => (
                    <FloatingParticle key={p.id} {...p} />
                ))}
            </div>
            
            {/* Glowing orbs */}
            <div className="absolute top-20 right-10 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-40 left-10 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            
            {/* Grid overlay */}
            <div 
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                    backgroundSize: '50px 50px'
                }}
            ></div>
            
            {/* Scrollable content */}
            <div className="relative z-10 h-full overflow-y-auto">
                <div className={`max-w-lg mx-auto px-4 py-6 pb-8 transition-all duration-700 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    
                    {/* Room code header */}
                    <div className="flex justify-center mb-6">
                        <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800/80 rounded-2xl px-5 py-3 flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-gray-500 text-sm">Room</span>
                                <span className="text-xl font-mono font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent tracking-widest">{roomCode}</span>
                            </div>
                            <button
                                onClick={copyRoomCode}
                                className="p-2 hover:bg-gray-800 rounded-xl transition-all"
                                title="Copy room code"
                            >
                                {copied ? (
                                    <Check className="text-green-400" size={16} />
                                ) : (
                                    <Copy className="text-gray-500 hover:text-indigo-400 transition-colors" size={16} />
                                )}
                            </button>
                            <div className="w-px h-6 bg-gray-700"></div>
                            <button
                                onClick={handleLeaveRoom}
                                className="p-2 hover:bg-red-500/10 rounded-xl transition-all group"
                                title="Leave room"
                            >
                                <LogOut className="text-gray-500 group-hover:text-red-400 transition-colors" size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Step indicator */}
                    <div className="flex items-center justify-center gap-3 mb-8">
                        <div className={`w-10 h-1.5 rounded-full transition-colors ${step === 'tasklist' ? 'bg-indigo-500' : 'bg-gray-700'}`}></div>
                        <div className={`w-10 h-1.5 rounded-full transition-colors ${step === 'settings' ? 'bg-indigo-500' : 'bg-gray-700'}`}></div>
                    </div>

                    {/* Render current step */}
                    {step === 'tasklist' ? renderTaskListStep() : renderSettingsStep()}

                    <p className="text-center text-gray-600 text-sm mt-8">
                        Share code <span className="text-indigo-400 font-mono font-medium">{roomCode}</span> to invite players
                    </p>
                </div>
            </div>
        </div>
    );
}

export default GameConfigPage;

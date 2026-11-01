import React, { useState, useContext, useEffect, useRef } from 'react';
import { DataContext } from '../GameContext';
import { Users, Play, ChevronDown, ChevronUp, List, Download, Trash2, Check, LogOut, MapPin, Settings, ArrowRight, ArrowLeft, X, Zap, Copy, Sparkles, Minus, Plus } from '../signal/icons';
import { readGeneratedSetup, clearGameDraft } from './seo/gameDraft';
import { AUTO_INTRUDERS_SUMMARY, AUTO_TASKS_SUMMARY, TASKS_PER_CREWMATE, playersForIntruders } from '../utils/intruders';
import { sendClientMetric } from '../utils/clientMetrics';
import '../signal/host.css';

const DEFAULT_CARD_DECK_COUNTS = {
    self_report: 4,
    emp: 4,
    fake_task: 6,
    taunt_message: 6,
    remote_sabotage: 3,
    shorten_meltdown: 3,
    area_denial_per_location: 2,
};

const CARD_DECK_PRESETS = [
    {
        key: 'default',
        label: 'Default',
        description: 'The normal mixed sabotage deck.',
    },
    {
        key: 'fake_task_chaos',
        label: 'Fake Task Chaos',
        description: 'Only fake task cards. Maximum nonsense.',
    },
    {
        key: 'sabotage_heavy',
        label: 'Sabotage Heavy',
        description: 'More EMP, Area Denial, and reactor pressure.',
    },
    {
        key: 'no_reactor_cards',
        label: 'No Reactor Cards',
        description: 'A mixed deck without meltdown cards.',
    },
    {
        key: 'custom',
        label: 'Custom',
        description: 'Set exact card counts manually.',
    },
];

const CARD_COUNT_CONTROLS = [
    { key: 'self_report', label: 'Self Report', description: 'Call a body-found meeting.' },
    { key: 'emp', label: 'EMP', description: 'Temporarily disable player devices.' },
    { key: 'fake_task', label: 'Fake Task', description: 'Send fake tasks to crewmates.' },
    { key: 'taunt_message', label: 'Taunt Message', description: 'Send anonymous taunts to crewmates.' },
    { key: 'remote_sabotage', label: 'Remote Sabotage', description: 'Trigger reactor meltdown remotely.' },
    { key: 'shorten_meltdown', label: 'Shorten Meltdown', description: 'Reduce the next meltdown timer.' },
    { key: 'area_denial_per_location', label: 'Area Denial / Location', description: 'Cards created for each enabled location.' },
];

// Defined outside GameConfigPage: a component made inside it is a new type each render, so
// React would rebuild the slider on every change and a finger drag would stop after one step.
const SliderInput = ({ label, value, onChange, min, max, step = 1, unit = '', description }) => {
    const id = `setting-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`;
    return (
        <div className="hs-slider">
            <div className="hs-slider__top">
                <label htmlFor={id}>{label}</label>
                <b>
                    {typeof value === 'number' && value < 1 && value > 0
                        ? `${Math.round(value * 100)}%`
                        : `${value}${unit}`}
                </b>
            </div>
            <input
                id={id}
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="hs-range"
            />
            {description && <small>{description}</small>}
        </div>
    );
};

const CountStepper = ({ label, description, value, onDecrease, onIncrease }) => (
    <div className="hs-stepper">
        <div className="hs-stepper__text">
            <b>{label}</b>
            <span>{description}</span>
        </div>
        <button type="button" onClick={onDecrease} aria-label={`Decrease ${label}`} className="hs-round">
            <Minus size={18} />
        </button>
        <span className="hs-stepper__val">{value}</span>
        <button type="button" onClick={onIncrease} aria-label={`Increase ${label}`} className="hs-round">
            <Plus size={18} />
        </button>
    </div>
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
    const { socket, roomCode, connected } = useContext(DataContext);
    
    // Two-step wizard: 'tasklist' or 'settings'
    const [step, setStep] = useState('tasklist');
    useEffect(() => { sendClientMetric(socket, { kind: 'setup_step', step }); }, [socket, step]);
    const [showContent, setShowContent] = useState(false);
    const [copied, setCopied] = useState(false);

    const [config, setConfig] = useState({
        locations: ['Basement', '1st Floor', '2nd Floor', '3rd Floor'],
        vote_time: 180,
        vote_threshold: 0.66,
        meeting_quorum: true,
        meltdown_time: 60,
        code_percent: 0.6,
        num_intruders: 'auto',
        card_draw_probability: 1,
        starting_cards: 2,
        task_ratio: 'auto',
        card_deck_preset: 'default',
        card_deck_counts: DEFAULT_CARD_DECK_COUNTS,
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
    const [generatedDraft, setGeneratedDraft] = useState(readGeneratedSetup);
    const [generatedImportError, setGeneratedImportError] = useState('');
    const generatedImportRef = useRef(false);
    const generatedSettingsRef = useRef(null);
    const generatedSettingsReadyRef = useRef(false);
    
    // Use device ID instead of player ID for task list ownership
    const deviceId = useRef(getDeviceId()).current;
    const pendingSettingsStepRef = useRef(false);
    const pendingRoomOpenRef = useRef(false);

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
            const generatedSettings = generatedSettingsReadyRef.current ? generatedSettingsRef.current : null;
            if (generatedSettings) {
                generatedSettingsRef.current = null;
                generatedSettingsReadyRef.current = false;
            }
            setConfig((prev) => ({
                ...prev,
                ...data,
                card_deck_preset: data.card_deck_preset || prev.card_deck_preset || 'default',
                card_deck_counts: {
                    ...DEFAULT_CARD_DECK_COUNTS,
                    ...(prev.card_deck_counts || {}),
                    ...(data.card_deck_counts || {}),
                },
                ...(generatedSettings ? {
                    // Auto counts the people who actually join; the pack's number assumed a headcount.
                    num_intruders: 'auto',
                    vote_time: generatedSettings.meetingSeconds,
                    task_ratio: generatedSettings.taskGoalPerCrewmate,
                } : {}),
            }));

            if (pendingRoomOpenRef.current) {
                pendingRoomOpenRef.current = false;
                socket.emit('open_room', { room_code: roomCode });
            }
        };

        socket.on('game_config', handleConfig);

        return () => {
            socket.off('game_config', handleConfig);
        };
    }, [socket, roomCode]);

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
            if (generatedImportRef.current) {
                generatedImportRef.current = false;
                const settings = generatedDraft?.recommendations;
                if (settings) {
                    generatedSettingsRef.current = settings;
                }
                clearGameDraft();
                setGeneratedDraft(null);
                const url = new URL(window.location.href);
                url.searchParams.delete('setup');
                window.history.replaceState(null, '', url.pathname + url.search + url.hash);
            }
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
            generatedSettingsReadyRef.current = Boolean(generatedSettingsRef.current);

            if (pendingSettingsStepRef.current) {
                pendingSettingsStepRef.current = false;
                setStep('settings');
            }
        };

        const handleTaskListDeleted = (data) => {
            console.log('Task list deleted:', data);
            setCurrentTaskList(prev => prev && prev.code === data.code ? null : prev);
            socket.emit('get_my_task_lists', { player_id: deviceId });
        };

        const handleError = (data) => {
            console.error('Error:', data);
            setTaskListLoading(false);
            setIsSaving(false);
            pendingSettingsStepRef.current = false;
            pendingRoomOpenRef.current = false;
            if (generatedImportRef.current) {
                generatedImportRef.current = false;
                setGeneratedImportError(data.message || 'Task import failed. Try again.');
            }
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
    }, [socket, deviceId, generatedDraft]);

    const autoIntruders = config.num_intruders === 'auto';
    const autoTasks = config.task_ratio === 'auto';

    const updateConfig = (key, value) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const selectCardDeckPreset = (preset) => {
        setConfig(prev => ({
            ...prev,
            card_deck_preset: preset,
            card_deck_counts: prev.card_deck_counts || DEFAULT_CARD_DECK_COUNTS,
        }));
    };

    const updateCardDeckCount = (key, delta) => {
        setConfig(prev => {
            const counts = {
                ...DEFAULT_CARD_DECK_COUNTS,
                ...(prev.card_deck_counts || {}),
            };
            counts[key] = Math.max(0, Math.min(30, (counts[key] || 0) + delta));
            return {
                ...prev,
                card_deck_preset: 'custom',
                card_deck_counts: counts,
            };
        });
    };

    // Task list handlers
    const importGeneratedTasks = () => {
        if (!socket || !generatedDraft || taskListLoading) return;
        generatedImportRef.current = true;
        setGeneratedImportError('');
        setTaskListLoading(true);
        setTaskListApplied(false);
        socket.emit('create_task_list', {
            player_id: deviceId,
            name: generatedDraft.name,
            tasks: generatedDraft.tasks.map(({ task, location }) => ({ task, location })),
            locations: generatedDraft.locations,
        });
    };

    // A pack from the task generator loads by itself; the button below is only a retry.
    useEffect(() => {
        if (generatedDraft && socket && !generatedImportRef.current && !generatedImportError) importGeneratedTasks();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket, generatedDraft]);

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
        pendingRoomOpenRef.current = true;
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
            pendingSettingsStepRef.current = true;
            setTaskListLoading(true);
            applyTaskListToGame();
            return;
        }
        setStep('settings');
    };

    const realLocationsOf = (list) => (list?.locations || []).filter((l) => l !== 'Other');

    // Step 1: Task List Selection
    const renderTaskListStep = () => (
        <>
            <div style={{ display: 'grid', gap: 10 }}>
                <h1 className="sg-big sg-h1">Task list</h1>
                <p className="sg-lede hs-muted">Load a saved task list, or skip to create tasks with your group</p>
            </div>

            {generatedDraft && (
                <div className="hs-panel">
                    <h2 className="hs-title">Your generated task pack</h2>
                    <p className="sg-lede">{generatedDraft.tasks.length} tasks across {generatedDraft.locations.length} areas for {generatedDraft.playerCount} players.</p>
                    {generatedImportError ? <>
                        <p role="alert" className="hs-error">{generatedImportError}</p>
                        <button type="button" onClick={importGeneratedTasks} disabled={taskListLoading} className="sg-btn sg-btn-line">
                            Try loading the pack again
                        </button>
                    </> : <p className="sg-small" role="status">Loading your pack…</p>}
                </div>
            )}

            {showStarterTemplatePromo && !generatedDraft && !currentTaskList && (
                <div className="hs-panel">
                    <div className="hs-bar" style={{ minHeight: 0, alignItems: 'flex-start' }}>
                        <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
                            <h2 className="hs-title" style={{ fontSize: 28 }}>{starterTemplate.name}</h2>
                            <p className="sg-lede">{starterTemplate.task_count} tasks · {starterLocationCount} locations</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setStarterTemplateDismissed(true)}
                            className="hs-round"
                            title="Dismiss example list"
                            aria-label="Dismiss example list"
                        >
                            <X size={18} />
                        </button>
                    </div>
                    {starterTemplate.description && <p className="sg-small">{starterTemplate.description}</p>}
                    <button type="button" onClick={useStarterTaskList} disabled={taskListLoading} className="sg-btn sg-btn-line">
                        <Plus size={22} /> Add Example List
                    </button>
                    <p className="sg-small">A starting point you can fully edit. Add, remove, or rewrite tasks to fit your space.</p>
                </div>
            )}

            {/* Load by code */}
            <div className="hs-panel">
                <label className="hs-label" htmlFor="task-list-code">Load by code</label>
                <div className="hs-inline">
                    <input
                        id="task-list-code"
                        type="text"
                        value={loadTaskListCode}
                        onChange={(e) => setLoadTaskListCode(e.target.value.toUpperCase())}
                        onKeyPress={(e) => e.key === 'Enter' && loadTaskListByCode()}
                        placeholder="6-letter code"
                        maxLength={6}
                        autoCapitalize="characters"
                        spellCheck="false"
                        className="hs-input hs-input--code"
                    />
                    <button
                        type="button"
                        onClick={loadTaskListByCode}
                        disabled={taskListLoading || loadTaskListCode.length < 6}
                        className="sg-btn sg-btn-line"
                        style={{ width: 64, padding: 0 }}
                        title="Load task list"
                        aria-label="Load task list"
                    >
                        <Download size={24} />
                    </button>
                </div>

                {myTaskLists.length > 0 && (
                    <>
                        <p className="hs-label" style={{ marginTop: 6 }}>Your saved lists</p>
                        <div className="hs-lists">
                            {myTaskLists.map((list) => {
                                const selected = currentTaskList?.code === list.code;
                                return (
                                    <div
                                        key={list.code}
                                        role="button"
                                        tabIndex={0}
                                        aria-current={selected}
                                        className="hs-listrow"
                                        onClick={() => {
                                            setTaskListLoading(true);
                                            setTaskListApplied(false);
                                            socket.emit('load_task_list', { code: list.code });
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                e.currentTarget.click();
                                            }
                                        }}
                                    >
                                        {selected && <Check size={22} />}
                                        <div className="hs-listrow__body">
                                            <span className="hs-listrow__name">{list.name}</span>
                                            <span className="hs-listrow__meta">{list.task_count} tasks · {list.code}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteTaskList(list.code);
                                            }}
                                            className="hs-round"
                                            style={{ background: selected ? 'rgba(0,0,0,0.07)' : undefined, color: 'inherit' }}
                                            title="Delete"
                                            aria-label={`Delete ${list.name}`}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* The list that's loaded right now */}
            {currentTaskList && (
                <div className="hs-panel">
                    <div className="hs-bar" style={{ minHeight: 0, alignItems: 'flex-start' }}>
                        <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
                            <h2 className="hs-title" style={{ fontSize: 28 }}>{currentTaskList.name}</h2>
                            <p className="sg-lede">
                                {currentTaskList.tasks.length} tasks · {realLocationsOf(currentTaskList).length} locations
                                {taskListApplied && <> · <Check size={16} style={{ display: 'inline', verticalAlign: '-2px' }} /> Applied</>}
                            </p>
                        </div>
                        <button type="button" onClick={clearTaskListSelection} className="hs-round" title="Clear selection" aria-label="Clear selection">
                            <X size={18} />
                        </button>
                    </div>
                    {realLocationsOf(currentTaskList).length > 0 && (
                        <p className="sg-small" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 16, opacity: 0.9 }}>
                            <MapPin size={16} /> {realLocationsOf(currentTaskList).join(' · ')}
                        </p>
                    )}
                    <ul className="hs-preview">
                        {currentTaskList.tasks.slice(0, 5).map((task, index) => (
                            <li key={index}>{task.task}</li>
                        ))}
                    </ul>
                    {currentTaskList.tasks.length > 5 && (
                        <p className="sg-small" style={{ textAlign: 'center' }}>+ {currentTaskList.tasks.length - 5} more</p>
                    )}
                </div>
            )}

            <div style={{ display: 'grid', gap: 10 }}>
                <button type="button" onClick={proceedToSettings} disabled={taskListLoading || !connected} className="sg-btn sg-btn-white" style={{ minHeight: 68, fontSize: 19 }}>
                    {currentTaskList
                        ? (taskListLoading ? <span>Applying Task List...</span> : <><span>Use This Task List</span><ArrowRight size={24} /></>)
                        : <><span>Create Tasks with Group</span><ArrowRight size={24} /></>}
                </button>
                <p className="hs-hint hs-muted">
                    {currentTaskList
                        ? 'You can still add more tasks after opening the room'
                        : 'All players can add tasks together after joining'}
                </p>
            </div>
        </>
    );

    // Step 2: Game Settings (Intruders + Advanced)
    const renderSettingsStep = () => (
        <>
            <div style={{ display: 'grid', gap: 10 }}>
                <h1 className="sg-big sg-h1">Game settings</h1>
                {currentTaskList && taskListApplied && (
                    <p className="sg-lede" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Check size={20} /> Using: {currentTaskList.name}
                    </p>
                )}
            </div>

            <div className="hs-panel">
                <h2 className="hs-title">Number of Intruders</h2>
                <button
                    type="button"
                    onClick={() => updateConfig('num_intruders', 'auto')}
                    aria-pressed={autoIntruders}
                    className="hs-num hs-num--auto"
                >
                    Auto
                </button>
                <div className="hs-num-row" role="group" aria-label="Number of Intruders">
                    {[1, 2, 3, 4].map((num) => (
                        <button
                            key={num}
                            type="button"
                            onClick={() => updateConfig('num_intruders', num)}
                            aria-pressed={config.num_intruders === num}
                            className="hs-num"
                        >
                            {num}
                        </button>
                    ))}
                </div>
                {!autoIntruders && (
                    <CountStepper
                        label="Intruders"
                        description="Any number, for big groups"
                        value={config.num_intruders}
                        onDecrease={() => updateConfig('num_intruders', Math.max(1, config.num_intruders - 1))}
                        onIncrease={() => updateConfig('num_intruders', config.num_intruders + 1)}
                    />
                )}
                <p className="sg-lede hs-muted" data-testid="intruder-advice">
                    {autoIntruders
                        ? `The game picks 1 intruder per 5 players when you start: ${AUTO_INTRUDERS_SUMMARY}.`
                        : `Best for ${playersForIntruders(config.num_intruders)[0]} to ${playersForIntruders(config.num_intruders)[1]} players. Needs at least ${config.num_intruders * 2 + 1} players to start.`}
                </p>
            </div>

            {/* Advanced Settings (collapsed by default) */}
            <div className="hs-panel">
                <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="hs-disclose" aria-expanded={showAdvanced}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Settings size={22} /> Advanced Settings</span>
                    {showAdvanced ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
                </button>

                {showAdvanced && (
                    <div className="hs-section">
                        <h3><Sparkles size={18} /> Intruder Cards</h3>
                        <div style={{ display: 'grid', gap: 8 }}>
                            <div className="hs-slider__top">
                                <span style={{ fontWeight: 800, fontSize: 16 }}>Card Deck</span>
                                <b style={{ fontSize: 16, textTransform: 'capitalize' }}>
                                    {(config.card_deck_preset || 'default').replace(/_/g, ' ')}
                                </b>
                            </div>
                            <div className="hs-presets">
                                {CARD_DECK_PRESETS.map((preset) => {
                                    const active = (config.card_deck_preset || 'default') === preset.key;
                                    return (
                                        <button
                                            key={preset.key}
                                            type="button"
                                            onClick={() => selectCardDeckPreset(preset.key)}
                                            aria-pressed={active}
                                            className="hs-preset"
                                        >
                                            <b>{preset.label}</b>
                                            <span>{preset.description}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="sg-small">Default preserves the normal deck. Custom lets you set exact counts.</p>
                        </div>

                        {(config.card_deck_preset || 'default') === 'custom' && (
                            <div className="hs-panel hs-panel--tight" style={{ gap: 0 }}>
                                <div className="hs-slider__top">
                                    <span style={{ fontWeight: 900, fontSize: 17 }}>Custom Card Counts</span>
                                    <span className="sg-small">0-30 each</span>
                                </div>
                                <p className="sg-small" style={{ margin: '4px 0 6px' }}>
                                    Reactor cards are ignored when no reactor is connected. Area Denial count is per location.
                                </p>
                                {CARD_COUNT_CONTROLS.map((cardControl) => {
                                    const counts = {
                                        ...DEFAULT_CARD_DECK_COUNTS,
                                        ...(config.card_deck_counts || {}),
                                    };
                                    return (
                                        <CountStepper
                                            key={cardControl.key}
                                            label={cardControl.label}
                                            description={cardControl.description}
                                            value={counts[cardControl.key] || 0}
                                            onDecrease={() => updateCardDeckCount(cardControl.key, -1)}
                                            onIncrease={() => updateCardDeckCount(cardControl.key, 1)}
                                        />
                                    );
                                })}
                            </div>
                        )}

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

                        <h3><Users size={18} /> Meetings & Voting</h3>
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
                        <div style={{ display: 'grid', gap: 8 }}>
                            <div className="hs-slider__top">
                                <span style={{ fontWeight: 800, fontSize: 16 }}>Start Voting When</span>
                            </div>
                            <div className="hs-presets" role="group" aria-label="Start Voting When">
                                {[
                                    { value: true, label: '80% ready in big games', description: 'Up to 10 players, everyone slides ready. Over 10, voting opens at 80%.' },
                                    { value: false, label: 'Everyone ready', description: 'Every meeting waits for every player, however big the game.' },
                                ].map((option) => (
                                    <button
                                        key={String(option.value)}
                                        type="button"
                                        onClick={() => updateConfig('meeting_quorum', option.value)}
                                        aria-pressed={(config.meeting_quorum !== false) === option.value}
                                        className="hs-preset"
                                    >
                                        <b>{option.label}</b>
                                        <span>{option.description}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <h3><Zap size={18} /> Meltdown Sabotage</h3>
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

                        <h3><List size={18} /> Tasks</h3>
                        <button
                            type="button"
                            onClick={() => updateConfig('task_ratio', autoTasks ? TASKS_PER_CREWMATE : 'auto')}
                            aria-pressed={autoTasks}
                            aria-label="Auto task goal"
                            className="hs-num hs-num--auto"
                        >
                            Auto
                        </button>
                        {autoTasks ? (
                            <p className="sg-lede hs-muted" data-testid="task-goal-advice">{AUTO_TASKS_SUMMARY}</p>
                        ) : (
                            <SliderInput
                                label="Tasks Per Player"
                                value={config.task_ratio}
                                onChange={(v) => updateConfig('task_ratio', v)}
                                min={2}
                                max={25}
                                description="Tasks each crewmate finishes, on average, to reveal the intruders"
                            />
                        )}
                    </div>
                )}
            </div>

            <div style={{ display: 'grid', gap: 4 }}>
                <button type="button" onClick={handleOpenRoom} disabled={isSaving || !connected} className="sg-btn sg-btn-white" style={{ minHeight: 68, fontSize: 21 }}>
                    {isSaving ? <span>Opening Room...</span> : <><Play size={24} /><span>Open Room</span></>}
                </button>
                <button type="button" onClick={() => setStep('tasklist')} className="sg-link" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <ArrowLeft size={18} />
                    <span>Back to Task List</span>
                </button>
            </div>
        </>
    );

    return (
        <div className="sg-screen sg-round hs">
            <div className={`hs-wrap ${showContent ? 'sg-a sg-rise' : ''}`} key={step}>
                <div className="hs-bar">
                    <div className="hs-bar__left">
                        <span className="hs-roompill">Room <b>{roomCode}</b></span>
                        <button type="button" onClick={copyRoomCode} className="hs-round" title="Copy room code" aria-label="Copy room code">
                            {copied ? <Check size={18} /> : <Copy size={18} />}
                        </button>
                    </div>
                    <button type="button" onClick={handleLeaveRoom} className="hs-round" title="Leave room" aria-label="Leave room">
                        <LogOut size={20} />
                    </button>
                </div>

                <p className="hs-steps">Step {step === 'tasklist' ? 1 : 2} of 2</p>
                {!connected && (
                    <p className="hs-hint" role="status">Reconnecting… your room is safe.</p>
                )}

                {step === 'tasklist' ? renderTaskListStep() : renderSettingsStep()}

                <p className="hs-hint hs-muted" style={{ marginTop: 8 }}>
                    Share code {roomCode} to invite players
                </p>
            </div>
        </div>
    );
}

export default GameConfigPage;

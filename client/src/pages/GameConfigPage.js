import React, { useState, useContext, useEffect, useRef } from 'react';
import { DataContext } from '../GameContext';
import { Users, Play, ChevronDown, ChevronUp, List, Download, Trash2, Check, Star, StarFilled, LogOut, MapPin, Settings, ArrowRight, ArrowLeft, X, Zap, Copy, Sparkles, Minus, Plus } from '../signal/icons';
import { readGeneratedSetup, clearGameDraft } from './seo/gameDraft';
import { readPendingSavedGame, clearPendingSavedGame } from '../utils/savedGame';
import { AUTO_INTRUDERS_SUMMARY, AUTO_TASKS_SUMMARY, TASKS_PER_CREWMATE, playersForIntruders } from '../utils/intruders';
import { sendClientMetric } from '../utils/clientMetrics';
import '../signal/host.css';
import { getLanguage, t, tk } from '../i18n';
import AccountButton from '../account/AccountButton';
import SaveListsPrompt from '../account/SaveListsPrompt';
import { useAccount } from '../account/accountStore';

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
        label: tk('Default'),
        description: tk('The normal mixed sabotage deck.'),
    },
    {
        key: 'fake_task_chaos',
        label: tk('Fake Task Chaos'),
        description: tk('Only fake task cards. Maximum nonsense.'),
    },
    {
        key: 'sabotage_heavy',
        label: tk('Sabotage Heavy'),
        description: tk('More EMP, Area Denial, and reactor pressure.'),
    },
    {
        key: 'no_reactor_cards',
        label: tk('No Reactor Cards'),
        description: tk('A mixed deck without meltdown cards.'),
    },
    {
        key: 'custom',
        label: tk('Custom'),
        description: tk('Set exact card counts manually.'),
    },
];

const CARD_COUNT_CONTROLS = [
    { key: 'self_report', label: tk('Self Report'), description: tk('Call a body-found meeting.') },
    { key: 'emp', label: tk('EMP'), description: tk('Temporarily disable player devices.') },
    { key: 'fake_task', label: tk('Fake Task'), description: tk('Send fake tasks to crewmates.') },
    { key: 'taunt_message', label: tk('Taunt Message'), description: tk('Send anonymous taunts to crewmates.') },
    { key: 'remote_sabotage', label: tk('Remote Sabotage'), description: tk('Trigger reactor meltdown remotely.') },
    { key: 'shorten_meltdown', label: tk('Shorten Meltdown'), description: tk('Reduce the next meltdown timer.') },
    { key: 'area_denial_per_location', label: tk('Area Denial / Location'), description: tk('Cards created for each enabled location.') },
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
        <button type="button" onClick={onDecrease} aria-label={t('Decrease {label}', { label })} className="hs-round">
            <Minus size={18} />
        </button>
        <span className="hs-stepper__val">{value}</span>
        <button type="button" onClick={onIncrease} aria-label={t('Increase {label}', { label })} className="hs-round">
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

// Asks before a saved list goes (lots of players are kids, and taps are easy).
function DeleteListConfirm({ name, onYes, onNo }) {
    const ref = useRef(null);
    // The saved lists scroll in a short box; bring the question into view once.
    useEffect(() => {
        if (ref.current && ref.current.scrollIntoView) ref.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, []);
    return (
        <div ref={ref} className="hs-confirm" role="group" aria-label={t('Delete {name}', { name })}>
            <p>{t('Delete this list? It leaves your lists, but anyone with the code can still play it.')}</p>
            <div className="hs-confirm__row">
                <button type="button" className="sg-btn hs-confirm__yes" onClick={onYes}>{t('Yes, delete')}</button>
                <button type="button" className="sg-btn sg-btn-line" onClick={onNo}>{t('Keep it')}</button>
            </div>
        </div>
    );
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
        late_join_live: true,
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
    // How the host picked the list, for the round stats: example, saved, code, generator.
    const pickedViaRef = useRef(null);
    const [currentTaskList, setCurrentTaskList] = useState(null);
    // The Example List copy doesn't count: it's ours, not the host's.
    const isExampleList = (list) => Boolean(list.source_template) && list.source_template !== 'saved_game';
    const hasOwnLists = myTaskLists.some((list) => !isExampleList(list));
    const hasOwnListsRef = useRef(hasOwnLists);
    hasOwnListsRef.current = hasOwnLists;
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
    // When to suggest signing in: right after a list is made, loaded by code, or picked from
    // this browser's saved lists (see SaveListsPrompt).
    const [signInMoment, setSignInMoment] = useState(null);
    const { listsVersion } = useAccount();

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
            socket.emit('get_my_task_lists', { player_id: deviceId, lang: getLanguage() });
        }
    }, [socket, roomCode, deviceId]);

    // Signing in or out changes whose lists these are.
    useEffect(() => {
        if (socket && deviceId && listsVersion > 0) {
            socket.emit('get_my_task_lists', { player_id: deviceId, lang: getLanguage() });
        }
    }, [socket, deviceId, listsVersion]);

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
                // A host with no lists of their own starts with everyone adding tasks (they can turn it off).
                socket.emit('open_room', { room_code: roomCode, group_tasks: !hasOwnListsRef.current });
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
            setSignInMoment('created');
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
            socket.emit('get_my_task_lists', { player_id: deviceId, lang: getLanguage() });
        };

        const handleTaskListUpdated = (data) => {
            console.log('Task list updated:', data);
            setCurrentTaskList(data.task_list);
            setTaskListLoading(false);
            socket.emit('get_my_task_lists', { player_id: deviceId, lang: getLanguage() });
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
            socket.emit('get_my_task_lists', { player_id: deviceId, lang: getLanguage() });
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
        pickedViaRef.current = 'generator';
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

    // A "Save this game" link opened earlier on this phone: its tasks load like a typed list code.
    useEffect(() => {
        const code = readPendingSavedGame();
        if (!socket || !code || generatedDraft) return;
        clearPendingSavedGame();
        setTaskListLoading(true);
        setTaskListApplied(false);
        socket.emit('load_task_list', { code });
        setSignInMoment('code');
        socket.emit('save_task_list_to_user', { player_id: deviceId, code });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket]);

    const loadTaskListByCode = () => {
        if (!loadTaskListCode.trim()) return;
        setTaskListLoading(true);
        setTaskListApplied(false);
        const code = loadTaskListCode.trim().toUpperCase();
        pickedViaRef.current = 'code';
        socket.emit('load_task_list', { code });
        setSignInMoment('code');
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

        pickedViaRef.current = 'example';
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
            lang: getLanguage(),
        });
    };

    const applyTaskListToGame = () => {
        if (!currentTaskList) return;
        setTaskListLoading(true);
        socket.emit('apply_task_list_to_game', {
            room_code: roomCode,
            task_list_code: currentTaskList.code,
            picked_via: pickedViaRef.current || 'saved',
        });
    };

    const clearTaskListSelection = () => {
        setCurrentTaskList(null);
        setTaskListApplied(false);
        pickedViaRef.current = null;
    };

    // Deleting asks first, on the row itself (lots of players are kids, and taps are easy).
    const [confirmDeleteCode, setConfirmDeleteCode] = useState(null);
    const deleteTaskList = (code) => {
        setConfirmDeleteCode(null);
        socket.emit('delete_task_list', { player_id: deviceId, code });
    };

    const starTaskList = (list) => {
        const starred = !list.starred;
        // Show it at once; the server's reply brings the new order.
        setMyTaskLists((prev) => prev.map((item) => (item.code === list.code ? { ...item, starred } : item)));
        socket.emit('star_task_list', { player_id: deviceId, code: list.code, starred, lang: getLanguage() });
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
                <h1 className="sg-big sg-h1">{t('Task list')}</h1>
                <p className="sg-lede hs-muted">{t('Pick a list, or make one together once everyone joins')}</p>
            </div>

            {generatedDraft && (
                <div className="hs-panel">
                    <h2 className="hs-title">{t('Your generated task pack')}</h2>
                    <p className="sg-lede">{t('{tasks} tasks across {areas} areas for {players} players.', { tasks: generatedDraft.tasks.length, areas: generatedDraft.locations.length, players: generatedDraft.playerCount })}</p>
                    {generatedImportError ? <>
                        <p role="alert" className="hs-error">{generatedImportError}</p>
                        <button type="button" onClick={importGeneratedTasks} disabled={taskListLoading} className="sg-btn sg-btn-line">
                            {t('Try loading the pack again')}
                        </button>
                    </> : <p className="sg-small" role="status">{t('Loading your pack…')}</p>}
                </div>
            )}

            {showStarterTemplatePromo && !generatedDraft && !currentTaskList && (
                <div className="hs-panel">
                    <div className="hs-bar" style={{ minHeight: 0, alignItems: 'flex-start' }}>
                        <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
                            <h2 className="hs-title" style={{ fontSize: 28 }}>{starterTemplate.name}</h2>
                            <p className="sg-lede">{t('{tasks} tasks · {locations} locations', { tasks: starterTemplate.task_count, locations: starterLocationCount })}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setStarterTemplateDismissed(true)}
                            className="hs-round"
                            title={t('Dismiss example list')}
                            aria-label={t('Dismiss example list')}
                        >
                            <X size={18} />
                        </button>
                    </div>
                    {starterTemplate.description && <p className="sg-small">{starterTemplate.description}</p>}
                    <button type="button" onClick={useStarterTaskList} disabled={taskListLoading} className="sg-btn sg-btn-line">
                        <Plus size={22} /> {t('Add Example List')}
                    </button>
                    <p className="sg-small">{t('A starting point you can fully edit. Add, remove, or rewrite tasks to fit your space.')}</p>
                </div>
            )}

            {/* Load by code */}
            <div className="hs-panel">
                <label className="hs-label" htmlFor="task-list-code">{t('Load by code')}</label>
                <div className="hs-inline">
                    <input
                        id="task-list-code"
                        type="text"
                        value={loadTaskListCode}
                        onChange={(e) => setLoadTaskListCode(e.target.value.toUpperCase())}
                        onKeyPress={(e) => e.key === 'Enter' && loadTaskListByCode()}
                        placeholder={t('6-letter code')}
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
                        title={t('Load task list')}
                        aria-label={t('Load task list')}
                    >
                        <Download size={24} />
                    </button>
                </div>

                {myTaskLists.length > 0 && (
                    <>
                        <p className="hs-label" style={{ marginTop: 6 }}>{t('Your saved lists')}</p>
                        <div className="hs-lists">
                            {myTaskLists.map((list) => {
                                const selected = currentTaskList?.code === list.code;
                                const confirming = confirmDeleteCode === list.code;
                                return (
                                    <React.Fragment key={list.code}>
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        aria-current={selected}
                                        className="hs-listrow"
                                        onClick={() => {
                                            setTaskListLoading(true);
                                            setTaskListApplied(false);
                                            pickedViaRef.current = isExampleList(list) ? 'example' : 'saved';
                                            socket.emit('load_task_list', { code: list.code });
                                            setSignInMoment('saved');
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
                                            <span className="hs-listrow__meta">{t('{tasks} tasks · {code}', { tasks: list.task_count, code: list.code })}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                starTaskList(list);
                                            }}
                                            className={`hs-round hs-star${list.starred ? ' hs-star--on' : ''}`}
                                            style={{ background: selected ? 'rgba(0,0,0,0.07)' : undefined }}
                                            title={list.starred ? t('Starred') : t('Star')}
                                            aria-pressed={Boolean(list.starred)}
                                            aria-label={list.starred ? t('Unstar {name}', { name: list.name }) : t('Star {name}', { name: list.name })}
                                        >
                                            {list.starred ? <StarFilled size={20} /> : <Star size={20} />}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setConfirmDeleteCode(confirming ? null : list.code);
                                            }}
                                            className="hs-round"
                                            style={{ background: selected ? 'rgba(0,0,0,0.07)' : undefined, color: 'inherit' }}
                                            title={t('Delete')}
                                            aria-expanded={confirming}
                                            aria-label={t('Delete {name}', { name: list.name })}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                    {confirming && (
                                        <DeleteListConfirm
                                            name={list.name}
                                            onYes={() => deleteTaskList(list.code)}
                                            onNo={() => setConfirmDeleteCode(null)}
                                        />
                                    )}
                                    </React.Fragment>
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
                                {t('{tasks} tasks · {locations} locations', { tasks: currentTaskList.tasks.length, locations: realLocationsOf(currentTaskList).length })}
                                {taskListApplied && <> · <Check size={16} style={{ display: 'inline', verticalAlign: '-2px' }} /> {t('Applied')}</>}
                            </p>
                        </div>
                        <button type="button" onClick={clearTaskListSelection} className="hs-round" title={t('Clear selection')} aria-label={t('Clear selection')}>
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
                        <p className="sg-small" style={{ textAlign: 'center' }}>{t('+ {count} more', { count: currentTaskList.tasks.length - 5 })}</p>
                    )}
                </div>
            )}

            {currentTaskList && <SaveListsPrompt moment={signInMoment} key={signInMoment} />}

            <div style={{ display: 'grid', gap: 10 }}>
                <button type="button" onClick={proceedToSettings} disabled={taskListLoading || !connected} className="sg-btn sg-btn-white" style={{ minHeight: 68, fontSize: 19 }}>
                    {currentTaskList
                        ? (taskListLoading ? <span>{t('Applying Task List...')}</span> : <><span>{t('Use This Task List')}</span><ArrowRight size={24} /></>)
                        : <><span>{t('Create Tasks with Group')}</span><ArrowRight size={24} /></>}
                </button>
                <p className="hs-hint hs-muted">
                    {!currentTaskList
                        ? t('Everyone adds tasks from their own phone in the lobby. You can turn this off.')
                        : hasOwnLists
                            ? t('You can still add more tasks after opening the room')
                            : t('Everyone can add more tasks from their phone in the lobby. You can turn this off.')}
                </p>
            </div>
        </>
    );

    // Step 2: Game Settings (Intruders + Advanced)
    const renderSettingsStep = () => (
        <>
            <div style={{ display: 'grid', gap: 10 }}>
                <h1 className="sg-big sg-h1">{t('Game settings')}</h1>
                {currentTaskList && taskListApplied && (
                    <p className="sg-lede" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Check size={20} /> {t('Using: {name}', { name: currentTaskList.name })}
                    </p>
                )}
            </div>

            <div className="hs-panel">
                <h2 className="hs-title">{t('Number of Intruders')}</h2>
                <button
                    type="button"
                    onClick={() => updateConfig('num_intruders', 'auto')}
                    aria-pressed={autoIntruders}
                    className="hs-num hs-num--auto"
                >
                    {t('Auto')}
                </button>
                <div className="hs-num-row" role="group" aria-label={t('Number of Intruders')}>
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
                        label={t('Intruders')}
                        description={t('Any number, for big groups')}
                        value={config.num_intruders}
                        onDecrease={() => updateConfig('num_intruders', Math.max(1, config.num_intruders - 1))}
                        onIncrease={() => updateConfig('num_intruders', config.num_intruders + 1)}
                    />
                )}
                <p className="sg-lede hs-muted" data-testid="intruder-advice">
                    {autoIntruders
                        ? t('The game picks 1 intruder per 5 players when you start: {summary}.', { summary: t(AUTO_INTRUDERS_SUMMARY) })
                        : t('Best for {min} to {max} players. Needs at least {needed} players to start.', { min: playersForIntruders(config.num_intruders)[0], max: playersForIntruders(config.num_intruders)[1], needed: config.num_intruders * 2 + 1 })}
                </p>
            </div>

            {/* Advanced Settings (collapsed by default) */}
            <div className="hs-panel">
                <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="hs-disclose" aria-expanded={showAdvanced}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Settings size={22} /> {t('Advanced Settings')}</span>
                    {showAdvanced ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
                </button>

                {showAdvanced && (
                    <div className="hs-section">
                        <h3><Sparkles size={18} /> {t('Intruder Cards')}</h3>
                        <div style={{ display: 'grid', gap: 8 }}>
                            <div className="hs-slider__top">
                                <span style={{ fontWeight: 800, fontSize: 16 }}>{t('Card Deck')}</span>
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
                                            <b>{t(preset.label)}</b>
                                            <span>{t(preset.description)}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="sg-small">{t('Default preserves the normal deck. Custom lets you set exact counts.')}</p>
                        </div>

                        {(config.card_deck_preset || 'default') === 'custom' && (
                            <div className="hs-panel hs-panel--tight" style={{ gap: 0 }}>
                                <div className="hs-slider__top">
                                    <span style={{ fontWeight: 900, fontSize: 17 }}>{t('Custom Card Counts')}</span>
                                    <span className="sg-small">{t('0-30 each')}</span>
                                </div>
                                <p className="sg-small" style={{ margin: '4px 0 6px' }}>
                                    {t('Reactor cards are ignored when no reactor is connected. Area Denial count is per location.')}
                                </p>
                                {CARD_COUNT_CONTROLS.map((cardControl) => {
                                    const counts = {
                                        ...DEFAULT_CARD_DECK_COUNTS,
                                        ...(config.card_deck_counts || {}),
                                    };
                                    return (
                                        <CountStepper
                                            key={cardControl.key}
                                            label={t(cardControl.label)}
                                            description={t(cardControl.description)}
                                            value={counts[cardControl.key] || 0}
                                            onDecrease={() => updateCardDeckCount(cardControl.key, -1)}
                                            onIncrease={() => updateCardDeckCount(cardControl.key, 1)}
                                        />
                                    );
                                })}
                            </div>
                        )}

                        <SliderInput
                            label={t('Starting Cards')}
                            value={config.starting_cards}
                            onChange={(v) => updateConfig('starting_cards', v)}
                            min={0}
                            max={5}
                            description={t('Cards each intruder starts with')}
                        />
                        <SliderInput
                            label={t('Card Draw Chance')}
                            value={config.card_draw_probability}
                            onChange={(v) => updateConfig('card_draw_probability', v)}
                            min={0}
                            max={1}
                            step={0.05}
                            description={t('Chance to draw a card after task completion')}
                        />

                        <h3><Users size={18} /> {t('Meetings & Voting')}</h3>
                        <SliderInput
                            label={t('Voting Time')}
                            value={config.vote_time}
                            onChange={(v) => updateConfig('vote_time', v)}
                            min={60}
                            max={300}
                            step={15}
                            unit="s"
                            description={t('Time allowed for voting')}
                        />
                        <SliderInput
                            label={t('Vote Threshold')}
                            value={config.vote_threshold}
                            onChange={(v) => updateConfig('vote_threshold', v)}
                            min={0.5}
                            max={1}
                            step={0.05}
                            description={t('Votes needed to eject')}
                        />
                        <div style={{ display: 'grid', gap: 8 }}>
                            <div className="hs-slider__top">
                                <span style={{ fontWeight: 800, fontSize: 16 }}>{t('Start Voting When')}</span>
                            </div>
                            <div className="hs-presets" role="group" aria-label={t('Start Voting When')}>
                                {[
                                    { value: true, label: t('80% ready in big games'), description: t('Up to 10 players, everyone slides ready. Over 10, voting opens at 80%.') },
                                    { value: false, label: t('Everyone ready'), description: t('Every meeting waits for every player, however big the game.') },
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

                        <div style={{ display: 'grid', gap: 8 }}>
                            <div className="hs-slider__top">
                                <span style={{ fontWeight: 800, fontSize: 16 }}>{t('Late Arrivals')}</span>
                            </div>
                            <div className="hs-presets" role="group" aria-label={t('Late Arrivals')}>
                                {[
                                    { value: true, label: t('Join the round'), description: t('Dealt straight in, secretly crew or intruder. If the round is close, they wait for the next one.') },
                                    { value: false, label: t('Wait for next round'), description: t('They join the lobby and play from the next round.') },
                                ].map((option) => (
                                    <button
                                        key={String(option.value)}
                                        type="button"
                                        onClick={() => updateConfig('late_join_live', option.value)}
                                        aria-pressed={(config.late_join_live !== false) === option.value}
                                        className="hs-preset"
                                    >
                                        <b>{option.label}</b>
                                        <span>{option.description}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <h3><Zap size={18} /> {t('Meltdown Sabotage')}</h3>
                        <SliderInput
                            label={t('Meltdown Time')}
                            value={config.meltdown_time}
                            onChange={(v) => updateConfig('meltdown_time', v)}
                            min={30}
                            max={120}
                            step={5}
                            unit="s"
                            description={t('Time to stop meltdown')}
                        />
                        <SliderInput
                            label={t('Codes Required')}
                            value={config.code_percent}
                            onChange={(v) => updateConfig('code_percent', v)}
                            min={0.3}
                            max={1}
                            step={0.05}
                            description={t('% of players needed')}
                        />

                        <h3><List size={18} /> {t('Tasks')}</h3>
                        <button
                            type="button"
                            onClick={() => updateConfig('task_ratio', autoTasks ? TASKS_PER_CREWMATE : 'auto')}
                            aria-pressed={autoTasks}
                            aria-label={t('Auto task goal')}
                            className="hs-num hs-num--auto"
                        >
                            {t('Auto')}
                        </button>
                        {autoTasks ? (
                            <p className="sg-lede hs-muted" data-testid="task-goal-advice">{t(AUTO_TASKS_SUMMARY)}</p>
                        ) : (
                            <SliderInput
                                label={t('Tasks Per Player')}
                                value={config.task_ratio}
                                onChange={(v) => updateConfig('task_ratio', v)}
                                min={2}
                                max={25}
                                description={t('Tasks each crewmate finishes, on average, to reveal the intruders')}
                            />
                        )}
                    </div>
                )}
            </div>

            <div style={{ display: 'grid', gap: 4 }}>
                <button type="button" onClick={handleOpenRoom} disabled={isSaving || !connected} className="sg-btn sg-btn-white" style={{ minHeight: 68, fontSize: 21 }}>
                    {isSaving ? <span>{t('Opening Room...')}</span> : <><Play size={24} /><span>{t('Open Room')}</span></>}
                </button>
                <button type="button" onClick={() => setStep('tasklist')} className="sg-link" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <ArrowLeft size={18} />
                    <span>{t('Back to Task List')}</span>
                </button>
            </div>
        </>
    );

    return (
        <div className="sg-screen sg-round hs">
            <div className={`hs-wrap ${showContent ? 'sg-a sg-rise' : ''}`} key={step}>
                <div className="hs-bar">
                    <div className="hs-bar__left">
                        <span className="hs-roompill">{t('Room {roomCode}', { roomCode })}</span>
                        <button type="button" onClick={copyRoomCode} className="hs-round" title={t('Copy room code')} aria-label={t('Copy room code')}>
                            {copied ? <Check size={18} /> : <Copy size={18} />}
                        </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AccountButton />
                        <button type="button" onClick={handleLeaveRoom} className="hs-round" title={t('Leave room')} aria-label={t('Leave room')}>
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>

                <p className="hs-steps">{t('Step {step} of 2', { step: step === 'tasklist' ? 1 : 2 })}</p>
                {!connected && (
                    <p className="hs-hint" role="status">{t('Reconnecting… your room is safe.')}</p>
                )}

                {step === 'tasklist' ? renderTaskListStep() : renderSettingsStep()}

                <p className="hs-hint hs-muted" style={{ marginTop: 8 }}>
                    {t('Share code {roomCode} to invite players', { roomCode })}
                </p>
            </div>
        </div>
    );
}

export default GameConfigPage;

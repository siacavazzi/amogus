import React, { useMemo, useState } from 'react';
import { usePageMeta } from '../../seo/usePageMeta';
import SeoPageLayout from './SeoPageLayout';
import GameplayScreenshots from './GameplayScreenshots';
import { VENUE_ROOMS, generateTasks } from './taskPools';
import { saveGameDraft } from './gameDraft';
import { CLEANUP_ROOMS } from './cleanupTasks';

const VENUES = {
    apartment: 'Apartment', house: 'House', dorm: 'Dorm', office: 'Office',
    airbnb: 'Vacation house / Airbnb', school: 'Classroom / community space', other: 'Other space',
};

function initialOptions() {
    const params = new URLSearchParams(window.location.search);
    const preset = params.get('preset') === 'cleanup' ? 'cleanup' : 'standard';
    const venue = preset === 'cleanup' ? 'house' : Object.hasOwn(VENUES, params.get('venue')) ? params.get('venue') : 'apartment';
    const movement = preset === 'cleanup' ? 'normal' : ['low', 'normal', 'active'].includes(params.get('movement')) ? params.get('movement') : 'normal';
    const playerCount = Math.max(3, Math.min(15, Math.floor(Number(params.get('players')) || (preset === 'cleanup' ? 4 : 8))));
    const requestedRooms = params.getAll('room').map(room => room.trim()).filter(room => room && room.length <= 60).slice(0, 12);
    return {
        venue, movement, playerCount, preset,
        taskStyle: preset === 'cleanup' ? 'standard' : ['standard', 'funny', 'mix'].includes(params.get('style')) ? params.get('style') : 'standard',
        selectedRooms: requestedRooms.length >= 2 ? [...new Set(requestedRooms)] : preset === 'cleanup' ? CLEANUP_ROOMS : defaultRooms(venue, movement),
    };
}

function defaultRooms(venue, movement) {
    return movement === 'low' ? ['Station A', 'Station B'] : VENUE_ROOMS[venue].filter(room =>
        !/Bedroom|Bathroom|Outdoor|Outdoors|Garage/.test(room));
}

function TaskGeneratorPage() {
    usePageMeta({
        title: 'Among Us IRL Task Generator | Sus Party',
        description: 'Generate tasks for an Among Us in real life game. Choose rooms, players, and task styles, then take the pack into a new Sus Party room. Free, no account.',
        canonical: 'https://susparty.com/among-us-irl-task-generator',
    });
    const [options, setOptions] = useState(initialOptions);
    const [shuffle, setShuffle] = useState(0);
    const [newRoom, setNewRoom] = useState('');
    const [status, setStatus] = useState('');
    const result = useMemo(() => generateTasks({ ...options, random: shuffle === 0 ? () => 0.42 : Math.random }), [options, shuffle]);
    const isCleanup = options.preset === 'cleanup';
    const availableRooms = [...new Set([
        ...(options.movement === 'low' ? ['Station A', 'Station B'] : VENUE_ROOMS[options.venue]),
        ...options.selectedRooms,
    ])];
    const minimumTasks = options.playerCount * 3;
    const ready = result.rooms.length >= 2 && result.tasks.length >= minimumTasks;
    const taskText = result.tasks.map((task, index) => `${index + 1}. [${task.location}] ${task.task}`).join('\n');

    const update = (key, value) => {
        setStatus('');
        setOptions(previous => ({ ...previous, [key]: value,
            ...(key === 'preset' ? { venue: value === 'cleanup' ? 'house' : 'apartment',
                movement: 'normal', taskStyle: 'standard', playerCount: value === 'cleanup' ? 4 : 8,
                selectedRooms: value === 'cleanup' ? CLEANUP_ROOMS : defaultRooms('apartment', 'normal') } : {}),
            ...(['venue', 'movement'].includes(key) ? {
                selectedRooms: defaultRooms(key === 'venue' ? value : previous.venue, key === 'movement' ? value : previous.movement),
            } : {}),
        }));
    };
    const toggleRoom = room => setOptions(previous => ({ ...previous, selectedRooms: previous.selectedRooms.includes(room)
        ? previous.selectedRooms.filter(value => value !== room) : [...previous.selectedRooms, room] }));
    const addRoom = event => {
        event.preventDefault();
        const room = newRoom.trim();
        if (!room || options.selectedRooms.includes(room) || options.selectedRooms.length >= 12) return;
        setOptions(previous => ({ ...previous, selectedRooms: [...previous.selectedRooms, room] }));
        setNewRoom('');
    };
    const copy = async text => {
        try {
            await navigator.clipboard.writeText(text);
            setStatus('Copied.');
        } catch (_) { setStatus('Copy is unavailable. Select the task text below and copy it manually.'); }
    };
    const shareSetup = () => {
        const url = new URL('/among-us-irl-task-generator', window.location.origin);
        if (isCleanup) url.searchParams.set('preset', 'cleanup');
        url.searchParams.set('venue', options.venue);
        url.searchParams.set('players', options.playerCount);
        url.searchParams.set('movement', options.movement);
        url.searchParams.set('style', options.taskStyle);
        url.searchParams.set('utm_source', 'shared-link');
        options.selectedRooms.forEach(room => url.searchParams.append('room', room));
        copy(url.href);
    };
    const useTasks = event => {
        const saved = saveGameDraft({
            name: isCleanup ? 'Family cleanup task pack' : `${VENUES[options.venue]} task pack`, tasks: result.tasks,
            locations: result.rooms, playerCount: options.playerCount, recommendations: result.recommendations,
        });
        if (!saved) {
            event.preventDefault();
            setStatus('Your browser cannot save this list. Copy the tasks or enable storage, then try again.');
            return;
        }
        // This action explicitly starts a new host session, rather than rejoining an old room.
        localStorage.removeItem('player_id');
        localStorage.removeItem('room_code');
        sessionStorage.removeItem('is_room_creator');
    };

    return (
        <SeoPageLayout>
            <header className="seo-hero">
                <p className="seo-eyebrow"><a href="/among-us-irl">Among Us IRL</a> / Task generator</p>
                <h1 className="seo-h1">{isCleanup ? 'Family cleanup task template' : 'Among Us IRL task generator'}</h1>
                <p className="seo-lead">{isCleanup ? 'Real chores, secret roles, and a reason to suspect the person beside the laundry basket. This template uses common areas in a home. Review the jobs, then take the pack into Sus Party.' : 'Your rooms, your friends, one playable task pack. Choose the areas below and review the list, then carry it into a new Sus Party game. No account or download.'}</p>
                <div className="seo-actions">
                    <a href="#generator-output" className="seo-btn--primary">See your task pack →</a>
                    <a href="/how-to-play-among-us-irl" className="seo-btn--secondary">See how the game works</a>
                </div>
            </header>
            <main className="seo-content">
                <section className="seo-section" id="build">
                    <h2>Your game setup</h2>
                    <p>A sample list is ready. Choose only the areas your group can use, then adjust the count and task style. The generator prepares groups of three to fifteen; the game itself has no fixed fifteen-player cap.</p>
                    <div className="seo-generator">
                        <div className="seo-generator__field">
                            <label htmlFor="gen-preset">Task pack</label>
                            <select id="gen-preset" value={options.preset} onChange={event => update('preset', event.target.value)}>
                                <option value="standard">Party tasks</option>
                                <option value="cleanup">Family cleanup</option>
                            </select>
                        </div>
                        <div className="seo-generator__field" hidden={isCleanup}>
                            <label htmlFor="gen-venue">Venue</label>
                            <select id="gen-venue" value={options.venue} onChange={event => update('venue', event.target.value)}>
                                {Object.entries(VENUES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </select>
                        </div>
                        <div className="seo-generator__field">
                            <label htmlFor="gen-players">Players: {options.playerCount}</label>
                            <input id="gen-players" type="range" min="3" max="15" step="1" value={options.playerCount}
                                onChange={event => update('playerCount', Number(event.target.value))} />
                            <p>The app requires at least three task entries per player. This list contains {result.tasks.length}.</p>
                        </div>
                        <div className="seo-generator__field" hidden={isCleanup}>
                            <label htmlFor="gen-movement">Movement</label>
                            <select id="gen-movement" value={options.movement} onChange={event => update('movement', event.target.value)}>
                                <option value="low">Seated tasks at two stations</option>
                                <option value="normal">Walk between areas</option>
                                <option value="active">Include more movement</option>
                            </select>
                        </div>
                        <div className="seo-generator__field" hidden={isCleanup}>
                            <label htmlFor="gen-style">Task style</label>
                            <select id="gen-style" value={options.taskStyle} onChange={event => update('taskStyle', event.target.value)}>
                                <option value="standard">Standard</option><option value="funny">Include funny tasks</option><option value="mix">Mix</option>
                            </select>
                        </div>
                        <fieldset className="seo-generator__field seo-room-picker">
                            <legend>Areas that players can use</legend>
                            <div className="seo-tags">{availableRooms.map(room => (
                                <label key={room} className="seo-room-option">
                                    <input type="checkbox" checked={options.selectedRooms.includes(room)}
                                        disabled={!options.selectedRooms.includes(room) && options.selectedRooms.length >= 12}
                                        onChange={() => toggleRoom(room)} /> {room}
                                </label>
                            ))}</div>
                            <p>Choose at least two areas. For seated play, use two table stations in one accessible room.</p>
                        </fieldset>
                        <form onSubmit={addRoom} className="seo-generator__field">
                            <label htmlFor="gen-room">Add your own area</label>
                            <div className="seo-output__actions">
                                <input id="gen-room" value={newRoom} maxLength="60" onChange={event => setNewRoom(event.target.value)} placeholder="For example, Dining Table" />
                                <button className="seo-btn--secondary" disabled={!newRoom.trim() || options.selectedRooms.length >= 12}>Add area</button>
                            </div>
                        </form>
                    </div>
                </section>
                <section className="seo-section" id="generator-output" aria-labelledby="task-list-title">
                    <div className="seo-output__meta">
                        <span className="seo-output__badge">{options.playerCount} players</span>
                        <span className="seo-output__badge">{result.rooms.length} areas</span>
                        <span className="seo-output__badge">{result.tasks.length} tasks</span>
                    </div>
                    <h2 id="task-list-title">Your {result.tasks.length} tasks</h2>
                    <p>{isCleanup ? 'Review the jobs before play. Remove jobs that are already done or do not fit your home in host setup. Use another small chore as a replacement.' : 'Provide paper and pencils. Cross out any task that does not fit your space before the round.'}</p>
                    {!ready && <p role="alert">Choose at least two areas and enough tasks for your group. Add areas or reduce the player count.</p>}
                    <div className="seo-output__actions">
                        {ready && <a href="/play?setup=generated" onClick={useTasks} className="seo-btn--primary">Use these tasks in a new game →</a>}
                        <button className="seo-btn--secondary" onClick={() => copy(taskText)}>Copy tasks</button>
                        <button className="seo-btn--secondary" onClick={() => { setShuffle(value => value + 1); setStatus(''); }}>Shuffle tasks</button>
                        <button className="seo-btn--secondary" onClick={shareSetup}>Copy setup link</button>
                    </div>
                    <p role="status" aria-live="polite">{status}</p>
                    <ol className="seo-output__tasks seo-generated-list">
                        {result.tasks.map((task, index) => <li className="seo-output__task" key={`${task.location}:${task.task}`}>
                            <span className="seo-output__loc">{index + 1}. {task.location}</span><span className="seo-output__text">{task.task}</span>
                        </li>)}
                    </ol>
                    <details className="seo-faq__item"><summary>Plain text for print or manual copy</summary>
                        <textarea className="seo-task-copy" readOnly value={taskText} rows="10" aria-label="Task list as plain text" />
                    </details>
                </section>
                <section className="seo-section" id="use-the-list">
                    <h2>From this task pack to your first round</h2>
                    <ol className="seo-checklist">
                        <li>Check each area and task with the host.</li>
                        <li>Select “Use these tasks in a new game.”</li>
                        <li>Create a room, then select “Import generated tasks” in host setup.</li>
                        <li>Review the saved list, apply it, and open the room for your friends.</li>
                    </ol>
                    <p>Task entries are spread across your selected areas. The app adds “Other” as a catch-all location.</p>
                    <p>For a first round, try {result.recommendations.intruderCount || 1} intruder(s), 90-second meetings, and five tasks per crewmate.</p>
                    <p>The host can adjust these settings before the room opens. The task goal reveals intruders rather than ending the game.</p>
                    <p>Keep this browser session open as you create the room so host setup can find your saved pack. Friends join from their own phone browsers with your room code.</p>
                </section>
                <GameplayScreenshots screens={['task-list', 'crew-task']} />

                <section className="seo-section">
                    <h2>Sabotage stays inside the game</h2>
                    <p>Sus Party supplies sabotage cards. No physical locks, hidden household items, or blocked paths are required.</p>
                    <ul className="seo-checklist">{result.sabotages.map(idea => <li key={idea}>{idea}</li>)}</ul>
                </section>
                <nav className="seo-links" aria-label="Next steps">
                    <a href="/make-cleaning-fun-for-kids">Play a family cleanup game →</a>
                    <a href="/among-us-irl-task-ideas">Choose tasks and plan your space →</a>
                    <a href="/how-to-play-among-us-irl">Read the rules and meeting flow →</a>
                    <a href="/among-us-irl">Plan your first game →</a>
                    <a href="/social-deduction-games">Compare games for your group →</a>
                    <a href="/among-us-birthday-party">Plan a birthday round →</a>
                </nav>
            </main>
        </SeoPageLayout>
    );
}

export default TaskGeneratorPage;

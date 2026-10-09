import React, { useState } from 'react';
import { ArrowRight, Check, ChevronDown, Copy, DoorOpen, Home, MapPin, Pencil, Plus, Printer, RefreshCw, Share2, Shuffle, Sofa, Utensils, X } from 'lucide-react';
import { usePageMeta } from '../../seo/usePageMeta';
import SeoPageLayout from './SeoPageLayout';
import { VENUE_ROOMS, generateTasks, taskStyleValue } from './taskPools';
import { saveGameDraft } from './gameDraft';
import { CLEANUP_ROOMS } from './cleanupTasks';
import './TaskGeneratorPage.css';

const VENUES = { house: 'House', apartment: 'Apartment', dorm: 'Dorm', office: 'Office', airbnb: 'Vacation rental', school: 'School', other: 'Other' };
const defaultRooms = venue => VENUE_ROOMS[venue].filter(room => !/Bedroom|Bathroom|Outdoor|Outdoors|Garage/.test(room));

function initialSetup() {
    const params = new URLSearchParams(window.location.search);
    const preset = params.get('preset') === 'cleanup' ? 'cleanup' : 'standard';
    const venue = preset === 'cleanup' ? 'house' : Object.hasOwn(VENUES, params.get('venue')) ? params.get('venue') : 'apartment';
    const requestedRooms = [...new Set(params.getAll('room').map(room => room.trim()).filter(room => room && room.length <= 60))].slice(0, 12);
    const options = {
        venue, preset,
        playerCount: Math.max(3, Math.min(15, Math.floor(Number(params.get('players')) || (preset === 'cleanup' ? 4 : 8)))),
        taskStyle: preset === 'cleanup' ? 0 : taskStyleValue(params.get('style') ?? 50),
        selectedRooms: requestedRooms.length >= 2 ? requestedRooms : preset === 'cleanup' ? CLEANUP_ROOMS : defaultRooms(venue),
    };
    return { options, pack: generateTasks({ ...options, random: () => 0.42 }) };
}

function rebuildPack(options, previousTasks = []) {
    const pack = generateTasks(options);
    // Keep deliberate edits when the group size or task style changes.
    if (!previousTasks.some(task => task.custom)) return pack;
    const tasks = pack.rooms.flatMap(location => {
        const edits = previousTasks.filter(task => task.custom && task.location === location);
        const planned = pack.tasks.filter(task => task.location === location);
        const size = Math.max(planned.length, edits.length);
        const seen = new Set(edits.map(task => task.task));
        const suggestions = [...planned, ...pack.candidates[location]].filter(task => {
            if (seen.has(task.task)) return false;
            seen.add(task.task);
            return true;
        });
        return [...edits, ...suggestions].slice(0, size);
    });
    return { ...pack, tasks };
}

function RoomIcon({ room }) {
    const Icon = /Kitchen/.test(room) ? Utensils : /Living|Common/.test(room) ? Sofa : /Hall/.test(room) ? DoorOpen : /Room|House/.test(room) ? Home : MapPin;
    return <Icon size={24} aria-hidden="true" />;
}

export default function TaskGeneratorPage() {
    usePageMeta({
        title: 'Sus Party | Among Us IRL Task Generator',
        description: 'Build a room-to-room Among Us IRL task pack. Choose your locations, tune the practical-to-playful mix, edit any task, then use your pack in Sus Party.',
        canonical: 'https://susparty.com/among-us-irl-task-generator',
    });
    const [{ options, pack }, setSetup] = useState(initialSetup);
    const [newRoom, setNewRoom] = useState('');
    const [status, setStatus] = useState('');
    const [expandedRooms, setExpandedRooms] = useState({});
    const [editingIndex, setEditingIndex] = useState(null);
    const [editText, setEditText] = useState('');
    const [plainTextOpen, setPlainTextOpen] = useState(false);
    const isCleanup = options.preset === 'cleanup';
    const availableRooms = [...new Set([...(isCleanup ? CLEANUP_ROOMS : VENUE_ROOMS[options.venue]), ...options.selectedRooms])];
    const minimumTasks = Math.max(10, options.playerCount * 3);
    const ready = pack.rooms.length >= 2 && pack.tasks.length >= minimumTasks && pack.tasks.length <= 120;
    const taskText = pack.rooms.map(room => `${room}\n${pack.tasks.filter(task => task.location === room).map((task, index) => `${index + 1}. ${task.task}`).join('\n')}`).join('\n\n');
    const styleText = options.taskStyle === 0 ? 'Practical' : options.taskStyle === 100 ? 'Playful' : options.taskStyle === 50 ? 'Mixed' : options.taskStyle < 50 ? 'Mostly practical' : 'Mostly playful';

    const update = (key, value) => {
        setStatus('');
        setEditingIndex(null);
        setSetup(previous => {
            const next = { ...previous.options, [key]: value };
            if (key === 'venue') next.selectedRooms = defaultRooms(value);
            if (key === 'preset') Object.assign(next, {
                venue: value === 'cleanup' ? 'house' : 'apartment', taskStyle: value === 'cleanup' ? 0 : 50,
                playerCount: value === 'cleanup' ? 4 : 8,
                selectedRooms: value === 'cleanup' ? CLEANUP_ROOMS : defaultRooms('apartment'),
            });
            return { options: next, pack: rebuildPack(next, key === 'preset' ? [] : previous.pack.tasks) };
        });
    };
    const toggleRoom = room => update('selectedRooms', options.selectedRooms.includes(room)
        ? options.selectedRooms.filter(value => value !== room) : [...options.selectedRooms, room]);
    const addRoom = event => {
        event.preventDefault();
        const room = newRoom.trim();
        if (!room || options.selectedRooms.includes(room) || options.selectedRooms.length >= 12) return;
        update('selectedRooms', [...options.selectedRooms, room]);
        setNewRoom('');
    };
    const shuffle = () => {
        if (pack.tasks.some(task => task.custom) && !window.confirm('Shuffle this pack and replace your edited tasks?')) return;
        setSetup(previous => ({ ...previous, pack: generateTasks(previous.options) }));
        setEditingIndex(null);
        setStatus('New task suggestions are ready.');
    };
    const swap = index => {
        const current = pack.tasks[index];
        const used = new Set(pack.tasks.filter(task => task.location === current.location).map(task => task.task));
        const unused = pack.candidates[current.location].filter(task => !used.has(task.task));
        const sameStyle = unused.filter(task => Boolean(task.funny) === Boolean(current.funny));
        const candidates = sameStyle.length ? sameStyle : unused;
        if (!candidates.length) { setStatus('This location has no unused suggestions. Edit the task instead.'); return; }
        const replacement = { ...candidates[Math.floor(Math.random() * candidates.length)], custom: true };
        setSetup(previous => ({ ...previous, pack: { ...previous.pack, tasks: previous.pack.tasks.map((task, i) => i === index ? replacement : task) } }));
        setStatus('Task swapped.');
    };
    const saveEdit = event => {
        event.preventDefault();
        const text = editText.trim();
        if (!text || text.length > 250) { setStatus('Write a task with 1 to 250 characters.'); return; }
        const current = pack.tasks[editingIndex];
        if (pack.tasks.some((task, index) => index !== editingIndex && task.location === current.location && task.task === text)) {
            setStatus('This location already has that task. Write a different task.'); return;
        }
        setSetup(previous => ({ ...previous, pack: { ...previous.pack, tasks: previous.pack.tasks.map((task, i) => i === editingIndex ? { ...task, task: text, custom: true } : task) } }));
        setEditingIndex(null);
        setStatus('Task saved.');
    };
    const copy = async (text, success) => {
        try { await navigator.clipboard.writeText(text); setStatus(success); }
        catch (_) { setPlainTextOpen(true); setStatus('Copy is unavailable. Select the plain text below to copy the pack.'); }
    };
    const shareSetup = () => {
        const url = new URL('/among-us-irl-task-generator', window.location.origin);
        if (isCleanup) url.searchParams.set('preset', 'cleanup');
        url.searchParams.set('venue', options.venue);
        url.searchParams.set('players', options.playerCount);
        url.searchParams.set('style', options.taskStyle);
        url.searchParams.set('utm_source', 'shared-link');
        options.selectedRooms.forEach(room => url.searchParams.append('room', room));
        copy(url.href, 'Setup link copied. Task edits stay in this browser.');
    };
    const useTasks = event => {
        if (!saveGameDraft({ name: isCleanup ? 'Family cleanup task pack' : `${VENUES[options.venue]} task pack`,
            tasks: pack.tasks, locations: pack.rooms, playerCount: options.playerCount, recommendations: pack.recommendations })) {
            event.preventDefault(); setStatus('Your browser cannot save this pack. Copy the tasks or enable storage, then try again.'); return;
        }
        localStorage.removeItem('player_id');
        localStorage.removeItem('room_code');
        sessionStorage.removeItem('is_room_creator');
    };

    return (
        <SeoPageLayout className="task-builder">
            <header className="task-builder__hero">
                <h1>{isCleanup ? 'Build your cleanup task pack' : 'Build your task pack'}</h1>
                <p>{isCleanup ? 'Real chores, secret roles, and a reason to suspect the person beside the laundry basket.' : 'Give everyone a reason to leave the room. Pick your spaces, tune the vibe, and make the list your own.'}</p>
                <a href="#generator-output" className="task-builder__jump">See your {pack.tasks.length} tasks <ChevronDown size={18} /></a>
            </header>
            <main className="task-builder__main">
                <div className="task-builder__workspace">
                    <section className="task-builder__setup" aria-labelledby="game-setup-title">
                        <h2 id="game-setup-title">Your game</h2>
                        <fieldset className="task-builder__field"><legend>Choose a pack</legend>
                            <div className="task-builder__pack-switch">
                                {[['standard', 'Party'], ['cleanup', 'Family cleanup']].map(([value, label]) => <button key={value} type="button" className="task-builder__choice" aria-pressed={options.preset === value} onClick={() => update('preset', value)}>{label}</button>)}
                            </div>
                        </fieldset>
                        {!isCleanup && <fieldset className="task-builder__field"><legend>Where are you playing?</legend>
                            <div className="task-builder__venues">{Object.entries(VENUES).map(([value, label]) => <button key={value} type="button" className="task-builder__choice" aria-pressed={options.venue === value} onClick={() => update('venue', value)}>{label}</button>)}</div>
                        </fieldset>}
                        <div className="task-builder__field">
                            <label htmlFor="gen-players">Players</label>
                            <div className="task-builder__players"><span>3</span><input id="gen-players" type="range" min="3" max="15" step="1" value={options.playerCount} onChange={event => update('playerCount', Number(event.target.value))} style={{ '--range-fill': `${(options.playerCount - 3) / 12 * 100}%` }} /><span>15</span><output htmlFor="gen-players">{options.playerCount}</output></div>
                        </div>
                        {!isCleanup && <div className="task-builder__field">
                            <label htmlFor="gen-style">Task style <span className="task-builder__current-style">{styleText}</span></label>
                            <input id="gen-style" type="range" min="0" max="100" step="5" value={options.taskStyle} aria-valuetext={styleText} onChange={event => update('taskStyle', Number(event.target.value))} style={{ '--range-fill': `${options.taskStyle}%` }} />
                            <div className="task-builder__range-labels"><span>Practical</span><span>Mixed</span><span>Playful</span></div>
                            <p className="task-builder__hint">{options.taskStyle < 25 ? 'Quick jobs and observations at each location.' : options.taskStyle > 75 ? 'Dramatic detours. Suspicious behavior guaranteed.' : 'Real tasks with a few suspicious detours.'}</p>
                        </div>}
                        <fieldset className="task-builder__field"><legend>Your locations</legend>
                            <div className="task-builder__rooms">{availableRooms.map(room => <label key={room} className={`task-builder__room ${options.selectedRooms.includes(room) ? 'is-selected' : ''}`}>
                                <input type="checkbox" checked={options.selectedRooms.includes(room)} disabled={!options.selectedRooms.includes(room) && options.selectedRooms.length >= 12} onChange={() => toggleRoom(room)} />
                                <Check size={16} aria-hidden="true" /><span>{room}</span>
                            </label>)}</div>
                        </fieldset>
                        <form className="task-builder__add-room" onSubmit={addRoom}>
                            <label htmlFor="gen-room" className="sr-only">Add a location</label>
                            <input id="gen-room" value={newRoom} maxLength="60" onChange={event => setNewRoom(event.target.value)} placeholder="Add a location" />
                            <button type="submit" aria-label="Add location" disabled={!newRoom.trim() || options.selectedRooms.includes(newRoom.trim()) || options.selectedRooms.length >= 12}><Plus size={22} /></button>
                        </form>
                        <button type="button" className="task-builder__button task-builder__shuffle" onClick={shuffle}><Shuffle size={17} />Shuffle the whole pack</button>
                    </section>

                    <section className="task-pack" aria-labelledby="task-pack-title" id="generator-output">
                        <div className="task-pack__header"><div><h2 id="task-pack-title">Your task pack</h2><p className="task-pack__summary">{pack.tasks.length} tasks · {pack.rooms.length} locations · {options.playerCount} players</p></div>
                            <div className="task-pack__actions">
                                {ready && editingIndex === null ? <a href="/play?setup=generated" onClick={useTasks} className="task-builder__button task-builder__button--primary">Use this pack <ArrowRight size={17} /></a> : <button className="task-builder__button task-builder__button--primary" disabled>Use this pack <ArrowRight size={17} /></button>}
                                <button type="button" className="task-builder__button" onClick={() => copy(taskText, 'Task pack copied.')}><Copy size={17} />Copy pack</button>
                                <button type="button" className="task-builder__button" onClick={shareSetup}><Share2 size={17} />Share setup</button>
                            </div>
                        </div>
                        {!ready && <p className="task-pack__notice" role="alert">{pack.rooms.length < 2 ? 'Choose at least two locations to give players a route.' : `This group needs ${minimumTasks} tasks. Add a location or reduce the player count.`}</p>}
                        <p className="task-pack__status" role="status" aria-live="polite">{status}</p>
                        {pack.rooms.map((room, roomIndex) => {
                            const rows = pack.tasks.map((task, index) => ({ ...task, index })).filter(task => task.location === room);
                            const expanded = Boolean(expandedRooms[room]);
                            return <section className="task-pack__location" key={room} aria-labelledby={`location-${roomIndex}`}>
                                <div className="task-pack__location-title"><RoomIcon room={room} /><h3 id={`location-${roomIndex}`}>{room}</h3><span>{rows.length} tasks</span></div>
                                <ol className="task-pack__rows" id={`location-tasks-${roomIndex}`}>{rows.map((task, number) => <li className="task-pack__row" data-testid="task-row" key={`${room}:${task.index}`} hidden={!expanded && number >= 3}>
                                    <span className="task-pack__number" aria-hidden="true">{String(number + 1).padStart(2, '0')}</span>
                                    {editingIndex === task.index ? <form className="task-pack__edit" onSubmit={saveEdit}>
                                        <input autoFocus maxLength="250" aria-label={`Edit task ${number + 1} in ${room}`} value={editText} onChange={event => setEditText(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') setEditingIndex(null); if (event.key === 'Enter') saveEdit(event); }} />
                                        <button type="submit" aria-label="Save task"><Check size={18} /></button><button type="button" aria-label="Cancel edit" onClick={() => setEditingIndex(null)}><X size={18} /></button>
                                    </form> : <button type="button" className="task-pack__task" aria-label={`Edit task ${number + 1} in ${room}`} onClick={() => { setEditingIndex(task.index); setEditText(task.task); setStatus(''); }}><span data-testid="task-text">{task.task}</span><Pencil size={14} aria-hidden="true" /></button>}
                                    <button type="button" className="task-pack__swap" aria-label={`Swap task ${number + 1} in ${room}`} disabled={editingIndex !== null} onClick={() => swap(task.index)}><RefreshCw size={16} /><span>Swap</span></button>
                                </li>)}</ol>
                                {rows.length > 3 && <button type="button" className="task-pack__expand" aria-expanded={expanded} aria-controls={`location-tasks-${roomIndex}`} onClick={() => setExpandedRooms(previous => ({ ...previous, [room]: !expanded }))}><ChevronDown size={18} />{expanded ? 'Show fewer tasks' : `Show ${rows.length - 3} more tasks`}</button>}
                            </section>;
                        })}
                        <div className="task-pack__utilities">
                            <details open={plainTextOpen} onToggle={event => setPlainTextOpen(event.currentTarget.open)}><summary>Plain text for manual copy</summary><textarea readOnly className="task-pack__plain-text" value={taskText} rows="10" aria-label="Task pack as plain text" /></details>
                            <button type="button" className="task-pack__print" onClick={() => window.print()}><Printer size={16} />Print pack</button>
                        </div>
                    </section>
                </div>

                <section className="task-builder__next" aria-labelledby="next-title">
                    <h2 id="next-title">Next: get everyone into the game</h2>
                    <ol><li><span>1</span><div><h3>Review the pack</h3><p>Visit each location. Swap or edit tasks that do not fit.</p></div></li><li><span>2</span><div><h3>Create a room and import it</h3><p>Select “Use this pack,” create a room, then select “Import generated tasks.”</p></div></li><li><span>3</span><div><h3>Share your room code</h3><p>Open the room. Everyone joins from their phone browser.</p></div></li></ol>
                </section>
                <section className="task-builder__notes">
                    <div><h2>Why locations matter</h2><p>In an Among Us IRL game, tasks give crewmates somewhere to go and intruders an excuse to follow. Spread your pack across rooms or separate areas. Travel to the named location before each task.</p><p>The generator supports 3–15 players. The game itself has no fixed fifteen-player cap. The app requires at least three task entries per player.</p></div>
                    <div><h2>Start with a short round</h2><p>Try {pack.recommendations.intruderCount || 1} intruder{pack.recommendations.intruderCount > 1 ? 's' : ''}, 90-second meetings, and {pack.recommendations.taskGoalPerCrewmate || 5} tasks per crewmate. The host can change these settings before the room opens.</p><p>{isCleanup ? 'Review each chore before play. Replace jobs that are already complete or do not fit your home.' : 'Task completion reveals the intruders. The crew still needs to vote them out. Sus Party supplies the sabotage cards.'}</p><p><a href="/how-to-play-among-us-irl">Read the round rules</a> · <a href="/among-us-irl-task-ideas">Browse more task ideas</a></p></div>
                </section>
            </main>
        </SeoPageLayout>
    );
}

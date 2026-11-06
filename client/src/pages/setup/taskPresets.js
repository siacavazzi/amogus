// Ready-made task lists for host setup: the host picks where they play and which areas are
// in play, and the task generator writes the list. Player count is not asked: every list is
// big enough for a large game (the server wants 3 tasks per player, up to 60).
import { tk } from '../../i18n';
import { TASK_LANGUAGES, VENUE_ROOMS, generateTasks } from '../seo/taskPools';
import { CLEANUP_TASKS } from '../seo/cleanupTasks';

export const PRESET_TASK_COUNT = 60;
// generateTasks writes max(24, players * 3) tasks.
const PLAYERS_FOR_COUNT = PRESET_TASK_COUNT / 3;
export const MAX_AREAS = 12;

const CLEANUP_AREAS = Object.keys(CLEANUP_TASKS).filter((room) => room !== 'any');
const quiet = /Bedroom|Bathroom|Outdoor|Outdoors|Garage|Basement/;

export const PLACES = [
    { key: 'apartment', label: tk('Apartment'), rooms: VENUE_ROOMS.apartment },
    { key: 'house', label: tk('House'), rooms: VENUE_ROOMS.house },
    { key: 'big_house', label: tk('Big house'), rooms: VENUE_ROOMS.big_house },
    { key: 'school', label: tk('School'), rooms: VENUE_ROOMS.school },
    { key: 'hall', label: tk('Church or hall'), rooms: VENUE_ROOMS.hall },
    { key: 'office', label: tk('Office'), rooms: VENUE_ROOMS.office },
    { key: 'dorm', label: tk('Dorm'), rooms: VENUE_ROOMS.dorm },
    { key: 'other', label: tk('Other place'), rooms: VENUE_ROOMS.other },
    { key: 'chores', label: tk('Chores at home'), rooms: CLEANUP_AREAS, preset: 'cleanup' },
];

export function placeByKey(key) {
    return PLACES.find((place) => place.key === key) || null;
}

// The areas switched on when a place is first picked: the shared rooms, not the private ones.
export function defaultAreas(place) {
    if (place.preset === 'cleanup') return place.rooms.filter((room) => room !== 'Bathroom');
    const open = place.rooms.filter((room) => !quiet.test(room));
    return open.length >= 2 ? open : place.rooms.slice(0, 3);
}

export function buildPresetList(place, areas, language, random = Math.random) {
    const taskLanguage = TASK_LANGUAGES.includes(language) ? language : 'en';
    const cleanup = place.preset === 'cleanup';
    const pack = generateTasks({
        venue: VENUE_ROOMS[place.key] ? place.key : 'other',
        preset: cleanup ? 'cleanup' : 'standard',
        playerCount: PLAYERS_FOR_COUNT,
        taskStyle: cleanup ? 0 : 50,
        selectedRooms: areas,
        taskLanguage,
        random,
    });
    return {
        tasks: pack.tasks.map(({ task, location }) => ({ task, location })),
        locations: pack.rooms,
    };
}

// The full task maker, set up with the same place and areas.
export function taskMakerUrl(place, areas) {
    const url = new URL('/among-us-irl-task-generator', window.location.origin);
    if (place.preset === 'cleanup') url.searchParams.set('preset', 'cleanup');
    else url.searchParams.set('venue', { big_house: 'house', hall: 'other' }[place.key] || place.key);
    url.searchParams.set('players', '12');
    areas.forEach((area) => url.searchParams.append('room', area));
    return url.pathname + url.search;
}

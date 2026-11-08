// Ready-made task lists for host setup: the host picks where they play, which areas are in
// play, and the vibe, and the task generator writes the list. Player count is not asked: every
// list is big enough for a large game (the server wants 3 tasks per player, up to 60).
import { tk } from '../../i18n';
import { TASK_LANGUAGES, VENUE_ROOMS, generateTasks } from '../seo/taskPools';

export const PRESET_TASK_COUNT = 60;
// generateTasks writes max(24, players * 3) tasks.
const PLAYERS_FOR_COUNT = PRESET_TASK_COUNT / 3;
export const MAX_AREAS = 12;

// Off until the host turns them on: private rooms and areas not every place has.
const OFF_AT_FIRST = new Set(['Bedroom', 'Bathroom', 'Outdoor', 'Outdoors', 'Garden / Outdoor', 'Garage / Utility',
    'Basement', 'Upstairs', 'Pool / Hot tub', 'Chapel', 'Gym', 'Stage', 'Library']);

export const PLACES = [
    { key: 'apartment', label: tk('Apartment'), rooms: VENUE_ROOMS.apartment },
    { key: 'house', label: tk('House'), rooms: VENUE_ROOMS.house },
    { key: 'big_house', label: tk('Big house'), rooms: VENUE_ROOMS.big_house },
    { key: 'school', label: tk('School'), rooms: VENUE_ROOMS.school },
    { key: 'hall', label: tk('Church or hall'), rooms: VENUE_ROOMS.hall },
    { key: 'office', label: tk('Office'), rooms: VENUE_ROOMS.office },
    { key: 'dorm', label: tk('Dorm'), rooms: VENUE_ROOMS.dorm },
    { key: 'other', label: tk('Other place'), rooms: VENUE_ROOMS.other },
];

export const VIBES = [
    { key: 'mixed', label: tk('Mixed'), description: tk('Real jobs with some silly ones') },
    { key: 'party', label: tk('Party'), description: tk('Loud, silly, and on the move') },
    { key: 'chill', label: tk('Chill'), description: tk('Calm tasks, no running or shouting') },
    { key: 'cleanup', label: tk('Clean up'), description: tk('Real chores that get the place tidy') },
];

export function placeByKey(key) {
    return PLACES.find((place) => place.key === key) || null;
}

export function vibeByKey(key) {
    return VIBES.find((vibe) => vibe.key === key) || VIBES[0];
}

export function defaultAreas(place) {
    const open = place.rooms.filter((room) => !OFF_AT_FIRST.has(room));
    return open.length >= 2 ? open : place.rooms.slice(0, 3);
}

export function buildPresetList(place, areas, vibe, language, random = Math.random) {
    const taskLanguage = TASK_LANGUAGES.includes(language) ? language : 'en';
    const pack = generateTasks({
        venue: VENUE_ROOMS[place.key] ? place.key : 'other',
        preset: vibe === 'mixed' ? 'standard' : vibe,
        playerCount: PLAYERS_FOR_COUNT,
        taskStyle: 50,
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
export function taskMakerUrl(place, areas, vibe) {
    const url = new URL('/among-us-irl-task-generator', window.location.origin);
    if (vibe === 'cleanup') url.searchParams.set('preset', 'cleanup');
    else url.searchParams.set('venue', { big_house: 'house', hall: 'other' }[place.key] || place.key);
    if (vibe === 'party') url.searchParams.set('style', '100');
    if (vibe === 'chill') url.searchParams.set('style', '0');
    url.searchParams.set('players', '12');
    areas.forEach((area) => url.searchParams.append('room', area));
    return url.pathname + url.search;
}

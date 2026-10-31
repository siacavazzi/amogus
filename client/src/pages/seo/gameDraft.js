const KEY = 'sus_party_generated_tasks_v1';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
// The tab's copy comes first; the browser-wide copy keeps a pack built hours before the
// party when the tab is closed or "Use this pack" opens in a new tab.
const STORES = ['sessionStorage', 'localStorage'];

function store(name) {
    try { return window[name]; } catch (_) { return null; }
}

function validDraft(draft) {
    return draft && draft.version === 1 && Number.isFinite(draft.createdAt) &&
        Date.now() - draft.createdAt <= MAX_AGE_MS && draft.createdAt <= Date.now() &&
        typeof draft.name === 'string' && draft.name.length <= 100 &&
        Number.isInteger(draft.playerCount) && draft.playerCount >= 3 && draft.playerCount <= 30 &&
        Array.isArray(draft.locations) && draft.locations.length >= 2 && draft.locations.length <= 12 &&
        draft.locations.every(room => typeof room === 'string' && room.trim() && room.length <= 60) &&
        Array.isArray(draft.tasks) && draft.tasks.length >= draft.playerCount * 3 && draft.tasks.length <= 120 &&
        draft.tasks.every(task => task && typeof task.task === 'string' && task.task.trim() &&
            task.task.length <= 250 && draft.locations.includes(task.location)) &&
        draft.recommendations &&
        Number.isInteger(draft.recommendations.intruderCount) && draft.recommendations.intruderCount >= 1 && draft.recommendations.intruderCount <= Math.max(1, Math.floor(draft.playerCount / 2)) &&
        Number.isInteger(draft.recommendations.meetingSeconds) && draft.recommendations.meetingSeconds >= 30 && draft.recommendations.meetingSeconds <= 300 &&
        Number.isInteger(draft.recommendations.taskGoalPerCrewmate) && draft.recommendations.taskGoalPerCrewmate >= 1 && draft.recommendations.taskGoalPerCrewmate <= 100;
}

export function saveGameDraft(value) {
    try {
        const draft = { ...value, version: 1, createdAt: Date.now() };
        if (!validDraft(draft)) return false;
        const json = JSON.stringify(draft);
        return STORES.filter(name => {
            try { store(name).setItem(KEY, json); return true; } catch (_) { return false; }
        }).length > 0;
    } catch (_) { return false; }
}

export function readGameDraft() {
    for (const name of STORES) {
        try {
            const draft = JSON.parse(store(name).getItem(KEY));
            if (validDraft(draft)) return draft;
        } catch (_) { /* Try the next store. */ }
    }
    return null;
}

export function clearGameDraft() {
    STORES.forEach(name => {
        try { store(name).removeItem(KEY); } catch (_) { /* Storage can be unavailable. */ }
    });
}

// The generator links to /play?setup=generated; the draft only counts on that page.
export function readGeneratedSetup(search = window.location.search) {
    return new URLSearchParams(search).get('setup') === 'generated' ? readGameDraft() : null;
}

// "Use this pack" creates the room by itself, once per pack, so leaving that room
// does not open another one.
const AUTO_CREATE_KEY = 'sus_party_generated_room_v1';

export function claimGeneratedRoomCreation(draft) {
    try {
        if (sessionStorage.getItem(AUTO_CREATE_KEY) === String(draft.createdAt)) return false;
        sessionStorage.setItem(AUTO_CREATE_KEY, String(draft.createdAt));
    } catch (_) { /* Without storage the room is still created once per page load. */ }
    return true;
}

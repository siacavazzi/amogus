const KEY = 'sus_party_generated_tasks_v1';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

function validDraft(draft) {
    return draft && draft.version === 1 && Number.isFinite(draft.createdAt) &&
        Date.now() - draft.createdAt <= MAX_AGE_MS && draft.createdAt <= Date.now() &&
        typeof draft.name === 'string' && draft.name.length <= 100 &&
        Number.isInteger(draft.playerCount) && draft.playerCount >= 5 && draft.playerCount <= 15 &&
        Array.isArray(draft.locations) && draft.locations.length >= 2 && draft.locations.length <= 12 &&
        draft.locations.every(room => typeof room === 'string' && room.trim() && room.length <= 60) &&
        Array.isArray(draft.tasks) && draft.tasks.length >= draft.playerCount * 3 && draft.tasks.length <= 120 &&
        draft.tasks.every(task => task && typeof task.task === 'string' && task.task.trim() &&
            task.task.length <= 250 && draft.locations.includes(task.location)) &&
        draft.recommendations &&
        Number.isInteger(draft.recommendations.intruderCount) && draft.recommendations.intruderCount >= 1 && draft.recommendations.intruderCount <= 4 &&
        Number.isInteger(draft.recommendations.meetingSeconds) && draft.recommendations.meetingSeconds >= 30 && draft.recommendations.meetingSeconds <= 300 &&
        Number.isInteger(draft.recommendations.taskGoalPerCrewmate) && draft.recommendations.taskGoalPerCrewmate >= 1 && draft.recommendations.taskGoalPerCrewmate <= 100;
}

export function saveGameDraft(value) {
    try {
        const draft = { ...value, version: 1, createdAt: Date.now() };
        if (!validDraft(draft)) return false;
        sessionStorage.setItem(KEY, JSON.stringify(draft));
        return true;
    } catch (_) { return false; }
}

export function readGameDraft() {
    try {
        const draft = JSON.parse(sessionStorage.getItem(KEY));
        return validDraft(draft) ? draft : null;
    } catch (_) { return null; }
}

export function clearGameDraft() {
    try { sessionStorage.removeItem(KEY); } catch (_) { /* Storage can be unavailable. */ }
}

// The last game this phone finished, so the home page can offer it again ("Welcome back").
// Kept on the saved-list side (a list code), not tied to any player or account. iOS Safari
// clears it after a week without visits, which is what the saved link and accounts are for.
import { normalizeListCode } from './savedGame';

const KEY = 'sus_last_game_v1';
const MAX_AGE_MS = 120 * 24 * 60 * 60 * 1000;

export function rememberLastGame({ code, taskCount, group }, now = Date.now()) {
    const listCode = normalizeListCode(code);
    if (!listCode) return;
    const groupToken = typeof group === 'string' && /^[A-Za-z0-9_-]{8,32}$/.test(group) ? group : undefined;
    try {
        localStorage.setItem(KEY, JSON.stringify({ code: listCode, taskCount: Number(taskCount) || 0, playedAt: now, group: groupToken }));
    } catch (_) { /* Storage can be unavailable. */ }
}

export function readLastGame(now = Date.now()) {
    try {
        const value = JSON.parse(localStorage.getItem(KEY));
        if (value && normalizeListCode(value.code) && !value.dismissed && now - value.playedAt <= MAX_AGE_MS) return value;
    } catch (_) { /* Storage can be unavailable. */ }
    return null;
}

/** "Not now" hides it until this phone finishes another game. */
export function dismissLastGame() {
    try {
        const value = JSON.parse(localStorage.getItem(KEY));
        if (value) localStorage.setItem(KEY, JSON.stringify({ ...value, dismissed: true }));
    } catch (_) { /* Storage can be unavailable. */ }
}

// "Save this game": a link any player keeps (in a text to themselves or the group chat) that
// opens host setup with that night's tasks. The link lives in their messages, so it survives
// iOS Safari clearing site storage after a week away.
export const SAVED_GAME_PARAM = 'list';
const KEY = 'sus_saved_game_v1';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function normalizeListCode(value) {
    const code = String(value || '').trim().toUpperCase();
    return /^[A-Z0-9]{6}$/.test(code) ? code : '';
}

export function savedGameUrl(code, origin = window.location.origin) {
    const url = new URL('/play', origin);
    if (normalizeListCode(code)) url.searchParams.set(SAVED_GAME_PARAM, normalizeListCode(code));
    url.searchParams.set('utm_source', 'saved-game');
    return url.toString();
}

/** Keeps a saved game the page was opened with until this phone next creates a room. */
export function rememberSavedGame(search = window.location.search, now = Date.now()) {
    return keepSavedGame(new URLSearchParams(search || '').get(SAVED_GAME_PARAM), now);
}

/** Keeps a list code an old invite link brought back, the same way as a saved game link. */
export function keepSavedGame(value, now = Date.now()) {
    const code = normalizeListCode(value);
    if (!code) return '';
    try { localStorage.setItem(KEY, JSON.stringify({ code, savedAt: now })); } catch (_) { /* Storage can be unavailable. */ }
    return code;
}

export function readPendingSavedGame(now = Date.now()) {
    try {
        const value = JSON.parse(localStorage.getItem(KEY));
        if (value && normalizeListCode(value.code) && now - value.savedAt <= MAX_AGE_MS) return value.code;
    } catch (_) { /* Storage can be unavailable. */ }
    return '';
}

export function clearPendingSavedGame() {
    try { localStorage.removeItem(KEY); } catch (_) { /* Storage can be unavailable. */ }
}

/** The phone's share sheet when it has one, else the clipboard. Resolves to what happened. */
export async function shareLink({ url, title, text }, nav = navigator) {
    if (nav?.share) {
        try {
            await nav.share({ title, text, url });
            return 'shared';
        } catch (error) {
            if (error?.name === 'AbortError') return 'cancelled';
        }
    }
    try {
        await nav.clipboard.writeText(url);
        return 'copied';
    } catch (_) {
        return 'failed';
    }
}

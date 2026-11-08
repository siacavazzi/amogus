// "Save this game": a link any player keeps (in a text to themselves or the group chat) that
// opens host setup with that night's tasks. The link lives in their messages, so it survives
// iOS Safari clearing site storage after a week away.
export const SAVED_GAME_PARAM = 'list';
// The game's link token, so a game started from this link stays in the same group (and keeps its score).
export const GROUP_PARAM = 'group';
// Marks a link the welcome back card opened, so the log can tell it from a link in a chat.
const FROM_PARAM = 'from';
const isGroupToken = (value) => typeof value === 'string' && /^[A-Za-z0-9_-]{8,32}$/.test(value);
const GROUP_VIA = ['old_link', 'saved_link', 'welcome_back'];
const KEY = 'sus_saved_game_v1';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function normalizeListCode(value) {
    const code = String(value || '').trim().toUpperCase();
    return /^[A-Z0-9]{6}$/.test(code) ? code : '';
}

export function savedGameUrl(code, origin = window.location.origin, { group = '', from = '' } = {}) {
    const url = new URL('/play', origin);
    if (normalizeListCode(code)) url.searchParams.set(SAVED_GAME_PARAM, normalizeListCode(code));
    if (normalizeListCode(code) && isGroupToken(group)) url.searchParams.set(GROUP_PARAM, group);
    if (from === 'welcome') url.searchParams.set(FROM_PARAM, from);
    url.searchParams.set('utm_source', 'saved-game');
    return url.toString();
}

/** Keeps a saved game the page was opened with until this phone next creates a room. */
export function rememberSavedGame(search = window.location.search, now = Date.now()) {
    const params = new URLSearchParams(search || '');
    return keepSavedGame(params.get(SAVED_GAME_PARAM), now, {
        group: params.get(GROUP_PARAM),
        via: params.get(FROM_PARAM) === 'welcome' ? 'welcome_back' : 'saved_link',
    });
}

/** Keeps a list code an old invite link brought back, the same way as a saved game link. */
export function keepSavedGame(value, now = Date.now(), { group = '', via = '' } = {}) {
    const code = normalizeListCode(value);
    if (!code) return '';
    const kept = { code, savedAt: now };
    if (isGroupToken(group)) {
        kept.group = group;
        kept.via = GROUP_VIA.includes(via) ? via : 'saved_link';
    }
    try { localStorage.setItem(KEY, JSON.stringify(kept)); } catch (_) { /* Storage can be unavailable. */ }
    return code;
}

/** The group the pending saved game came from, for create_game, or null. */
export function readPendingGroup(now = Date.now()) {
    try {
        const value = JSON.parse(localStorage.getItem(KEY));
        if (value && normalizeListCode(value.code) && now - value.savedAt <= MAX_AGE_MS && isGroupToken(value.group)) {
            return { group_link: value.group, group_via: GROUP_VIA.includes(value.via) ? value.via : 'saved_link' };
        }
    } catch (_) { /* Storage can be unavailable. */ }
    return null;
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

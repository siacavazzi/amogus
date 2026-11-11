import { createRequestId } from './socketCommand';

// Each browser tab gets its own id, kept across reloads of that tab (sessionStorage is per tab).
// Two tabs of the game on one phone share the saved player; the id lets the server tell them apart.
const TAB_KEY = 'sus_tab_id';
let fallbackTabId = null;

export function getTabId() {
    try {
        let id = window.sessionStorage.getItem(TAB_KEY);
        if (!id) {
            id = createRequestId();
            window.sessionStorage.setItem(TAB_KEY, id);
        }
        return id;
    } catch (_) {
        if (!fallbackTabId) fallbackTabId = createRequestId();
        return fallbackTabId;
    }
}

export function isPageHidden() {
    return typeof document !== 'undefined' && document.visibilityState === 'hidden';
}

/**
 * What a tab sends to take its seat back. A tab rejoining from the background says so, and the
 * server leaves the seat with a tab that is in use. `claim` is for a tap in this tab: take the seat.
 */
export function rejoinPayload(playerId, { claim = false } = {}) {
    return { player_id: playerId, tab_id: getTabId(), hidden: claim ? false : isPageHidden() };
}

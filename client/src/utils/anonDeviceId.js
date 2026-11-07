// An anonymous ID for this browser, so usage stats can tell a returning phone from a new one
// across rooms and days. It is a random UUID kept in this browser's storage: no name, no account,
// no fingerprint. Clearing site data, a private tab or another browser gives a new one.
//
// This is not the `device_id` that owns saved task lists: that one acts like a key, so it never goes
// into usage logs. This one only labels usage events.

export const ANON_DEVICE_STORAGE_KEY = 'sp_anon_device_id';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function isAnonDeviceId(value) {
    return typeof value === 'string' && UUID_PATTERN.test(value);
}

export function randomUuid(cryptoApi = typeof crypto !== 'undefined' ? crypto : undefined) {
    if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
    const bytes = new Uint8Array(16);
    if (cryptoApi?.getRandomValues) {
        cryptoApi.getRandomValues(bytes);
    } else {
        for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Returns a reader for this page load. Each call gives { id, status }:
 * - `created`: no ID was stored, so this page load made one (a new device, or storage was wiped,
 *   which in-app browsers sometimes do). Only the first call of the page load says this.
 * - `stored`: read back from storage (a returning device), or made earlier in this page load.
 * - `unsaved`: storage is blocked, so the ID lasts only until the page reloads.
 */
export function createAnonDeviceId({ storage, makeId = randomUuid } = {}) {
    let state = null;
    return function read() {
        if (state) {
            return { id: state.id, status: state.status === 'created' ? 'stored' : state.status };
        }
        let store = storage;
        try {
            if (store === undefined) store = window.localStorage;
            const saved = store.getItem(ANON_DEVICE_STORAGE_KEY);
            if (isAnonDeviceId(saved)) {
                state = { id: saved, status: 'stored' };
            } else {
                const id = makeId();
                store.setItem(ANON_DEVICE_STORAGE_KEY, id);
                // Some browsers accept the write and drop it; only a read-back proves it stuck.
                state = { id, status: store.getItem(ANON_DEVICE_STORAGE_KEY) === id ? 'created' : 'unsaved' };
            }
        } catch (_) {
            state = { id: state?.id || makeId(), status: 'unsaved' };
        }
        return { ...state };
    };
}

export const readAnonDeviceId = createAnonDeviceId();

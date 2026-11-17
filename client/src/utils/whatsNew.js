// Which "what's new" list this phone has seen. It stays on the phone: nothing here is sent anywhere,
// and it holds no ID, only the release id from src/whatsNew.js and how often the list was shown.
//
// A first visit is remembered as "already seen the current list", so newcomers never get it.
// Any later release id is new to that phone, so it sees that list once.

const KEY = 'sus_whats_new_v1';
const MAX_SHOWS = 3;
// What a phone kept from before this existed: if any is there, it has been here before.
const EARLIER_VISIT_KEYS = ['sus_last_game_v1', 'sus_party_has_played_game', 'device_id', 'player_id',
    'sus_saved_game_v1', 'sus_party_tutorial_completed', 'sus_language'];

function read() {
    try {
        const value = JSON.parse(localStorage.getItem(KEY));
        if (value && typeof value === 'object') return value;
    } catch (_) { /* Storage can be unavailable. */ }
    return null;
}

function write(value) {
    try { localStorage.setItem(KEY, JSON.stringify(value)); } catch (_) { /* Storage can be unavailable. */ }
}

function visitedBefore() {
    try { return EARLIER_VISIT_KEYS.some(key => localStorage.getItem(key) !== null); } catch (_) { return false; }
}

const isPrerender = () => typeof navigator !== 'undefined' && /HeadlessChrome/.test(navigator.userAgent || '');

/** Once per page load, before the game stores anything: tells a first visit from a return. */
export function noteWhatsNewVisit(news) {
    if (isPrerender() || read()) return;
    // A phone that played before this shipped hasn't seen any list yet; a new one has nothing to catch up on.
    write({ seen: visitedBefore() ? null : (news?.id || null) });
}

/** The list to show this phone, or null. */
export function pendingWhatsNew(news) {
    if (!news?.id || !news.items?.length || isPrerender()) return null;
    const record = read();
    if (!record || record.seen === news.id) return null;
    return news;
}

export function markWhatsNewSeen(news) {
    if (news?.id) write({ seen: news.id });
}

/** A list closed by the round starting can come back at the next quiet moment, but not forever. */
export function noteWhatsNewShown(news) {
    const record = read() || {};
    const shows = (record.showsFor === news.id ? record.shows || 0 : 0) + 1;
    if (shows >= MAX_SHOWS) markWhatsNewSeen(news);
    else write({ ...record, showsFor: news.id, shows });
}

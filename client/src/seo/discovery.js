const KEY = 'sus_party_acquisition_v1';
const PAGES = new Set(['/', '/play', '/among-us-irl', '/how-to-play-among-us-irl',
    '/among-us-irl-task-ideas', '/among-us-irl-task-generator', '/social-deduction-games',
    '/among-us-birthday-party', '/party-games-for-10-people', '/party-games-for-adults',
    '/murder-mystery-party-game', '/birthday-party-games-for-adults', '/game-night-ideas',
    '/make-cleaning-fun-for-kids', '/traitors-at-home', '/party-games-on-your-phone',
    '/sleepover-games-for-teens', '/indoor-family-reunion-games', '/among-us-role-generator', '/among-us-chores', '/chore-games-for-kids', '/family-cleaning-routine', '/among-us-party-for-kids', '/among-us-irl-for-youth-groups', '/among-us-task-cards-printable', '/holiday-party-games-for-adults', '/how-to-play', '/faq', '/about']);
const SOURCES = new Set(['direct', 'google', 'bing', 'chatgpt', 'facebook', 'instagram',
    'snapchat', 'reddit', 'youtube', 'shared-link', 'other', 'unknown']);
// Tags other sites add to their links. ChatGPT sends utm_source=chatgpt.com, which used to land as "direct".
const SOURCE_ALIASES = {
    'chatgpt.com': 'chatgpt', 'chat.openai.com': 'chatgpt', openai: 'chatgpt',
    'google.com': 'google', 'bing.com': 'bing', 'facebook.com': 'facebook', fb: 'facebook',
    ig: 'instagram', 'instagram.com': 'instagram', 'reddit.com': 'reddit', 'youtube.com': 'youtube',
};
const VISIT_KEY = 'sus_party_visit_v1';
const TOOL_PAGES = {
    '/among-us-irl-task-generator': 'task_generator',
    '/among-us-role-generator': 'role_generator',
    '/among-us-irl-task-ideas': 'task_ideas',
    '/how-to-play': 'how_to_play',
    '/how-to-play-among-us-irl': 'how_to_play',
};

export function sourceFromTag(tag) {
    if (!tag) return null;
    const value = String(tag).trim().toLowerCase();
    if (SOURCES.has(value)) return value;
    if (SOURCE_ALIASES[value]) return SOURCE_ALIASES[value];
    const bare = value.replace(/^www\./, '');
    return SOURCE_ALIASES[bare] || 'other';
}

function readVisit() {
    try {
        const value = JSON.parse(sessionStorage.getItem(VISIT_KEY));
        if (value && typeof value.landed_at === 'number') return value;
    } catch (_) { /* Storage can be unavailable. */ }
    return null;
}

// Counts site pages and tools seen this browser session, so a new room can say how the host got there.
export function noteVisit({ pathname = window.location.pathname, now = Date.now() } = {}) {
    pathname = pathname.replace(/\/+$/, '') || '/';
    const visit = readVisit() || { landed_at: now, pages_viewed: 0, tools_used: [] };
    visit.pages_viewed = Math.min((visit.pages_viewed || 0) + 1, 100);
    const tool = TOOL_PAGES[pathname];
    if (tool && !visit.tools_used.includes(tool)) visit.tools_used.push(tool);
    try { sessionStorage.setItem(VISIT_KEY, JSON.stringify(visit)); }
    catch (_) { /* Gameplay works without visit metadata. */ }
}

export function getVisit(now = Date.now()) {
    const visit = readVisit();
    if (!visit) return {};
    return {
        seconds_since_landing: Math.max(0, Math.round((now - visit.landed_at) / 1000)),
        pages_viewed: visit.pages_viewed,
        tools_used: visit.tools_used,
    };
}

export function getAcquisition() {
    try {
        const value = JSON.parse(sessionStorage.getItem(KEY));
        if (value && SOURCES.has(value.source) && PAGES.has(value.landing_page)) {
            return { source: value.source, landing_page: value.landing_page, ...getVisit() };
        }
    } catch (_) { /* Storage can be unavailable. */ }
    return { source: 'unknown', landing_page: '/play', ...getVisit() };
}

export function captureAcquisition({ pathname = window.location.pathname, search = window.location.search,
    referrer = document.referrer, origin = window.location.origin } = {}) {
    pathname = pathname.replace(/\/+$/, '') || '/';
    if (!PAGES.has(pathname)) return;
    const previous = getAcquisition();
    if (previous.source !== 'unknown') return;
    const tagged = sourceFromTag(new URLSearchParams(search).get('utm_source'));
    let source = tagged || 'direct';
    if (!tagged && referrer) {
        try {
            const url = new URL(referrer);
            if (url.origin === origin) source = 'unknown';
            else {
                const host = url.hostname.toLowerCase();
                const domains = {
                    google: ['google.com', 'google.co.uk', 'google.ca', 'google.com.hk'],
                    bing: ['bing.com'], chatgpt: ['chatgpt.com', 'chat.openai.com'],
                    facebook: ['facebook.com', 'fb.com'], instagram: ['instagram.com'],
                    snapchat: ['snapchat.com'], reddit: ['reddit.com'], youtube: ['youtube.com', 'youtu.be'],
                };
                source = Object.keys(domains).find(key => domains[key].some(domain =>
                    host === domain || host.endsWith(`.${domain}`))) || 'other';
            }
        } catch (_) { source = 'other'; }
    }
    try { sessionStorage.setItem(KEY, JSON.stringify({ source, landing_page: pathname })); }
    catch (_) { /* Gameplay works without source metadata. */ }
}

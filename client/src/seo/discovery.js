const KEY = 'sus_party_acquisition_v1';
const PAGES = new Set(['/', '/play', '/among-us-irl', '/how-to-play-among-us-irl',
    '/among-us-irl-task-ideas', '/among-us-irl-task-generator', '/social-deduction-games',
    '/among-us-birthday-party', '/party-games-for-10-people', '/party-games-for-adults',
    '/murder-mystery-party-game', '/birthday-party-games-for-adults', '/game-night-ideas',
    '/make-cleaning-fun-for-kids', '/traitors-at-home', '/party-games-on-your-phone',
    '/sleepover-games-for-teens', '/indoor-family-reunion-games', '/how-to-play', '/faq', '/about']);
const SOURCES = new Set(['direct', 'google', 'bing', 'chatgpt', 'facebook', 'instagram',
    'snapchat', 'reddit', 'youtube', 'shared-link', 'other', 'unknown']);

export function getAcquisition() {
    try {
        const value = JSON.parse(sessionStorage.getItem(KEY));
        if (value && SOURCES.has(value.source) && PAGES.has(value.landing_page)) {
            return { source: value.source, landing_page: value.landing_page };
        }
    } catch (_) { /* Storage can be unavailable. */ }
    return { source: 'unknown', landing_page: '/play' };
}

export function captureAcquisition({ pathname = window.location.pathname, search = window.location.search,
    referrer = document.referrer, origin = window.location.origin } = {}) {
    pathname = pathname.replace(/\/+$/, '') || '/';
    if (!PAGES.has(pathname)) return;
    const previous = getAcquisition();
    if (previous.source !== 'unknown') return;
    const tagged = new URLSearchParams(search).get('utm_source');
    let source = tagged && SOURCES.has(tagged) ? tagged : 'direct';
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

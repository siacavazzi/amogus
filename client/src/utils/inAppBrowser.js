// Spots the browsers built into other apps (Facebook, Instagram, Reddit, X, TikTok...). They can
// throw the page away when the phone locks or the player switches apps, and their storage is not
// the phone's browser storage, so a player can lose their spot in the game.
//
// Only user-agent tokens those apps add themselves, plus the two generic webview signs:
// Android's "; wv)" and an iPhone page with no "Safari/" token. Real Chrome, Safari, Firefox,
// Edge, Samsung Internet and the Chrome custom tabs other apps open keep their normal tokens.

// Order matters: Messenger also says FBAN, WeChat's token contains "Messenger".
const APPS = [
    ['wechat', /MicroMessenger/i],
    ['messenger', /MessengerForiOS|MessengerLite|Orca-Android|\bMessenger\b/i],
    ['instagram', /Instagram/i],
    ['facebook', /FBAN|FBAV|FB_IAB|FBIOS|\[FB/i],
    ['threads', /Barcelona/],
    ['tiktok', /musical_ly|BytedanceWebview|TikTok|\btrill_/i],
    ['snapchat', /Snapchat/i],
    ['reddit', /Reddit/i],
    ['twitter', /Twitter/i],
    ['linkedin', /LinkedInApp/i],
    ['pinterest', /Pinterest/i],
    ['line', /\bLine\//],
    ['google_app', /\bGSA\//],
];

export const IN_APP_NAMES = {
    wechat: 'WeChat',
    messenger: 'Messenger',
    instagram: 'Instagram',
    facebook: 'Facebook',
    threads: 'Threads',
    tiktok: 'TikTok',
    snapchat: 'Snapchat',
    reddit: 'Reddit',
    twitter: 'X',
    linkedin: 'LinkedIn',
    pinterest: 'Pinterest',
    line: 'LINE',
    google_app: 'Google',
};

export function phoneOs(userAgent = '') {
    if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios';
    if (/Android/i.test(userAgent)) return 'android';
    return 'other';
}

/**
 * Returns { app, os } for an in-app browser, null for a real browser.
 * `app` is a key of IN_APP_NAMES, or "webview" when only the generic signs match.
 * `standalone` is iOS's navigator.standalone: a home-screen web app has no "Safari/" token either.
 */
export function detectInAppBrowser(userAgent = '', { standalone = false } = {}) {
    const ua = typeof userAgent === 'string' ? userAgent : '';
    if (!ua) return null;
    const os = phoneOs(ua);
    for (const [app, pattern] of APPS) {
        if (pattern.test(ua)) return { app, os };
    }
    if (os === 'android' && /;\s*wv\)/.test(ua)) return { app: 'webview', os };
    // iOS WebKit views without Safari's token. Chrome, Firefox and Edge on iPhone all keep "Safari/".
    if (os === 'ios' && /AppleWebKit/.test(ua) && /Mobile\//.test(ua) && !/Safari\//.test(ua) && !standalone) {
        return { app: 'webview', os };
    }
    return null;
}

export function currentInAppBrowser() {
    if (typeof navigator === 'undefined') return null;
    // ?inapp=ios or ?inapp=android shows the pop-up in a normal browser, for checking it.
    try {
        const forced = new URLSearchParams(window.location.search).get('inapp');
        if (forced === 'ios' || forced === 'android') return { app: 'webview', os: forced };
    } catch (_) { /* no window */ }
    return detectInAppBrowser(navigator.userAgent || '', { standalone: navigator.standalone === true });
}

/**
 * A link that asks the phone to open `url` in its real browser, or null when there is no such link.
 * Android: an intent that opens Chrome. iOS 17+: the x-safari scheme. Apps can block either,
 * so the pop-up always offers Copy link and the menu hint as well.
 */
export function openInBrowserUrl(url, os) {
    let parsed;
    try { parsed = new URL(url); } catch (_) { return null; }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    const rest = `${parsed.host}${parsed.pathname}${parsed.search}`;
    if (os === 'android') {
        return `intent://${rest}#Intent;scheme=${parsed.protocol.slice(0, -1)};package=com.android.chrome;end`;
    }
    if (os === 'ios') return `x-safari-${parsed.protocol}//${rest}`;
    return null;
}

const DISMISS_KEY = 'sus_in_app_warning_dismissed';

export function wasDismissed() {
    try { return sessionStorage.getItem(DISMISS_KEY) === '1'; } catch (_) { return false; }
}

export function rememberDismissed() {
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch (_) { /* this load only */ }
}

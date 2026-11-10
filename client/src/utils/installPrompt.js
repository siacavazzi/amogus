// "Add to Home Screen" for hosts. An icon on the home screen is the reminder a web game otherwise
// lacks. (On iOS the home-screen app has its own storage: lists saved in Safari don't move over.)
import { detectInAppBrowser } from './inAppBrowser';

const DISMISSED_KEY = 'sus_install_prompt_v1';

let deferredPrompt = null;
if (typeof window !== 'undefined') {
    // Chrome and Edge (Android and computers) offer their own install sheet, but only through this event, fired once early on.
    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredPrompt = event;
    });
}

export function isStandalone(win = window) {
    try {
        return Boolean(win.navigator?.standalone) || Boolean(win.matchMedia?.('(display-mode: standalone)').matches);
    } catch (_) { return false; }
}

/**
 * Opened from the home screen icon: go straight to the game's start screen (create, join, welcome
 * back) instead of the marketing home page. The manifest's start_url does this where the browser
 * reads it; iPhones that saved the page's own address land on "/" and are moved here. Only on the
 * first page of each launch, so the logo still reaches the home page.
 */
export function homeScreenStartPath({ win = window, storage = win.sessionStorage } = {}) {
    if (!isStandalone(win)) return null;
    try {
        if (storage.getItem('sus_app_launched')) return null;
        storage.setItem('sus_app_launched', '1');
    } catch (_) { return null; }
    const path = win.location.pathname.replace(/\/+$/, '') || '/';
    return path === '/' && !win.location.search ? '/play?source=homescreen' : null;
}

/**
 * How this browser adds a page to the home screen, so the hint can name the browser's own buttons:
 *   'native'        the browser's own install sheet, opened by our button (Chrome/Edge on Android and computers)
 *   'safari'        iPhone Safari before iOS 26: the Share icon in the bottom bar
 *   'safari_menu'   iPhone Safari on iOS 26+: ⋯ next to the address bar, then Share
 *   'chrome_ios'    Chrome on iPhone: the Share icon in its address bar
 *   'firefox_ios'   Firefox on iPhone: the Share icon in its address bar
 *   'ios_menu'      Edge and other iPhone browsers: the browser's menu, then Share
 *   'samsung'       Samsung Internet without the install event: ≡ at the bottom, then "Add page to"
 *   'android_menu'  other Android browsers without the install event (Firefox, Chrome before it is ready): ⋮ menu
 * On iOS 26 the share sheet can hide "Add to Home Screen" behind "View More" (every browser uses the same sheet).
 *   null            no way to do it (in-app browsers, old iPhones, computers without the event, already installed)
 * Our "Save this game" button opens a share sheet too, but that one never has Add to Home Screen in it.
 */
export function installMethod({ win = window, prompt = deferredPrompt } = {}) {
    const nav = win.navigator || {};
    const ua = nav.userAgent || '';
    // In-app browsers (Facebook, Instagram, the Google app...) can't add to the home screen, and an installed app needs no prompt.
    if (isStandalone(win) || detectInAppBrowser(ua, { standalone: nav.standalone === true })) return null;
    if (prompt) return 'native';
    const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && nav.maxTouchPoints > 1);
    if (ios) {
        if (/CriOS|FxiOS|EdgiOS|OPiOS|YaBrowser|DuckDuckGo|Brave/.test(ua)) {
            // Other iPhone browsers got Add to Home Screen in iOS 16.4.
            const os = /OS (\d+)_(\d+)/.exec(ua);
            if (os && (Number(os[1]) < 16 || (Number(os[1]) === 16 && Number(os[2]) < 4))) return null;
            if (/CriOS/.test(ua)) return 'chrome_ios';
            return /FxiOS/.test(ua) ? 'firefox_ios' : 'ios_menu';
        }
        // Safari's version follows iOS (the OS number in the user agent stopped at 18 in iOS 26).
        const safari = /Version\/(\d+)/.exec(ua);
        return safari && Number(safari[1]) >= 26 ? 'safari_menu' : 'safari';
    }
    if (/Android/.test(ua)) return /SamsungBrowser/.test(ua) ? 'samsung' : 'android_menu';
    return null;
}

export async function promptInstall() {
    if (!deferredPrompt) return false;
    const event = deferredPrompt;
    deferredPrompt = null;
    event.prompt();
    const choice = await event.userChoice.catch(() => null);
    return choice?.outcome === 'accepted';
}

export function installPromptDismissed() {
    try { return Boolean(localStorage.getItem(DISMISSED_KEY)); } catch (_) { return false; }
}

export function dismissInstallPrompt(value = 'dismissed') {
    try { localStorage.setItem(DISMISSED_KEY, value); } catch (_) { /* Storage can be unavailable. */ }
}

// "Add to Home Screen" for hosts. An icon on the home screen is the reminder a web game otherwise
// lacks. (On iOS the home-screen app has its own storage: lists saved in Safari don't move over.)
const DISMISSED_KEY = 'sus_install_prompt_v1';
const IN_APP = /FBAN|FBAV|FB_IAB|Instagram|Snapchat|musical_ly|TikTok|Line\/|Messenger/i;

let deferredPrompt = null;
if (typeof window !== 'undefined') {
    // Chrome on Android offers its own install sheet, but only through this event, fired once early on.
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

/** 'native' (the browser's own install sheet), 'ios' (Share, then Add to Home Screen) or null. */
export function installMethod({ win = window, prompt = deferredPrompt } = {}) {
    const ua = win.navigator?.userAgent || '';
    // In-app browsers (Facebook, Instagram...) can't add to the home screen, and an installed app needs no prompt.
    if (IN_APP.test(ua) || isStandalone(win)) return null;
    if (prompt) return 'native';
    const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && win.navigator?.maxTouchPoints > 1);
    return ios ? 'ios' : null;
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

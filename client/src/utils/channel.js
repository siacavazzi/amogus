// Which copy of the site this browser is on. Beta is a second install on the same domain:
// visiting any page with ?beta=1 sets a cookie that nginx routes to beta, ?beta=0 clears it.
// A cookie stays with one browser, so a link or QR code another phone opens must say beta itself,
// or that phone lands on the regular site and its room code matches no room there.
// Room codes typed by hand never carry it: only links and QR codes do.
export const BETA_PARAM = 'beta';

export function isBetaChannel(cookie = typeof document !== 'undefined' ? document.cookie : '') {
    return /(?:^|;\s*)sus_channel=beta(?:;|$)/.test(cookie || '');
}

/** Marks a URL object for beta when this browser is on beta (a link on the regular site stays as it is). */
export function markChannel(url, beta = isBetaChannel()) {
    if (beta) url.searchParams.set(BETA_PARAM, '1');
    return url;
}

/** The same link, marked for beta when this browser is on beta. */
export function withChannel(href, beta = isBetaChannel()) {
    if (!beta || !href) return href;
    try {
        return markChannel(new URL(href, window.location.origin), beta).toString();
    } catch (_) {
        return href;
    }
}

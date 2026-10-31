import { CLIENT_VERSION } from '../version';

// Signals only the browser sees. The server allowlists every field; keep this file to labels, never text people typed.
export function sendClientMetric(socket, payload) {
    try {
        if (socket?.connected) socket.emit('client_metric', payload);
    } catch (_) { /* Metrics never get in the way of play. */ }
}

function label(value, limit) {
    return typeof value === 'string' ? value.replace(/[^A-Za-z0-9_./:-]/g, '').slice(0, limit) : undefined;
}

// "main.1a2b3c.js:2:14523" from a stack line: the bundle and position, no message.
function bundleLocation(stack) {
    const match = typeof stack === 'string' && stack.match(/([A-Za-z0-9_.-]+\.js):(\d+):(\d+)/);
    return match ? `${match[1]}:${match[2]}:${match[3]}` : undefined;
}

export function errorMetric(error, { unhandledRejection = false, pathname = window.location.pathname } = {}) {
    return {
        kind: 'client_error',
        error_type: label(error?.name, 40) || 'Error',
        screen: label(pathname, 60),
        where: bundleLocation(error?.stack),
        client_version: label(CLIENT_VERSION.version, 40),
        unhandled_rejection: unhandledRejection,
    };
}

/** Report uncaught errors over the game socket. Returns a function that removes the listeners. */
export function installErrorReporting(getSocket) {
    let sent = 0;
    const report = (error, unhandledRejection) => {
        if (sent >= 10) return; // A render loop can throw hundreds of times.
        sent += 1;
        sendClientMetric(getSocket(), errorMetric(error, { unhandledRejection }));
    };
    const onError = event => report(event.error || { name: 'Error' }, false);
    const onRejection = event => report(event.reason instanceof Error ? event.reason : { name: 'UnhandledRejection' }, true);
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
        window.removeEventListener('error', onError);
        window.removeEventListener('unhandledrejection', onRejection);
    };
}

/**
 * Remembers what the page was doing when the socket last dropped: hidden (locked or switched app) or offline.
 * The next connection hands this to the server so disconnects can be told apart.
 */
export function createDropTracker({ doc = document, nav = navigator, now = () => Date.now() } = {}) {
    let hiddenSince = doc.visibilityState === 'hidden' ? now() : null;
    let drop = null;
    const onVisibility = () => {
        hiddenSince = doc.visibilityState === 'hidden' ? (hiddenSince ?? now()) : null;
        if (drop && doc.visibilityState !== 'hidden' && drop.hiddenAt !== null && drop.visibleAt === null) {
            drop.visibleAt = now();
        }
    };
    doc.addEventListener('visibilitychange', onVisibility);
    return {
        noteDisconnect() {
            drop = { at: now(), hiddenAt: hiddenSince, visibleAt: null, offline: nav.onLine === false };
        },
        // Called from the socket auth callback; only reconnects carry a report.
        report() {
            if (!drop) return undefined;
            const hiddenEnd = drop.visibleAt ?? (hiddenSince !== null ? now() : null);
            return {
                page_hidden: drop.hiddenAt !== null,
                hidden_seconds: drop.hiddenAt !== null && hiddenEnd !== null
                    ? Math.round((hiddenEnd - drop.hiddenAt) / 100) / 10 : undefined,
                browser_offline: drop.offline,
                seconds_since_drop: Math.round((now() - drop.at) / 100) / 10,
            };
        },
        clear() { drop = null; },
        stop() { doc.removeEventListener('visibilitychange', onVisibility); },
    };
}

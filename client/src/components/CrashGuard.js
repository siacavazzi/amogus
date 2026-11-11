import React from 'react';
import '../signal/signal.css';
import { t } from '../i18n';
import { errorMetric } from '../utils/clientMetrics';

// A render error used to unmount the whole app and leave the phone blank (the vote screen, Nov 2026).
// Now the page reloads once, which puts a player back in their game (reconnect keeps the player ID).
// If it crashes again soon after, we stop reloading and show a screen with a way out instead.
export const CRASH_RELOAD_KEY = 'sus_crash_reload_v1';
export const CRASH_REPORT_KEY = 'sus_crash_report_v1';
export const RELOAD_WINDOW_MS = 60 * 1000;

function storages() {
    const found = [];
    try { if (window.localStorage) found.push(window.localStorage); } catch (_) { /* blocked */ }
    try { if (window.sessionStorage) found.push(window.sessionStorage); } catch (_) { /* blocked */ }
    return found;
}

/** Note a reload for this crash, and say whether we may. No storage means no loop guard, so no reload. */
export function claimCrashReload(now = Date.now()) {
    for (const storage of storages()) {
        try {
            const last = Number(storage.getItem(CRASH_RELOAD_KEY));
            if (last && now - last >= 0 && now - last < RELOAD_WINDOW_MS) return false;
            storage.setItem(CRASH_RELOAD_KEY, String(now));
            if (storage.getItem(CRASH_RELOAD_KEY) === String(now)) return true;
        } catch (_) { /* try the next one */ }
    }
    return false;
}

// The socket lives inside the tree that crashed, so the report waits for the next connection.
function saveCrashReport(error, recovery) {
    for (const storage of storages()) {
        try {
            storage.setItem(CRASH_REPORT_KEY, JSON.stringify({ ...errorMetric(error), recovery }));
            return;
        } catch (_) { /* try the next one */ }
    }
}

/** The report a crash left for us, once. */
export function takeCrashReport() {
    for (const storage of storages()) {
        try {
            const saved = storage.getItem(CRASH_REPORT_KEY);
            if (!saved) continue;
            storage.removeItem(CRASH_REPORT_KEY);
            const report = JSON.parse(saved);
            return report && report.kind === 'client_error' ? report : null;
        } catch (_) { /* try the next one */ }
    }
    return null;
}

export function CrashScreen() {
    return (
        <div className="sg-screen sg-round" role="alert">
            <div className="sg-center sg-a sg-rise" style={{ gap: 18 }}>
                <h1 className="sg-big sg-h2">{t('Oops, something went wrong')}</h1>
                <p className="sg-lede" style={{ opacity: 0.85 }}>
                    {t('This screen hit a problem. If you were in a game, Try again usually puts you back in it.')}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 320 }}>
                    <button type="button" className="sg-btn sg-btn-white" onClick={() => window.location.reload()}>
                        {t('Try again')}
                    </button>
                    <a href="/" className="sg-btn sg-btn-ghost" style={{ textDecoration: 'none' }}>
                        {t('Back to the main screen')}
                    </a>
                </div>
            </div>
        </div>
    );
}

export default class CrashGuard extends React.Component {
    constructor(props) {
        super(props);
        this.state = { crashed: false, gaveUp: false };
    }

    static getDerivedStateFromError() {
        return { crashed: true };
    }

    componentDidCatch(error) {
        const reload = (this.props.claimReload || claimCrashReload)();
        saveCrashReport(error, reload ? 'reload' : 'crash_screen');
        if (reload) (this.props.reload || (() => window.location.reload()))();
        else this.setState({ gaveUp: true });
    }

    render() {
        if (!this.state.crashed) return this.props.children;
        // Blank for the moment the reload takes; the crash screen only once reloading has not helped.
        return this.state.gaveUp ? <CrashScreen /> : <div className="sg-screen sg-round" />;
    }
}

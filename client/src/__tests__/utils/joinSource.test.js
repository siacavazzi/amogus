import { buildRoomInviteUrl, getEntryMethodFromSearch } from '../../utils/inviteLinks';
import { createDropTracker, errorMetric } from '../../utils/clientMetrics';

describe('join source tags', () => {
    it('tells QR scans, Share-button links, home-page codes and untagged links apart', () => {
        expect(getEntryMethodFromSearch('?room=AEHM&via=qr')).toBe('qr');
        expect(getEntryMethodFromSearch('?room=AEHM&via=share')).toBe('share_link');
        expect(getEntryMethodFromSearch('?room=AEHM&via=home')).toBe('typed');
        expect(getEntryMethodFromSearch('?room=AEHM')).toBe('invite_link');
        expect(getEntryMethodFromSearch('?room=AEHM&via=whatever')).toBe('invite_link');
        expect(getEntryMethodFromSearch('?via=qr')).toBeNull();
    });

    it('adds the tag to links it builds', () => {
        expect(buildRoomInviteUrl('aehm', 'https://susparty.com', 'share')).toBe('https://susparty.com/play?room=AEHM&via=share');
        expect(buildRoomInviteUrl('aehm', 'https://susparty.com')).toBe('https://susparty.com/play?room=AEHM');
    });
});

describe('client metrics', () => {
    it('reports an error by type and bundle position, never its message', () => {
        const error = new TypeError('Cannot read name of Bob');
        error.stack = 'TypeError: Cannot read name of Bob\n    at x (https://susparty.com/static/js/main.1a2b.js:2:14523)';
        const metric = errorMetric(error, { pathname: '/play' });
        expect(metric).toMatchObject({ kind: 'client_error', error_type: 'TypeError', screen: '/play', where: 'main.1a2b.js:2:14523' });
        expect(JSON.stringify(metric)).not.toContain('Bob');
    });

    it('remembers that the page was hidden when the socket dropped', () => {
        let now = 0;
        const listeners = {};
        const doc = { visibilityState: 'visible', addEventListener: (name, fn) => { listeners[name] = fn; }, removeEventListener: () => {} };
        const tracker = createDropTracker({ doc, nav: { onLine: true }, now: () => now });
        expect(tracker.report()).toBeUndefined();
        now = 1000; doc.visibilityState = 'hidden'; listeners.visibilitychange();
        now = 5000; tracker.noteDisconnect();
        now = 31000; doc.visibilityState = 'visible'; listeners.visibilitychange();
        now = 32000;
        expect(tracker.report()).toEqual({ page_hidden: true, hidden_seconds: 30, browser_offline: false, seconds_since_drop: 27 });
        tracker.clear();
        expect(tracker.report()).toBeUndefined();
    });
});

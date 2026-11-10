import { savedGameUrl, readSavedGameLink, rememberSavedGame, readPendingSavedGame, readPendingGroup, keepSavedGame, shareLink } from '../../utils/savedGame';
import { installMethod } from '../../utils/installPrompt';

describe('saved game links', () => {
    let stored;
    beforeEach(() => {
        stored = {};
        localStorage.getItem.mockImplementation(key => stored[key] ?? null);
        localStorage.setItem.mockImplementation((key, value) => { stored[key] = value; });
    });

    it('reads the link the page was opened with, group from after the #', () => {
        expect(readSavedGameLink('?list=zn5qf2&utm_source=saved-game', '#group=tokenAAAAAAA'))
            .toEqual({ code: 'ZN5QF2', group: 'tokenAAAAAAA', via: 'saved_link' });
        expect(readSavedGameLink('?list=ZN5QF2&from=welcome', '')).toEqual({ code: 'ZN5QF2', group: '', via: 'welcome_back' });
        expect(readSavedGameLink('?list=ZN5QF2', '#group=bad token')).toEqual({ code: 'ZN5QF2', group: '', via: 'saved_link' });
        expect(readSavedGameLink('?utm_source=saved-game', '#group=tokenAAAAAAA')).toBeNull();
    });

    it('carries the list code and tags the visit', () => {
        expect(savedGameUrl('zn5qf2', 'https://susparty.com')).toBe('https://susparty.com/play?list=ZN5QF2&utm_source=saved-game');
        expect(savedGameUrl(null, 'https://susparty.com')).toBe('https://susparty.com/play?utm_source=saved-game');
    });

    it('keeps the code from the link until the phone creates a room, for 30 days', () => {
        expect(rememberSavedGame('?list=ZN5QF2&utm_source=saved-game', 1000)).toBe('ZN5QF2');
        expect(readPendingSavedGame(2000)).toBe('ZN5QF2');
        expect(readPendingSavedGame(1000 + 31 * 24 * 60 * 60 * 1000)).toBe('');
        expect(rememberSavedGame('?list=<script>')).toBe('');
    });

    it("carries the game's group token, so the next game stays in the same group", () => {
        expect(savedGameUrl('zn5qf2', 'https://susparty.com', { group: 'tokenAAAAAAA' }))
            .toBe('https://susparty.com/play?list=ZN5QF2&utm_source=saved-game#group=tokenAAAAAAA');
        expect(savedGameUrl('zn5qf2', 'https://susparty.com', { group: 'bad token' })).not.toContain('group=');
        rememberSavedGame('?list=ZN5QF2', 1000, '#group=tokenAAAAAAA');
        expect(readPendingGroup(2000)).toEqual({ group_link: 'tokenAAAAAAA', group_via: 'saved_link' });
        rememberSavedGame('?list=ZN5QF2&group=tokenCCCCCCC', 1000, '');   // an address from before the # move
        expect(readPendingGroup(2000)).toEqual({ group_link: 'tokenCCCCCCC', group_via: 'saved_link' });
        rememberSavedGame('?list=ZN5QF2&from=welcome', 1000, '#group=tokenAAAAAAA');
        expect(readPendingGroup(2000)).toEqual({ group_link: 'tokenAAAAAAA', group_via: 'welcome_back' });
        keepSavedGame('ZN5QF2', 1000, { group: 'tokenBBBBBBB', via: 'old_link' });
        expect(readPendingGroup(2000)).toEqual({ group_link: 'tokenBBBBBBB', group_via: 'old_link' });
        rememberSavedGame('?list=ZN5QF2', 1000, '');
        expect(readPendingGroup(2000)).toBeNull();
    });

    it('uses the share sheet, and the clipboard when there is none', async () => {
        const share = jest.fn().mockResolvedValue();
        expect(await shareLink({ url: 'u' }, { share })).toBe('shared');
        const writeText = jest.fn().mockResolvedValue();
        expect(await shareLink({ url: 'u' }, { clipboard: { writeText } })).toBe('copied');
        expect(writeText).toHaveBeenCalledWith('u');
        const cancelled = Object.assign(new Error('x'), { name: 'AbortError' });
        expect(await shareLink({ url: 'u' }, { share: jest.fn().mockRejectedValue(cancelled), clipboard: { writeText } })).toBe('cancelled');
    });
});

describe('add to home screen', () => {
    const win = (userAgent, extra = {}) => ({ navigator: { userAgent, ...extra }, matchMedia: () => ({ matches: false }) });

    it('names the right buttons for each browser and skips in-app browsers', () => {
        const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)';
        expect(installMethod({ win: win(`${iphone} Version/18.6 Mobile/15E148 Safari/604.1`), prompt: null })).toBe('safari');
        expect(installMethod({ win: win(`${iphone} Version/26.1 Mobile/15E148 Safari/604.1`), prompt: null })).toBe('safari_menu');
        expect(installMethod({ win: win(`${iphone} CriOS/142.0.7444.77 Mobile/15E148 Safari/604.1`), prompt: null })).toBe('chrome_ios');
        expect(installMethod({ win: win(`${iphone} FxiOS/144.0 Mobile/15E148 Safari/605.1.15`), prompt: null })).toBe('firefox_ios');
        expect(installMethod({ win: win(`${iphone} EdgiOS/142.0 Mobile/15E148 Safari/605.1.15`), prompt: null })).toBe('ios_menu');
        // Before iOS 16.4 only Safari could add to the home screen.
        expect(installMethod({ win: win('Mozilla/5.0 (iPhone; CPU iPhone OS 15_7 like Mac OS X) AppleWebKit/605.1.15 CriOS/120.0 Mobile/15E148 Safari/604.1'), prompt: null })).toBeNull();
        expect(installMethod({ win: win('Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile'), prompt: {} })).toBe('native');
        expect(installMethod({ win: win('Mozilla/5.0 (Linux; Android 14; Pixel 8) Gecko/130.0 Firefox/130.0'), prompt: null })).toBe('android_menu');
        expect(installMethod({ win: win('Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 SamsungBrowser/28.0 Chrome/130 Mobile Safari/537.36'), prompt: null })).toBe('samsung');
        expect(installMethod({ win: win('Mozilla/5.0 (Windows NT 10.0) Chrome/142.0 Safari/537.36'), prompt: {} })).toBe('native');
        expect(installMethod({ win: win('Mozilla/5.0 (Windows NT 10.0) Firefox/144.0'), prompt: null })).toBeNull();
        // In-app browsers: Facebook, the Google app, and an Android webview.
        expect(installMethod({ win: win(`${iphone} Mobile/15E148 [FBAN/FBIOS;FBAV/480.0]`), prompt: null })).toBeNull();
        expect(installMethod({ win: win(`${iphone} GSA/390.0 Mobile/15E148 Safari/604.1`), prompt: null })).toBeNull();
        expect(installMethod({ win: win('Mozilla/5.0 (Linux; Android 14; wv) Chrome/130 Mobile'), prompt: {} })).toBeNull();
        expect(installMethod({ win: win('Mozilla/5.0 (iPhone)', { standalone: true }), prompt: null })).toBeNull();
    });
});

import { savedGameUrl, rememberSavedGame, readPendingSavedGame, readPendingGroup, keepSavedGame, shareLink } from '../../utils/savedGame';
import { installMethod } from '../../utils/installPrompt';

describe('saved game links', () => {
    let stored;
    beforeEach(() => {
        stored = {};
        localStorage.getItem.mockImplementation(key => stored[key] ?? null);
        localStorage.setItem.mockImplementation((key, value) => { stored[key] = value; });
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
            .toBe('https://susparty.com/play?list=ZN5QF2&group=tokenAAAAAAA&utm_source=saved-game');
        expect(savedGameUrl('zn5qf2', 'https://susparty.com', { group: 'bad token' })).not.toContain('group=');
        rememberSavedGame('?list=ZN5QF2&group=tokenAAAAAAA', 1000);
        expect(readPendingGroup(2000)).toEqual({ group_link: 'tokenAAAAAAA', group_via: 'saved_link' });
        rememberSavedGame('?list=ZN5QF2&group=tokenAAAAAAA&from=welcome', 1000);
        expect(readPendingGroup(2000)).toEqual({ group_link: 'tokenAAAAAAA', group_via: 'welcome_back' });
        keepSavedGame('ZN5QF2', 1000, { group: 'tokenBBBBBBB', via: 'old_link' });
        expect(readPendingGroup(2000)).toEqual({ group_link: 'tokenBBBBBBB', group_via: 'old_link' });
        rememberSavedGame('?list=ZN5QF2', 1000);
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

    it('walks iPhone Safari through Share, uses Chrome\'s own sheet, and skips in-app browsers', () => {
        expect(installMethod({ win: win('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1'), prompt: null })).toBe('ios');
        expect(installMethod({ win: win('Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile'), prompt: {} })).toBe('native');
        expect(installMethod({ win: win('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) [FBAN/FBIOS;FBAV/480.0]'), prompt: null })).toBeNull();
        expect(installMethod({ win: win('Mozilla/5.0 (iPhone)', { standalone: true }), prompt: null })).toBeNull();
        expect(installMethod({ win: win('Mozilla/5.0 (Linux; Android 14) Firefox/130'), prompt: null })).toBeNull();
    });
});

import { isBetaChannel, withChannel } from '../../utils/channel';
import { buildRoomInviteUrl, buildRoomQrUrl } from '../../utils/inviteLinks';
import { savedGameUrl } from '../../utils/savedGame';
import { phoneStartUrl } from '../../components/LaptopHostPrompt';
import { regularSiteRoomUrl } from '../../components/RoomEntryNotice';

const setCookie = (value) => Object.defineProperty(document, 'cookie', { configurable: true, get: () => value });

describe('links shared from a beta browser stay on beta', () => {
    afterEach(() => setCookie(''));

    it('reads the beta cookie nginx sets', () => {
        expect(isBetaChannel('a=1; sus_channel=beta')).toBe(true);
        expect(isBetaChannel('sus_channel=betamax')).toBe(false);
        expect(isBetaChannel('')).toBe(false);
    });

    it('marks every shared link on beta and leaves regular-site links plain', () => {
        setCookie('sus_channel=beta');
        expect(buildRoomInviteUrl('abcd', 'https://susparty.com', 'share', 'k7Qm2xP9vT4w'))
            .toBe('https://susparty.com/play?room=ABCD&via=share&beta=1#g=k7Qm2xP9vT4w');
        expect(buildRoomQrUrl('abcd', { origin: 'https://susparty.com', linkToken: 'k7Qm2xP9vT4w' }))
            .toBe('https://susparty.com/play?room=ABCD&via=qr&beta=1#g=k7Qm2xP9vT4w');
        expect(savedGameUrl('zn5qf2', 'https://susparty.com', { group: 'tokenAAAAAAA' }))
            .toBe('https://susparty.com/play?list=ZN5QF2&utm_source=saved-game&beta=1#group=tokenAAAAAAA');
        expect(phoneStartUrl({ origin: 'https://susparty.com' })).toBe('https://susparty.com/play?from=laptop&beta=1');
        expect(withChannel('https://susparty.com/play?x=1#g=abc')).toBe('https://susparty.com/play?x=1&beta=1#g=abc');

        setCookie('');
        expect(buildRoomInviteUrl('abcd', 'https://susparty.com', 'share')).toBe('https://susparty.com/play?room=ABCD&via=share');
        expect(buildRoomQrUrl('abcd', { origin: 'https://susparty.com' })).toBe('https://susparty.com/play?room=ABCD&via=qr');
        expect(savedGameUrl('zn5qf2', 'https://susparty.com')).toBe('https://susparty.com/play?list=ZN5QF2&utm_source=saved-game');
        expect(phoneStartUrl({ origin: 'https://susparty.com' })).toBe('https://susparty.com/play?from=laptop');
        expect(withChannel('https://susparty.com/play?x=1')).toBe('https://susparty.com/play?x=1');
    });

    it('never puts the group token in the query string', () => {
        setCookie('sus_channel=beta');
        const url = new URL(buildRoomInviteUrl('abcd', 'https://susparty.com', null, 'k7Qm2xP9vT4w'));
        expect(url.search).not.toContain('k7Qm2xP9vT4w');
        expect(url.hash).toBe('#g=k7Qm2xP9vT4w');
    });

    it('offers the regular site when a beta phone finds no room', () => {
        const status = { code: 'room_not_found', room_code: 'abcd' };
        expect(regularSiteRoomUrl(status, true)).toBe(`${window.location.origin}/play?room=ABCD&beta=0`);
        expect(regularSiteRoomUrl(status, false)).toBe('');
        expect(regularSiteRoomUrl({ code: 'round_in_progress', room_code: 'ABCD' }, true)).toBe('');
        // A link to a room this beta never had looks like a game that ended.
        expect(regularSiteRoomUrl({ code: 'game_ended', room_code: 'ABCD', saved_game: null, group_room: null }, true))
            .toBe(`${window.location.origin}/play?room=ABCD&beta=0`);
        // A game this beta did play needs no detour.
        expect(regularSiteRoomUrl({ code: 'game_ended', room_code: 'ABCD', saved_game: { code: 'ZN5QF2' } }, true)).toBe('');
    });
});

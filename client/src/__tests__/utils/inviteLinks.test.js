import { buildRoomInviteUrl, getRoomCodeFromSearch, normalizeRoomCode } from '../../utils/inviteLinks';

describe('inviteLinks', () => {
    it('normalizes valid room codes', () => {
        expect(normalizeRoomCode(' abcd ')).toBe('ABCD');
        expect(normalizeRoomCode('a1b2')).toBe('A1B2');
    });

    it('rejects invalid room codes', () => {
        expect(normalizeRoomCode('ABC')).toBe('');
        expect(normalizeRoomCode('ABCDE')).toBe('');
        expect(normalizeRoomCode('AB-D')).toBe('');
    });

    it('parses room and room_code query params', () => {
        expect(getRoomCodeFromSearch('?room=abcd')).toBe('ABCD');
        expect(getRoomCodeFromSearch('?room_code=wxyz')).toBe('WXYZ');
    });

    it('builds a play invite URL from the current origin', () => {
        expect(buildRoomInviteUrl('abcd', 'https://susparty.com')).toBe('https://susparty.com/play?room=ABCD');
        expect(buildRoomInviteUrl('wxyz', 'http://localhost:3000')).toBe('http://localhost:3000/play?room=WXYZ');
    });
});

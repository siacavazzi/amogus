import { buildRoomInviteUrl, buildRoomQrUrl, getRoomCodeFromSearch, normalizeRoomCode } from '../../utils/inviteLinks';
import { qrPath } from '../../components/RoomQrCode';

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

    it('builds the reactor QR link: the invite link marked as a scan, on beta when the reactor is', () => {
        expect(buildRoomQrUrl('xyrr', { origin: 'https://susparty.com' })).toBe('https://susparty.com/play?room=XYRR&via=qr');
        expect(buildRoomQrUrl('xyrr', { origin: 'https://susparty.com', beta: true })).toBe('https://susparty.com/play?room=XYRR&via=qr&beta=1');
        expect(buildRoomQrUrl('', { origin: 'https://susparty.com' })).toBe('');
    });

    it('draws a small QR code for the link', () => {
        const { d, count } = qrPath('https://susparty.com/play?room=XYRR&via=qr&beta=1');
        // Version 3 (29 modules): big modules that a camera picks out from across the room.
        expect(count).toBe(29);
        expect(d).toMatch(/^M\d+ \d+h1v1h-1z/);
    });
});

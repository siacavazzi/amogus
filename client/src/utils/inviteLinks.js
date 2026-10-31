export const ROOM_QUERY_PARAM = 'room';
export const ROOM_QUERY_PARAM_ALIAS = 'room_code';

export function normalizeRoomCode(value) {
    if (!value) return '';
    const normalized = String(value).trim().toUpperCase();
    return /^[A-Z0-9]{4}$/.test(normalized) ? normalized : '';
}

export function getRoomCodeFromSearch(search = window.location.search) {
    const params = new URLSearchParams(search || '');
    return normalizeRoomCode(params.get(ROOM_QUERY_PARAM) || params.get(ROOM_QUERY_PARAM_ALIAS));
}

export function clearRoomCodeFromUrl() {
    const url = new URL(window.location.href);
    url.searchParams.delete(ROOM_QUERY_PARAM);
    url.searchParams.delete(ROOM_QUERY_PARAM_ALIAS);
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
}

export function buildRoomInviteUrl(roomCode, origin = window.location.origin) {
    const normalizedRoomCode = normalizeRoomCode(roomCode);
    if (!normalizedRoomCode) return '';

    const url = new URL('/play', origin);
    url.searchParams.set(ROOM_QUERY_PARAM, normalizedRoomCode);
    return url.toString();
}

// Tells the join apart from a link pasted into a group chat (the join event reports it).
export const JOIN_VIA_QUERY_PARAM = 'via';

// The link the reactor's QR code opens: the invite link, marked as a scan. A reactor on the
// beta channel (a cookie set by ?beta=1) hands phones the beta too, or they would join prod.
export function buildRoomQrUrl(roomCode, { origin = window.location.origin, beta = false } = {}) {
    const inviteUrl = buildRoomInviteUrl(roomCode, origin);
    if (!inviteUrl) return '';

    const url = new URL(inviteUrl);
    url.searchParams.set(JOIN_VIA_QUERY_PARAM, 'qr');
    if (beta) url.searchParams.set('beta', '1');
    return url.toString();
}

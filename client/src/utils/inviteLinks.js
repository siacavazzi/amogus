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

export function buildRoomInviteUrl(roomCode, origin = window.location.origin) {
    const normalizedRoomCode = normalizeRoomCode(roomCode);
    if (!normalizedRoomCode) return '';

    const url = new URL('/play', origin);
    url.searchParams.set(ROOM_QUERY_PARAM, normalizedRoomCode);
    return url.toString();
}

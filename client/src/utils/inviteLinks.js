export const ROOM_QUERY_PARAM = 'room';
export const ROOM_QUERY_PARAM_ALIAS = 'room_code';
// Tags where a join link came from, so the event log can split joins by channel.
export const VIA_QUERY_PARAM = 'via';
// The game's own random token. Room codes are short and get reused, so only the token lets an
// old link bring back the tasks that game played.
export const LINK_TOKEN_PARAM = 'g';
const ENTRY_METHOD_BY_VIA = { qr: 'qr', share: 'share_link', home: 'typed' };

/** How this page load reached a room: a QR scan, a shared link, a code typed on the home page, or an untagged link. */
export function getEntryMethodFromSearch(search = window.location.search) {
    const params = new URLSearchParams(search || '');
    if (!getRoomCodeFromSearch(search)) return null;
    return ENTRY_METHOD_BY_VIA[params.get(VIA_QUERY_PARAM)] || 'invite_link';
}

export function normalizeRoomCode(value) {
    if (!value) return '';
    const normalized = String(value).trim().toUpperCase();
    return /^[A-Z0-9]{4}$/.test(normalized) ? normalized : '';
}

export function getRoomCodeFromSearch(search = window.location.search) {
    const params = new URLSearchParams(search || '');
    return normalizeRoomCode(params.get(ROOM_QUERY_PARAM) || params.get(ROOM_QUERY_PARAM_ALIAS));
}

const isLinkToken = (value) => typeof value === 'string' && /^[A-Za-z0-9_-]{8,32}$/.test(value);

export function getLinkTokenFromSearch(search = window.location.search) {
    const token = new URLSearchParams(search || '').get(LINK_TOKEN_PARAM);
    return isLinkToken(token) ? token : '';
}

export function clearRoomCodeFromUrl() {
    const url = new URL(window.location.href);
    url.searchParams.delete(ROOM_QUERY_PARAM);
    url.searchParams.delete(ROOM_QUERY_PARAM_ALIAS);
    url.searchParams.delete(VIA_QUERY_PARAM);
    url.searchParams.delete(LINK_TOKEN_PARAM);
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
}

export function buildRoomInviteUrl(roomCode, origin = window.location.origin, via = null, linkToken = '') {
    const normalizedRoomCode = normalizeRoomCode(roomCode);
    if (!normalizedRoomCode) return '';

    const url = new URL('/play', origin);
    url.searchParams.set(ROOM_QUERY_PARAM, normalizedRoomCode);
    if (via) url.searchParams.set(VIA_QUERY_PARAM, via);
    if (isLinkToken(linkToken)) url.searchParams.set(LINK_TOKEN_PARAM, linkToken);
    return url.toString();
}

// Tells the join apart from a link pasted into a group chat (the join event reports it).
export const JOIN_VIA_QUERY_PARAM = 'via';

// The link the reactor's QR code opens: the invite link, marked as a scan. A reactor on the
// beta channel (a cookie set by ?beta=1) hands phones the beta too, or they would join prod.
export function buildRoomQrUrl(roomCode, { origin = window.location.origin, beta = false, linkToken = '' } = {}) {
    const inviteUrl = buildRoomInviteUrl(roomCode, origin, null, linkToken);
    if (!inviteUrl) return '';

    const url = new URL(inviteUrl);
    url.searchParams.set(JOIN_VIA_QUERY_PARAM, 'qr');
    if (beta) url.searchParams.set('beta', '1');
    return url.toString();
}

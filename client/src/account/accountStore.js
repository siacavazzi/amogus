// Optional host accounts on the page: who is signed in, and signing in or out.
//
// The session is an HttpOnly cookie the server sets, so this page never sees a token. The game's
// socket picks the cookie up when it connects. A host who signs in with the room already open
// trades the new cookie for a one-minute ticket and hands it to the open socket, so the room
// connection never drops.

import { useEffect, useState } from 'react';
import { ENDPOINT } from '../ENDPOINT';

const API = typeof window !== 'undefined' && window.location.port === '3000' ? ENDPOINT : '';
// The dev server (port 3000) talks to Flask on another origin, which can't take the session
// cookie, so sign-in stays off there. Skipping the check also keeps Safari from logging a CORS
// error on every page.
const SIGN_IN_OFF_HERE = API !== '';
const SNOOZE_KEY = 'sp_signin_snoozed_until';
const SNOOZE_DAYS = 30;

let state = { loaded: false, account: null, google: false, email: false, listsVersion: 0 };
const listeners = new Set();
let socket = null;
let loading = null;

function setState(patch) {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener(state));
}

async function call(path, { method = 'GET', body } = {}) {
    const response = await fetch(`${API}${path}`, {
        method,
        credentials: 'include',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
    });
    let data = {};
    try { data = await response.json(); } catch (_) { /* empty reply */ }
    return { status: response.status, ...data };
}

function deviceId() {
    try { return localStorage.getItem('device_id'); } catch (_) { return null; }
}

/** Lists this browser saved while signed out move into the account. */
async function adoptDeviceLists() {
    const id = deviceId();
    if (!id) return 0;
    try {
        const reply = await call('/api/account/adopt', { method: 'POST', body: { device_id: id } });
        return reply.moved || 0;
    } catch (_) {
        return 0;
    }
}

async function bindSocket() {
    if (!socket || !socket.connected) return;
    try {
        const { ticket } = await call('/api/account/ticket', { method: 'POST' });
        if (!ticket) return;
        await new Promise((resolve) => {
            const timer = setTimeout(resolve, 4000);
            socket.emit('bind_account', { ticket }, () => { clearTimeout(timer); resolve(); });
        });
    } catch (_) { /* the next reconnect carries the cookie anyway */ }
}

export function getAccountState() {
    return state;
}

export function loadAccount({ force = false } = {}) {
    if (loading && !force) return loading;
    loading = (async () => {
        if (SIGN_IN_OFF_HERE) {
            setState({ loaded: true });
            return state;
        }
        try {
            const reply = await call('/api/account');
            setState({ loaded: true, account: reply.account || null, google: Boolean(reply.google), email: Boolean(reply.email) });
            if (reply.account && (await adoptDeviceLists()) > 0) {
                await bindSocket();
                setState({ listsVersion: state.listsVersion + 1 });
            }
        } catch (_) {
            setState({ loaded: true });
        }
        return state;
    })();
    return loading;
}

/** The game's socket, so a sign-in can reach a room that's already open. */
export function attachAccountSocket(nextSocket) {
    socket = nextSocket;
}

/** Called once the server has set the cookie (email code or Google). */
export async function finishSignIn() {
    const reply = await call('/api/account');
    await adoptDeviceLists();
    await bindSocket();
    clearSnooze();
    setState({ loaded: true, account: reply.account || null, google: Boolean(reply.google), email: Boolean(reply.email), listsVersion: state.listsVersion + 1 });
    return reply.account;
}

export async function signOut() {
    await call('/api/auth/sign-out', { method: 'POST' });
    if (socket && socket.connected) socket.emit('unbind_account', {});
    setState({ account: null, listsVersion: state.listsVersion + 1 });
}

export async function deleteAccount() {
    const reply = await call('/api/account/delete', { method: 'POST' });
    if (reply.ok) {
        if (socket && socket.connected) socket.emit('unbind_account', {});
        setState({ account: null, listsVersion: state.listsVersion + 1 });
    }
    return reply.ok;
}

export function requestEmailCode(email, lang) {
    return call('/api/auth/email/start', { method: 'POST', body: { email, lang } });
}

export async function verifyEmailCode(email, code) {
    const reply = await call('/api/auth/email/verify', { method: 'POST', body: { email, code } });
    if (reply.ok) await finishSignIn();
    return reply;
}

export function fetchAccountLists() {
    return call('/api/account/lists');
}

export function googleStartUrl({ popup, returnTo }) {
    const params = new URLSearchParams({ return: returnTo || '/account' });
    if (popup) params.set('popup', '1');
    return `${API}/api/auth/google/start?${params.toString()}`;
}

export function snoozed() {
    try { return Number(localStorage.getItem(SNOOZE_KEY) || 0) > Date.now(); } catch (_) { return false; }
}

export function snooze() {
    try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 24 * 3600 * 1000)); } catch (_) { /* this visit only */ }
}

export function clearSnooze() {
    try { localStorage.removeItem(SNOOZE_KEY); } catch (_) { /* nothing saved */ }
}

/** Account state for a component; loads it on first use. */
export function useAccount() {
    const [current, setCurrent] = useState(state);
    useEffect(() => {
        listeners.add(setCurrent);
        setCurrent(state);
        loadAccount();
        return () => listeners.delete(setCurrent);
    }, []);
    return current;
}

/** True when this site can sign anyone in at all (Google or email is set up). */
export function signInAvailable(current) {
    return Boolean(current.loaded && (current.google || current.email));
}

// Tests reset the module between cases.
export function resetAccountStoreForTests() {
    state = { loaded: false, account: null, google: false, email: false, listsVersion: 0 };
    listeners.clear();
    socket = null;
    loading = null;
}

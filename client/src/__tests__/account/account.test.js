import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import SaveListsPrompt from '../../account/SaveListsPrompt';
import AccountButton from '../../account/AccountButton';
import { resetAccountStoreForTests } from '../../account/accountStore';

function reply(body, status = 200) {
    return Promise.resolve({ status, json: () => Promise.resolve(body) });
}

function mockServer({ account = null, google = true, email = true } = {}) {
    const calls = [];
    let signedIn = account;
    global.fetch = jest.fn((url, options = {}) => {
        const body = options.body ? JSON.parse(options.body) : null;
        calls.push({ url, method: options.method || 'GET', body });
        if (url.endsWith('/api/account')) return reply({ account: signedIn, google, email });
        if (url.endsWith('/api/auth/email/start')) return reply({ ok: true });
        if (url.endsWith('/api/auth/email/verify')) {
            if (body.code !== '4821') return reply({ ok: false, reason: 'wrong' }, 400);
            signedIn = { id: 'a_1', email: body.email, name: '', google: false };
            return reply({ ok: true, account: signedIn, google, email });
        }
        if (url.endsWith('/api/account/adopt')) return reply({ ok: true, moved: 2 });
        if (url.endsWith('/api/account/ticket')) return reply({ ok: true, ticket: 't' });
        return reply({ ok: true });
    });
    return calls;
}

const realUserAgent = navigator.userAgent;

beforeEach(() => {
    resetAccountStoreForTests();
    // setupTests mocks storage with fixed answers; give these tests a working one.
    const saved = { device_id: 'device_abc12345' };
    localStorage.getItem.mockImplementation((key) => (key in saved ? saved[key] : null));
    localStorage.setItem.mockImplementation((key, value) => { saved[key] = String(value); });
    localStorage.removeItem.mockImplementation((key) => { delete saved[key]; });
});

afterEach(() => {
    delete global.fetch;
    Object.defineProperty(window.navigator, 'userAgent', { value: realUserAgent, configurable: true });
});

test('stays hidden while sign-in is not set up on the server', async () => {
    const calls = mockServer({ google: false, email: false });
    render(<SaveListsPrompt moment="saved" />);
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    await act(async () => {});
    expect(screen.queryByTestId('save-lists-prompt')).toBeNull();
});

test('shows at a moment, and "Not now" quiets the next ones for 30 days, except a new list', async () => {
    mockServer();
    const { rerender } = render(<SaveListsPrompt moment="saved" key="saved" />);
    expect(await screen.findByTestId('save-lists-prompt')).toBeTruthy();
    expect(screen.getByText('Continue with Google')).toBeTruthy();
    fireEvent.click(screen.getByText('Not now'));
    expect(screen.queryByTestId('save-lists-prompt')).toBeNull();
    expect(Number(localStorage.getItem('sp_signin_snoozed_until'))).toBeGreaterThan(Date.now() + 29 * 24 * 3600 * 1000);

    rerender(<SaveListsPrompt moment="code" key="code" />);
    expect(screen.queryByTestId('save-lists-prompt')).toBeNull();

    rerender(<SaveListsPrompt moment="created" key="created" />);
    expect(screen.getByTestId('save-lists-prompt')).toBeTruthy();
});

test('never shows to a host who is already signed in', async () => {
    const calls = mockServer({ account: { id: 'a_1', email: 'host@x.co', name: '', google: false } });
    render(<SaveListsPrompt moment="created" />);
    await waitFor(() => expect(calls.some((c) => c.url.endsWith('/api/account/adopt'))).toBe(true));
    expect(screen.queryByTestId('save-lists-prompt')).toBeNull();
});

test('signs in with an email code and moves this browser\'s lists into the account', async () => {
    const calls = mockServer();
    render(<SaveListsPrompt moment="created" />);
    fireEvent.click(await screen.findByText('Email me a code'));
    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'host@x.co' } });
    fireEvent.click(screen.getByText('Email me a code'));
    const code = await screen.findByLabelText('Code');
    expect(code.getAttribute('autocomplete')).toBe('one-time-code');
    expect(code.getAttribute('inputmode')).toBe('numeric');

    fireEvent.change(code, { target: { value: '1111' } });
    expect(await screen.findByRole('alert')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Code'), { target: { value: '48-21' } });
    expect(await screen.findByTestId('save-lists-done')).toBeTruthy();
    const adopt = calls.find((c) => c.url.endsWith('/api/account/adopt'));
    expect(adopt.body).toEqual({ device_id: 'device_abc12345' });
});

test('hides Google inside Instagram\'s browser, where Google blocks sign-in', async () => {
    Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 300.0',
        configurable: true,
    });
    mockServer();
    render(<SaveListsPrompt moment="created" />);
    expect(await screen.findByText('Email me a code')).toBeTruthy();
    expect(screen.queryByText('Continue with Google')).toBeNull();
    expect(screen.getByText('To use Google, open susparty.com in Safari or Chrome.')).toBeTruthy();
});

test('the top link reads "Sign in", then becomes the host\'s initial', async () => {
    mockServer({ account: { id: 'a_1', email: 'pat@x.co', name: 'Pat', google: true } });
    render(<AccountButton />);
    const avatar = await screen.findByLabelText('Account');
    expect(avatar.textContent).toBe('P');
    fireEvent.click(avatar);
    expect(screen.getByText('My lists').getAttribute('href')).toBe('/account');
});

import React from 'react';
import { act, fireEvent } from '@testing-library/react';
import { renderWithContext, screen } from '../../test-utils';
import { configureTestStorage } from '../../testing/gameFlowHarness';
import InAppBrowserWarning, { resetInAppReportForTests } from '../../components/InAppBrowserWarning';

const REDDIT_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Reddit/Version 2024.12.0/Build 1543101/iOS Version 17.4';
const FACEBOOK_ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/122.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/455.0.0.48.110;]';
const SAFARI_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';

beforeAll(() => {
    // JSDOM lacks native dialog methods.
    HTMLDialogElement.prototype.showModal = function () { this.open = true; };
    HTMLDialogElement.prototype.close = function () { this.open = false; };
});
beforeEach(() => configureTestStorage());
afterEach(() => jest.restoreAllMocks());

// The component reports once per page load; each test is a fresh load.
function renderOn(userAgent, context = { roomCode: 'ABCD' }) {
    jest.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(userAgent);
    resetInAppReportForTests();
    return renderWithContext(<InAppBrowserWarning />, context);
}

function metrics(socket) {
    return socket.emit.mock.calls.filter(([event]) => event === 'client_metric').map(([, payload]) => payload);
}

test('asks iPhone players in Reddit to move to Safari, and lets them carry on', () => {
    const { contextValue } = renderOn(REDDIT_IPHONE);
    expect(screen.getByRole('heading', { name: 'Open this in Safari' })).toBeVisible();
    expect(screen.getByText(/You're in Reddit's built-in browser\./)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Open in Safari' }))
        .toHaveAttribute('href', 'x-safari-http://localhost/play?room=ABCD');
    expect(metrics(contextValue.socket)).toEqual([{ kind: 'in_app_browser', app: 'reddit', os: 'ios', action: 'shown' }]);

    fireEvent.click(screen.getByRole('button', { name: 'Keep playing here' }));
    expect(screen.queryByTestId('in-app-browser-warning')).not.toBeInTheDocument();
    expect(metrics(contextValue.socket).at(-1)).toMatchObject({ action: 'keep_playing' });
    expect(window.sessionStorage.getItem('sus_in_app_warning_dismissed')).toBe('1');
});

test('offers Chrome on Android and copies the room link', async () => {
    Object.assign(navigator, { clipboard: { writeText: jest.fn().mockResolvedValue() } });
    const { contextValue } = renderOn(FACEBOOK_ANDROID);
    expect(screen.getByRole('heading', { name: 'Open this in Chrome' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Open in Chrome' }).getAttribute('href')).toMatch(/^intent:\/\/localhost\/play\?room=ABCD#Intent;/);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copy link' })); });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('http://localhost/play?room=ABCD');
    expect(screen.getByText('Link copied. Paste it into Chrome.')).toBeVisible();
    expect(metrics(contextValue.socket).map(m => m.action)).toEqual(['shown', 'copy_link']);
});

test('stays hidden after a dismissal this session but still counts the phone', () => {
    configureTestStorage({ sessionStorage: { sus_in_app_warning_dismissed: '1' } });
    const { contextValue } = renderOn(REDDIT_IPHONE);
    expect(screen.queryByTestId('in-app-browser-warning')).not.toBeInTheDocument();
    expect(metrics(contextValue.socket)).toEqual([{ kind: 'in_app_browser', app: 'reddit', os: 'ios', action: 'already_dismissed' }]);
});

test('never shows in Safari', () => {
    const { contextValue } = renderOn(SAFARI_IPHONE);
    expect(screen.queryByTestId('in-app-browser-warning')).not.toBeInTheDocument();
    expect(metrics(contextValue.socket)).toEqual([]);
});

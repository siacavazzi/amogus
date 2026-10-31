/**
 * Tests for ConnectingPage - Shown while the phone has no connection to the game server
 *
 * Game Flow Context:
 * - Shows when the socket drops (wifi blink, locked phone) or on first load
 * - After 6 seconds still connecting, it reloads the page
 * - It must not reload while the phone is offline: the browser would show its own
 *   "no internet" page, which never comes back to the game by itself
 */
import React from 'react';
import { renderWithContext, act } from '../../test-utils';
import ConnectingPage from '../../pages/ConnectingPage';

describe('ConnectingPage', () => {
    const originalLocation = window.location;
    let reload;
    let online;

    beforeEach(() => {
        jest.useFakeTimers();
        reload = jest.fn();
        delete window.location;
        window.location = { ...originalLocation, reload };
        online = true;
        jest.spyOn(window.navigator, 'onLine', 'get').mockImplementation(() => online);
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
        window.location = originalLocation;
    });

    it('reloads after 6 seconds still connecting', () => {
        renderWithContext(<ConnectingPage />, { roomCode: 'ABCD' });
        act(() => { jest.advanceTimersByTime(5900); });
        expect(reload).not.toHaveBeenCalled();
        act(() => { jest.advanceTimersByTime(200); });
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it('waits for the connection to come back before reloading', () => {
        online = false;
        renderWithContext(<ConnectingPage />, { roomCode: 'ABCD' });
        act(() => { jest.advanceTimersByTime(30000); });
        expect(reload).not.toHaveBeenCalled();

        online = true;
        act(() => { jest.advanceTimersByTime(1000); });
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it('does not reload once it has gone away', () => {
        const { unmount } = renderWithContext(<ConnectingPage />, { roomCode: 'ABCD' });
        unmount();
        act(() => { jest.advanceTimersByTime(10000); });
        expect(reload).not.toHaveBeenCalled();
    });
});

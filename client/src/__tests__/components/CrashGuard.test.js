import React from 'react';
import { render, screen } from '@testing-library/react';
import CrashGuard, {
    claimCrashReload, takeCrashReport, CRASH_RELOAD_KEY, RELOAD_WINDOW_MS,
} from '../../components/CrashGuard';
import { configureTestStorage, restoreTestStorage } from '../../testing/gameFlowHarness';

function Boom() {
    throw new TypeError("Cannot read properties of null (reading 'stage')");
}

describe('CrashGuard', () => {
    let consoleError;

    beforeEach(() => {
        configureTestStorage();
        // React logs every caught render error; the test expects them.
        consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleError.mockRestore();
        restoreTestStorage();
    });

    it('reloads the page once after a render crash instead of leaving it blank', () => {
        const reload = jest.fn();
        const { container } = render(<CrashGuard reload={reload}><Boom /></CrashGuard>);
        expect(reload).toHaveBeenCalledTimes(1);
        expect(window.localStorage.getItem(CRASH_RELOAD_KEY)).not.toBeNull();
        expect(container.firstChild).not.toBeNull();
        expect(screen.queryByText('Oops, something went wrong')).toBeNull();
    });

    it('shows the crash screen, with a way back, when the page crashes again right after reloading', () => {
        window.localStorage.setItem(CRASH_RELOAD_KEY, String(Date.now() - 5000));
        const reload = jest.fn();
        render(<CrashGuard reload={reload}><Boom /></CrashGuard>);
        expect(reload).not.toHaveBeenCalled();
        expect(screen.getByText('Oops, something went wrong')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Back to the main screen' })).toHaveAttribute('href', '/');
    });

    it('may reload again for a crash long after the last reload', () => {
        const now = 1_000_000_000;
        window.localStorage.setItem(CRASH_RELOAD_KEY, String(now - RELOAD_WINDOW_MS - 1));
        expect(claimCrashReload(now)).toBe(true);
        expect(claimCrashReload(now + 1000)).toBe(false);
    });

    it('never reloads when the browser blocks storage, so it cannot loop', () => {
        const blocked = () => { throw new Error('blocked'); };
        window.localStorage.getItem.mockImplementation(blocked);
        window.sessionStorage.getItem.mockImplementation(blocked);
        expect(claimCrashReload()).toBe(false);
    });

    it('keeps an error report, without the message, for the next connection, once', () => {
        render(<CrashGuard reload={jest.fn()}><Boom /></CrashGuard>);
        const report = takeCrashReport();
        expect(report).toEqual(expect.objectContaining({ kind: 'client_error', error_type: 'TypeError', recovery: 'reload' }));
        expect(JSON.stringify(report)).not.toMatch(/stage/);
        expect(takeCrashReport()).toBeNull();
    });

    it('renders its children when nothing goes wrong', () => {
        render(<CrashGuard><p>Game</p></CrashGuard>);
        expect(screen.getByText('Game')).toBeInTheDocument();
    });
});

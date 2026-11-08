import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import WelcomeBackCard from '../../components/WelcomeBackCard';
import { rememberLastGame } from '../../utils/lastGame';

describe('Welcome back card', () => {
    let store;
    beforeEach(() => {
        store = {};
        localStorage.getItem.mockImplementation((key) => (key in store ? store[key] : null));
        localStorage.setItem.mockImplementation((key, value) => { store[key] = String(value); });
    });

    it('shows nothing on a phone that never finished a game', () => {
        const { container } = render(<WelcomeBackCard />);
        expect(container).toBeEmptyDOMElement();
    });

    it("offers the phone's last game with its tasks", () => {
        rememberLastGame({ code: 'zn5qf2', taskCount: 33 }, new Date(2026, 10, 6, 21).getTime());
        render(<WelcomeBackCard />);
        expect(screen.getByText('Welcome back')).toBeInTheDocument();
        expect(screen.getByText(/same 33 tasks/)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Host it again' })).toHaveAttribute('href', expect.stringContaining('/play?list=ZN5QF2'));
    });

    it('stays hidden after Not now until another game is finished', () => {
        rememberLastGame({ code: 'ZN5QF2', taskCount: 33 });
        const first = render(<WelcomeBackCard />);
        fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
        expect(screen.queryByText('Welcome back')).toBeNull();
        first.unmount();
        render(<WelcomeBackCard />);
        expect(screen.queryByText('Welcome back')).toBeNull();
        rememberLastGame({ code: 'WXYZ12', taskCount: 20 });
    });
});

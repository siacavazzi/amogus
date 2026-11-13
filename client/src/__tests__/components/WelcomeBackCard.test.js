import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
        expect(screen.getByRole('link', { name: 'Play it again' })).toHaveAttribute('href', expect.stringContaining('/play?list=ZN5QF2'));
    });

    describe('with the group behind the game', () => {
        afterEach(() => { delete global.fetch; });
        const respond = body => { global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(body) }); };

        it("shows the group's score and keeps the group on the link", async () => {
            respond({ recap: { rooms: 2, rounds: 9, crew_wins: 5, intruder_wins: 4 }, room: null });
            rememberLastGame({ code: 'ZN5QF2', taskCount: 33, group: 'tokenAAAAAAA' });
            render(<WelcomeBackCard />);
            await waitFor(() => expect(screen.getByTestId('group-recap')).toBeInTheDocument());
            expect(global.fetch).toHaveBeenCalledWith('/api/group', expect.objectContaining({ method: 'POST', body: JSON.stringify({ g: 'tokenAAAAAAA' }) }));
            expect(screen.getByTestId('group-recap-crew')).toHaveTextContent('5');
            expect(screen.getByTestId('group-recap-intruders')).toHaveTextContent('4');
            const href = screen.getByRole('link', { name: 'Play it again' }).getAttribute('href');
            expect(href).toContain('#group=tokenAAAAAAA');
            expect(href).toContain('from=welcome');
        });

        it("sends the phone to the room a friend already started", async () => {
            respond({ recap: null, room: { room_code: 'RSJO', link_token: 'tokenBBBBBBB' } });
            rememberLastGame({ code: 'ZN5QF2', taskCount: 33, group: 'tokenAAAAAAA' });
            render(<WelcomeBackCard />);
            const link = await screen.findByRole('link', { name: 'Join your group' });
            expect(link.getAttribute('href')).toContain('room=RSJO');
            expect(link.getAttribute('href')).toContain('#g=tokenBBBBBBB');
        });

        it('asks the beta server on a beta page, because the request carries no cookies', async () => {
            const cookie = jest.spyOn(document, 'cookie', 'get').mockReturnValue('sus_channel=beta');
            respond({ recap: { rooms: 1, rounds: 1, crew_wins: 1, intruder_wins: 0 }, room: null });
            rememberLastGame({ code: 'ZN5QF2', taskCount: 33, group: 'tokenAAAAAAA' });
            render(<WelcomeBackCard />);
            await waitFor(() => expect(screen.getByTestId('group-recap')).toBeInTheDocument());
            expect(global.fetch).toHaveBeenCalledWith('/api/group?beta=1', expect.objectContaining({ credentials: 'omit', body: JSON.stringify({ g: 'tokenAAAAAAA' }) }));
            cookie.mockRestore();
        });

        it('works as before when the phone has no group token', () => {
            global.fetch = jest.fn();
            rememberLastGame({ code: 'ZN5QF2', taskCount: 33 });
            render(<WelcomeBackCard />);
            expect(global.fetch).not.toHaveBeenCalled();
        });
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

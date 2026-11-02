import React from 'react';
import { act, fireEvent, renderWithContext, screen } from '../../test-utils';
import ReactorPage from '../../pages/ReactorPage';

describe('Reactor meeting guard', () => {
    it.each(['waiting', 'voting'])(
        'blocks sabotage during the %s stage', (stage) => {
            renderWithContext(<ReactorPage />, {
                meetingState: { stage }, hackTime: 0, endState: null,
            });
            expect(screen.getByRole('button', { name: /sabotage core/i })).toBeDisabled();
            expect(screen.getByText('Cannot sabotage during meeting')).toBeInTheDocument();
        }
    );

    it('allows sabotage after meeting results', () => {
        renderWithContext(<ReactorPage />, {
            meetingState: { stage: 'over' }, hackTime: 0, endState: null,
        });
        expect(screen.getByRole('button', { name: /sabotage core/i })).toBeEnabled();
    });
});

describe('ReactorPage latecomers corner', () => {
    const { LateJoin } = require('../../pages/ReactorPage');
    const { render, screen } = require('@testing-library/react');

    it('shows a next-round QR and who is joining next round', () => {
        render(<LateJoin roomCode="MTRX" waitingPlayers={[
            { player_id: 'a', username: 'Jamie', pic: 1 },
            { player_id: 'b', username: 'Ari', pic: 2 },
        ]} />);
        expect(screen.getByText('Late? Scan to join the next round')).toBeInTheDocument();
        expect(screen.getByText('+2 joining next round')).toBeInTheDocument();
    });

    it('shows only the QR while nobody is waiting', () => {
        render(<LateJoin roomCode="MTRX" waitingPlayers={[]} />);
        expect(screen.queryByTestId('reactor-waiting-list')).toBeNull();
        expect(screen.getByText('Late? Scan to join the next round')).toBeInTheDocument();
    });

    it('invites latecomers straight into the round when the room deals them in', () => {
        render(<LateJoin roomCode="MTRX" live waitingPlayers={[{ player_id: 'a', username: 'Jamie', pic: 1 }]} />);
        expect(screen.getByText('Late? Scan to join')).toBeInTheDocument();
        expect(screen.getByText('+1 waiting to join')).toBeInTheDocument();
    });
});

describe('ReactorPage sabotage', () => {
    afterEach(() => {
        jest.useRealTimers();
        localStorage.clear();
    });

    const press = (overrides = {}) => {
        jest.useFakeTimers();
        // The same browser played as a phone earlier: that id must not ride along with the screen.
        localStorage.setItem('player_id', 'phone-in-this-browser');
        const rendered = renderWithContext(<ReactorPage />, { roomCode: 'ABCD', meetingState: null, ...overrides });
        fireEvent.click(screen.getByRole('button', { name: /SABOTAGE CORE/ }));
        act(() => { jest.advanceTimersByTime(3000); });
        return rendered;
    };

    it('sends the room, never a phone id, after the three second arm', () => {
        const { contextValue } = press();
        expect(contextValue.socket.emit).toHaveBeenCalledWith('meltdown', { room_code: 'ABCD' }, expect.any(Function));
    });

    it('says why when the server refuses the sabotage, instead of doing nothing', () => {
        const { contextValue } = press();
        const ack = contextValue.socket.emit.mock.calls.find(([event]) => event === 'meltdown')[2];
        act(() => ack({ ok: false, error: 'This screen lost its place in the room. Reload it.' }));
        expect(screen.getByTestId('sabotage-error')).toHaveTextContent('lost its place');
    });
});

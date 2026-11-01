import React from 'react';
import { renderWithContext, screen } from '../../test-utils';
import WaitingNextRoundPage from '../../pages/WaitingNextRoundPage';

const base = {
    roomCode: 'MTRX',
    playerState: { username: 'Late', playerId: 'late-1', pic: 3 },
    waitingPlayers: [
        { player_id: 'late-1', username: 'Late', pic: 3 },
        { player_id: 'late-2', username: 'Jamie', pic: 5 },
    ],
};

describe('WaitingNextRoundPage', () => {
    it('tells the latecomer they are in for the next round', () => {
        renderWithContext(<WaitingNextRoundPage />, base);
        expect(screen.getByText("You're in!")).toBeInTheDocument();
        expect(screen.getByText(/dealt in when the next round starts/)).toBeInTheDocument();
        expect(screen.getByText('Late')).toBeInTheDocument();
    });

    it('lists the other phones waiting, not this one twice', () => {
        renderWithContext(<WaitingNextRoundPage />, base);
        expect(screen.getByText('Also joining next round: 1')).toBeInTheDocument();
        expect(screen.getByText('Jamie')).toBeInTheDocument();
    });

    it('follows what the round is doing', () => {
        const { unmount } = renderWithContext(<WaitingNextRoundPage />, { ...base, meetingState: { stage: 'voting' } });
        expect(screen.getByTestId('waiting-round-status')).toHaveTextContent('A meeting is on');
        unmount();
        renderWithContext(<WaitingNextRoundPage />, { ...base, endState: 'victory' });
        expect(screen.getByTestId('waiting-round-status')).toHaveTextContent('This round is over');
    });
});

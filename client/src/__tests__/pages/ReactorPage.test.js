import React from 'react';
import { renderWithContext, screen } from '../../test-utils';
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
});

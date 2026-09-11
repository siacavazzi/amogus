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

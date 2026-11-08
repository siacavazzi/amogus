import React from 'react';
import { renderWithContext, screen, fireEvent } from '../../test-utils';
import EndGameButtons from '../../components/EndGameButtons';

describe('Play Again', () => {
    beforeEach(() => localStorage.getItem.mockImplementation((key) => (key === 'player_id' ? 'p1' : null)));

    it('casts this phone\'s vote once, even when tapped repeatedly', () => {
        const { contextValue } = renderWithContext(<EndGameButtons />, { roomCode: 'ABCD', isMobile: true });
        const button = screen.getByRole('button', { name: /Play Again/ });
        fireEvent.click(button);
        fireEvent.click(button);
        const resets = contextValue.socket.emit.mock.calls.filter(([event]) => event === 'reset');
        expect(resets).toEqual([['reset', { player_id: 'p1', room_code: 'ABCD' }]]);
    });

    it('takes the room back to the lobby from the reactor, which has no vote', () => {
        localStorage.getItem.mockImplementation(() => null);
        const { contextValue } = renderWithContext(<EndGameButtons />, { roomCode: 'ABCD', isMobile: false });
        fireEvent.click(screen.getByRole('button', { name: /Play Again/ }));
        expect(contextValue.socket.emit).toHaveBeenCalledWith('reset', { room_code: 'ABCD', force: true });
    });
});

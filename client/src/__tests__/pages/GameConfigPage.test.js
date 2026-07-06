import React from 'react';
import GameConfigPage from '../../pages/GameConfigPage';
import { renderWithContext, screen, fireEvent, waitFor } from '../../test-utils';

describe('GameConfigPage card deck settings', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    it('saves the selected card deck preset with the game config', async () => {
        const { contextValue } = renderWithContext(<GameConfigPage />, { roomCode: 'ROOM1' });

        fireEvent.click(screen.getByRole('button', { name: /Create Tasks with Group/i }));
        fireEvent.click(screen.getByRole('button', { name: /Advanced Settings/i }));
        fireEvent.click(screen.getByRole('button', { name: /Fake Task Chaos/i }));
        fireEvent.click(screen.getByRole('button', { name: /Open Room/i }));

        await waitFor(() => {
            expect(contextValue.socket.emit).toHaveBeenCalledWith('update_game_config', expect.objectContaining({
                room_code: 'ROOM1',
                config: expect.objectContaining({
                    card_deck_preset: 'fake_task_chaos',
                }),
            }));
        });
    });

    it('switches to custom mode when a card count changes', async () => {
        const { contextValue } = renderWithContext(<GameConfigPage />, { roomCode: 'ROOM2' });

        fireEvent.click(screen.getByRole('button', { name: /Create Tasks with Group/i }));
        fireEvent.click(screen.getByRole('button', { name: /Advanced Settings/i }));
        fireEvent.click(screen.getByRole('button', { name: /^Custom/i }));
        fireEvent.click(screen.getByRole('button', { name: /Increase Fake Task/i }));
        fireEvent.click(screen.getByRole('button', { name: /Open Room/i }));

        await waitFor(() => {
            expect(contextValue.socket.emit).toHaveBeenCalledWith('update_game_config', expect.objectContaining({
                room_code: 'ROOM2',
                config: expect.objectContaining({
                    card_deck_preset: 'custom',
                    card_deck_counts: expect.objectContaining({
                        fake_task: 7,
                    }),
                }),
            }));
        });
    });
});

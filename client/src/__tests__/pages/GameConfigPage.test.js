import React from 'react';
import GameConfigPage from '../../pages/GameConfigPage';
import { renderWithContext, screen, fireEvent, waitFor } from '../../test-utils';
import { act } from '@testing-library/react';
import { saveGameDraft } from '../../pages/seo/gameDraft';

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

    it('keeps the generated settings after the server applies its task list', () => {
        const items = new Map();
        sessionStorage.getItem.mockImplementation(key => items.get(key) || null);
        sessionStorage.setItem.mockImplementation((key, value) => items.set(key, value));
        sessionStorage.removeItem.mockImplementation(key => items.delete(key));
        window.history.replaceState(null, '', '/play?setup=generated');
        const tasks = Array.from({ length: 24 }, (_, index) => ({ task: `Task ${index}`, location: 'Kitchen' }));
        saveGameDraft({ name: 'House tasks', playerCount: 8, locations: ['Kitchen', 'Hallway'], tasks,
            recommendations: { intruderCount: 1, meetingSeconds: 90, taskGoalPerCrewmate: 5 } });
        const { contextValue } = renderWithContext(<GameConfigPage />, { roomCode: 'ROOM3' });
        const receive = (event, data) => act(() => {
            contextValue.socket.on.mock.calls.filter(call => call[0] === event).slice(-1)[0][1](data);
        });
        fireEvent.click(screen.getByRole('button', { name: 'Import generated tasks' }));
        receive('task_list_created', { task_list: { code: 'PACK01', name: 'House tasks', tasks, locations: ['Kitchen', 'Hallway', 'Other'] } });
        fireEvent.click(screen.getByRole('button', { name: /Use This Task List/ }));
        receive('task_list_applied', { task_list_code: 'PACK01', task_count: 24 });
        receive('game_config', { vote_time: 180, task_ratio: 10, num_intruders: 1, locations: ['Kitchen', 'Hallway', 'Other'] });
        fireEvent.click(screen.getByRole('button', { name: /Open Room/ }));
        expect(contextValue.socket.emit).toHaveBeenCalledWith('update_game_config', expect.objectContaining({
            config: expect.objectContaining({ vote_time: 90, task_ratio: 5 }),
        }));
    });
});

describe('GameConfigPage intruder count', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    const openRoomWith = async (contextValue, roomCode, numIntruders) => {
        fireEvent.click(screen.getByRole('button', { name: /Open Room/i }));
        await waitFor(() => {
            expect(contextValue.socket.emit).toHaveBeenCalledWith('update_game_config', expect.objectContaining({
                room_code: roomCode,
                config: expect.objectContaining({ num_intruders: numIntruders }),
            }));
        });
    };

    it('starts on Auto and saves it', async () => {
        const { contextValue } = renderWithContext(<GameConfigPage />, { roomCode: 'AUTO' });
        fireEvent.click(screen.getByRole('button', { name: /Create Tasks with Group/i }));
        expect(screen.getByRole('button', { name: 'Auto' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByTestId('intruder-advice')).toHaveTextContent('1 intruder per 5 players');
        await openRoomWith(contextValue, 'AUTO', 'auto');
    });

    it('lets the host pick a number, including more than four', async () => {
        const { contextValue } = renderWithContext(<GameConfigPage />, { roomCode: 'PICK' });
        fireEvent.click(screen.getByRole('button', { name: /Create Tasks with Group/i }));
        fireEvent.click(screen.getByRole('button', { name: '4' }));
        expect(screen.getByRole('button', { name: 'Auto' })).toHaveAttribute('aria-pressed', 'false');
        fireEvent.click(screen.getByRole('button', { name: 'Increase Intruders' }));
        fireEvent.click(screen.getByRole('button', { name: 'Increase Intruders' }));
        expect(screen.getByTestId('intruder-advice')).toHaveTextContent('Best for 28 to 32 players. Needs at least 13 players to start.');
        await openRoomWith(contextValue, 'PICK', 6);
    });

    it('goes back to Auto', async () => {
        const { contextValue } = renderWithContext(<GameConfigPage />, { roomCode: 'BACK' });
        fireEvent.click(screen.getByRole('button', { name: /Create Tasks with Group/i }));
        fireEvent.click(screen.getByRole('button', { name: '2' }));
        fireEvent.click(screen.getByRole('button', { name: 'Auto' }));
        expect(screen.queryByRole('button', { name: 'Increase Intruders' })).toBeNull();
        await openRoomWith(contextValue, 'BACK', 'auto');
    });
});

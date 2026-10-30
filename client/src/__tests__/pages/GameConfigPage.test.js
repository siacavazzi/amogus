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
        expect(contextValue.socket.emit).toHaveBeenCalledWith('create_task_list', expect.objectContaining({ name: 'House tasks' }));
        receive('task_list_created', { task_list: { code: 'PACK01', name: 'House tasks', tasks, locations: ['Kitchen', 'Hallway', 'Other'] } });
        fireEvent.click(screen.getByRole('button', { name: /Use This Task List/ }));
        receive('task_list_applied', { task_list_code: 'PACK01', task_count: 24 });
        receive('game_config', { vote_time: 180, task_ratio: 10, num_intruders: 1, locations: ['Kitchen', 'Hallway', 'Other'] });
        fireEvent.click(screen.getByRole('button', { name: /Open Room/ }));
        expect(contextValue.socket.emit).toHaveBeenCalledWith('update_game_config', expect.objectContaining({
            config: expect.objectContaining({ vote_time: 90, task_ratio: 5 }),
        }));
    });

    describe('a pack from the task generator', () => {
        const tasks = Array.from({ length: 24 }, (_, index) => ({ task: `Task ${index}`, location: index % 2 ? 'Kitchen' : 'Hallway' }));

        beforeEach(() => {
            const items = new Map();
            sessionStorage.getItem.mockImplementation(key => items.get(key) || null);
            sessionStorage.setItem.mockImplementation((key, value) => items.set(key, value));
            sessionStorage.removeItem.mockImplementation(key => items.delete(key));
            window.history.replaceState(null, '', '/play?setup=generated');
            saveGameDraft({ name: 'House tasks', playerCount: 8, locations: ['Kitchen', 'Hallway'], tasks,
                recommendations: { intruderCount: 1, meetingSeconds: 90, taskGoalPerCrewmate: 5 } });
        });

        afterEach(() => window.history.replaceState(null, '', '/'));

        const receiver = contextValue => (event, data) => act(() => {
            contextValue.socket.on.mock.calls.filter(call => call[0] === event).slice(-1)[0][1](data);
        });

        it('is loaded and selected without pressing an import button', () => {
            const { contextValue } = renderWithContext(<GameConfigPage />, { roomCode: 'ROOM4' });
            const creates = contextValue.socket.emit.mock.calls.filter(([event]) => event === 'create_task_list');
            expect(creates).toHaveLength(1);
            expect(creates[0][1].tasks).toEqual(tasks);
            expect(creates[0][1].locations).toEqual(['Kitchen', 'Hallway']);
            expect(screen.queryByRole('button', { name: /Import generated tasks/ })).not.toBeInTheDocument();
            expect(screen.getByText('Loading your pack…')).toBeInTheDocument();

            receiver(contextValue)('task_list_created', { task_list: { code: 'PACK02', name: 'House tasks', tasks, locations: ['Kitchen', 'Hallway', 'Other'] } });
            expect(screen.queryByText('Your generated task pack')).not.toBeInTheDocument();
            expect(screen.getByRole('heading', { name: 'House tasks' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Use This Task List/ })).toBeInTheDocument();
            expect(window.location.search).toBe('');
        });

        it('offers a retry when loading the pack fails', () => {
            const { contextValue } = renderWithContext(<GameConfigPage />, { roomCode: 'ROOM5' });
            receiver(contextValue)('error', { message: 'Too many tasks.' });
            expect(screen.getByRole('alert')).toHaveTextContent('Too many tasks.');
            contextValue.socket.emit.mockClear();
            fireEvent.click(screen.getByRole('button', { name: 'Try loading the pack again' }));
            expect(contextValue.socket.emit).toHaveBeenCalledWith('create_task_list', expect.objectContaining({ name: 'House tasks' }));
        });
    });
});

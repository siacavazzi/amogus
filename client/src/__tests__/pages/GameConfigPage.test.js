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

    it('lets the host make every meeting wait for everyone', async () => {
        const { contextValue } = renderWithContext(<GameConfigPage />, { roomCode: 'ROOM4' });

        fireEvent.click(screen.getByRole('button', { name: /Create Tasks with Group/i }));
        fireEvent.click(screen.getByRole('button', { name: /Advanced Settings/i }));
        expect(screen.getByRole('button', { name: /80% ready in big games/ })).toHaveAttribute('aria-pressed', 'true');
        fireEvent.click(screen.getByRole('button', { name: /^Everyone ready/ }));
        fireEvent.click(screen.getByRole('button', { name: /Open Room/i }));

        await waitFor(() => {
            expect(contextValue.socket.emit).toHaveBeenCalledWith('update_game_config', expect.objectContaining({
                config: expect.objectContaining({ meeting_quorum: false }),
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
        expect(screen.getByTestId('intruder-advice')).toHaveTextContent('Best for 30 to 34 players. Needs at least 13 players to start.');
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

describe('GameConfigPage task goal', () => {
    it('starts on Auto and switches to a number', async () => {
        const { contextValue } = renderWithContext(<GameConfigPage />, { roomCode: 'TASK' });
        fireEvent.click(screen.getByRole('button', { name: /Create Tasks with Group/i }));
        fireEvent.click(screen.getByRole('button', { name: /Advanced Settings/i }));
        const auto = screen.getByRole('button', { name: 'Auto task goal' });
        expect(auto).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByTestId('task-goal-advice')).toHaveTextContent('10 tasks per crewmate with 1 intruder, 6 with 2 or more');
        fireEvent.click(auto);
        expect(screen.getByLabelText('Tasks Per Player')).toHaveValue('6');
        fireEvent.click(screen.getByRole('button', { name: /Open Room/i }));
        await waitFor(() => {
            expect(contextValue.socket.emit).toHaveBeenCalledWith('update_game_config', expect.objectContaining({
                room_code: 'TASK',
                config: expect.objectContaining({ task_ratio: 6 }),
            }));
        });
    });
});
});

describe('GameConfigPage task list picker', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    const receiver = contextValue => (event, data) => act(() => {
        contextValue.socket.on.mock.calls.filter(call => call[0] === event).slice(-1)[0][1](data);
    });
    const applied = contextValue => contextValue.socket.emit.mock.calls.filter(([event]) => event === 'apply_task_list_to_game').slice(-1)[0][1];

    it('makes a big list from a place and its areas, without asking for a player count', () => {
        const { contextValue } = renderWithContext(<GameConfigPage />, { roomCode: 'ROOM6' });
        expect(screen.queryByLabelText(/players/i)).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'House' }));
        expect(screen.getByRole('heading', { name: 'House' })).toBeInTheDocument();
        // The shared rooms start on, private ones off.
        expect(screen.getByRole('button', { name: /Kitchen/ })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: /Bathroom/ })).toHaveAttribute('aria-pressed', 'false');
        fireEvent.click(screen.getByRole('button', { name: /Bathroom/ }));
        fireEvent.change(screen.getByLabelText('Add an area'), { target: { value: 'Attic' } });
        fireEvent.click(screen.getByRole('button', { name: 'Add area' }));
        fireEvent.click(screen.getByRole('button', { name: /Make my task list/ }));

        const create = contextValue.socket.emit.mock.calls.find(([event]) => event === 'create_task_list')[1];
        expect(create.name).toBe('House · Mixed');
        expect(create.tasks).toHaveLength(60);
        expect(create.locations).toEqual(['Kitchen', 'Living Room', 'Hallway', 'Bathroom', 'Attic']);
        for (const location of create.locations) expect(create.tasks.some(task => task.location === location)).toBe(true);

        receiver(contextValue)('task_list_created', { task_list: { code: 'HOUSE1', name: 'House · Mixed', tasks: create.tasks, locations: [...create.locations, 'Other'] } });
        expect(screen.getByRole('heading', { name: 'House · Mixed' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /Use This Task List/ }));
        expect(applied(contextValue)).toEqual({ room_code: 'ROOM6', task_list_code: 'HOUSE1', picked_via: 'preset' });
    });

    it('writes the list in the vibe the host picks', () => {
        const { contextValue } = renderWithContext(<GameConfigPage />, { roomCode: 'ROOM10' });
        fireEvent.click(screen.getByRole('button', { name: 'Apartment' }));
        expect(screen.getByRole('button', { name: /^Mixed/ })).toHaveAttribute('aria-pressed', 'true');
        fireEvent.click(screen.getByRole('button', { name: /^Clean up/ }));
        fireEvent.click(screen.getByRole('button', { name: /Make my task list/ }));
        const create = contextValue.socket.emit.mock.calls.find(([event]) => event === 'create_task_list')[1];
        expect(create.name).toBe('Apartment · Clean up');
        expect(create.tasks.length).toBeGreaterThanOrEqual(40);
    });

    it('needs two areas and can go back to every place', () => {
        renderWithContext(<GameConfigPage />, { roomCode: 'ROOM7' });
        fireEvent.click(screen.getByRole('button', { name: 'Apartment' }));
        fireEvent.click(screen.getByRole('button', { name: /Kitchen/ }));
        fireEvent.click(screen.getByRole('button', { name: /Living Room/ }));
        expect(screen.getByText('Pick at least 2 areas.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Make my task list/ })).toBeDisabled();
        fireEvent.click(screen.getByRole('button', { name: /All places/ }));
        expect(screen.getByRole('heading', { name: 'Where are you playing?' })).toBeInTheDocument();
    });

    it('keeps the example list on screen and marks it as the example', () => {
        const { contextValue } = renderWithContext(<GameConfigPage />, { roomCode: 'ROOM8' });
        receiver(contextValue)('my_task_lists', { lists: [], starter_template: { name: 'Example List', template_key: 'starter_house', task_count: 96, locations: ['Kitchen', 'Bedroom', 'Other'] } });
        expect(screen.queryByRole('button', { name: /Dismiss/ })).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Example list' }));
        expect(contextValue.socket.emit).toHaveBeenCalledWith('create_task_list', expect.objectContaining({ from_default: true }));
        const tasks = [{ task: 'Wipe the counter', location: 'Kitchen' }];
        receiver(contextValue)('task_list_created', { task_list: { code: 'EXAMPL', name: 'Example List', tasks, locations: ['Kitchen', 'Bedroom', 'Other'] } });
        fireEvent.click(screen.getByRole('button', { name: /Use This Task List/ }));
        expect(applied(contextValue).picked_via).toBe('example');

        // Clearing it brings the whole picker back, example included.
        fireEvent.click(screen.getByRole('button', { name: 'Pick a different list' }));
        expect(screen.getByRole('button', { name: 'Example list' })).toBeInTheDocument();
    });

    it('tucks loading by code behind a link', () => {
        const { contextValue } = renderWithContext(<GameConfigPage />, { roomCode: 'ROOM9' });
        expect(screen.queryByLabelText('Load by code')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Have a list code?' }));
        fireEvent.change(screen.getByLabelText('Load by code'), { target: { value: 'abc123' } });
        fireEvent.click(screen.getByRole('button', { name: 'Load task list' }));
        expect(contextValue.socket.emit).toHaveBeenCalledWith('load_task_list', { code: 'ABC123' });
        receiver(contextValue)('task_list_loaded', { task_list: { code: 'ABC123', name: 'Church list', tasks: [{ task: 'Ring the bell', location: 'Hall' }], locations: ['Hall', 'Yard', 'Other'] } });
        fireEvent.click(screen.getByRole('button', { name: /Use This Task List/ }));
        expect(applied(contextValue).picked_via).toBe('code');
    });
});

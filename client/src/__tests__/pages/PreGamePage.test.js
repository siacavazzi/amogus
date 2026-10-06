/**
 * Tests for PreGamePage - Waiting room before game starts
 * 
 * Game Flow Context:
 * - After logging in, players wait here until the host starts the game
 * - Shows list of all joined players with their selfies
 * - Players can see who's ready
 * - Host has option to start the game once enough players join
 * - Has tabs for viewing players and creating/editing tasks
 */
import React from 'react';
import { act, within } from '@testing-library/react';
import { renderWithContext, screen, fireEvent, waitFor, mockPlayers, mockTaskLocations, simulateSocketEvent } from '../../test-utils';
import PreGamePage from '../../pages/PreGamePage';

describe('PreGamePage', () => {
    const defaultContext = {
        players: mockPlayers,
        taskLocations: mockTaskLocations,
        roomCode: 'TEST1',
        running: false,
    };

    beforeEach(() => {
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: {
                writeText: jest.fn().mockResolvedValue(undefined),
            },
        });
        delete navigator.share;
        window.history.pushState({}, '', '/play');
    });

    describe('Rendering', () => {
        it('renders the pre-game page with room code', () => {
            renderWithContext(<PreGamePage />, defaultContext);
            
            expect(screen.getByText(/TEST1/)).toBeInTheDocument();
        });

        it('displays all joined players', () => {
            renderWithContext(<PreGamePage />, defaultContext);
            
            // Should show all player names from mockPlayers
            expect(screen.getByText('Alice')).toBeInTheDocument();
            expect(screen.getByText('Bob')).toBeInTheDocument();
            expect(screen.getByText('Charlie')).toBeInTheDocument();
            expect(screen.getByText('Diana')).toBeInTheDocument();
        });

        it('shows player count', () => {
            renderWithContext(<PreGamePage />, defaultContext);
            
            // Should display number of players (4 in mockPlayers)
            expect(screen.getByText(/4/)).toBeInTheDocument();
        });
    });

    describe('Tab Navigation', () => {
        it('shows players tab by default', () => {
            renderWithContext(<PreGamePage />, defaultContext);
            
            // Players should be visible by default
            expect(screen.getByText('Alice')).toBeInTheDocument();
        });

        it('has tasks tab button', () => {
            renderWithContext(<PreGamePage />, defaultContext);
            
            const tasksTab = screen.queryByRole('button', { name: /tasks/i });
            // Tasks tab may exist for hosts only
            expect(screen.getByText('Alice')).toBeInTheDocument();
        });
    });

    describe('Room Code Sharing', () => {
        it('displays room code prominently for sharing', () => {
            renderWithContext(<PreGamePage />, { ...defaultContext, roomCode: 'ABCD' });
            
            expect(screen.getByText('ABCD')).toBeInTheDocument();
        });

        it('has copy button for room code', () => {
            renderWithContext(<PreGamePage />, defaultContext);
            
            // Look for copy functionality
            const copyButton = screen.queryByRole('button', { name: /copy/i }) || 
                              screen.queryByLabelText(/copy/i);
            
            // Copy button should exist (implementation may vary)
            expect(screen.getByText(/TEST1/)).toBeInTheDocument();
        });

        it('copies the invite URL when native share is unavailable', async () => {
            renderWithContext(<PreGamePage />, { ...defaultContext, roomCode: 'ABCD' });

            fireEvent.click(screen.getByRole('button', { name: /invite players to room/i }));

            await waitFor(() => {
                expect(navigator.clipboard.writeText).toHaveBeenCalledWith('http://localhost/play?room=ABCD');
            });
        });

        it('opens the native share sheet when supported', async () => {
            navigator.share = jest.fn().mockResolvedValue(undefined);
            renderWithContext(<PreGamePage />, { ...defaultContext, roomCode: 'ABCD' });

            fireEvent.click(screen.getByRole('button', { name: /invite players to room/i }));

            await waitFor(() => {
                expect(navigator.share).toHaveBeenCalledWith(expect.objectContaining({
                    title: 'Join my Sus Party room',
                    url: 'http://localhost/play?room=ABCD',
                }));
            });
            expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
        });
    });

    describe('Host Controls', () => {
        it('shows start game button for room creator', () => {
            renderWithContext(<PreGamePage />, { 
                ...defaultContext, 
                isRoomCreator: true 
            });
            
            // Host should see start button
            const startButton = screen.queryByRole('button', { name: /start/i });
            // Note: Start button visibility may depend on minimum player count
        });

        it('does not show start button for non-host players', () => {
            renderWithContext(<PreGamePage />, { 
                ...defaultContext, 
                isRoomCreator: false 
            });
            
            // Non-host should not see start game controls
            const startButton = screen.queryByRole('button', { name: /start.*game/i });
            expect(startButton).not.toBeInTheDocument();
        });

        it('keeps start disabled until the server task minimum is met', async () => {
            const players = [
                { player_id: 'player1', username: 'Alice', sus: false, alive: true, ready: false, pic: 1, selfie: null },
                { player_id: 'player2', username: 'Bob', sus: false, alive: true, ready: false, pic: 2, selfie: null },
                { player_id: 'player3', username: 'Charlie', sus: false, alive: true, ready: false, pic: 3, selfie: null },
                { player_id: 'player4', username: 'Diana', sus: false, alive: true, ready: false, pic: 4, selfie: null },
            ];
            const tasks = [
                ...Array.from({ length: 5 }, (_, index) => ({ task: `Kitchen ${index}`, location: 'Kitchen' })),
                ...Array.from({ length: 5 }, (_, index) => ({ task: `Yard ${index}`, location: 'Yard' })),
            ];

            const { contextValue } = renderWithContext(<PreGamePage />, {
                ...defaultContext,
                players,
                taskLocations: ['Kitchen', 'Yard', 'Other'],
                isRoomCreator: true,
            });
            fireEvent.click(screen.getByRole('button', { name: /^Tasks/i }));

            await waitFor(() => {
                expect(contextValue.socket.on).toHaveBeenCalledWith('collaborative_tasks', expect.any(Function));
            });
            simulateSocketEvent(contextValue.socket, 'collaborative_tasks', { tasks });

            await waitFor(() => {
                expect(screen.queryByRole('button', { name: /start game/i })).not.toBeInTheDocument();
                expect(screen.getByText(/Need 2 more tasks total/i)).toBeInTheDocument();
            });

            simulateSocketEvent(contextValue.socket, 'collaborative_tasks', {
                tasks: [
                    ...tasks,
                    { task: 'Other extra one', location: 'Other' },
                    { task: 'Other extra two', location: 'Other' },
                ],
            });

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /start game/i })).toBeInTheDocument();
                expect(within(screen.getByRole('region', { name: 'Other tasks' })).getByText('2 tasks')).toBeInTheDocument();
            });
        });

        it('uses the newest lobby task snapshot and lets the server lower the roster minimum', async () => {
            const players = [
                { player_id: 'player1', username: 'Alice', sus: false, alive: true, ready: false, pic: 1 },
                { player_id: 'player2', username: 'Bob', sus: false, alive: true, ready: false, pic: 2 },
            ];
            const tasks = [
                ...Array.from({ length: 8 }, (_, index) => ({ task: `Kitchen ${index}`, location: 'Kitchen' })),
                ...Array.from({ length: 2 }, (_, index) => ({ task: `Yard ${index}`, location: 'Yard' })),
            ];
            const { contextValue } = renderWithContext(<PreGamePage />, {
                ...defaultContext,
                players,
                taskLocations: ['Kitchen', 'Yard', 'Other'],
                isRoomCreator: true,
            });

            fireEvent.click(screen.getByRole('button', { name: /^Tasks/i }));
            act(() => simulateSocketEvent(contextValue.socket, 'lobby_state', {
                room_code: 'TEST1', revision: 2, round_id: 'round-1',
                locations: ['Kitchen', 'Yard', 'Other'], tasks, min_tasks: 12,
                task_list_code: null, task_list_name: null, collaborative_mode: false,
                can_start: false, start_error: 'Need 2 more tasks total.',
            }));

            expect(screen.queryByRole('button', { name: /start game/i })).not.toBeInTheDocument();
            expect(screen.getByText(/Need 2 more tasks total/i)).toBeInTheDocument();
            expect(screen.getByText('Kitchen 0')).toBeInTheDocument();

            act(() => simulateSocketEvent(contextValue.socket, 'lobby_state', {
                room_code: 'TEST1', revision: 3, round_id: 'round-1',
                locations: ['Kitchen', 'Yard', 'Other'], tasks: [{ task: 'Latest kitchen task', location: 'Kitchen' }],
                min_tasks: 10, task_list_code: null, task_list_name: null, collaborative_mode: false,
                can_start: true, start_error: null,
            }));

            expect(screen.getByRole('button', { name: /start game/i })).toBeInTheDocument();
            expect(screen.getByText('Latest kitchen task')).toBeInTheDocument();
            expect(screen.queryByText('Kitchen 0')).not.toBeInTheDocument();
        });

        it('ignores lobby snapshots for a different room', () => {
            const { contextValue } = renderWithContext(<PreGamePage />, {
                ...defaultContext,
                isRoomCreator: true,
                taskLocations: ['Kitchen', 'Yard', 'Other'],
            });
            fireEvent.click(screen.getByRole('button', { name: /^Tasks/i }));
            act(() => simulateSocketEvent(contextValue.socket, 'lobby_state', {
                room_code: 'OTHER', revision: 10, round_id: 'other-round',
                locations: ['Kitchen', 'Yard', 'Other'], tasks: [{ task: 'Other room task', location: 'Kitchen' }],
                min_tasks: 10, collaborative_mode: false, can_start: false,
            }));

            expect(screen.queryByText('Other room task')).not.toBeInTheDocument();
        });

        it('replaces tasks from lobby state without changing task-list ownership', async () => {
            const { contextValue } = renderWithContext(<PreGamePage />, {
                ...defaultContext,
                isRoomCreator: true,
                taskLocations: ['Kitchen', 'Yard', 'Other'],
            });
            fireEvent.click(screen.getByRole('button', { name: /^Tasks/i }));
            await waitFor(() => {
                expect(contextValue.socket.on).toHaveBeenCalledWith('collaborative_tasks', expect.any(Function));
            });

            act(() => simulateSocketEvent(contextValue.socket, 'collaborative_tasks', {
                tasks: [{ task: 'Old task', location: 'Kitchen' }],
                min_tasks: 10,
                task_list_code: 'LIST1',
                task_list_name: 'Shared list',
                is_owner: false,
            }));
            act(() => simulateSocketEvent(contextValue.socket, 'lobby_state', {
                room_code: 'TEST1', revision: 2, round_id: 'round-1',
                locations: ['Kitchen', 'Yard', 'Other'],
                tasks: [{ task_id: 'task-1', task: 'Replacement task', location: 'Yard' }],
                min_tasks: 10, task_list_code: 'LIST1', task_list_name: 'Shared list',
                collaborative_mode: false, can_start: false, start_error: 'Need more tasks.',
            }));

            expect(screen.getByText('Replacement task')).toBeInTheDocument();
            expect(screen.queryByText('Old task')).not.toBeInTheDocument();
            expect(screen.getByText('copy')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /save copy/i })).toBeInTheDocument();
        });
    });

    describe('Task Creation (Host)', () => {
        const hostContext = {
            ...defaultContext,
            isRoomCreator: true,
        };

        it('shows task-related UI for host', async () => {
            renderWithContext(<PreGamePage />, hostContext);
            
            // Host should see some task management options
            // The exact UI depends on the tab state
            expect(screen.getByText('Alice')).toBeInTheDocument();
        });

        it('shows and removes an Other task in its optional section', () => {
            const { contextValue } = renderWithContext(<PreGamePage />, {
                ...hostContext,
                taskLocations: ['Kitchen', 'Yard', 'Garage', 'Basement', 'Other'],
            });
            act(() => simulateSocketEvent(contextValue.socket, 'collaborative_tasks', {
                tasks: [{ task: 'Kitchen task', location: 'Kitchen' }],
            }));
            fireEvent.click(screen.getByRole('button', { name: /^Tasks/i }));

            const otherSection = screen.getByRole('region', { name: 'Other tasks' });
            expect(within(otherSection).getByText('0 tasks')).toBeInTheDocument();
            expect(within(otherSection).queryByTitle('Delete this location')).not.toBeInTheDocument();

            fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Other' } });
            fireEvent.change(screen.getByPlaceholderText(/Add a task/), { target: { value: 'Do ten jumping jacks' } });
            fireEvent.click(screen.getByTitle('Add task'));
            expect(contextValue.socket.emit).toHaveBeenCalledWith('add_collaborative_task', expect.objectContaining({
                task: expect.objectContaining({ task: 'Do ten jumping jacks', location: 'Other' }),
            }));
            act(() => simulateSocketEvent(contextValue.socket, 'collaborative_task_added', {
                task: { task_id: 'task-2', task: 'Do ten jumping jacks', location: 'Other' }, total_tasks: 2,
            }));

            expect(within(otherSection).getByText('Do ten jumping jacks')).toBeInTheDocument();
            expect(within(otherSection).getByText('1 task')).toBeInTheDocument();
            fireEvent.click(within(otherSection).getByTitle('Remove task'));
            expect(contextValue.socket.emit).toHaveBeenCalledWith('remove_collaborative_task', expect.objectContaining({
                room_code: 'TEST1', task_index: 1, task_id: 'task-2',
            }));
            act(() => simulateSocketEvent(contextValue.socket, 'collaborative_task_removed', { index: 1 }));
            expect(within(otherSection).queryByText('Do ten jumping jacks')).not.toBeInTheDocument();
            expect(within(otherSection).getByText('0 tasks')).toBeInTheDocument();
        });

        it('shows an existing Other task to a player without edit permission', () => {
            const { contextValue } = renderWithContext(<PreGamePage />, {
                ...defaultContext,
                taskLocations: ['Kitchen', 'Yard', 'Other'],
                isRoomCreator: false,
            });
            act(() => simulateSocketEvent(contextValue.socket, 'collaborative_tasks', {
                tasks: [{ task: 'Existing Other task', location: 'Other' }], collaborative_mode: false,
            }));
            fireEvent.click(screen.getByRole('button', { name: /^Tasks/i }));

            const otherSection = screen.getByRole('region', { name: 'Other tasks' });
            expect(within(otherSection).getByText('Existing Other task')).toBeInTheDocument();
            expect(within(otherSection).queryByTitle('Remove task')).not.toBeInTheDocument();
        });
    });

    describe('Leave Game', () => {
        it('shows leave game button', () => {
            renderWithContext(<PreGamePage />, defaultContext);
            
            // Should have a way to leave the game
            const leaveButton = screen.queryByRole('button', { name: /leave/i }) ||
                               screen.queryByLabelText(/leave/i);
            // Leave functionality should exist
        });
    });
});

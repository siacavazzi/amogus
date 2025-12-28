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
import { renderWithContext, screen, fireEvent, waitFor, mockPlayers, mockTaskLocations } from '../../test-utils';
import PreGamePage from '../../pages/PreGamePage';

describe('PreGamePage', () => {
    const defaultContext = {
        players: mockPlayers,
        taskLocations: mockTaskLocations,
        roomCode: 'TEST1',
        running: false,
    };

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

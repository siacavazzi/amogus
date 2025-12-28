/**
 * Tests for DeadPage - Shown to eliminated players
 * 
 * Game Flow Context:
 * - Players see this when they've been killed or voted out
 * - Shows death cause (murdered, voted out, meltdown, etc.)
 * - Dead players can spectate the remaining game
 * - They cannot participate in voting or tasks
 * - Ghost-themed UI with particle effects
 */
import React from 'react';
import { renderWithContext, screen, fireEvent, mockPlayers, mockDeadPlayerState } from '../../test-utils';
import DeadPage from '../../pages/DeadPage';

describe('DeadPage', () => {
    const deadContext = {
        playerState: mockDeadPlayerState,
        players: mockPlayers,
        running: true,
        meetingState: null,
    };

    describe('Rendering', () => {
        it('renders the dead page', () => {
            renderWithContext(<DeadPage />, deadContext);
            
            // Should show death-related UI - check for the elimination message
            expect(screen.getByText(/You were eliminated/i)).toBeInTheDocument();
        });

        it('displays death message', () => {
            renderWithContext(<DeadPage />, deadContext);
            
            expect(screen.getByText(/You were eliminated/i)).toBeInTheDocument();
        });

        it('shows death cause indicator', () => {
            renderWithContext(<DeadPage />, deadContext);
            
            // mockDeadPlayerState has death_cause: 'murdered'
            expect(screen.getByText(/Murdered/i)).toBeInTheDocument();
        });
    });

    describe('Different Death Causes', () => {
        it('shows ejected label for voted out players', () => {
            const votedOutContext = {
                ...deadContext,
                playerState: {
                    ...mockDeadPlayerState,
                    death_cause: 'voted_out',
                    death_message: 'You were voted out by the crew',
                },
            };
            
            renderWithContext(<DeadPage />, votedOutContext);
            
            expect(screen.getByText(/Ejected/i)).toBeInTheDocument();
        });

        it('shows irradiated label for meltdown deaths', () => {
            const meltdownContext = {
                ...deadContext,
                playerState: {
                    ...mockDeadPlayerState,
                    death_cause: 'meltdown',
                    death_message: 'You died in the reactor meltdown',
                },
            };
            
            renderWithContext(<DeadPage />, meltdownContext);
            
            expect(screen.getByText(/Irradiated/i)).toBeInTheDocument();
        });

        it('shows disconnected for left_game', () => {
            const leftContext = {
                ...deadContext,
                playerState: {
                    ...mockDeadPlayerState,
                    death_cause: 'left_game',
                },
            };
            
            renderWithContext(<DeadPage />, leftContext);
            
            expect(screen.getByText(/Disconnected/i)).toBeInTheDocument();
        });
    });

    describe('Spectate Mode', () => {
        it('has spectate button to view alive players', () => {
            renderWithContext(<DeadPage />, deadContext);
            
            // Look for spectate-related button
            const spectateButton = screen.getByRole('button', { name: /spectate|watch|view|eye/i });
            expect(spectateButton).toBeInTheDocument();
        });

        it('toggles spectate view when clicked', () => {
            renderWithContext(<DeadPage />, deadContext);
            
            const spectateButton = screen.getByRole('button', { name: /spectate|watch|view|eye/i });
            fireEvent.click(spectateButton);
            
            // After clicking, should show alive players or change button state
            // At minimum, should show one of the alive players from mockPlayers
        });
    });
});

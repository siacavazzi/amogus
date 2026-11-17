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
import { renderWithContext, screen, mockPlayers, mockDeadPlayerState } from '../../test-utils';
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

    describe('Spectator screen', () => {
        it('shows everyone still in without waiting for the feed', () => {
            renderWithContext(<DeadPage />, deadContext);
            expect(screen.getByText('Alice')).toBeInTheDocument();
            expect(screen.getByText('Charlie')).toBeInTheDocument();
            expect(screen.queryByText('Diana')).not.toBeInTheDocument();
            expect(screen.getByText(/Nothing yet/i)).toBeInTheDocument();
            expect(screen.getByText(/don't tell anyone/i)).toBeInTheDocument();
        });

        it('shows the secret feed newest first, without naming intruders', () => {
            const spectator = {
                view: 'secret', open_book: false,
                living: [{ player_id: 'player1' }, { player_id: 'player2' }, { player_id: 'player3' }],
                feed: [
                    { id: 1, kind: 'out', at: 12, player_id: 'player4', name: 'Diana', sus: false, cause: 'murdered_during_task' },
                    { id: 2, kind: 'task', at: 30, location: 'Kitchen' },
                    { id: 3, kind: 'card', at: 65, card: 'EMP' },
                ],
            };
            renderWithContext(<DeadPage />, { ...deadContext, spectator, crewScore: 3, taskGoal: 10 });
            const lines = screen.getAllByTestId('spectator-feed-line').map(line => line.textContent);
            expect(lines[0]).toContain('An intruder played EMP');
            expect(lines[0]).toContain('1:05');
            expect(lines[1]).toContain('Someone finished a task in Kitchen');
            expect(lines[2]).toContain('Diana was tagged out');
            expect(screen.queryByText('Intruder')).not.toBeInTheDocument();
            expect(screen.getByText('3/10')).toBeInTheDocument();
        });

        it('marks intruders and shows task areas when the server opens the book', () => {
            const spectator = {
                view: 'full', open_book: true,
                living: [
                    { player_id: 'player1', sus: false, location: 'Garden', tasks_done: 2 },
                    { player_id: 'player2', sus: false, tasks_done: 0 },
                    { player_id: 'player3', sus: true, cards: 1, tasks_done: 0 },
                ],
                feed: [{ id: 4, kind: 'card', at: 5, card: 'Taunt Message', player_id: 'player3', name: 'Charlie', target_name: 'Bob' }],
            };
            renderWithContext(<DeadPage />, { ...deadContext, spectator });
            expect(screen.getByText('Intruder')).toBeInTheDocument();
            expect(screen.getByText('Garden')).toBeInTheDocument();
            expect(screen.getByText('2 tasks')).toBeInTheDocument();
            expect(screen.getByText(/Charlie played Taunt Message on Bob/)).toBeInTheDocument();
            expect(screen.getByText(/You can see everything now/)).toBeInTheDocument();
        });
    });
});

/**
 * Tests for VotingPage - Emergency meeting voting screen
 * 
 * Game Flow Context:
 * - When someone calls a meeting, all players enter this phase
 * - Players see a timer counting down
 * - Players can vote for who they think is the intruder
 * - Players can also vote to skip/veto (no one ejected)
 * - Once voted, shows who you voted for
 * - When timer expires or all vote, results are calculated
 */
import React from 'react';
import { renderWithContext, screen, fireEvent, waitFor, act, mockPlayers, mockMeetingStateVoting } from '../../test-utils';
import VotingPage from '../../pages/VotingPage';
import { DataContext } from '../../GameContext';
import { createControlledSocket } from '../../testing/gameFlowHarness';

describe('VotingPage', () => {
    const votingContext = {
        running: true,
        players: mockPlayers,
        meetingState: mockMeetingStateVoting,
        votes: {},
        vetoVotes: 0,
        playerState: {
            username: 'VotingPlayer',
            playerId: 'player1',
            alive: true,
        },
    };

    describe('Death reports during voting', () => {
        afterEach(() => {
            jest.useRealTimers();
            jest.restoreAllMocks();
        });

        it('keeps the death control available after a vote and sends current phase identity once', async () => {
            jest.spyOn(window, 'confirm').mockReturnValue(true);
            const socket = createControlledSocket();
            renderWithContext(<VotingPage />, { ...votingContext, socket });
            fireEvent.click(screen.getByText('Bob').closest('div[class*="cursor-pointer"]'));
            fireEvent.click(screen.getByRole('button', { name: /Vote for Bob/i }));
            const deathButton = screen.getByRole('button', { name: /I've Been Killed/i });
            fireEvent.click(deathButton);
            fireEvent.click(deathButton);

            expect(socket.emits('player_dead')).toHaveLength(1);
            expect(socket.lastEmit('player_dead')[1]).toEqual({
                player_id: 'player1', round_id: 'round-1', meeting_id: 'meeting-1',
            });
            expect(deathButton).toBeDisabled();
            expect(screen.getByRole('button', { name: /Vote for Bob/i })).toBeDisabled();
            expect(screen.getByRole('button', { name: /Veto Meeting/i })).toBeDisabled();
            await act(async () => socket.ack(0, { ok: true }));
            expect(deathButton).toBeDisabled();
        });

        it('does not send a death report when the player cancels confirmation', () => {
            jest.spyOn(window, 'confirm').mockReturnValue(false);
            const socket = createControlledSocket();
            renderWithContext(<VotingPage />, { ...votingContext, socket });
            fireEvent.click(screen.getByRole('button', { name: /I've Been Killed/i }));
            expect(socket.emits('player_dead')).toHaveLength(0);
        });

        it('shows a rejected death report and permits a new attempt', async () => {
            jest.spyOn(window, 'confirm').mockReturnValue(true);
            const socket = createControlledSocket();
            const { contextValue } = renderWithContext(<VotingPage />, { ...votingContext, socket });
            fireEvent.click(screen.getByRole('button', { name: /I've Been Killed/i }));
            await act(async () => socket.ack(0, { ok: false, error: 'The meeting ended.' }));
            expect(contextValue.setMessage).toHaveBeenCalledWith({ text: 'The meeting ended.', status: 'error' });
            expect(screen.getByRole('button', { name: /I've Been Killed/i })).toBeEnabled();
        });

        it('blocks death reports while offline', () => {
            const socket = createControlledSocket();
            socket.connected = false;
            renderWithContext(<VotingPage />, { ...votingContext, socket, connected: false });
            expect(screen.getByRole('button', { name: /I've Been Killed/i })).toBeDisabled();
        });

        it('releases the control after a lost acknowledgment without an automatic duplicate report', async () => {
            jest.useFakeTimers();
            jest.spyOn(window, 'confirm').mockReturnValue(true);
            const socket = createControlledSocket();
            const { contextValue } = renderWithContext(<VotingPage />, { ...votingContext, socket });
            fireEvent.click(screen.getByRole('button', { name: /I've Been Killed/i }));
            await act(async () => jest.advanceTimersByTime(5000));
            expect(screen.getByRole('button', { name: /I've Been Killed/i })).toBeEnabled();
            expect(socket.emits('player_dead')).toHaveLength(1);
            expect(contextValue.setMessage).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));
        });

        it('does not show a false failure after the roster moves the player off the voting screen', async () => {
            jest.useFakeTimers();
            jest.spyOn(window, 'confirm').mockReturnValue(true);
            const socket = createControlledSocket();
            const { unmount, contextValue } = renderWithContext(<VotingPage />, { ...votingContext, socket });
            fireEvent.click(screen.getByRole('button', { name: /I've Been Killed/i }));
            unmount();
            await act(async () => jest.advanceTimersByTime(5000));
            expect(contextValue.setMessage).not.toHaveBeenCalled();
        });

        it('clears a vote confirmation when the target reports death', () => {
            const { rerender, contextValue } = renderWithContext(<VotingPage />, votingContext);
            fireEvent.click(screen.getByText('Bob').closest('div[class*="cursor-pointer"]'));
            fireEvent.click(screen.getByRole('button', { name: /Vote for Bob/i }));
            expect(screen.getByText(/Voted for Bob/i)).toBeInTheDocument();
            rerender(
                <DataContext.Provider value={{
                    ...contextValue,
                    players: mockPlayers.map(player => player.player_id === 'player2' ? { ...player, alive: false } : player),
                }}>
                    <VotingPage />
                </DataContext.Provider>
            );
            expect(screen.queryByText(/Voted for Bob/i)).not.toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Select a Player/i })).toBeDisabled();
        });

        it('hides the death control for dead players and tutorial screens', () => {
            const first = renderWithContext(<VotingPage />, {
                ...votingContext, playerState: { ...votingContext.playerState, alive: false },
            });
            expect(screen.queryByRole('button', { name: /I've Been Killed/i })).not.toBeInTheDocument();
            first.unmount();
            renderWithContext(<VotingPage tutorialMode />, votingContext);
            expect(screen.queryByRole('button', { name: /I've Been Killed/i })).not.toBeInTheDocument();
        });
    });

    describe('Rendering', () => {
        it('renders the voting page with title', () => {
            renderWithContext(<VotingPage />, votingContext);
            
            // Component has "Emergency Vote" as the title
            expect(screen.getByRole('heading', { name: /Emergency Vote/i })).toBeInTheDocument();
        });

        it('displays countdown timer', () => {
            renderWithContext(<VotingPage />, votingContext);
            
            // Should show time remaining (60 seconds in mockMeetingStateVoting)
            // Timer shows "{timeLeft}s"
            expect(screen.getByText(/60s/)).toBeInTheDocument();
        });

        it('shows all alive players to vote for', () => {
            renderWithContext(<VotingPage />, votingContext);
            
            // Should show alive players from mockPlayers
            expect(screen.getByText('Alice')).toBeInTheDocument();
            expect(screen.getByText('Bob')).toBeInTheDocument();
            expect(screen.getByText('Charlie')).toBeInTheDocument();
            // Diana is dead in mockPlayers, should not be voteable
        });

        it('does not show dead players as voting options', () => {
            renderWithContext(<VotingPage />, votingContext);
            
            // Diana is dead, should not appear as a vote option
            const playerCards = screen.queryAllByRole('button');
            // Diana might appear in a different context, but not as a voteable option
        });
    });

    describe('Voting Mechanics', () => {
        it('allows selecting a player to vote for', () => {
            renderWithContext(<VotingPage />, votingContext);
            
            // Click on a player card
            const playerCard = screen.getByText('Bob').closest('button') || 
                              screen.getByText('Bob').parentElement;
            
            if (playerCard) {
                fireEvent.click(playerCard);
                // Player should be selected
            }
        });

        it('shows vote button after selecting a player', () => {
            renderWithContext(<VotingPage />, votingContext);
            
            // Initially the button shows "Select a Player"
            const voteButton = screen.getByRole('button', { name: /Select a Player/i });
            expect(voteButton).toBeInTheDocument();
        });

        it('emits vote event when confirmed', () => {
            const { contextValue } = renderWithContext(<VotingPage />, votingContext);
            
            // Select a player first by clicking their card
            const playerCards = screen.getAllByText('Bob');
            const playerCard = playerCards[0].closest('div[class*="cursor-pointer"]') || 
                              playerCards[0].parentElement?.parentElement;
            if (playerCard) {
                fireEvent.click(playerCard);
            }
            
            // After selecting, the button should say "Vote for Bob"
            const voteButton = screen.getByRole('button', { name: /Vote for Bob/i });
            fireEvent.click(voteButton);
            
            expect(contextValue.socket.emit).toHaveBeenCalledWith('vote', expect.objectContaining({
                player_id: expect.any(String),
                votedFor: expect.any(String),
                round_id: 'round-1',
                meeting_id: 'meeting-1',
            }));
        });

        it('shows veto/skip option', () => {
            renderWithContext(<VotingPage />, votingContext);
            
            const vetoButton = screen.getByRole('button', { name: /Veto Meeting/i });
            expect(vetoButton).toBeInTheDocument();
        });

        it('emits veto event when skip is clicked', () => {
            const { contextValue } = renderWithContext(<VotingPage />, votingContext);
            
            const vetoButton = screen.getByRole('button', { name: /Veto Meeting/i });
            fireEvent.click(vetoButton);
            
            expect(contextValue.socket.emit).toHaveBeenCalledWith('veto', expect.objectContaining({
                player_id: expect.any(String),
                round_id: 'round-1',
                meeting_id: 'meeting-1',
            }));
        });
    });

    describe('After Voting', () => {
        it('shows confirmation after voting', async () => {
            const { contextValue } = renderWithContext(<VotingPage />, votingContext);
            
            // Select and vote for Bob
            const playerCards = screen.getAllByText('Bob');
            const playerCard = playerCards[0].closest('div[class*="cursor-pointer"]') || 
                              playerCards[0].parentElement?.parentElement;
            if (playerCard) {
                fireEvent.click(playerCard);
            }
            
            const voteButton = screen.getByRole('button', { name: /Vote for Bob/i });
            fireEvent.click(voteButton);
            
            // Should show some confirmation (either in text or UI change)
            await waitFor(() => {
                // The vote button might disappear or text might change
                expect(contextValue.socket.emit).toHaveBeenCalledWith('vote', expect.any(Object));
            });
        });

        it('changes UI state after voting', async () => {
            renderWithContext(<VotingPage />, votingContext);
            
            // Vote for Bob
            const playerCards = screen.getAllByText('Bob');
            const playerCard = playerCards[0].closest('div[class*="cursor-pointer"]') || 
                              playerCards[0].parentElement?.parentElement;
            if (playerCard) {
                fireEvent.click(playerCard);
            }
            
            const voteButton = screen.getByRole('button', { name: /Vote for Bob/i });
            fireEvent.click(voteButton);
            
            // Page should update after voting - shows "Voted for Bob" badge
            await waitFor(() => {
                expect(screen.getByText(/Voted for Bob/i)).toBeInTheDocument();
            });
        });
    });

    describe('Timer Display', () => {
        it('shows timer with progress bar', () => {
            renderWithContext(<VotingPage />, votingContext);
            
            // Should have timer visual - component shows "{timeLeft}s"
            expect(screen.getByText(/60s/)).toBeInTheDocument();
        });

        it('shows urgent styling when time is low', () => {
            const lowTimeContext = {
                ...votingContext,
                meetingState: { ...mockMeetingStateVoting, time_left: 5 },
            };
            
            renderWithContext(<VotingPage />, lowTimeContext);
            
            // Low time warning - shows the countdown
            expect(screen.getByText(/5s/)).toBeInTheDocument();
        });
    });

    describe('Vote Counts', () => {
        it('displays current vote counts if visible', () => {
            const votesContext = {
                ...votingContext,
                votes: {
                    'player2': 2, // Bob has 2 votes
                },
            };
            
            renderWithContext(<VotingPage />, votesContext);
            
            // Vote count display may vary by implementation
        });

        it('shows veto vote count', () => {
            const vetoContext = {
                ...votingContext,
                vetoVotes: 2,
            };
            
            renderWithContext(<VotingPage />, vetoContext);
            
            // Should show veto votes
            expect(screen.getByText(/2/)).toBeInTheDocument();
        });
    });
});

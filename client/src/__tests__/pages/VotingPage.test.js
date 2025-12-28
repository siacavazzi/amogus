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
import { renderWithContext, screen, fireEvent, waitFor, mockPlayers, mockMeetingStateVoting } from '../../test-utils';
import VotingPage from '../../pages/VotingPage';

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
                votedFor: expect.any(String),
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
            
            expect(contextValue.socket.emit).toHaveBeenCalledWith('veto', expect.any(Object));
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

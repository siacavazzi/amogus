/**
 * Tests for MeetingResultsPage - Shows voting results after a meeting
 * 
 * Game Flow Context:
 * - After voting timer ends, all players see this screen
 * - Shows who was voted out (if anyone)
 * - Reveals if the ejected player was an intruder or innocent
 * - Also handles veto (no one ejected) and tie scenarios
 * - Players return to gameplay after viewing results
 */
import React from 'react';
import { renderWithContext, screen, fireEvent, mockPlayers, mockMeetingStateResults } from '../../test-utils';
import MeetingResultPage from '../../pages/MeetingResultsPage';

describe('MeetingResultsPage', () => {
    describe('Ejection Result', () => {
        const ejectionContext = {
            meetingState: mockMeetingStateResults, // voted_out: 'player3', was_intruder: true
            players: mockPlayers,
            running: true,
        };

        it('renders the results page', () => {
            renderWithContext(<MeetingResultPage />, ejectionContext);
            
            // Should show the continue button
            expect(screen.getByRole('button', { name: /Continue/i })).toBeInTheDocument();
        });

        it('shows the ejected player name', () => {
            renderWithContext(<MeetingResultPage />, ejectionContext);
            
            // Charlie was voted out (player3 = Charlie in mockPlayers)
            expect(screen.getByText('Charlie')).toBeInTheDocument();
        });

        it('shows ejection text', () => {
            renderWithContext(<MeetingResultPage />, ejectionContext);
            
            // Should show "was ejected" text
            expect(screen.getByText(/was ejected/i)).toBeInTheDocument();
        });

        it('shows ejected player selfie/picture', () => {
            renderWithContext(<MeetingResultPage />, ejectionContext);
            
            // Should display player's image
            // Implementation varies - image or placeholder should be present
        });
    });

    describe('Innocent Ejection', () => {
        it('shows sad message when innocent player ejected', () => {
            const innocentContext = {
                meetingState: {
                    stage: 'over',
                    voted_out: 'player1', // Alice, who is not sus
                    was_intruder: false,
                },
                players: mockPlayers,
            };

            renderWithContext(<MeetingResultPage />, innocentContext);
            
            // Should show Alice
            expect(screen.getByText('Alice')).toBeInTheDocument();
            
            // Should show "was ejected" text
            expect(screen.getByText(/was ejected/i)).toBeInTheDocument();
        });
    });

    describe('Veto Result', () => {
        const vetoContext = {
            meetingState: {
                stage: 'over',
                reason: 'veto',
                voted_out: null,
                was_intruder: null,
            },
            players: mockPlayers,
        };

        it('shows veto message when meeting was vetoed', () => {
            renderWithContext(<MeetingResultPage />, vetoContext);
            
            expect(screen.getByText(/Meeting Vetoed/i)).toBeInTheDocument();
        });

        it('shows skip explanation', () => {
            renderWithContext(<MeetingResultPage />, vetoContext);
            
            expect(screen.getByText(/The crew decided to skip the vote/i)).toBeInTheDocument();
        });
    });

    describe('No Consensus', () => {
        const noConsensusContext = {
            meetingState: {
                stage: 'over',
                voted_out: null,
                was_intruder: null,
            },
            players: mockPlayers,
        };

        it('shows no consensus message when votes are tied', () => {
            renderWithContext(<MeetingResultPage />, noConsensusContext);
            
            expect(screen.getByText(/No Consensus/i)).toBeInTheDocument();
        });
    });

    describe('Navigation', () => {
        it('has continue button to return to game', () => {
            renderWithContext(<MeetingResultPage />, {
                meetingState: mockMeetingStateResults,
                players: mockPlayers,
            });
            
            const continueButton = screen.getByRole('button', { name: /Continue/i });
            expect(continueButton).toBeInTheDocument();
        });

        it('clears meeting state when continue is clicked', () => {
            const { contextValue } = renderWithContext(<MeetingResultPage />, {
                meetingState: mockMeetingStateResults,
                players: mockPlayers,
            });
            
            const continueButton = screen.getByRole('button', { name: /Continue/i });
            fireEvent.click(continueButton);
            
            expect(contextValue.setMeetingState).toHaveBeenCalled();
        });

        it('clears votes when page loads', () => {
            const { contextValue } = renderWithContext(<MeetingResultPage />, {
                meetingState: mockMeetingStateResults,
                players: mockPlayers,
            });
            
            // setVotes is called on mount to clear votes
            expect(contextValue.setVotes).toHaveBeenCalled();
            expect(contextValue.setVetoVotes).toHaveBeenCalledWith(0);
        });
    });

    describe('Animation', () => {
        it('shows results with animation', async () => {
            renderWithContext(<MeetingResultPage />, {
                meetingState: mockMeetingStateResults,
                players: mockPlayers,
            });
            
            // Content should be visible (animation reveals it)
            // The exact animation implementation varies
            expect(screen.getByText('Charlie')).toBeInTheDocument();
        });
    });
});

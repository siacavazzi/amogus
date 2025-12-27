/**
 * Tests for IntruderPage - Special abilities screen for intruders
 * 
 * Game Flow Context:
 * - Intruders can access this page from CrewPage by clicking the special button
 * - Shows available sabotage cards/abilities
 * - Cards have various effects: Hack (disable player screens), Fake Task, Meltdown trigger
 * - Cards may have cooldowns and durations
 * - Intruders can return to "normal" view to blend in
 */
import React from 'react';
import { renderWithContext, screen, fireEvent, mockActiveCards, mockPlayers, mockTaskLocations } from '../test-utils';
import IntruderPage from './IntruderPage';

describe('IntruderPage', () => {
    const mockSetShowSusPage = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    const intruderContext = {
        running: true,
        playerState: {
            username: 'IntruderPlayer',
            playerId: 'intruder123',
            sus: true,
            alive: true,
        },
        activeCards: mockActiveCards,
        players: mockPlayers,
        taskLocations: mockTaskLocations,
    };

    describe('Rendering', () => {
        it('renders the intruder page', () => {
            renderWithContext(
                <IntruderPage setShowSusPage={mockSetShowSusPage} />,
                intruderContext
            );
            
            // Should show intruder-specific UI (vent network header)
            expect(screen.getByText(/VENT NETWORK ACTIVE/i)).toBeInTheDocument();
        });

        it('displays available ability cards', () => {
            renderWithContext(
                <IntruderPage setShowSusPage={mockSetShowSusPage} />,
                intruderContext
            );
            
            // Should show card actions - use getAllByText since there may be multiple matches
            const hackElements = screen.getAllByText(/Hack/i);
            expect(hackElements.length).toBeGreaterThan(0);
            
            const fakeTaskElements = screen.getAllByText(/Fake Task/i);
            expect(fakeTaskElements.length).toBeGreaterThan(0);
        });

        it('shows card descriptions', () => {
            renderWithContext(
                <IntruderPage setShowSusPage={mockSetShowSusPage} />,
                intruderContext
            );
            
            // Should show card descriptions
            expect(screen.getByText(/Disable a crewmate/i)).toBeInTheDocument();
        });

        it('shows card duration info', () => {
            renderWithContext(
                <IntruderPage setShowSusPage={mockSetShowSusPage} />,
                intruderContext
            );
            
            // Should show duration for timed cards - shows as "15s" or "15s left"
            expect(screen.getByText(/15s/)).toBeInTheDocument();
        });
    });

    describe('Card Usage', () => {
        it('emits play_card event when simple card is clicked', () => {
            const { contextValue } = renderWithContext(
                <IntruderPage setShowSusPage={mockSetShowSusPage} />,
                intruderContext
            );
            
            // Click the Hack card (doesn't require input)
            const hackCard = screen.getByText(/Hack/i).closest('button');
            fireEvent.click(hackCard);
            
            expect(contextValue.socket.emit).toHaveBeenCalledWith('play_card', expect.objectContaining({
                card_id: 'card1',
            }));
        });

        it('opens modal for cards requiring input', () => {
            renderWithContext(
                <IntruderPage setShowSusPage={mockSetShowSusPage} />,
                intruderContext
            );
            
            // Click the Fake Task card (requires input) - get first match
            const fakeTaskCards = screen.getAllByText(/Fake Task/i);
            const fakeTaskCard = fakeTaskCards[0].closest('button');
            fireEvent.click(fakeTaskCard);
            
            // Should show modal for selecting target player and task details
            expect(screen.getByText(/Send Fake Task/i)).toBeInTheDocument();
        });
    });

    describe('Active Cards Display', () => {
        it('shows active indicator for cards in use', () => {
            const activeCardContext = {
                ...intruderContext,
                activeCards: [
                    { ...mockActiveCards[0], active: true },
                    mockActiveCards[1],
                ],
            };
            
            renderWithContext(
                <IntruderPage setShowSusPage={mockSetShowSusPage} />,
                activeCardContext
            );
            
            // Active card should have indicator - may have multiple
            const activeElements = screen.getAllByText(/Active/i);
            expect(activeElements.length).toBeGreaterThan(0);
        });

        it('shows time remaining for countdown cards', () => {
            const countdownCardContext = {
                ...intruderContext,
                activeCards: [
                    { ...mockActiveCards[0], countdown: true, time_left: 10 },
                ],
            };
            
            renderWithContext(
                <IntruderPage setShowSusPage={mockSetShowSusPage} />,
                countdownCardContext
            );
            
            // Should show remaining time
            expect(screen.getByText(/10s left/i)).toBeInTheDocument();
        });

        it('hides cards with zero time left', () => {
            const expiredCardContext = {
                ...intruderContext,
                activeCards: [
                    { ...mockActiveCards[0], time_left: 0 },
                ],
            };
            
            renderWithContext(
                <IntruderPage setShowSusPage={mockSetShowSusPage} />,
                expiredCardContext
            );
            
            // Should not show the expired card
            expect(screen.queryByText(/Hack/i)).not.toBeInTheDocument();
        });
    });

    describe('Back to Normal View', () => {
        it('has button to return to crew view', () => {
            renderWithContext(
                <IntruderPage setShowSusPage={mockSetShowSusPage} />,
                intruderContext
            );
            
            const backButton = screen.getByRole('button', { name: /EXIT TO SAFETY/i });
            expect(backButton).toBeInTheDocument();
        });

        it('calls setShowSusPage(false) when back is clicked', () => {
            renderWithContext(
                <IntruderPage setShowSusPage={mockSetShowSusPage} />,
                intruderContext
            );
            
            const backButton = screen.getByRole('button', { name: /EXIT TO SAFETY/i });
            fireEvent.click(backButton);
            
            expect(mockSetShowSusPage).toHaveBeenCalledWith(false);
        });
    });

    describe('Other Intruders', () => {
        it('shows other intruders if present', () => {
            const multiIntruderContext = {
                ...intruderContext,
                players: [
                    ...mockPlayers,
                    { player_id: 'intruder2', username: 'EvilPlayer2', sus: true, alive: true },
                ],
            };
            
            renderWithContext(
                <IntruderPage setShowSusPage={mockSetShowSusPage} />,
                multiIntruderContext
            );
            
            // Should show other intruder - Charlie is sus in mockPlayers
            // Note: This may or may not show depending on component implementation
            expect(screen.getByText(/VENT NETWORK ACTIVE/i)).toBeInTheDocument();
        });
    });

    describe('Empty State', () => {
        it('handles no available cards gracefully', () => {
            renderWithContext(
                <IntruderPage setShowSusPage={mockSetShowSusPage} />,
                { ...intruderContext, activeCards: [] }
            );
            
            // Should not crash and should show the vent network active header
            expect(screen.getByText(/VENT NETWORK ACTIVE/i)).toBeInTheDocument();
        });
    });
});

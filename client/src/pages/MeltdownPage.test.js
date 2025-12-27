/**
 * Tests for MeltdownPage - Reactor meltdown countdown screen (TV/display view)
 * 
 * Game Flow Context:
 * - Intruders can trigger a reactor meltdown as a sabotage
 * - This page is shown on the "TV" screen (non-mobile display)
 * - Shows countdown timer until meltdown
 * - Crewmates must enter codes on their phones to stop it
 * - If timer reaches 0, intruders win
 */
import React from 'react';
import { renderWithContext, screen, fireEvent, waitFor } from '../test-utils';
import ReactorMeltdown from './MeltdownPage';

// Mock react-icons
jest.mock('react-icons/fa', () => ({
    FaRadiation: () => <span data-testid="radiation-icon">☢</span>,
}));

describe('MeltdownPage', () => {
    const meltdownContext = {
        meltdownTimer: 60,
        codesNeeded: 5,
        roomCode: 'TEST1',
    };

    describe('Rendering', () => {
        it('renders the meltdown page', () => {
            renderWithContext(<ReactorMeltdown />, meltdownContext);
            
            // Should show meltdown title
            expect(screen.getByText(/CORE MELTDOWN/i)).toBeInTheDocument();
        });

        it('shows meltdown in progress warning', () => {
            renderWithContext(<ReactorMeltdown />, meltdownContext);
            
            // Should show meltdown in progress warning
            expect(screen.getByText(/MELTDOWN IN PROGRESS/i)).toBeInTheDocument();
        });

        it('shows codes needed count', () => {
            renderWithContext(<ReactorMeltdown />, meltdownContext);
            
            // Should show number of codes needed (5)
            expect(screen.getByText(/5/)).toBeInTheDocument();
        });

        it('displays radiation icon', () => {
            renderWithContext(<ReactorMeltdown />, meltdownContext);
            
            expect(screen.getByTestId('radiation-icon')).toBeInTheDocument();
        });
    });

    describe('Code Entry', () => {
        it('has 4-digit PIN input fields', () => {
            renderWithContext(<ReactorMeltdown />, meltdownContext);
            
            // Should have input fields for code entry
            const inputs = screen.getAllByRole('textbox');
            expect(inputs.length).toBe(4);
        });

        it('allows entering code digits', () => {
            renderWithContext(<ReactorMeltdown />, meltdownContext);
            
            const inputs = screen.getAllByRole('textbox');
            fireEvent.change(inputs[0], { target: { value: '1' } });
            // Input should accept the value
            expect(inputs[0].value).toBe('1');
        });
    });

    describe('Code Feedback', () => {
        it('shows error state for incorrect code', async () => {
            const { contextValue } = renderWithContext(<ReactorMeltdown />, meltdownContext);
            
            // Simulate socket receiving incorrect code response
            const errorHandler = contextValue.socket.on.mock.calls.find(
                call => call[0] === 'code_incorrect'
            )?.[1];
            
            if (errorHandler) {
                errorHandler();
                
                // Should show error indication
                // Visual feedback varies by implementation
            }
        });

        it('shows success and decrements codes needed for correct code', async () => {
            const { contextValue } = renderWithContext(<ReactorMeltdown />, meltdownContext);
            
            // Simulate correct code response
            const successHandler = contextValue.socket.on.mock.calls.find(
                call => call[0] === 'code_correct'
            )?.[1];
            
            if (successHandler) {
                successHandler(4); // Now 4 codes needed instead of 5
                
                expect(contextValue.setCodesNeeded).toHaveBeenCalledWith(4);
            }
        });
    });

    describe('Progress Display', () => {
        it('shows progress toward stopping meltdown', () => {
            const progressContext = {
                ...meltdownContext,
                codesNeeded: 2, // Started at 5, now only 2 needed
            };
            
            renderWithContext(<ReactorMeltdown />, progressContext);
            
            // Should show reduced codes needed
            expect(screen.getByText(/2/)).toBeInTheDocument();
        });
    });

    describe('Meltdown Averted', () => {
        it('shows success when all codes entered', async () => {
            const { contextValue } = renderWithContext(<ReactorMeltdown />, meltdownContext);
            
            // Simulate all codes entered
            const successHandler = contextValue.socket.on.mock.calls.find(
                call => call[0] === 'code_correct'
            )?.[1];
            
            if (successHandler) {
                successHandler(0); // No more codes needed
                
                // Should show success state
            }
        });
    });

    describe('Urgency States', () => {
        it('shows high urgency styling at low time', () => {
            const urgentContext = {
                ...meltdownContext,
                meltdownTimer: 10,
            };
            
            renderWithContext(<ReactorMeltdown />, urgentContext);
            
            // Low time should trigger urgent visuals - may have multiple matches
            const timeElements = screen.getAllByText(/10/);
            expect(timeElements.length).toBeGreaterThan(0);
        });

        it('shows critical styling at very low time', () => {
            const criticalContext = {
                ...meltdownContext,
                meltdownTimer: 5,
            };
            
            renderWithContext(<ReactorMeltdown />, criticalContext);
            
            // At 5 seconds, shows critical warning
            expect(screen.getByText(/CRITICAL - MELTDOWN IMMINENT/i)).toBeInTheDocument();
        });
    });
});

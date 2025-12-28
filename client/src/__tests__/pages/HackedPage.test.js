/**
 * Tests for HackedPage - Shown when a player gets hacked by an intruder
 * 
 * Game Flow Context:
 * - Intruders can use the "Hack" card to disable a player's screen
 * - Hacked players see this page with a matrix-style animation
 * - A countdown timer shows how long until the hack ends
 * - Player cannot do anything during the hack (no tasks, no meetings)
 * - Creates chaos and allows intruders to act unnoticed
 */
import React from 'react';
import { renderWithContext, screen } from '../../test-utils';
import HackedPage from '../../pages/HackedPage';

describe('HackedPage', () => {
    const mockSetHackTime = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Rendering', () => {
        it('renders the hacked page', () => {
            renderWithContext(
                <HackedPage hackTime={15} setHackTime={mockSetHackTime} />,
                { hackTime: 15 }
            );
            
            // Should show hacked indicator (multiple elements due to glitch effect)
            const hackedElements = screen.getAllByText('HACKED');
            expect(hackedElements.length).toBeGreaterThan(0);
        });

        it('displays hack timer countdown', () => {
            renderWithContext(
                <HackedPage hackTime={15} setHackTime={mockSetHackTime} />,
                { hackTime: 15 }
            );
            
            // Should show "SYSTEM RECOVERY IN" text
            expect(screen.getByText(/SYSTEM RECOVERY IN/i)).toBeInTheDocument();
        });
    });

    describe('Timer Display', () => {
        it('shows the HACKED title', () => {
            renderWithContext(
                <HackedPage hackTime={10} setHackTime={mockSetHackTime} />,
                { hackTime: 10 }
            );
            
            const hackedElements = screen.getAllByText('HACKED');
            expect(hackedElements.length).toBeGreaterThan(0);
        });

        it('shows EMP effect subtitle', () => {
            renderWithContext(
                <HackedPage hackTime={5} setHackTime={mockSetHackTime} />,
                { hackTime: 5 }
            );
            
            expect(screen.getByText(/ELECTROMAGNETIC PULSE ACTIVE/i)).toBeInTheDocument();
        });
    });

    describe('Visual Elements', () => {
        it('shows the hacked title', () => {
            renderWithContext(
                <HackedPage hackTime={15} setHackTime={mockSetHackTime} />,
                { hackTime: 15 }
            );
            
            const hackedElements = screen.getAllByText('HACKED');
            expect(hackedElements.length).toBeGreaterThan(0);
        });
    });
});

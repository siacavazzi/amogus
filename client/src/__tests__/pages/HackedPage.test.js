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
import { act } from '@testing-library/react';
import { renderWithContext, screen } from '../../test-utils';
import HackedPage from '../../pages/HackedPage';
import { DataContext } from '../../GameContext';

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
            
            expect(screen.getByText(/Back in/i)).toBeInTheDocument();
            expect(screen.getByText('00:15')).toBeInTheDocument();
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
            
            expect(screen.getByText(/An intruder played EMP/i)).toBeInTheDocument();
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

describe('HackedPage animation', () => {
    afterEach(() => jest.useRealTimers());

    it('plays the bolt hit first, then shows the countdown and a recharging battery', () => {
        jest.useFakeTimers();
        const { container, rerender, contextValue } = renderWithContext(<HackedPage hackTime={30} />, { hackTime: 30 });
        expect(screen.getByTestId('emp-hit')).toBeInTheDocument();
        act(() => { jest.advanceTimersByTime(1100); });
        expect(screen.queryByTestId('emp-hit')).not.toBeInTheDocument();
        expect(container.querySelectorAll('.sg-emp-batt__seg.is-on')).toHaveLength(0);
        rerender(<DataContext.Provider value={contextValue}><HackedPage hackTime={12} /></DataContext.Provider>);
        // 18 of 30 seconds gone: three of five segments charged.
        expect(container.querySelectorAll('.sg-emp-batt__seg.is-on')).toHaveLength(3);
    });

    it('skips the hit when the phone asks for less motion', () => {
        const original = window.matchMedia;
        window.matchMedia = (q) => ({ matches: q.includes('reduce'), addListener() {}, removeListener() {} });
        try {
            renderWithContext(<HackedPage hackTime={30} />, { hackTime: 30 });
            expect(screen.queryByTestId('emp-hit')).not.toBeInTheDocument();
            expect(screen.getByText('00:30')).toBeInTheDocument();
        } finally {
            window.matchMedia = original;
        }
    });
});

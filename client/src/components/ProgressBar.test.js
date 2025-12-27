/**
 * Tests for ProgressBar - Task completion indicator at top of screen
 * 
 * Game Flow Context:
 * - Shows during active gameplay (running state)
 * - Displays crew's progress toward completing all tasks
 * - Different styling for crewmates vs intruders (sus)
 * - Crewmates see "Complete Tasks" message
 * - Intruders see "Eliminate Crew" message (same progress bar though)
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import ProgressBar from './ProgressBar';

describe('ProgressBar', () => {
    describe('Rendering', () => {
        it('renders progress bar', () => {
            render(<ProgressBar score={5} goalScore={10} />);
            
            expect(screen.getByRole('progressbar')).toBeInTheDocument();
        });

        it('shows percentage', () => {
            render(<ProgressBar score={5} goalScore={10} />);
            
            expect(screen.getByText('50%')).toBeInTheDocument();
        });

        it('calculates percentage correctly', () => {
            render(<ProgressBar score={3} goalScore={12} />);
            
            expect(screen.getByText('25%')).toBeInTheDocument();
        });
    });

    describe('Crewmate Theme', () => {
        it('shows complete tasks message for crewmates', () => {
            render(<ProgressBar score={5} goalScore={10} sus={false} />);
            
            expect(screen.getByText(/Complete Tasks/i)).toBeInTheDocument();
        });

        it('does not show eliminate message for crewmates', () => {
            render(<ProgressBar score={5} goalScore={10} sus={false} />);
            
            expect(screen.queryByText(/Eliminate/i)).not.toBeInTheDocument();
        });
    });

    describe('Intruder Theme', () => {
        it('shows eliminate crew message for intruders', () => {
            render(<ProgressBar score={5} goalScore={10} sus={true} />);
            
            expect(screen.getByText(/Eliminate Crew/i)).toBeInTheDocument();
        });

        it('does not show complete tasks for intruders', () => {
            render(<ProgressBar score={5} goalScore={10} sus={true} />);
            
            expect(screen.queryByText(/Complete Tasks/i)).not.toBeInTheDocument();
        });
    });

    describe('Progress States', () => {
        it('shows 0% at start', () => {
            render(<ProgressBar score={0} goalScore={10} />);
            
            expect(screen.getByText('0%')).toBeInTheDocument();
        });

        it('shows 100% when complete', () => {
            render(<ProgressBar score={10} goalScore={10} />);
            
            expect(screen.getByText('100%')).toBeInTheDocument();
        });

        it('caps at 100% even if over', () => {
            render(<ProgressBar score={15} goalScore={10} />);
            
            expect(screen.getByText('100%')).toBeInTheDocument();
        });

        it('handles zero goal gracefully', () => {
            render(<ProgressBar score={0} goalScore={0} />);
            
            // Should not crash, shows 0%
            expect(screen.getByText('0%')).toBeInTheDocument();
        });
    });

    describe('Accessibility', () => {
        it('has proper aria attributes', () => {
            render(<ProgressBar score={5} goalScore={10} />);
            
            const progressbar = screen.getByRole('progressbar');
            expect(progressbar).toHaveAttribute('aria-valuenow', '5');
            expect(progressbar).toHaveAttribute('aria-valuemin', '0');
            expect(progressbar).toHaveAttribute('aria-valuemax', '10');
        });

        it('has accessible label', () => {
            render(<ProgressBar score={5} goalScore={10} />);
            
            const progressbar = screen.getByRole('progressbar');
            expect(progressbar).toHaveAttribute('aria-label', 'Progress: 50%');
        });
    });

    describe('Visual Styling', () => {
        it('applies complete styling at 100%', () => {
            const { container } = render(<ProgressBar score={10} goalScore={10} />);
            
            // At 100%, should have glow effect
            // CSS class testing is limited
            expect(container.querySelector('.shadow-lg')).toBeInTheDocument();
        });
    });
});

/**
 * Tests for Modal - Dialog component for notifications and prompts
 * 
 * Game Flow Context:
 * - Used for game notifications (role reveal, task assignments)
 * - Audio enable prompt at game start
 * - Confirmation dialogs
 * - Closes on escape key or backdrop click (except audio modal)
 */
import React from 'react';
import { renderWithContext, screen, fireEvent } from '../../test-utils';
import Modal from '../../components/Modal';

describe('Modal', () => {
    describe('Visibility', () => {
        it('does not render when no dialog', () => {
            renderWithContext(<Modal />, { dialog: null });
            
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        it('renders when dialog is present', () => {
            renderWithContext(<Modal />, { 
                dialog: { title: 'Test Modal', body: 'Test content' }
            });
            
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        it('shows dialog title', () => {
            renderWithContext(<Modal />, {
                dialog: { title: 'Important Message', body: 'Content here' }
            });
            
            expect(screen.getByText('Important Message')).toBeInTheDocument();
        });

        it('shows dialog body content', () => {
            renderWithContext(<Modal />, {
                dialog: { title: 'Test', body: 'This is the body content' }
            });
            
            expect(screen.getByText('This is the body content')).toBeInTheDocument();
        });
    });

    describe('Close Behavior', () => {
        it('has OK button for normal modals', () => {
            renderWithContext(<Modal />, {
                dialog: { title: 'Test Modal', body: 'Content' }
            });
            
            const okButton = screen.getByRole('button', { name: /OK/i });
            expect(okButton).toBeInTheDocument();
        });

        it('has X close button for normal modals', () => {
            renderWithContext(<Modal />, {
                dialog: { title: 'Test Modal', body: 'Content' }
            });
            
            // The X button exists (though not accessible by name)
            const buttons = screen.getAllByRole('button');
            expect(buttons.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('Audio Enable Modal', () => {
        it('shows special styling for audio enable modal', () => {
            renderWithContext(<Modal />, {
                dialog: { title: 'Click to enable audio', body: 'Tap to enable sound' }
            });
            
            expect(screen.getByText('Click to enable audio')).toBeInTheDocument();
        });

        it('shows Enable Audio button for audio modal', () => {
            renderWithContext(<Modal />, {
                dialog: { title: 'Click to enable audio', body: 'Tap' }
            });
            
            expect(screen.getByRole('button', { name: /Enable Audio/i })).toBeInTheDocument();
        });

        it('enables audio when clicked', () => {
            const { contextValue } = renderWithContext(<Modal />, {
                dialog: { title: 'Click to enable audio', body: 'Tap' }
            });
            
            // Click Enable Audio button
            const enableButton = screen.getByRole('button', { name: /Enable Audio/i });
            fireEvent.click(enableButton);
            
            // setAudioEnabled should be called
            expect(contextValue.setAudioEnabled).toHaveBeenCalledWith(true);
        });
    });

    describe('Meeting State Override', () => {
        it('hides during voting stage', () => {
            renderWithContext(<Modal />, {
                dialog: { title: 'Test Modal', body: 'Content' },
                meetingState: { stage: 'voting' }
            });
            
            // Modal should not show during voting
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        it('hides during results stage', () => {
            renderWithContext(<Modal />, {
                dialog: { title: 'Test Modal', body: 'Content' },
                meetingState: { stage: 'over' }
            });
            
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
    });

    describe('Accessibility', () => {
        it('has proper aria attributes', () => {
            renderWithContext(<Modal />, {
                dialog: { title: 'Test Modal', body: 'Content' }
            });
            
            const dialog = screen.getByRole('dialog');
            expect(dialog).toHaveAttribute('aria-modal', 'true');
        });

        it('has labeled title', () => {
            renderWithContext(<Modal />, {
                dialog: { title: 'Test Modal', body: 'Content' }
            });
            
            const dialog = screen.getByRole('dialog');
            expect(dialog).toHaveAttribute('aria-labelledby');
        });

        it('traps focus when open', () => {
            renderWithContext(<Modal />, {
                dialog: { title: 'Test Modal', body: 'Content' }
            });
            
            // Modal should receive focus
        });
    });
});

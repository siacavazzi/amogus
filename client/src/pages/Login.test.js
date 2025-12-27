/**
 * Tests for Login Page - Where players enter their username and take selfies
 * 
 * Game Flow Context:
 * - After joining a room, players land on this page
 * - Players enter a username and optionally take a selfie
 * - Selfies are used to identify players during voting
 * - After login, players go to PreGamePage to wait for game start
 */
import React from 'react';
import { renderWithContext, screen, fireEvent, waitFor } from '../test-utils';
import LoginPage from './Login';

// Mock the CameraCapture component since it requires browser camera APIs
jest.mock('../components/CameraCapture', () => {
    return function MockCameraCapture({ onCapture, onSkip }) {
        return (
            <div data-testid="camera-capture">
                <button onClick={() => onCapture('mock-image-data')}>Capture</button>
                <button onClick={onSkip}>Skip</button>
            </div>
        );
    };
});

describe('LoginPage', () => {
    describe('Username Entry', () => {
        it('renders username input form', () => {
            renderWithContext(<LoginPage />);
            
            expect(screen.getByText(/Join the Game/i)).toBeInTheDocument();
            expect(screen.getByPlaceholderText(/Enter your name/i)).toBeInTheDocument();
        });

        it('displays the room code', () => {
            renderWithContext(<LoginPage />, { roomCode: 'GAME1' });
            
            expect(screen.getByText(/GAME1/)).toBeInTheDocument();
        });

        it('accepts username input', () => {
            renderWithContext(<LoginPage />);
            
            const input = screen.getByPlaceholderText(/Enter your name/i);
            fireEvent.change(input, { target: { value: 'TestPlayer' } });
            expect(input.value).toBe('TestPlayer');
        });

        it('proceeds to camera step after username submission', async () => {
            renderWithContext(<LoginPage />);
            
            const input = screen.getByPlaceholderText(/Enter your name/i);
            fireEvent.change(input, { target: { value: 'TestPlayer' } });
            
            const form = input.closest('form');
            fireEvent.submit(form);
            
            // Should show camera capture component
            await waitFor(() => {
                expect(screen.getByTestId('camera-capture')).toBeInTheDocument();
            });
        });
    });

    describe('Camera/Selfie Step', () => {
        const goToCameraStep = async () => {
            const result = renderWithContext(<LoginPage />);
            
            const input = screen.getByPlaceholderText(/Enter your name/i);
            fireEvent.change(input, { target: { value: 'TestPlayer' } });
            
            const form = input.closest('form');
            fireEvent.submit(form);
            
            await waitFor(() => {
                expect(screen.getByTestId('camera-capture')).toBeInTheDocument();
            });
            
            return result;
        };

        it('shows back button on camera step', async () => {
            await goToCameraStep();
            
            expect(screen.getByText(/Back/i)).toBeInTheDocument();
        });

        it('returns to username step when back is clicked', async () => {
            await goToCameraStep();
            
            const backButton = screen.getByText(/Back/i);
            fireEvent.click(backButton);
            
            await waitFor(() => {
                expect(screen.getByPlaceholderText(/Enter your name/i)).toBeInTheDocument();
            });
        });

        it('emits join event with selfie when captured', async () => {
            const { contextValue } = await goToCameraStep();
            
            const captureButton = screen.getByText('Capture');
            fireEvent.click(captureButton);
            
            expect(contextValue.socket.emit).toHaveBeenCalledWith('join', expect.objectContaining({
                username: 'TestPlayer',
                selfie: 'mock-image-data',
            }));
        });

        it('has skip button for camera step', async () => {
            await goToCameraStep();
            
            const skipButton = screen.getByText('Skip');
            expect(skipButton).toBeInTheDocument();
        });
    });
});

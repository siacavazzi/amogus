/**
 * Tests for Login Page - Where players enter their username and pick how they look
 *
 * Game Flow Context:
 * - After joining a room, players land on this page
 * - Players enter a username, then pick an avatar or opt in to a selfie
 * - The camera is only requested after the player chooses a selfie
 * - After login, players go to PreGamePage to wait for game start
 */
import React from 'react';
import { renderWithContext, screen, fireEvent, waitFor } from '../../test-utils';
import LoginPage from '../../pages/Login';

// Mock the CameraCapture component since it requires browser camera APIs
jest.mock('../../components/CameraCapture', () => {
    return function MockCameraCapture({ onCapture, onCancel }) {
        return (
            <div data-testid="camera-capture">
                <button onClick={() => onCapture('mock-image-data')}>Capture</button>
                <button onClick={onCancel}>Skip</button>
            </div>
        );
    };
});

const goToAvatarStep = async (overrides) => {
    const result = renderWithContext(<LoginPage />, overrides);
    const input = screen.getByPlaceholderText(/Enter your name/i);
    fireEvent.change(input, { target: { value: 'TestPlayer' } });
    fireEvent.submit(input.closest('form'));
    await waitFor(() => {
        expect(screen.getByRole('radiogroup', { name: 'Avatar' })).toBeInTheDocument();
    });
    return result;
};

const checkedAvatar = () => screen.getAllByRole('radio').find((radio) => radio.getAttribute('aria-checked') === 'true');

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

        it('proceeds to the avatar picker after username submission', async () => {
            await goToAvatarStep();

            expect(screen.getAllByRole('radio')).toHaveLength(18);
        });
    });

    describe('Avatar Step', () => {
        it('does not open the camera until the player asks for a selfie', async () => {
            await goToAvatarStep();

            expect(screen.queryByTestId('camera-capture')).not.toBeInTheDocument();
        });

        it('locks avatars that other players in the room already have', async () => {
            await goToAvatarStep();

            expect(screen.getByRole('radio', { name: /taken by Alice/ })).toBeDisabled();
            expect(screen.getByRole('radio', { name: /taken by Diana/ })).toBeDisabled();
        });

        it('preselects a free avatar', async () => {
            await goToAvatarStep();

            expect(checkedAvatar()).toBeEnabled();
        });

        it('allows any avatar once every avatar is taken', async () => {
            const players = Array.from({ length: 18 }, (_, pic) => ({ player_id: `p${pic}`, username: `P${pic}`, pic }));
            await goToAvatarStep({ players });

            screen.getAllByRole('radio').forEach((radio) => expect(radio).toBeEnabled());
        });

        it('emits join with the chosen avatar and no selfie', async () => {
            const { contextValue } = await goToAvatarStep();

            fireEvent.click(screen.getByRole('radio', { name: /Hopper/ }));
            fireEvent.click(screen.getByText('Join Game'));

            expect(contextValue.socket.emit).toHaveBeenCalledWith('join', expect.objectContaining({
                username: 'TestPlayer',
                selfie: null,
                pic: 7,
            }));
        });

        it('shuffles to a different free avatar', async () => {
            await goToAvatarStep();
            const before = checkedAvatar();

            fireEvent.click(screen.getByLabelText('Pick a random avatar'));

            expect(checkedAvatar()).not.toBe(before);
            expect(checkedAvatar()).toBeEnabled();
        });

        it('returns to username step when back is clicked', async () => {
            await goToAvatarStep();

            fireEvent.click(screen.getByText(/Back/i));

            await waitFor(() => {
                expect(screen.getByPlaceholderText(/Enter your name/i)).toBeInTheDocument();
            });
        });
    });

    describe('Selfie Step', () => {
        const goToCameraStep = async () => {
            const result = await goToAvatarStep();
            fireEvent.click(screen.getByText(/Take a selfie instead/i));
            await waitFor(() => {
                expect(screen.getByTestId('camera-capture')).toBeInTheDocument();
            });
            return result;
        };

        it('opens the camera when the player chooses a selfie', async () => {
            await goToCameraStep();
        });

        it('emits join with the selfie and the chosen avatar as a fallback', async () => {
            const { contextValue } = await goToCameraStep();

            fireEvent.click(screen.getByText('Capture'));

            expect(contextValue.socket.emit).toHaveBeenCalledWith('join', expect.objectContaining({
                username: 'TestPlayer',
                selfie: 'mock-image-data',
                pic: expect.any(Number),
            }));
        });

        it('returns to the avatar picker when the selfie is skipped', async () => {
            await goToCameraStep();

            fireEvent.click(screen.getByText('Skip'));

            expect(screen.queryByTestId('camera-capture')).not.toBeInTheDocument();
            expect(screen.getByRole('radiogroup', { name: 'Avatar' })).toBeInTheDocument();
        });

        it('returns to the avatar picker when back is clicked', async () => {
            await goToCameraStep();

            fireEvent.click(screen.getByText(/Back/i));

            expect(screen.getByRole('radiogroup', { name: 'Avatar' })).toBeInTheDocument();
        });
    });
});

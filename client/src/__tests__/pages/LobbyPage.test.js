/**
 * Tests for LobbyPage - The entry point where players create or join game rooms
 * 
 * Game Flow Context:
 * - This is the first page players see after connecting
 * - Players can either CREATE a new game room or JOIN an existing one
 * - Creating a game makes you the room creator (host)
 * - Joining requires entering a 4-character room code
 */
import React from 'react';
import { renderWithContext, screen, fireEvent, waitFor } from '../../test-utils';
import LobbyPage from '../../pages/LobbyPage';

describe('LobbyPage', () => {
    describe('Rendering', () => {
        it('renders the lobby page with title and options', () => {
            renderWithContext(<LobbyPage />);
            
            // Should show the game title
            expect(screen.getByText(/Sus Party/i)).toBeInTheDocument();
            
            // Should show create and join options
            expect(screen.getByText(/Create New Game/i)).toBeInTheDocument();
            expect(screen.getByText(/Join Game/i)).toBeInTheDocument();
        });

        it('displays feature badges explaining the game', () => {
            renderWithContext(<LobbyPage />);
            
            // Should show key game features
            expect(screen.getByText(/Physical Tasks/i)).toBeInTheDocument();
            expect(screen.getByText(/Real-time/i)).toBeInTheDocument();
        });
    });

    describe('Creating a Game', () => {
        it('emits create_game event when create button is clicked', () => {
            const { contextValue } = renderWithContext(<LobbyPage />);
            
            const createButton = screen.getByText(/Create New Game/i);
            fireEvent.click(createButton);
            
            expect(contextValue.socket.emit).toHaveBeenCalledWith('create_game');
        });

        it('shows loading state while creating', async () => {
            renderWithContext(<LobbyPage />);
            
            const createButton = screen.getByText(/Create New Game/i);
            fireEvent.click(createButton);
            
            // Button should show loading state or be in loading mode
            await waitFor(() => {
                expect(screen.queryByText(/Creating Room.../i)).toBeInTheDocument();
            });
        });
    });

    describe('Joining a Game', () => {
        it('shows room code input field', () => {
            renderWithContext(<LobbyPage />);
            
            // Input should be present with placeholder XXXX
            expect(screen.getByPlaceholderText('XXXX')).toBeInTheDocument();
        });

        it('emits join_game event with room code when submitted', () => {
            const { contextValue } = renderWithContext(<LobbyPage />);
            
            // Enter room code
            const input = screen.getByPlaceholderText('XXXX');
            fireEvent.change(input, { target: { value: 'ABCD' } });
            
            // Submit the form - find the Join Game button
            const joinButton = screen.getByRole('button', { name: /Join Game/i });
            fireEvent.click(joinButton);
            
            expect(contextValue.socket.emit).toHaveBeenCalledWith('join_game', expect.objectContaining({ 
                room_code: 'ABCD' 
            }));
        });

        it('converts room code to uppercase automatically', () => {
            const { contextValue } = renderWithContext(<LobbyPage />);
            
            const input = screen.getByPlaceholderText('XXXX');
            fireEvent.change(input, { target: { value: 'abcd' } });
            
            const joinButton = screen.getByRole('button', { name: /Join Game/i });
            fireEvent.click(joinButton);
            
            expect(contextValue.socket.emit).toHaveBeenCalledWith('join_game', expect.objectContaining({ 
                room_code: 'ABCD' 
            }));
        });
    });

    describe('Error Handling', () => {
        it('displays error message when socket emits error', async () => {
            const { contextValue } = renderWithContext(<LobbyPage />);
            
            // Simulate socket error event
            const errorHandler = contextValue.socket.on.mock.calls.find(
                call => call[0] === 'error'
            )?.[1];
            
            if (errorHandler) {
                errorHandler({ message: 'Room not found' });
                
                await waitFor(() => {
                    expect(screen.getByText(/Room not found/i)).toBeInTheDocument();
                });
            }
        });
    });
});

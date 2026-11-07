import React from 'react';
import { act } from '@testing-library/react';
import { renderWithContext, screen, fireEvent, mockPlayers } from '../../test-utils';
import ReactorWaiting from '../../pages/ReactorWaiting';
import ReactorPage from '../../pages/ReactorPage';
import { markMeltdownAverted, clearMeltdownAverted } from '../../components/MeltdownAverted';

describe('Reactor waiting screen', () => {
    it('shows the room code, the joined players and the waiting line', () => {
        const { contextValue } = renderWithContext(<ReactorWaiting />, { roomCode: 'ABCD', players: mockPlayers });
        expect(screen.getByRole('heading', { name: /Room code ABCD/ })).toBeInTheDocument();
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('4 players connected')).toBeInTheDocument();
        expect(screen.getByText('Waiting for the host to start')).toBeInTheDocument();
        fireEvent.click(screen.getByTitle('Leave Room'));
        expect(contextValue.socket.emit).toHaveBeenCalledWith('leave_room', { room_code: 'ABCD' });
    });

    it('names the host so the room knows whose phone starts the game', () => {
        renderWithContext(<ReactorWaiting />, {
            roomCode: 'ABCD', players: mockPlayers, lobbyState: { host_player_id: 'player2' },
        });
        expect(screen.getByTestId('reactor-host-hint')).toHaveTextContent('Bob is the host. Start the game from their phone.');
        expect(screen.getByText('Host')).toBeInTheDocument();
    });

    it('tells the laptop to join on a phone when nobody has joined', () => {
        renderWithContext(<ReactorWaiting />, { roomCode: 'ABCD', players: [] });
        expect(screen.getByTestId('reactor-host-hint')).toHaveTextContent('Now join on your phone. The first phone in is the host and starts the game.');
    });

    it('says the screen cannot start the game when no phone joins for a minute', () => {
        jest.useFakeTimers();
        try {
            renderWithContext(<ReactorWaiting />, { roomCode: 'ABCD', players: [] });
            act(() => { jest.advanceTimersByTime(59 * 1000); });
            expect(screen.getByTestId('reactor-host-hint')).not.toHaveTextContent('No phones yet');
            act(() => { jest.advanceTimersByTime(2 * 1000); });
            expect(screen.getByTestId('reactor-host-hint')).toHaveTextContent("No phones yet. Everyone joins on a phone, including you. This screen can't start the game.");
        } finally {
            jest.useRealTimers();
        }
    });

    it('remembers that this laptop has had phones join', () => {
        renderWithContext(<ReactorWaiting />, { roomCode: 'ABCD', players: mockPlayers });
        expect(localStorage.setItem).toHaveBeenCalledWith('sus_party_laptop_hosted_v1', '1');
    });
});

describe('Reactor round screen', () => {
    afterEach(() => clearMeltdownAverted());

    it('shows task progress as a percentage', () => {
        renderWithContext(<ReactorPage />, { crewScore: 3, taskGoal: 4, hackTime: 0 });
        expect(screen.getByRole('progressbar', { name: 'Progress: 75%' })).toBeInTheDocument();
    });

    it('shows the meeting roll call of living players', () => {
        renderWithContext(<ReactorPage />, {
            meetingState: { stage: 'waiting', player_who_started_it: 'Alice' }, players: mockPlayers, hackTime: 0,
        });
        expect(screen.getByText('Alice called it')).toBeInTheDocument();
        expect(screen.getByText('Bob')).toBeInTheDocument();
        expect(screen.queryByText('Diana')).not.toBeInTheDocument();
        expect(screen.getByTestId('reactor-ready-count')).toHaveTextContent('2 of 3 ready');
    });

    it('names the intruders once tasks are complete', () => {
        renderWithContext(<ReactorPage />, {
            intrudersRevealed: { intruder_names: ['Charlie'] }, players: mockPlayers, hackTime: 0,
        });
        expect(screen.getByText('Charlie')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sabotage core/i })).toBeEnabled();
    });

    it('shows the averted moment right after a meltdown is stopped', () => {
        markMeltdownAverted();
        renderWithContext(<ReactorPage />, { hackTime: 0 });
        expect(screen.getByText('The reactor is safe. Back to your tasks.')).toBeInTheDocument();
    });
});

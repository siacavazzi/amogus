import React from 'react';
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

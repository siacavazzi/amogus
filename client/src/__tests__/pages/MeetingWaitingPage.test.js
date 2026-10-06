import React from 'react';
import { fireEvent, renderWithContext, screen } from '../../test-utils';
import MeetingWaitingPage from '../../pages/MeetingWaitingPage';

jest.mock('../../components/swiper', () => function MockSlider({ onSuccess }) {
    return <button onClick={onSuccess}>Ready up</button>;
});

describe('MeetingWaitingPage', () => {
    const meetingContext = {
        playerState: { player_id: 'player-1', username: 'Alex', alive: true, ready: false },
        players: [
            { player_id: 'player-1', username: 'Alex', alive: true, active: true, ready: false },
            { player_id: 'player-2', username: 'Blair', alive: true, active: false, ready: true },
            { player_id: 'player-3', username: 'Casey', alive: false, active: false, ready: true },
        ],
        roundId: 'round-8',
        meetingState: { id: 'meeting-8', round_id: 'round-8', stage: 'waiting', player_who_started_it: 'Alex' },
    };

    it('shows an absent living player as offline and still waiting', () => {
        renderWithContext(<MeetingWaitingPage />, meetingContext);

        expect(screen.getByText('Blair')).toBeInTheDocument();
        expect(screen.getByText('Offline')).toBeInTheDocument();
        expect(screen.getAllByText('2', { selector: '.text-3xl' })).toHaveLength(2);
        expect(screen.getByText('0', { selector: '.text-3xl' })).toBeInTheDocument();
    });

    it('sends the current round and meeting IDs for readiness and death reports', () => {
        const { contextValue } = renderWithContext(<MeetingWaitingPage />, meetingContext);

        fireEvent.click(screen.getByRole('button', { name: /Ready up/i }));
        expect(contextValue.socket.emit).toHaveBeenCalledWith('ready', expect.objectContaining({
            player_id: expect.any(String),
            round_id: 'round-8',
            meeting_id: 'meeting-8',
        }));

        const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
        fireEvent.click(screen.getByRole('button', { name: /I've Been Killed/i }));
        expect(contextValue.socket.emit).toHaveBeenCalledWith('player_dead', expect.objectContaining({
            player_id: expect.any(String),
            round_id: 'round-8',
            meeting_id: 'meeting-8',
        }));
        confirm.mockRestore();
    });
});

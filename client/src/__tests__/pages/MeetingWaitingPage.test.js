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

    it('shows a player who slid ready and then dropped as offline but still ready', () => {
        renderWithContext(<MeetingWaitingPage />, meetingContext);

        expect(screen.getByText('Blair')).toBeInTheDocument();
        expect(screen.getByText('Offline')).toBeInTheDocument();
        // The server keeps a dropped phone's ready, so the count does too.
        expect(screen.getByTestId('ready-count')).toHaveTextContent('1 of 2 ready');
    });

    it('sends the current round and meeting IDs for readiness and death reports', () => {
        const { contextValue } = renderWithContext(<MeetingWaitingPage />, meetingContext);

        fireEvent.click(screen.getByRole('button', { name: /Ready up/i }));
        expect(contextValue.socket.emit).toHaveBeenCalledWith('ready', expect.objectContaining({
            player_id: expect.any(String),
            round_id: 'round-8',
            meeting_id: 'meeting-8',
        }), expect.any(Function));

        const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
        fireEvent.click(screen.getByRole('button', { name: /I've Been Killed/i }));
        expect(contextValue.socket.emit).toHaveBeenCalledWith('player_dead', expect.objectContaining({
            player_id: expect.any(String),
            round_id: 'round-8',
            meeting_id: 'meeting-8',
        }));
        confirm.mockRestore();
    });

    it('rejoins and slides again when the server says this socket must reconnect first', () => {
        const { contextValue } = renderWithContext(<MeetingWaitingPage />, meetingContext);
        const { socket } = contextValue;
        socket.once = jest.fn();

        fireEvent.click(screen.getByRole('button', { name: /Ready up/i }));
        const readyCall = socket.emit.mock.calls.find(call => call[0] === 'ready');
        readyCall[2]({ ok: false, error: 'Reconnect before you send this command.' });

        expect(socket.emit).toHaveBeenCalledWith('rejoin', { player_id: readyCall[1].player_id });
        const [event, afterRejoin] = socket.once.mock.calls[0];
        expect(event).toBe('game_joined');
        afterRejoin();
        expect(socket.emit.mock.calls.filter(call => call[0] === 'ready')).toHaveLength(2);
    });

    it('does not rejoin when the slide simply arrived after the meeting moved on', () => {
        const { contextValue } = renderWithContext(<MeetingWaitingPage />, meetingContext);
        const { socket } = contextValue;
        socket.once = jest.fn();
        fireEvent.click(screen.getByRole('button', { name: /Ready up/i }));
        socket.emit.mock.calls.find(call => call[0] === 'ready')[2]({ ok: false, error: 'This meeting is no longer in the ready phase.' });
        expect(socket.emit).not.toHaveBeenCalledWith('rejoin', expect.anything());
    });

    it('in a big game, says how many need to be ready before voting opens', () => {
        const players = Array.from({ length: 12 }, (_, i) => ({
            player_id: `p-${i}`, username: `P${i}`, alive: true, active: true, ready: i < 6,
        }));
        renderWithContext(<MeetingWaitingPage />, {
            ...meetingContext,
            players,
            meetingState: { ...meetingContext.meetingState, ready_quorum: 0.8, ready_quorum_min_players: 11 },
        });
        expect(screen.getByTestId('ready-count')).toHaveTextContent('6 of 12 ready');
        expect(screen.getByTestId('ready-needed')).toHaveTextContent('Voting opens at 10 ready');
    });

    it('in a small game, waits for everyone without mentioning a quorum', () => {
        renderWithContext(<MeetingWaitingPage />, {
            ...meetingContext,
            meetingState: { ...meetingContext.meetingState, ready_quorum: 0.8, ready_quorum_min_players: 11 },
        });
        expect(screen.queryByTestId('ready-needed')).not.toBeInTheDocument();
    });
});

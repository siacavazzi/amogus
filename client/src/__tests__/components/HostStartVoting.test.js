import React from 'react';
import { act, fireEvent, renderWithContext, screen } from '../../test-utils';
import HostStartVoting from '../../components/HostStartVoting';

describe('HostStartVoting', () => {
    const base = {
        playerState: { player_id: 'host-1', username: 'Sam', alive: true, ready: true },
        players: [
            { player_id: 'host-1', username: 'Sam', alive: true, active: true, ready: true },
            { player_id: 'p-2', username: 'Blair', alive: true, active: true, ready: false },
            { player_id: 'p-3', username: 'Casey', alive: true, active: true, ready: false },
        ],
        roundId: 'round-8',
        connected: true,
        meetingState: {
            id: 'meeting-8', round_id: 'round-8', stage: 'waiting',
            host_name: 'Sam', host_override_in: 0,
        },
    };

    afterEach(() => jest.useRealTimers());

    it('asks the host to tap twice, then sends the meeting it belongs to', () => {
        const { contextValue } = renderWithContext(<HostStartVoting />, { ...base, isRoomCreator: true });

        fireEvent.click(screen.getByTestId('host-start-voting'));
        expect(contextValue.socket.emit).not.toHaveBeenCalledWith('host_start_voting', expect.anything(), expect.anything());
        expect(screen.getByTestId('host-start-voting')).toHaveTextContent('Tap again to vote without 2');

        fireEvent.click(screen.getByTestId('host-start-voting'));
        expect(contextValue.socket.emit).toHaveBeenCalledWith('host_start_voting', {
            player_id: 'host-1', round_id: 'round-8', meeting_id: 'meeting-8',
        }, expect.any(Function));
    });

    it('stays locked until the server says the wait is over', () => {
        jest.useFakeTimers();
        renderWithContext(<HostStartVoting />, {
            ...base, isRoomCreator: true, meetingState: { ...base.meetingState, host_override_in: 3 },
        });
        expect(screen.getByTestId('host-start-voting')).toBeDisabled();
        expect(screen.getByTestId('host-start-voting')).toHaveTextContent('Start voting in 3s');

        act(() => { jest.advanceTimersByTime(3500); });
        expect(screen.getByTestId('host-start-voting')).toBeEnabled();
        expect(screen.getByTestId('host-start-voting')).toHaveTextContent('Start voting now');
    });

    it('never gives other players the button, only tells them who the host is', () => {
        renderWithContext(<HostStartVoting />, { ...base, isRoomCreator: false });
        expect(screen.queryByTestId('host-start-voting')).not.toBeInTheDocument();
        expect(screen.getByTestId('host-can-start-voting')).toHaveTextContent('Sam is the host');
    });

    it('disappears once everyone is ready', () => {
        const players = base.players.map((p) => ({ ...p, ready: true }));
        renderWithContext(<HostStartVoting />, { ...base, players, isRoomCreator: true });
        expect(screen.queryByTestId('host-start-voting')).not.toBeInTheDocument();
    });

    it('does not count a player who is offline past the grace period', () => {
        const players = [...base.players.slice(0, 2), { ...base.players[2], active: false, absent: true }];
        renderWithContext(<HostStartVoting />, { ...base, players, isRoomCreator: true });
        fireEvent.click(screen.getByTestId('host-start-voting'));
        expect(screen.getByTestId('host-start-voting')).toHaveTextContent('Tap again to vote without 1');
    });
});

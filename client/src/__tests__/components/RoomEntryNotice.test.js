import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RoomEntryNotice from '../../components/RoomEntryNotice';

describe('RoomEntryNotice', () => {
    it('tells a phone that came before the host opened the room to wait, with no retry button', () => {
        render(<RoomEntryNotice status={{ code: 'room_not_open', waiting: true, room_code: 'HEMY', message: "You'll join as soon as they do." }} onRetry={() => {}} onChangeCode={() => {}} />);
        expect(screen.getByText('Waiting for the host to open the room')).toBeInTheDocument();
        expect(screen.getByTestId('waiting-to-open')).toBeInTheDocument();
        expect(screen.queryByText('Try again')).not.toBeInTheDocument();
        expect(screen.getByText('Change code')).toBeInTheDocument();
    });

    it('still offers Try again for a room that is not found', () => {
        render(<RoomEntryNotice status={{ code: 'room_not_found', room_code: 'HEMY', message: 'No room' }} onRetry={() => {}} onChangeCode={() => {}} />);
        expect(screen.getByText('Try again')).toBeInTheDocument();
    });

    it("turns an old link into the game's tasks for a new room", () => {
        const onStartNew = jest.fn();
        const playedAt = new Date(2026, 9, 27, 20).getTime() / 1000;
        render(<RoomEntryNotice status={{ code: 'game_ended', room_code: 'RSJO', saved_game: { code: 'ZN5QF2', played_at: playedAt, task_count: 24 } }}
            onRetry={() => {}} onChangeCode={() => {}} onStartNew={onStartNew} />);
        expect(screen.getByText('This game has ended')).toBeInTheDocument();
        expect(screen.getByText(/same 24 tasks/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Play it again' }));
        expect(onStartNew).toHaveBeenCalled();
    });

    it('sends an old link with no saved tasks to a new room', () => {
        render(<RoomEntryNotice status={{ code: 'game_ended', room_code: 'RSJO', saved_game: null }}
            onRetry={() => {}} onChangeCode={() => {}} onStartNew={() => {}} />);
        expect(screen.getByRole('button', { name: 'Start a new game' })).toBeInTheDocument();
        expect(screen.queryByText('Try again')).not.toBeInTheDocument();
    });

    it("shows the group's score with the old link", () => {
        render(<RoomEntryNotice status={{ code: 'game_ended', room_code: 'RSJO', saved_game: { code: 'ZN5QF2', played_at: 1, task_count: 24 },
            group_recap: { rooms: 1, rounds: 6, crew_wins: 2, intruder_wins: 4 } }}
            onRetry={() => {}} onChangeCode={() => {}} onStartNew={() => {}} />);
        expect(screen.getByTestId('group-recap-rounds')).toHaveTextContent('6');
        expect(screen.getByTestId('group-recap-intruders')).toHaveTextContent('4');
        expect(screen.getByRole('button', { name: 'Play it again' })).toBeInTheDocument();
    });

    it('joins the room a friend already started instead of starting another', () => {
        const onStartNew = jest.fn();
        render(<RoomEntryNotice status={{ code: 'game_ended', room_code: 'RSJO', saved_game: { code: 'ZN5QF2', played_at: 1, task_count: 24 },
            group_room: { room_code: 'HEMY', link_token: 'tokenBBBBBBB' } }}
            onRetry={() => {}} onChangeCode={() => {}} onStartNew={onStartNew} />);
        expect(screen.getByText('Your group is playing')).toBeInTheDocument();
        const link = screen.getByRole('link', { name: 'Join your group' });
        expect(link.getAttribute('href')).toContain('room=HEMY');
        expect(link.getAttribute('href')).toContain('g=tokenBBBBBBB');
        expect(screen.queryByRole('button', { name: 'Play it again' })).toBeNull();
    });
});

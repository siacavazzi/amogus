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
});

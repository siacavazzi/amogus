import React from 'react';
import { render, screen } from '@testing-library/react';
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
});

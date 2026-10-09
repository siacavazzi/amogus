import React from 'react';
import { render, screen } from '@testing-library/react';
import { io } from 'socket.io-client';
import App from '../App';
import { createControlledSocket } from '../testing/gameFlowHarness';

jest.mock('socket.io-client', () => ({ io: jest.fn() }));

it('opens a generator setup with four-letter location names instead of treating it as a room invite', () => {
    io.mockImplementation(() => createControlledSocket());
    window.history.replaceState({}, '', '/among-us-irl-task-generator?venue=other&players=8&room=Desk&room=Yard');
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Build your task pack' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Desk', exact: true })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Yard', exact: true })).toBeChecked();
});

import React from 'react';
import { render, waitFor } from '@testing-library/react';

let mockSocket;

function mockCreateSocket() {
    return {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
        connected: true,
    };
}

jest.mock('socket.io-client', () => {
    const io = jest.fn(() => {
        mockSocket = mockCreateSocket();
        return mockSocket;
    });

    return {
        __esModule: true,
        io,
        default: io,
    };
});

jest.mock('../AudioHandler', () => ({
    AudioHandler: () => null,
}));

jest.mock('react-device-detect', () => ({
    isMobile: true,
}));

function triggerSocketEvent(eventName, data) {
    const handler = mockSocket.on.mock.calls.find((call) => call[0] === eventName)?.[1];
    if (!handler) {
        throw new Error(`No socket handler registered for ${eventName}`);
    }
    handler(data);
}

function renderGameContext() {
    const GameContext = require('../GameContext').default;
    return render(
        <GameContext>
            <div>child</div>
        </GameContext>
    );
}

describe('GameContext invite links', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        const { io } = require('socket.io-client');
        io.mockImplementation(() => {
            mockSocket = mockCreateSocket();
            return mockSocket;
        });
        localStorage.clear();
        sessionStorage.clear();
        window.history.pushState({}, '', '/play?room=abcd');
    });

    it('auto-joins a room from the room query param on connect', async () => {
        renderGameContext();

        triggerSocketEvent('connect');

        await waitFor(() => {
            expect(mockSocket.emit).toHaveBeenCalledWith('join_game', {
                room_code: 'ABCD',
                player_id: undefined,
            });
        });
    });

    it('does not repeatedly auto-join the same invite on reconnect', async () => {
        renderGameContext();

        triggerSocketEvent('connect');
        triggerSocketEvent('connect');

        await waitFor(() => {
            const autoJoinCalls = mockSocket.emit.mock.calls.filter((call) => call[0] === 'join_game');
            expect(autoJoinCalls).toHaveLength(1);
        });
    });
});

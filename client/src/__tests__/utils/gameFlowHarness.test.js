import React from 'react';
import { waitFor } from '@testing-library/react';
import {
    buildPlayer,
    configureTestStorage,
    createControlledSocket,
    renderWithLiveGameContext,
    serverEvents,
} from '../../testing/gameFlowHarness';

describe('gameFlowHarness', () => {
    let consoleLogSpy;

    beforeEach(() => {
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
    });

    it('drives registered socket handlers like a server event stream', async () => {
        const socket = createControlledSocket();
        const handler = jest.fn();

        socket.on('game_start', handler);
        await socket.serverEmit('game_start', { room_code: 'ROOM1' });

        expect(handler).toHaveBeenCalledWith({ room_code: 'ROOM1' });
        expect(socket.hasHandler('game_start')).toBe(true);
    });

    it('installs stateful browser storage for tests that need reload/session behavior', () => {
        const storage = configureTestStorage({
            localStorage: { room_code: 'ROOM1' },
            sessionStorage: { is_room_creator: 'true' },
        });

        expect(localStorage.getItem('room_code')).toBe('ROOM1');
        expect(sessionStorage.getItem('is_room_creator')).toBe('true');

        localStorage.setItem('player_id', 'player-1');
        sessionStorage.removeItem('is_room_creator');

        expect(storage.getLocal('player_id')).toBe('player-1');
        expect(sessionStorage.getItem('is_room_creator')).toBe(null);

        localStorage.clear();
        expect(storage.getLocal('room_code')).toBe(null);
    });

    it('renders the real GameContext and advances a normal crewmate into a task', async () => {
        const player = buildPlayer({
            player_id: 'player-1',
            username: 'Alice',
            sus: false,
            alive: true,
        });

        const game = renderWithLiveGameContext(<div>child</div>);

        await game.serverEmit('connect');
        await game.serverEmit('game_joined', { room_code: 'ROOM1', is_creator: false });
        await game.serverEmit('player_id', { player_id: 'player-1', pic: 1, is_creator: false });
        await game.serverEmit('game_data', serverEvents.playerList([player]));
        await game.serverEmit('task_goal', 6);
        await game.serverEmit('game_start');
        await game.serverEmit('task', { task: { task: 'Fix lights', location: 'Kitchen' } });

        await waitFor(() => {
            expect(game.getContext()).toEqual(expect.objectContaining({
                connected: true,
                inRoom: true,
                roomCode: 'ROOM1',
                running: true,
                taskGoal: 6,
            }));
        });
        expect(game.getContext().playerState).toEqual(expect.objectContaining({
            player_id: 'player-1',
            username: 'Alice',
        }));
        expect(game.getContext().players).toHaveLength(1);
        expect(game.getContext().task).toEqual({ task: 'Fix lights', location: 'Kitchen' });
        expect(game.storage.getLocal('player_id')).toBe('player-1');
    });

    it('supports JSON-shaped meeting and intruder card events', async () => {
        const game = renderWithLiveGameContext(<div>child</div>, {
            localStorage: { player_id: 'intruder-1', room_code: 'ROOM1' },
        });

        await game.serverEmit('meeting', serverEvents.meeting({ stage: 'voting', time_left: 45 }));
        await game.serverEmit('active_cards', serverEvents.activeCards([
            { id: 'hack-1', action: 'Hack', time_left: 10, countdown: false },
        ]));

        await waitFor(() => {
            expect(game.getContext().meetingState).toEqual(expect.objectContaining({
                stage: 'voting',
                time_left: 45,
            }));
        });
        expect(game.getContext().activeCards).toEqual([
            expect.objectContaining({ id: 'hack-1', action: 'Hack', time_left: 10 }),
        ]);
    });
});

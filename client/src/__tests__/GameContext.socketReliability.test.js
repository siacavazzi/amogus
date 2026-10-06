import React, { useContext } from 'react';
import { act } from '@testing-library/react';
import { DataContext } from '../GameContext';
import { buildPlayer, renderWithLiveGameContext } from '../testing/gameFlowHarness';
import { SOCKET_COMMAND_TIMEOUT_MS } from '../utils/socketCommand';

jest.mock('../AudioHandler', () => ({ AudioHandler: () => null }));
jest.mock('react-device-detect', () => ({ isMobile: false }));

function ContextProbe({ capture }) {
    const value = useContext(DataContext);
    capture(value);
    return null;
}

function roomSnapshot(overrides = {}) {
    return {
        room_code: 'ROOM',
        revision: 1,
        round_id: 'round-1',
        running: true,
        room_open: true,
        is_creator: false,
        players: [buildPlayer({ player_id: 'player-1', username: 'Alex' })],
        task: {
            assignment_id: 'assignment-1',
            round_id: 'round-1',
            task: 'Fix wires',
            location: 'Kitchen',
        },
        crew_score: 0,
        task_goal: 10,
        meeting: null,
        votes: {},
        veto_votes: 0,
        active_cards: [],
        end_state: null,
        stats: { tasks_completed: 0 },
        task_creation_mode: false,
        locations: ['Kitchen', 'Yard', 'Other'],
        config: {},
        collaborative_tasks: {
            tasks: [],
            min_tasks: 10,
            task_list_code: null,
            task_list_name: null,
            collaborative_mode: false,
        },
        ...overrides,
    };
}

describe('GameContext socket reliability', () => {
    let game;
    let currentContext;
    let log;

    beforeEach(() => {
        jest.useFakeTimers();
        log = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        game?.cleanupHarness();
        game = null;
        currentContext = null;
        jest.useRealTimers();
        log.mockRestore();
    });

    async function startRoom(snapshot = roomSnapshot(), storage = { player_id: 'player-1', room_code: 'ROOM' }) {
        game = renderWithLiveGameContext(
            <ContextProbe capture={(contextValue) => { currentContext = contextValue; }} />,
            { localStorage: storage }
        );
        await game.serverEmit('connect');
        const stateAckIndex = game.socket.pendingAcks.findIndex((ack) => ack.eventName === 'get_room_state');
        if (stateAckIndex !== -1) {
            await act(async () => game.socket.ack(stateAckIndex, { ok: true, state: snapshot }));
        } else {
            const player = snapshot.players[0];
            await game.serverEmit('game_data', {
                room_code: snapshot.room_code,
                revision: snapshot.revision,
                round_id: snapshot.round_id,
                action: 'player_list',
                list: [JSON.stringify(player)],
            });
            await game.serverEmit('task', {
                room_code: snapshot.room_code,
                revision: snapshot.revision,
                round_id: snapshot.round_id,
                task: snapshot.task,
            });
            await game.serverEmit('crew_score', {
                room_code: snapshot.room_code,
                revision: snapshot.revision,
                round_id: snapshot.round_id,
                score: snapshot.crew_score,
            });
        }
        return game;
    }

    it('keeps a pending swipe single while duplicate completion requests share its result', async () => {
        await startRoom();
        let firstResult;
        let duplicateResult;

        act(() => {
            firstResult = currentContext.completeTask();
            duplicateResult = currentContext.completeTask();
        });

        expect(currentContext.taskCompletionPending).toBe(true);
        expect(game.socket.emits('complete_task')).toHaveLength(1);
        const request = game.socket.lastEmit('complete_task')[1];
        expect(request).toEqual({
            player_id: 'player-1',
            request_id: expect.stringMatching(/^[0-9a-f-]{36}$/i),
            assignment_id: 'assignment-1',
            round_id: 'round-1',
        });

        const ackIndex = game.socket.pendingAcks.findIndex((ack) => ack.eventName === 'complete_task');
        await act(async () => {
            game.socket.ack(ackIndex, { ok: true, request_id: request.request_id, state: roomSnapshot({ revision: 2, crew_score: 1 }) });
            await Promise.all([firstResult, duplicateResult]);
        });

        expect(currentContext.taskCompletionPending).toBe(false);
        expect(currentContext.crewScore).toBe(1);
    });

    it('retries a lost completion acknowledgment with the same request ID', async () => {
        await startRoom();
        let result;
        act(() => { result = currentContext.completeTask(); });
        const firstRequest = game.socket.lastEmit('complete_task')[1];
        const firstAck = game.socket.pendingAcks.find((ack) => ack.eventName === 'complete_task');

        await act(async () => {
            jest.advanceTimersByTime(firstAck.timeout);
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(game.socket.emits('complete_task')).toHaveLength(2);
        expect(game.socket.lastEmit('complete_task')[1]).toEqual(firstRequest);

        const ackIndex = game.socket.pendingAcks.findIndex((ack) => ack.eventName === 'complete_task' && !ack.settled);
        await act(async () => {
            game.socket.ack(ackIndex, { ok: true, request_id: firstRequest.request_id, state: roomSnapshot({ revision: 2, crew_score: 1 }) });
        });

        await expect(result).resolves.toBe(true);
        expect(currentContext.crewScore).toBe(1);
    });

    it('shows a rejected completion and applies its current state', async () => {
        await startRoom();
        let result;
        act(() => { result = currentContext.completeTask(); });
        const request = game.socket.lastEmit('complete_task')[1];
        const ackIndex = game.socket.pendingAcks.findIndex((ack) => ack.eventName === 'complete_task');

        await act(async () => {
            game.socket.ack(ackIndex, {
                ok: false,
                error: 'No game is running. Rejoin the active room and try again.',
                state: roomSnapshot({ revision: 2, running: false, task: null }),
            });
        });

        await expect(result).resolves.toBe(false);
        expect(currentContext.taskCompletionError).toMatch(/No game is running/);
        expect(currentContext.running).toBe(false);
        expect(game.socket.emits('complete_task')).toHaveLength(1);
    });

    it('does not let an older completion acknowledgment replace a newer room snapshot', async () => {
        await startRoom(roomSnapshot({ revision: 5, crew_score: 3, task: {
            assignment_id: 'assignment-new', round_id: 'round-1', task: 'New task', location: 'Yard',
        } }));
        let result;
        act(() => { result = currentContext.completeTask(); });
        const request = game.socket.lastEmit('complete_task')[1];
        const ackIndex = game.socket.pendingAcks.findIndex((ack) => ack.eventName === 'complete_task');

        await act(async () => {
            game.socket.ack(ackIndex, { ok: true, request_id: request.request_id, state: roomSnapshot({ revision: 4, crew_score: 2 }) });
            await result;
        });

        expect(currentContext.crewScore).toBe(3);
        expect(currentContext.task.assignment_id).toBe('assignment-new');
    });

    it('does not report success when an acknowledgment belongs to an earlier round', async () => {
        await startRoom();
        let result;
        act(() => { result = currentContext.completeTask(); });
        const request = game.socket.lastEmit('complete_task')[1];
        const ackIndex = game.socket.pendingAcks.findIndex((ack) => ack.eventName === 'complete_task');
        await game.serverEmit('room_state', roomSnapshot({
            revision: 2,
            round_id: 'round-2',
            task: { assignment_id: 'assignment-2', round_id: 'round-2', task: 'New round task', location: 'Yard' },
        }));

        await act(async () => {
            game.socket.ack(ackIndex, { ok: true, request_id: request.request_id, state: roomSnapshot({ revision: 2, crew_score: 1 }) });
        });

        await expect(result).resolves.toBe(false);
        expect(currentContext.roundId).toBe('round-2');
        expect(currentContext.task.assignment_id).toBe('assignment-2');
        expect(currentContext.taskCompletionError).toMatch(/earlier round/i);
    });

    it('refreshes the room after both completion acknowledgments time out', async () => {
        await startRoom();
        let result;
        act(() => { result = currentContext.completeTask(); });

        await act(async () => {
            jest.advanceTimersByTime(SOCKET_COMMAND_TIMEOUT_MS);
            await Promise.resolve();
            await Promise.resolve();
        });
        expect(game.socket.emits('complete_task')).toHaveLength(2);

        await act(async () => {
            jest.advanceTimersByTime(SOCKET_COMMAND_TIMEOUT_MS);
            await Promise.resolve();
            await Promise.resolve();
        });

        const stateAckIndex = game.socket.pendingAcks.findIndex((ack) => ack.eventName === 'get_room_state' && !ack.settled);
        expect(stateAckIndex).not.toBe(-1);
        await act(async () => {
            game.socket.ack(stateAckIndex, { ok: true, state: roomSnapshot({ revision: 2, crew_score: 1 }) });
        });

        await expect(result).resolves.toBe(false);
        expect(currentContext.crewScore).toBe(1);
        expect(currentContext.taskCompletionError).toMatch(/unconfirmed/i);
    });

    it('restores vote totals and active cards from a room snapshot', async () => {
        await startRoom(roomSnapshot({
            votes: { 'player-1': 2 },
            veto_votes: 1,
            active_cards: [{ id: 'card-1', name: 'Area Denial' }],
        }));

        expect(currentContext.votes).toEqual({ 'player-1': 2 });
        expect(currentContext.vetoVotes).toBe(1);
        expect(currentContext.activeCards).toEqual([{ id: 'card-1', name: 'Area Denial' }]);
    });

    it('requests and applies a full room snapshot after reconnect without remounting', async () => {
        const snapshot = roomSnapshot({ revision: 8, task: {
            assignment_id: 'assignment-after-reconnect', round_id: 'round-1', task: 'Resume task', location: 'Yard',
        } });
        await startRoom(snapshot);
        await game.serverEmit('disconnect');
        game.socket.connected = true;
        await game.serverEmit('connect');

        expect(game.socket.emits('rejoin')).toHaveLength(2);
        expect(game.socket.emits('get_room_state')).toHaveLength(2);
        expect(game.socket.lastEmit('get_room_state')[1]).toEqual({ room_code: 'ROOM', player_id: 'player-1' });

        const ackIndex = game.socket.pendingAcks.findIndex((ack) => ack.eventName === 'get_room_state' && !ack.settled);
        await act(async () => game.socket.ack(ackIndex, { ok: true, state: snapshot }));

        expect(currentContext.inRoom).toBe(true);
        expect(currentContext.task.assignment_id).toBe('assignment-after-reconnect');
        expect(currentContext.roundId).toBe('round-1');
    });

    it('requests a room-only snapshot when a registered reactor reconnects', async () => {
        game = renderWithLiveGameContext(
            <ContextProbe capture={(contextValue) => { currentContext = contextValue; }} />,
            { localStorage: { room_code: 'ROOM' } }
        );
        await game.serverEmit('connect');

        expect(game.socket.lastEmit('register_reactor')[1]).toEqual({ room_code: 'ROOM' });
        expect(game.socket.lastEmit('get_room_state')[1]).toEqual({ room_code: 'ROOM' });
        const ackIndex = game.socket.pendingAcks.findIndex((ack) => ack.eventName === 'get_room_state');
        await act(async () => {
            game.socket.ack(ackIndex, { ok: true, state: roomSnapshot({ is_creator: true }) });
        });

        expect(currentContext.inRoom).toBe(true);
        expect(currentContext.roomCode).toBe('ROOM');
        expect(currentContext.isRoomCreator).toBe(true);
    });
});

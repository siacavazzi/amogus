import React from 'react';
import { renderWithLiveGameContext } from '../testing/gameFlowHarness';

jest.mock('../AudioHandler', () => ({ AudioHandler: () => null }));
jest.mock('react-device-detect', () => ({ isMobile: true }));

describe('next-round waiting list', () => {
    let game;
    let log;

    beforeEach(() => {
        log = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        game?.cleanupHarness();
        log.mockRestore();
    });

    it('remembers that a round was on when the phone came in', async () => {
        game = renderWithLiveGameContext(<div>Phone</div>);
        await game.serverEmit('game_joined', { room_code: 'ROOM', is_creator: false, is_open: true, round_running: true });
        expect(game.getContext().roundRunningAtEntry).toBe(true);
    });

    it('puts the phone on the waiting screen with its own name and face', async () => {
        game = renderWithLiveGameContext(<div>Phone</div>);
        await game.serverEmit('player_id', { player_id: 'late-1', pic: 4, is_creator: false, waiting: true, username: 'Late', selfie: null });
        const context = game.getContext();
        expect(context.waitingForNextRound).toBe(true);
        expect(context.playerState).toEqual(expect.objectContaining({ username: 'Late', playerId: 'late-1', pic: 4 }));
        expect(localStorage.getItem('player_id')).toBe('late-1');
    });

    it('keeps the waiting list up to date and clears it when the room returns to the lobby', async () => {
        game = renderWithLiveGameContext(<div>Phone</div>);
        await game.serverEmit('player_id', { player_id: 'late-1', pic: 4, waiting: true, username: 'Late' });
        await game.serverEmit('waiting_players', { room_code: 'ROOM', revision: 7, players: [{ player_id: 'late-1', username: 'Late', pic: 4 }] });
        expect(game.getContext().waitingPlayers).toHaveLength(1);

        await game.serverEmit('game_reset', { room_code: 'ROOM', revision: 8 });
        expect(game.getContext().waitingForNextRound).toBe(false);
        expect(game.getContext().waitingPlayers).toEqual([]);
    });

    it('restores the waiting screen from a room snapshot after a reload', async () => {
        game = renderWithLiveGameContext(<div>Phone</div>);
        await game.serverEmit('room_state', {
            room_code: 'ROOM', revision: 9, running: true, waiting: true,
            players: [], waiting_players: [{ player_id: 'late-1', username: 'Late', pic: 4 }],
        });
        expect(game.getContext().waitingForNextRound).toBe(true);
        expect(game.getContext().waitingPlayers).toHaveLength(1);
    });
    it('leaves the waiting screen when dealt into the round, with a late role pop-up', async () => {
        game = renderWithLiveGameContext(<div>Phone</div>);
        await game.serverEmit('player_id', { player_id: 'late-1', pic: 4, waiting: true, username: 'Late', joins_when: 'meeting' });
        expect(game.getContext().waitingJoinsWhen).toBe('meeting');
        await game.serverEmit('player_id', { player_id: 'late-1', pic: 4, is_creator: false, joined_round: true });
        expect(game.getContext().waitingForNextRound).toBe(false);
        await game.serverEmit('game_data', {
            room_code: 'ROOM', revision: 12, action: 'start_game', late_join: true,
            list: [JSON.stringify({ player_id: 'late-1', username: 'Late', sus: true, alive: true })],
        });
        expect(game.getContext().running).toBe(true);
        expect(game.getContext().dialog).toEqual(expect.objectContaining({ title: "You're in this round", kind: 'role', sus: true }));
    });

    it('knows whether the room deals latecomers in', async () => {
        game = renderWithLiveGameContext(<div>Phone</div>);
        await game.serverEmit('game_joined', { room_code: 'ROOM', is_open: true, round_running: true, late_join_live: true });
        expect(game.getContext().lateJoinLive).toBe(true);
    });
});

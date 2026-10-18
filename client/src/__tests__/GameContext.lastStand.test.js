import React from 'react';
import { renderWithLiveGameContext } from '../testing/gameFlowHarness';

jest.mock('../AudioHandler', () => ({ AudioHandler: () => null }));
jest.mock('react-device-detect', () => ({ isMobile: true }));

describe('last stand pop-up', () => {
    let game;
    let log;

    beforeEach(() => {
        log = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        game?.cleanupHarness();
        log.mockRestore();
    });

    it('shows the server message on the phone', async () => {
        game = renderWithLiveGameContext(<div>Phone</div>);
        await game.serverEmit('last_stand', { room_code: 'ROOM', revision: 5, title: 'Last stand', message: 'One crewmate left.' });
        expect(game.getContext().dialog).toEqual(expect.objectContaining({ title: 'Last stand', body: 'One crewmate left.' }));
    });

    it('skips the results screen when last stand closes an open meeting', async () => {
        game = renderWithLiveGameContext(<div>Phone</div>);
        await game.serverEmit('meeting', { room_code: 'ROOM', revision: 5, stage: 'waiting', reason: null });
        await game.serverEmit('meeting', { room_code: 'ROOM', revision: 6, stage: 'over', reason: 'last_stand' });
        expect(game.getContext().meetingState).toBeUndefined();
    });

    it('closes when the game ends so it does not cover the results', async () => {
        game = renderWithLiveGameContext(<div>Phone</div>);
        await game.serverEmit('last_stand', { room_code: 'ROOM', revision: 5, title: 'Last stand', message: 'One crewmate left.' });
        await game.serverEmit('end_game', { room_code: 'ROOM', revision: 6, result: 'victory', stats: {} });
        expect(game.getContext().dialog).toBeUndefined();
        expect(game.getContext().endState).toBe('victory');
    });

    it('leaves other pop-ups open when the game ends', async () => {
        game = renderWithLiveGameContext(<div>Phone</div>);
        await game.serverEmit('taunt_received', { message: 'Watch your back' });
        await game.serverEmit('end_game', { room_code: 'ROOM', revision: 6, result: 'victory', stats: {} });
        expect(game.getContext().dialog).toEqual(expect.objectContaining({ title: "You've received a message..." }));
    });
});

import React, { useContext } from 'react';
import { act } from '@testing-library/react';
import { DataContext } from '../GameContext';
import HackedPage from '../pages/HackedPage';
import { renderWithLiveGameContext, serverEvents } from '../testing/gameFlowHarness';

jest.mock('../AudioHandler', () => ({ AudioHandler: () => null }));

function HackScreen() {
    const { hackTime, setHackTime } = useContext(DataContext);
    return hackTime > 0 ? <HackedPage hackTime={hackTime} setHackTime={setHackTime} /> : null;
}

describe('shared gameplay state', () => {
    let game;
    let log;

    beforeEach(() => {
        jest.useFakeTimers();
        log = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        game?.cleanupHarness();
        jest.useRealTimers();
        log.mockRestore();
    });

    function advanceSeconds(count) {
        for (let second = 0; second < count; second += 1) {
            act(() => jest.advanceTimersByTime(1000));
        }
    }

    it('expires an EMP even when no hacked page is mounted', async () => {
        game = renderWithLiveGameContext(<div>Reactor</div>);
        await game.serverEmit('hack', 3);
        advanceSeconds(1);
        expect(game.getContext().hackTime).toBe(2);
        advanceSeconds(2);
        expect(game.getContext().hackTime).toBe(0);
    });

    it('counts down once per second when the phone shows the hacked page', async () => {
        game = renderWithLiveGameContext(<HackScreen />);
        await game.serverEmit('hack', 3);
        advanceSeconds(1);
        expect(game.getContext().hackTime).toBe(2);
        advanceSeconds(2);
        expect(game.getContext().hackTime).toBe(0);
    });

    it('clears the old EMP timer on reset before a new EMP starts', async () => {
        game = renderWithLiveGameContext(<div>Reactor</div>);
        await game.serverEmit('hack', 30);
        act(() => jest.advanceTimersByTime(500));
        await game.serverEmit('game_reset', { room_code: 'ROOM' });
        expect(game.getContext().hackTime).toBe(0);
        await game.serverEmit('hack', 10);
        act(() => jest.advanceTimersByTime(500));
        expect(game.getContext().hackTime).toBe(10);
        act(() => jest.advanceTimersByTime(500));
        expect(game.getContext().hackTime).toBe(9);
    });

    it('restores reactor lobby access from the server registration snapshot', async () => {
        game = renderWithLiveGameContext(<div>Reactor</div>);
        await game.serverEmit('reactor_registered', { room_code: 'ROOM', is_open: true, is_creator: true });
        expect(game.getContext()).toEqual(expect.objectContaining({
            roomCode: 'ROOM', inRoom: true, roomOpen: true, isRoomCreator: true,
        }));
        expect(game.storage.getSession('is_room_creator')).toBe('true');
        expect(game.storage.getLocal('room_code')).toBe('ROOM');
    });

    it('updates the audio preference without an unrelated game event', () => {
        game = renderWithLiveGameContext(<div>Phone</div>);
        act(() => game.getContext().setAudioEnabled(true));
        expect(game.getContext().audioEnabled).toBe(true);
        act(() => game.getContext().setAudioEnabled(false));
        expect(game.getContext().audioEnabled).toBe(false);
    });

    it('does not request a second meeting cue from the meeting state event', async () => {
        game = renderWithLiveGameContext(<div>Phone</div>);
        await game.serverEmit('meeting', serverEvents.meeting());
        expect(game.getContext().meetingState.stage).toBe('waiting');
        expect(game.getContext().audio).toBeUndefined();
    });

    it('does not request a second reveal cue from the reveal state event', async () => {
        game = renderWithLiveGameContext(<div>Phone</div>);
        const reveal = { intruder_names: ['Bob'], intruder_ids: ['intruder-1'] };
        await game.serverEmit('intruders_revealed', reveal);
        expect(game.getContext().intrudersRevealed).toEqual(reveal);
        expect(game.getContext().audio).toBeUndefined();
    });
});

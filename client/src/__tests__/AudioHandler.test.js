import React from 'react';
import { act, render } from '@testing-library/react';
import { Howl } from 'howler';
import { DataContext } from '../GameContext';
import { AudioHandler } from '../AudioHandler';

const mockHowls = [];
const createHowlMock = (options) => {
    const sound = {
        options,
        isLooping: false,
        play: jest.fn(),
        stop: jest.fn(),
        pause: jest.fn(),
        volume: jest.fn(),
        loop: jest.fn((value) => {
            sound.isLooping = value;
            return sound;
        }),
    };
    mockHowls.push(sound);
    return sound;
};

const createSocket = () => {
    const handlers = {};
    return {
        on: jest.fn((event, handler) => {
            handlers[event] = handler;
        }),
        off: jest.fn((event, handler) => {
            if (handlers[event] === handler) delete handlers[event];
        }),
        emit: jest.fn(),
        trigger: (event, data) => handlers[event]?.(data),
    };
};

const mountAudioHandler = (socket, overrides = {}) => render(
    <DataContext.Provider value={{
        audio: null,
        setAudio: jest.fn(),
        audioEnabled: true,
        setAudioEnabled: jest.fn(),
        inRoom: false,
        socket,
        ...overrides,
    }}>
        <AudioHandler />
    </DataContext.Provider>
);

const soundFor = (name) => Howl.instances.find((howl) =>
    howl.options.src.some((source) => source.endsWith(`${name}.mp3`))
);

describe('AudioHandler', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        mockHowls.forEach((sound) => {
            sound.loop.mockImplementation((value) => {
                sound.isLooping = value;
                return sound;
            });
        });
        Howl.instances = mockHowls;
        Howl.mockImplementation(createHowlMock);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('returns a loop to non-loop mode when stop_sound arrives early', () => {
        const socket = createSocket();
        const { unmount } = mountAudioHandler(socket);
        const meltdown = soundFor('meltdown');
        act(() => socket.trigger('loop_sound', { sound: 'meltdown', duration: 30 }));

        expect(meltdown.isLooping).toBe(true);
        expect(meltdown.play).toHaveBeenCalledTimes(1);
        meltdown.stop.mockClear();
        meltdown.loop.mockClear();

        act(() => socket.trigger('stop_sound'));

        expect(meltdown.stop).toHaveBeenCalledTimes(1);
        expect(meltdown.loop).toHaveBeenLastCalledWith(false);
        expect(meltdown.isLooping).toBe(false);

        act(() => jest.advanceTimersByTime(30000));
        expect(meltdown.stop).toHaveBeenCalledTimes(1);
        unmount();
    });

    it('stops a one-shot sound when stop_sound arrives', () => {
        const socket = createSocket();
        const { unmount } = mountAudioHandler(socket);
        const sus = soundFor('sus');

        act(() => socket.trigger('play_sound', { sound: 'sus' }));
        expect(sus.play).toHaveBeenCalledTimes(1);

        act(() => socket.trigger('stop_sound'));

        expect(sus.stop).toHaveBeenCalledTimes(1);
        unmount();
    });

    it('plays the existing dead sound key through the legacy audio context value', () => {
        const socket = createSocket();
        const setAudio = jest.fn();
        const { rerender, unmount } = mountAudioHandler(socket, { setAudio });
        const dead = soundFor('dead');

        rerender(
            <DataContext.Provider value={{
                audio: 'dead',
                setAudio,
                audioEnabled: true,
                setAudioEnabled: jest.fn(),
                inRoom: false,
                socket,
            }}>
                <AudioHandler />
            </DataContext.Provider>
        );

        expect(dead.play).toHaveBeenCalledTimes(1);
        expect(setAudio).toHaveBeenCalledWith(undefined);
        unmount();
    });
});

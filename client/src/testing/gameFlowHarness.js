import React, { useContext, useEffect } from 'react';
import { act, render } from '@testing-library/react';
import { io } from 'socket.io-client';
import GameContext, { DataContext } from '../GameContext';

let activeStorageRestore = null;

function ensureJestStorageMock(storage, methodName) {
    if (!jest.isMockFunction(storage[methodName])) {
        jest.spyOn(storage, methodName);
    }
}

function installStorage(storage, initialValues = {}) {
    ['getItem', 'setItem', 'removeItem', 'clear'].forEach((methodName) => {
        ensureJestStorageMock(storage, methodName);
    });

    const store = { ...initialValues };
    const previousImplementations = {
        getItem: storage.getItem.getMockImplementation(),
        setItem: storage.setItem.getMockImplementation(),
        removeItem: storage.removeItem.getMockImplementation(),
        clear: storage.clear.getMockImplementation(),
    };

    storage.getItem.mockImplementation((key) => (
        Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null
    ));
    storage.setItem.mockImplementation((key, value) => {
        store[key] = String(value);
    });
    storage.removeItem.mockImplementation((key) => {
        delete store[key];
    });
    storage.clear.mockImplementation(() => {
        Object.keys(store).forEach((key) => delete store[key]);
    });

    return {
        get: (key) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null),
        all: () => ({ ...store }),
        restore: () => {
            storage.getItem.mockImplementation(previousImplementations.getItem);
            storage.setItem.mockImplementation(previousImplementations.setItem);
            storage.removeItem.mockImplementation(previousImplementations.removeItem);
            storage.clear.mockImplementation(previousImplementations.clear);
        },
    };
}

export function restoreTestStorage() {
    if (!activeStorageRestore) {
        return;
    }

    activeStorageRestore();
    activeStorageRestore = null;
}

export function configureTestStorage({
    localStorage: initialLocalStorage = {},
    sessionStorage: initialSessionStorage = {},
} = {}) {
    restoreTestStorage();

    const local = installStorage(window.localStorage, initialLocalStorage);
    const session = installStorage(window.sessionStorage, initialSessionStorage);
    activeStorageRestore = () => {
        local.restore();
        session.restore();
    };

    return {
        getLocal: local.get,
        getSession: session.get,
        allLocal: local.all,
        allSession: session.all,
        restore: restoreTestStorage,
    };
}

if (typeof afterEach === 'function') {
    afterEach(() => {
        restoreTestStorage();
    });
}

export function createControlledSocket() {
    const handlers = new Map();

    const socket = {
        connected: true,
        emit: jest.fn(() => socket),
        on: jest.fn((eventName, handler) => {
            if (!handlers.has(eventName)) {
                handlers.set(eventName, new Set());
            }
            handlers.get(eventName).add(handler);
            return socket;
        }),
        off: jest.fn((eventName, handler) => {
            if (!handlers.has(eventName)) {
                return socket;
            }
            if (handler) {
                handlers.get(eventName).delete(handler);
            } else {
                handlers.delete(eventName);
            }
            return socket;
        }),
        connect: jest.fn(() => {
            socket.connected = true;
            return socket;
        }),
        disconnect: jest.fn(() => {
            socket.connected = false;
            return socket;
        }),
        hasHandler: (eventName) => (handlers.get(eventName)?.size || 0) > 0,
        handlersFor: (eventName) => Array.from(handlers.get(eventName) || []),
        emits: (eventName) => socket.emit.mock.calls.filter((call) => call[0] === eventName),
        lastEmit: (eventName) => {
            const matchingEmits = socket.emits(eventName);
            return matchingEmits[matchingEmits.length - 1];
        },
        serverEmit: async (eventName, payload) => {
            const eventHandlers = Array.from(handlers.get(eventName) || []);
            if (eventHandlers.length === 0) {
                throw new Error(`No socket handler registered for ${eventName}`);
            }

            await act(async () => {
                await Promise.all(eventHandlers.map((handler) => handler(payload)));
            });
        },
    };

    return socket;
}

function ContextProbe({ onChange }) {
    const value = useContext(DataContext);

    useEffect(() => {
        onChange(value);
    }, [onChange, value]);

    return null;
}

export function renderWithLiveGameContext(ui, {
    localStorage: initialLocalStorage = {},
    sessionStorage: initialSessionStorage = {},
    route = '/play',
    socket = createControlledSocket(),
} = {}) {
    if (!jest.isMockFunction(io)) {
        throw new Error('socket.io-client io must be a Jest mock before rendering GameContext');
    }

    const storage = configureTestStorage({
        localStorage: initialLocalStorage,
        sessionStorage: initialSessionStorage,
    });
    window.history.pushState({}, '', route);
    io.mockImplementation(() => socket);

    let latestContext;
    const contextSnapshots = [];
    const captureContext = (contextValue) => {
        latestContext = contextValue;
        contextSnapshots.push(contextValue);
    };

    const result = render(
        <GameContext>
            {ui}
            <ContextProbe onChange={captureContext} />
        </GameContext>
    );

    return {
        ...result,
        socket,
        storage,
        contextSnapshots,
        serverEmit: socket.serverEmit,
        getContext: () => latestContext,
        cleanupHarness: () => {
            result.unmount();
            restoreTestStorage();
        },
    };
}

export function buildPlayer(overrides = {}) {
    const playerId = overrides.player_id || overrides.playerId || 'player-1';

    return {
        sid: `${playerId}-sid`,
        player_id: playerId,
        username: 'Player 1',
        sus: false,
        alive: true,
        ready: true,
        pic: 1,
        selfie: null,
        death_cause: null,
        death_message: null,
        meltdown_code: null,
        cards: [],
        ...overrides,
    };
}

export const serverEvents = {
    playerList: (players, action = 'player_list') => ({
        action,
        list: players.map((player) => JSON.stringify(player)),
    }),
    startGame: (players) => serverEvents.playerList(players, 'start_game'),
    rejoin: (players) => serverEvents.playerList(players, 'rejoin'),
    meeting: (overrides = {}) => JSON.stringify({
        stage: 'waiting',
        time_left: 60,
        caller: null,
        voted_out: null,
        ...overrides,
    }),
    activeCards: (cards) => cards.map((card) => JSON.stringify(card)),
    task: (overrides = {}) => ({
        task: {
            task: 'Fix wires',
            location: 'Kitchen',
            ...overrides,
        },
    }),
};

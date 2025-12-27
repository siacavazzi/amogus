/**
 * Jest setup file for Sus Party tests
 * Configures testing environment and global mocks
 */
import '@testing-library/jest-dom';

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn((key) => {
        if (key === 'player_id') return 'test_player_id';
        if (key === 'room_code') return 'TEST1';
        if (key === 'device_id') return 'test_device_id';
        return null;
    }),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock sessionStorage
const sessionStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
};
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

// Mock window.scrollTo
window.scrollTo = jest.fn();

// Mock window.alert
window.alert = jest.fn();

// Mock matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});

// Mock IntersectionObserver
class MockIntersectionObserver {
    constructor(callback) {
        this.callback = callback;
    }
    observe() { return null; }
    unobserve() { return null; }
    disconnect() { return null; }
}
window.IntersectionObserver = MockIntersectionObserver;

// Mock ResizeObserver
class MockResizeObserver {
    observe() { return null; }
    unobserve() { return null; }
    disconnect() { return null; }
}
window.ResizeObserver = MockResizeObserver;

// Mock react-device-detect to always return mobile by default
jest.mock('react-device-detect', () => ({
    isMobile: true,
    isBrowser: false,
}));

// Mock Howler (audio library)
jest.mock('howler', () => ({
    Howl: jest.fn().mockImplementation(() => ({
        play: jest.fn(),
        stop: jest.fn(),
        pause: jest.fn(),
        volume: jest.fn(),
        on: jest.fn(),
    })),
}));

// Mock socket.io-client
jest.mock('socket.io-client', () => ({
    io: jest.fn(() => ({
        emit: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
        connect: jest.fn(),
        disconnect: jest.fn(),
        connected: true,
    })),
}));

// Mock ENDPOINT
jest.mock('./ENDPOINT', () => ({
    ENDPOINT: 'http://localhost:5001',
}));

// Suppress console errors during tests (optional, can be removed for debugging)
const originalError = console.error;
beforeAll(() => {
    console.error = (...args) => {
        // Filter out expected React warnings during tests
        if (
            typeof args[0] === 'string' &&
            (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
             args[0].includes('act(...)'))
        ) {
            return;
        }
        originalError.call(console, ...args);
    };
});

afterAll(() => {
    console.error = originalError;
});

// Clear all mocks after each test
afterEach(() => {
    jest.clearAllMocks();
});

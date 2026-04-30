/**
 * Test utilities for Sus Party game components
 * Provides mock contexts, socket, and common test helpers
 */
import React from 'react';
import { render } from '@testing-library/react';
import { DataContext } from './GameContext';

// Mock socket with common emit/on functionality
export const createMockSocket = () => ({
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    connected: true,
});

// Default mock player state for a crewmate
export const mockCrewmateState = {
    username: 'TestPlayer',
    playerId: 'player123',
    sus: false,
    alive: true,
    pic: 1,
    selfie: null,
    death_cause: null,
    death_message: null,
};

// Mock player state for an intruder
export const mockIntruderState = {
    username: 'IntruderPlayer',
    playerId: 'intruder123',
    sus: true,
    alive: true,
    pic: 2,
    selfie: null,
    death_cause: null,
    death_message: null,
};

// Mock player state for a dead player
export const mockDeadPlayerState = {
    username: 'DeadPlayer',
    playerId: 'dead123',
    sus: false,
    alive: false,
    pic: 3,
    selfie: null,
    death_cause: 'murdered',
    death_message: 'You were eliminated by an intruder',
};

// Mock players list for a typical game
export const mockPlayers = [
    { player_id: 'player1', username: 'Alice', sus: false, alive: true, ready: true, pic: 1, selfie: null },
    { player_id: 'player2', username: 'Bob', sus: false, alive: true, ready: false, pic: 2, selfie: null },
    { player_id: 'player3', username: 'Charlie', sus: true, alive: true, ready: true, pic: 3, selfie: null },
    { player_id: 'player4', username: 'Diana', sus: false, alive: false, ready: true, pic: 4, selfie: null, death_cause: 'murdered', death_message: 'You were eliminated by an intruder' },
];

// Mock task for crewmates
export const mockTask = {
    id: 'task1',
    task: 'Make a sandwich',  // The actual task name
    location: 'Kitchen',
};

// Mock meeting state for voting
export const mockMeetingStateVoting = {
    stage: 'voting',
    time_left: 60,
    caller: 'player1',
    voted_out: null,
};

// Mock meeting state for results
export const mockMeetingStateResults = {
    stage: 'over',
    time_left: 0,
    caller: 'player1',
    voted_out: 'player3',
    was_intruder: true,
};

// Mock active cards for intruders
export const mockActiveCards = [
    {
        id: 'card1',
        action: 'Hack',
        text: 'Disable a crewmate\'s screen for 15 seconds',
        location: null,
        duration: 15,
        time_left: 15,
        active: false,
        countdown: false,
        requires_input: false,
    },
    {
        id: 'card2',
        action: 'Fake Task',
        text: 'Send a fake task to a crewmate',
        location: 'Kitchen',
        duration: 30,
        time_left: 30,
        active: false,
        countdown: false,
        requires_input: true,
    },
];

// Mock task locations
export const mockTaskLocations = ['Kitchen', 'Living Room', 'Basement', 'Garage', 'Backyard'];

// Default context values for testing
export const createMockContextValue = (overrides = {}) => {
    const mockSocket = createMockSocket();
    
    return {
        // Connection state
        connected: true,
        socket: mockSocket,
        
        // Room state
        roomCode: 'TEST1',
        inRoom: true,
        isRoomCreator: false,
        roomOpen: true,
        
        // Game state
        running: false,
        endState: null,
        
        // Player state
        playerState: mockCrewmateState,
        players: mockPlayers,
        setPlayerState: jest.fn(),
        
        // Task state
        task: null,
        crewScore: 0,
        taskGoal: 10,
        taskLocations: mockTaskLocations,
        setTask: jest.fn(),
        setTaskEntry: jest.fn(),
        
        // Meeting state
        meetingState: null,
        votes: {},
        vetoVotes: 0,
        setVotes: jest.fn(),
        setVetoVotes: jest.fn(),
        setMeetingState: jest.fn(),
        handleCallMeeting: jest.fn(),
        
        // Intruder state
        susPoints: 0,
        activeCards: [],
        showSusPage: false,
        setShowSusPage: jest.fn(),
        killCooldown: 0,
        setKillCooldown: jest.fn(),
        
        // Special game states
        hackTime: 0,
        setHackTime: jest.fn(),
        meltdownCode: null,
        meltdownTimer: 0,
        codesNeeded: null,
        setCodesNeeded: jest.fn(),
        
        // UI state
        message: null,
        setMessage: jest.fn(),
        dialog: null,
        setDialog: jest.fn(),
        audio: null,
        setAudio: jest.fn(),
        audioEnabled: false,
        setAudioEnabled: jest.fn(),
        showAnimation: false,
        setShowAnimation: jest.fn(),
        modalOpen: false,
        setModalOpen: jest.fn(),
        
        // Game stats
        gameStats: null,
        
        // Other intruders (for intruder page)
        otherIntruders: [],
        
        // Reset functions
        resetGameState: jest.fn(),
        resetState: jest.fn(),
        
        // Task creation mode
        taskCreationMode: false,
        setTaskCreationMode: jest.fn(),
        
        // Reset votes
        resetVotes: { current: 0, needed: 0, voters: [] },
        
        // Override with any custom values
        ...overrides,
    };
};

// Custom render function that wraps components with DataContext
export const renderWithContext = (ui, contextOverrides = {}) => {
    const contextValue = createMockContextValue(contextOverrides);
    
    return {
        ...render(
            <DataContext.Provider value={contextValue}>
                {ui}
            </DataContext.Provider>
        ),
        contextValue,
    };
};

// Helper to simulate socket events in tests
export const simulateSocketEvent = (socket, eventName, data) => {
    const handler = socket.on.mock.calls.find(call => call[0] === eventName)?.[1];
    if (handler) {
        handler(data);
    }
};

// Helper to check if socket emitted a specific event
export const expectSocketEmit = (socket, eventName, expectedData) => {
    const emitCalls = socket.emit.mock.calls;
    const matchingCall = emitCalls.find(call => call[0] === eventName);
    expect(matchingCall).toBeTruthy();
    if (expectedData) {
        expect(matchingCall[1]).toEqual(expect.objectContaining(expectedData));
    }
};

// Re-export testing library utilities for convenience
export * from '@testing-library/react';

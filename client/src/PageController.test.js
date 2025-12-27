/**
 * Tests for PageController - Page routing based on game state
 * 
 * Game Flow Context:
 * - Determines which page to show based on connection, room, game state
 * - Flow: connecting → lobby → gameConfig (host) → login → players → running game
 * - During game: crewmember/intruder → meetings → voting → results → victory
 * - Special states: hacked, meltdown, dead
 */
import React from 'react';
import { renderWithContext, screen } from './test-utils';
import PageController from './PageController';

// Mock all page components to simplify testing
jest.mock('./pages/ConnectingPage', () => () => <div data-testid="connecting-page">Connecting</div>);
jest.mock('./pages/LobbyPage', () => () => <div data-testid="lobby-page">Lobby</div>);
jest.mock('./pages/GameConfigPage', () => () => <div data-testid="config-page">Config</div>);
jest.mock('./pages/Login', () => () => <div data-testid="login-page">Login</div>);
jest.mock('./pages/PreGamePage', () => () => <div data-testid="pregame-page">PreGame</div>);
jest.mock('./pages/CrewPage', () => ({ setShowSusPage }) => <div data-testid="crew-page">Crew</div>);
jest.mock('./pages/IntruderPage', () => ({ setShowSusPage }) => <div data-testid="intruder-page">Intruder</div>);
jest.mock('./pages/VotingPage', () => () => <div data-testid="voting-page">Voting</div>);
jest.mock('./pages/MeetingWaitingPage', () => () => <div data-testid="meeting-waiting-page">Meeting Waiting</div>);
jest.mock('./pages/MeetingResultsPage', () => () => <div data-testid="results-page">Results</div>);
jest.mock('./pages/DeadPage', () => () => <div data-testid="dead-page">Dead</div>);
jest.mock('./pages/HackedPage', () => ({ hackTime, setHackTime }) => <div data-testid="hacked-page">Hacked</div>);
jest.mock('./pages/MeltdownInfo', () => () => <div data-testid="meltdown-info-page">Meltdown Info</div>);
jest.mock('./pages/CrewVictory', () => () => <div data-testid="crew-victory-page">Crew Victory</div>);
jest.mock('./pages/IntruderVictory', () => () => <div data-testid="intruder-victory-page">Intruder Victory</div>);
jest.mock('./pages/MeltdownEnd', () => () => <div data-testid="meltdown-end-page">Meltdown End</div>);
jest.mock('./pages/MeltdownPage', () => () => <div data-testid="meltdown-page">Meltdown</div>);
jest.mock('./pages/ReactorPage', () => () => <div data-testid="reactor-page">Reactor</div>);
jest.mock('./pages/ReactorWaiting', () => () => <div data-testid="reactor-waiting-page">Reactor Waiting</div>);
jest.mock('./pages/GameRunning', () => () => <div data-testid="game-running-page">Game Running</div>);
jest.mock('./pages/TaskEntryPage', () => () => <div data-testid="task-entry-page">Task Entry</div>);
jest.mock('./components/Modal', () => () => null);
jest.mock('./components/ProgressBar', () => () => null);

describe('PageController', () => {
    describe('Connection State', () => {
        it('shows connecting page when not connected', () => {
            renderWithContext(<PageController />, { connected: false });
            
            expect(screen.getByTestId('connecting-page')).toBeInTheDocument();
        });
    });

    describe('Lobby State', () => {
        it('shows lobby page when connected but not in room', () => {
            renderWithContext(<PageController />, {
                connected: true,
                inRoom: false,
                roomCode: '',
            });
            
            expect(screen.getByTestId('lobby-page')).toBeInTheDocument();
        });
    });

    describe('Game Config (Host)', () => {
        it('shows config page for room creator before room opens', () => {
            renderWithContext(<PageController />, {
                connected: true,
                inRoom: true,
                isRoomCreator: true,
                roomOpen: false,
                running: false,
            });
            
            expect(screen.getByTestId('config-page')).toBeInTheDocument();
        });
    });

    describe('Login State', () => {
        it('shows login page for players without username', () => {
            renderWithContext(<PageController />, {
                connected: true,
                inRoom: true,
                roomOpen: true,
                running: false,
                playerState: { username: '' },
            });
            
            expect(screen.getByTestId('login-page')).toBeInTheDocument();
        });
    });

    describe('Pre-Game State', () => {
        it('shows pre-game page for logged in players before game starts', () => {
            renderWithContext(<PageController />, {
                connected: true,
                inRoom: true,
                roomOpen: true,
                running: false,
                playerState: { username: 'TestPlayer', alive: true },
            });
            
            expect(screen.getByTestId('pregame-page')).toBeInTheDocument();
        });
    });

    describe('Running Game - Crewmate', () => {
        it('shows crew page for alive crewmates during game', () => {
            renderWithContext(<PageController />, {
                connected: true,
                inRoom: true,
                running: true,
                playerState: { username: 'CrewPlayer', sus: false, alive: true },
                showSusPage: false,
            });
            
            expect(screen.getByTestId('crew-page')).toBeInTheDocument();
        });
    });

    describe('Running Game - Intruder', () => {
        it('shows intruder page when showSusPage is true', () => {
            renderWithContext(<PageController />, {
                connected: true,
                inRoom: true,
                running: true,
                playerState: { username: 'IntruderPlayer', sus: true, alive: true },
                showSusPage: true,
            });
            
            expect(screen.getByTestId('intruder-page')).toBeInTheDocument();
        });
    });

    describe('Meeting States', () => {
        it('shows meeting waiting page during waiting stage', () => {
            renderWithContext(<PageController />, {
                connected: true,
                inRoom: true,
                running: true,
                playerState: { username: 'Player', alive: true },
                meetingState: { stage: 'waiting' },
            });
            
            expect(screen.getByTestId('meeting-waiting-page')).toBeInTheDocument();
        });

        it('shows voting page during voting stage', () => {
            renderWithContext(<PageController />, {
                connected: true,
                inRoom: true,
                running: true,
                playerState: { username: 'Player', alive: true },
                meetingState: { stage: 'voting', time_left: 60 },
            });
            
            expect(screen.getByTestId('voting-page')).toBeInTheDocument();
        });

        it('shows results page after voting is over', () => {
            renderWithContext(<PageController />, {
                connected: true,
                inRoom: true,
                running: true,
                playerState: { username: 'Player', alive: true },
                meetingState: { stage: 'over' },
            });
            
            expect(screen.getByTestId('results-page')).toBeInTheDocument();
        });
    });

    describe('Dead Player State', () => {
        it('shows dead page for eliminated players', () => {
            renderWithContext(<PageController />, {
                connected: true,
                inRoom: true,
                running: true,
                playerState: { username: 'DeadPlayer', alive: false },
            });
            
            expect(screen.getByTestId('dead-page')).toBeInTheDocument();
        });
    });

    describe('Hacked State', () => {
        it('shows hacked page when player is hacked', () => {
            renderWithContext(<PageController />, {
                connected: true,
                inRoom: true,
                running: true,
                playerState: { username: 'Player', alive: true },
                hackTime: 15,
            });
            
            expect(screen.getByTestId('hacked-page')).toBeInTheDocument();
        });
    });

    describe('Meltdown State', () => {
        it('shows meltdown info for mobile players', () => {
            renderWithContext(<PageController />, {
                connected: true,
                inRoom: true,
                running: true,
                playerState: { username: 'Player', alive: true },
                meltdownCode: '1234',
            });
            
            expect(screen.getByTestId('meltdown-info-page')).toBeInTheDocument();
        });
    });

    describe('Victory States', () => {
        it('shows crew victory page on crew win', () => {
            renderWithContext(<PageController />, {
                connected: true,
                inRoom: true,
                running: true,
                endState: 'victory',
            });
            
            expect(screen.getByTestId('crew-victory-page')).toBeInTheDocument();
        });

        it('shows intruder victory page on sus win', () => {
            renderWithContext(<PageController />, {
                connected: true,
                inRoom: true,
                running: true,
                endState: 'sus_victory',
            });
            
            expect(screen.getByTestId('intruder-victory-page')).toBeInTheDocument();
        });

        it('shows meltdown end page on meltdown fail', () => {
            renderWithContext(<PageController />, {
                connected: true,
                inRoom: true,
                running: true,
                endState: 'meltdown_fail',
            });
            
            expect(screen.getByTestId('meltdown-end-page')).toBeInTheDocument();
        });
    });
});

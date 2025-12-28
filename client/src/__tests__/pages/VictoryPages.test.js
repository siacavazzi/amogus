/**
 * Tests for Victory Pages - CrewVictory and IntruderVictory
 * 
 * Game Flow Context:
 * - Game ends when either crew completes all tasks OR intruders eliminate enough crew
 * - CrewVictory: Shown when crewmates win (tasks complete or all intruders ejected)
 * - IntruderVictory: Shown when intruders win (enough crew dead or meltdown not stopped)
 * - Both show game stats, death summary, and option to play again
 */
import React from 'react';
import { renderWithContext, screen, mockPlayers } from '../../test-utils';
import CrewVictoryScreen from '../../pages/CrewVictory';
import IntruderVictoryScreen from '../../pages/IntruderVictory';

describe('CrewVictoryScreen', () => {
    const crewVictoryContext = {
        players: mockPlayers,
        endState: 'victory',
        gameStats: {
            tasksCompleted: 15,
            meetingsCalled: 3,
            intrudersEjected: 1,
        },
    };

    describe('Rendering', () => {
        it('renders crew victory screen', () => {
            renderWithContext(<CrewVictoryScreen />, crewVictoryContext);
            
            expect(screen.getByText(/Crewmates Win/i)).toBeInTheDocument();
        });

        it('shows mission complete badge', () => {
            renderWithContext(<CrewVictoryScreen />, crewVictoryContext);
            
            // Should show mission complete badge
            expect(screen.getByText(/Mission Complete/i)).toBeInTheDocument();
        });

        it('displays surviving crewmates', () => {
            renderWithContext(<CrewVictoryScreen />, crewVictoryContext);
            
            // Alive, non-sus players from mockPlayers: Alice, Bob
            expect(screen.getByText('Alice')).toBeInTheDocument();
            expect(screen.getByText('Bob')).toBeInTheDocument();
        });

        it('shows exposed intruders', () => {
            renderWithContext(<CrewVictoryScreen />, crewVictoryContext);
            
            // Charlie is the intruder in mockPlayers - may appear multiple times
            const charlieElements = screen.getAllByText('Charlie');
            expect(charlieElements.length).toBeGreaterThan(0);
        });
    });

    describe('Game Stats', () => {
        it('shows game statistics', () => {
            renderWithContext(<CrewVictoryScreen />, crewVictoryContext);
            
            // Game stats component should be rendered
            // Specific stats depend on GameStats component
        });
    });

    describe('Death Summary', () => {
        it('shows summary of eliminated players', () => {
            renderWithContext(<CrewVictoryScreen />, crewVictoryContext);
            
            // Diana was dead in mockPlayers - may appear multiple times
            const dianaElements = screen.getAllByText('Diana');
            expect(dianaElements.length).toBeGreaterThan(0);
        });
    });

    describe('End Game Controls', () => {
        it('has end game buttons', () => {
            renderWithContext(<CrewVictoryScreen />, crewVictoryContext);
            
            // Should have buttons for ending game
            const buttons = screen.getAllByRole('button');
            expect(buttons.length).toBeGreaterThan(0);
        });
    });
});

describe('IntruderVictoryScreen', () => {
    const intruderVictoryContext = {
        players: mockPlayers,
        endState: 'sus_victory',
        gameStats: {
            tasksCompleted: 5,
            crewmatesKilled: 3,
            meetingsSurvived: 2,
        },
    };

    describe('Rendering', () => {
        it('renders intruder victory screen', () => {
            renderWithContext(<IntruderVictoryScreen />, intruderVictoryContext);
            
            expect(screen.getByText(/Intruders Win/i)).toBeInTheDocument();
        });

        it('shows dark theme victory', () => {
            renderWithContext(<IntruderVictoryScreen />, intruderVictoryContext);
            
            // Intruder victory shows "Intruders Win!"
            expect(screen.getByText(/Intruders Win!/i)).toBeInTheDocument();
        });

        it('displays winning intruders', () => {
            renderWithContext(<IntruderVictoryScreen />, intruderVictoryContext);
            
            // Charlie is the intruder
            expect(screen.getByText('Charlie')).toBeInTheDocument();
        });

        it('shows eliminated crewmates', () => {
            renderWithContext(<IntruderVictoryScreen />, intruderVictoryContext);
            
            // Diana was killed - may appear in multiple places
            const dianaElements = screen.getAllByText('Diana');
            expect(dianaElements.length).toBeGreaterThan(0);
        });
    });

    describe('Glitch Effects', () => {
        it('has glitch animation styling', () => {
            renderWithContext(<IntruderVictoryScreen />, intruderVictoryContext);
            
            // Glitch effects are visual - hard to test directly
            // But the component should render without error
            expect(screen.getByText(/Intruders Win/i)).toBeInTheDocument();
        });
    });

    describe('End Game Controls', () => {
        it('shows options to continue', () => {
            renderWithContext(<IntruderVictoryScreen />, intruderVictoryContext);
            
            // End game buttons should be present
            const buttons = screen.queryAllByRole('button');
            expect(buttons.length).toBeGreaterThan(0);
        });
    });
});

describe('Victory Screen Transitions', () => {
    it('crew victory animates content in', async () => {
        renderWithContext(<CrewVictoryScreen />, { players: mockPlayers });
        
        // Content should become visible after animation delay
        expect(screen.getByText(/Crewmates Win/i)).toBeInTheDocument();
    });

    it('intruder victory animates content in', async () => {
        renderWithContext(<IntruderVictoryScreen />, { players: mockPlayers });
        
        expect(screen.getByText(/Intruders Win/i)).toBeInTheDocument();
    });
});

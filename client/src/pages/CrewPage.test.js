/**
 * Tests for CrewPage - Main gameplay screen for crewmates
 * 
 * Game Flow Context:
 * - This is where crewmates spend most of their game time
 * - Shows current task to complete with location
 * - Has button to call emergency meeting (or enter vent for intruders)
 * - Uses a slider to complete tasks (not a button)
 * - Progress bar shows overall crew task completion
 */
import React from 'react';
import { renderWithContext, screen, fireEvent, mockTask } from '../test-utils';
import CrewmemberPage from './CrewPage';

// Mock the slider component
jest.mock('../components/swiper', () => {
    return function MockSlider({ text, onSuccess }) {
        return (
            <div data-testid="task-slider">
                <span>{text}</span>
                <button onClick={onSuccess} data-testid="slider-trigger">Complete</button>
            </div>
        );
    };
});

describe('CrewPage', () => {
    const mockSetShowSusPage = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Crewmate View', () => {
        const crewmateContext = {
            running: true,
            playerState: {
                username: 'CrewPlayer',
                sus: false,
                alive: true,
            },
            task: mockTask,
        };

        it('renders current task for crewmate', () => {
            renderWithContext(
                <CrewmemberPage setShowSusPage={mockSetShowSusPage} />,
                crewmateContext
            );
            
            // Should display task name
            expect(screen.getByText(/Make a sandwich/i)).toBeInTheDocument();
        });

        it('shows task location', () => {
            renderWithContext(
                <CrewmemberPage setShowSusPage={mockSetShowSusPage} />,
                crewmateContext
            );
            
            // Should show the location from task
            expect(screen.getByText(/Kitchen/i)).toBeInTheDocument();
        });

        it('shows meeting button for crewmates', () => {
            renderWithContext(
                <CrewmemberPage setShowSusPage={mockSetShowSusPage} />,
                crewmateContext
            );
            
            // Crewmates see "CALL MEETING"
            expect(screen.getByText(/CALL MEETING/i)).toBeInTheDocument();
        });

        it('calls handleCallMeeting when meeting button clicked', () => {
            const { contextValue } = renderWithContext(
                <CrewmemberPage setShowSusPage={mockSetShowSusPage} />,
                crewmateContext
            );
            
            const meetingButton = screen.getByText(/CALL MEETING/i).closest('button');
            fireEvent.click(meetingButton);
            
            expect(contextValue.handleCallMeeting).toHaveBeenCalled();
        });

        it('shows slider for completing task', () => {
            renderWithContext(
                <CrewmemberPage setShowSusPage={mockSetShowSusPage} />,
                crewmateContext
            );
            
            expect(screen.getByTestId('task-slider')).toBeInTheDocument();
        });

        it('emits complete_task when slider is used', () => {
            const { contextValue } = renderWithContext(
                <CrewmemberPage setShowSusPage={mockSetShowSusPage} />,
                crewmateContext
            );
            
            const sliderTrigger = screen.getByTestId('slider-trigger');
            fireEvent.click(sliderTrigger);
            
            expect(contextValue.socket.emit).toHaveBeenCalledWith('complete_task', expect.any(Object));
        });

        it('shows active status when no cooldown', () => {
            renderWithContext(
                <CrewmemberPage setShowSusPage={mockSetShowSusPage} />,
                { ...crewmateContext, killCooldown: 0 }
            );
            
            expect(screen.getByText(/ACTIVE/i)).toBeInTheDocument();
        });
    });

    describe('Intruder in Disguise View', () => {
        const intruderContext = {
            running: true,
            playerState: {
                username: 'IntruderPlayer',
                sus: true,
                alive: true,
            },
            task: mockTask,
            killCooldown: 0,
        };

        it('shows ENTER VENT button for intruders', () => {
            renderWithContext(
                <CrewmemberPage setShowSusPage={mockSetShowSusPage} />,
                intruderContext
            );
            
            expect(screen.getByText(/ENTER VENT/i)).toBeInTheDocument();
        });

        it('calls setShowSusPage when vent button clicked', () => {
            renderWithContext(
                <CrewmemberPage setShowSusPage={mockSetShowSusPage} />,
                intruderContext
            );
            
            const ventButton = screen.getByText(/ENTER VENT/i).closest('button');
            fireEvent.click(ventButton);
            
            expect(mockSetShowSusPage).toHaveBeenCalledWith(true);
        });

        it('shows cooldown status when on cooldown', () => {
            renderWithContext(
                <CrewmemberPage setShowSusPage={mockSetShowSusPage} />,
                { ...intruderContext, killCooldown: 10 }
            );
            
            expect(screen.getByText(/STANDBY/i)).toBeInTheDocument();
        });

        it('shows eliminate objective for intruders', () => {
            renderWithContext(
                <CrewmemberPage setShowSusPage={mockSetShowSusPage} />,
                intruderContext
            );
            
            expect(screen.getByText(/Eliminate all crewmates/i)).toBeInTheDocument();
        });
    });

    describe('No Task State', () => {
        it('shows waiting state when no task assigned', () => {
            renderWithContext(
                <CrewmemberPage setShowSusPage={mockSetShowSusPage} />,
                {
                    running: true,
                    playerState: { username: 'Player', sus: false, alive: true },
                    task: null,
                }
            );
            
            expect(screen.getByText(/Awaiting task assignment/i)).toBeInTheDocument();
        });
    });
});

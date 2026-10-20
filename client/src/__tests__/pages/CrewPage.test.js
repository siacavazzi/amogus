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
import { act, renderWithContext, screen, fireEvent, waitFor, mockTask } from '../../test-utils';
import CrewmemberPage from '../../pages/CrewPage';

// Mock the slider component
jest.mock('../../components/swiper', () => {
    return function MockSlider({ text, onSuccess, disabled = false, pending = false }) {
        return (
            <div data-testid="task-slider">
                <span>{text}</span>
                <button onClick={onSuccess} disabled={disabled || pending} data-testid="slider-trigger">Complete</button>
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

        describe('during a last stand', () => {
            const lastStandContext = { ...crewmateContext, lastStand: true, roundId: 'round-1' };
            let confirmSpy;
            afterEach(() => confirmSpy?.mockRestore());

            it('swaps the meeting button for a self-report after confirming', () => {
                confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
                const { contextValue } = renderWithContext(
                    <CrewmemberPage setShowSusPage={mockSetShowSusPage} />,
                    lastStandContext
                );

                expect(screen.queryByText(/CALL MEETING/i)).not.toBeInTheDocument();
                fireEvent.click(screen.getByText(/I WAS ELIMINATED/i).closest('button'));

                expect(contextValue.handleCallMeeting).not.toHaveBeenCalled();
                expect(contextValue.socket.emit).toHaveBeenCalledWith('player_dead', expect.objectContaining({ round_id: 'round-1' }));
            });

            it('shows how many tasks are left to win', () => {
                renderWithContext(
                    <CrewmemberPage setShowSusPage={mockSetShowSusPage} />,
                    { ...lastStandContext, crewScore: 4, taskGoal: 6 }
                );

                expect(screen.getByTestId('last-stand-tasks-left')).toHaveTextContent('2 tasks to win');
            });

            it('does nothing if the player cancels', () => {
                confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
                const { contextValue } = renderWithContext(
                    <CrewmemberPage setShowSusPage={mockSetShowSusPage} />,
                    lastStandContext
                );

                fireEvent.click(screen.getByText(/I WAS ELIMINATED/i).closest('button'));
                expect(contextValue.socket.emit).not.toHaveBeenCalledWith('player_dead', expect.anything());
            });
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

        it('uses the acknowledged task completion action when slider is used', async () => {
            const { contextValue } = renderWithContext(
                <CrewmemberPage setShowSusPage={mockSetShowSusPage} />,
                crewmateContext
            );
            
            const sliderTrigger = screen.getByTestId('slider-trigger');
            fireEvent.click(sliderTrigger);
            
            expect(contextValue.completeTask).toHaveBeenCalledWith(mockTask);
            await waitFor(() => {
                expect(contextValue.setAudio).toHaveBeenCalledWith('complete_task');
                expect(contextValue.setShowAnimation).toHaveBeenCalledWith(true);
            });
        });

        it('waits for an accepted completion before playing success feedback', async () => {
            let resolveCompletion;
            const completeTask = jest.fn(() => new Promise((resolve) => { resolveCompletion = resolve; }));
            const { contextValue } = renderWithContext(
                <CrewmemberPage setShowSusPage={mockSetShowSusPage} />,
                { ...crewmateContext, completeTask }
            );

            fireEvent.click(screen.getByTestId('slider-trigger'));

            expect(completeTask).toHaveBeenCalledWith(mockTask);
            expect(contextValue.setAudio).not.toHaveBeenCalledWith('complete_task');
            expect(contextValue.setShowAnimation).not.toHaveBeenCalledWith(true);

            await act(async () => { resolveCompletion(true); });
            await waitFor(() => {
                expect(contextValue.setAudio).toHaveBeenCalledWith('complete_task');
                expect(contextValue.setShowAnimation).toHaveBeenCalledWith(true);
            });
        });

        it('blocks task completion while disconnected or another completion is pending', () => {
            const disconnected = renderWithContext(
                <CrewmemberPage setShowSusPage={mockSetShowSusPage} />,
                { ...crewmateContext, connected: false }
            );
            expect(screen.getByTestId('slider-trigger')).toBeDisabled();
            expect(disconnected.contextValue.completeTask).not.toHaveBeenCalled();
            disconnected.unmount();

            const pending = renderWithContext(
                <CrewmemberPage setShowSusPage={mockSetShowSusPage} />,
                { ...crewmateContext, taskCompletionPending: true }
            );
            expect(screen.getByTestId('slider-trigger')).toBeDisabled();
            expect(pending.contextValue.completeTask).not.toHaveBeenCalled();
        });

        it('shows the task completion error without success feedback after rejection', async () => {
            const { contextValue } = renderWithContext(
                <CrewmemberPage setShowSusPage={mockSetShowSusPage} />,
                { ...crewmateContext, completeTask: jest.fn().mockResolvedValue(false), taskCompletionError: 'Task not recorded. Reconnect and try again.' }
            );

            fireEvent.click(screen.getByTestId('slider-trigger'));

            await waitFor(() => {
                expect(screen.getByRole('alert')).toHaveTextContent(/Task not recorded/i);
            });
            expect(contextValue.setAudio).not.toHaveBeenCalledWith('complete_task');
            expect(contextValue.setShowAnimation).not.toHaveBeenCalledWith(true);
        });
    });

    describe('Intruder View', () => {
        const intruderContext = {
            running: true,
            playerState: {
                username: 'IntruderPlayer',
                sus: true,
                alive: true,
            },
            task: mockTask,
            killCooldown: 0,
            lobbyState: { tasks: [{ task: 'Water the plants', location: 'Garden' }] },
        };

        afterEach(() => jest.useRealTimers());

        it('shows ENTER VENT and their objective instead of a task', () => {
            renderWithContext(<CrewmemberPage setShowSusPage={mockSetShowSusPage} />, intruderContext);

            expect(screen.getByText('ENTER VENT')).toBeInTheDocument();
            expect(screen.getByText(/Current objective/i)).toBeInTheDocument();
            expect(screen.getByText('Eliminate the crew')).toBeInTheDocument();
            expect(screen.getByText(/Slide to eliminate/i)).toBeInTheDocument();
            expect(screen.queryByText(/CALL MEETING|Current task|Water the plants/i)).not.toBeInTheDocument();
        });

        it('opens the vent on a tap and never calls a meeting', () => {
            const { contextValue } = renderWithContext(<CrewmemberPage setShowSusPage={mockSetShowSusPage} />, intruderContext);

            fireEvent.click(screen.getByText('ENTER VENT').closest('button'));

            expect(mockSetShowSusPage).toHaveBeenCalledWith(true);
            expect(contextValue.handleCallMeeting).not.toHaveBeenCalled();
        });

        it('logs a kill and starts the cooldown', () => {
            window.localStorage.getItem.mockImplementation((key) =>
                key === 'player_id' ? 'test_player_id' : null
            );
            const { contextValue } = renderWithContext(<CrewmemberPage setShowSusPage={mockSetShowSusPage} />, intruderContext);

            fireEvent.click(screen.getByTestId('slider-trigger'));

            expect(contextValue.setAudio).toHaveBeenCalledWith('dead');
            expect(contextValue.socket.emit).toHaveBeenCalledWith('kill_player', {
                player_id: 'test_player_id',
            });
            expect(contextValue.setKillCooldown).toHaveBeenCalledWith(15);
            expect(contextValue.completeTask).not.toHaveBeenCalled();
        });

        it('locks the slider and shows the wait while the cooldown runs', () => {
            renderWithContext(<CrewmemberPage setShowSusPage={mockSetShowSusPage} />, { ...intruderContext, killCooldown: 10 });

            expect(screen.getByTestId('slider-trigger')).toBeDisabled();
            expect(screen.getByText(/Cooldown active/i)).toBeInTheDocument();
            expect(screen.getByTestId('crew-kill-cooldown')).toHaveTextContent('Next kill in 10s');
        });
    });

    describe('Crewmate hold', () => {
        it('shows the role while CALL MEETING is held and hides it on release', () => {
            jest.useFakeTimers();
            const { contextValue } = renderWithContext(<CrewmemberPage setShowSusPage={mockSetShowSusPage} />, {
                running: true,
                playerState: { username: 'CrewPlayer', sus: false, alive: true },
                task: mockTask,
            });
            const button = screen.getByText(/CALL MEETING/i).closest('button');

            fireEvent.pointerDown(button, { button: 0 });
            act(() => { jest.advanceTimersByTime(1000); });
            expect(screen.getByText('Crewmate')).toBeInTheDocument();
            fireEvent.pointerUp(button);
            fireEvent.click(button);

            expect(screen.queryByText('Crewmate')).not.toBeInTheDocument();
            expect(contextValue.handleCallMeeting).not.toHaveBeenCalled();
            jest.useRealTimers();
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

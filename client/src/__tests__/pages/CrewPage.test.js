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

            await act(async () => { resolveCompletion(true); });
            await waitFor(() => {
                expect(contextValue.setAudio).toHaveBeenCalledWith('complete_task');
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

        it('shows ENTER VENT and a hand that looks like a crewmate\'s, with no real task', () => {
            renderWithContext(<CrewmemberPage setShowSusPage={mockSetShowSusPage} />, intruderContext);

            expect(screen.getByText('ENTER VENT')).toBeInTheDocument();
            expect(screen.getByText('Your tasks')).toBeInTheDocument();
            expect(screen.getAllByText('You may draw a card after a meeting')).toHaveLength(3);
            expect(screen.getByText(/Slide to eliminate/i)).toBeInTheDocument();
            expect(screen.queryByText(/CALL MEETING|Water the plants|Make a sandwich/i)).not.toBeInTheDocument();
        });

        it('shows cards as tasks, plays one after a 2 s tap and lets a second tap take it back', () => {
            jest.useFakeTimers();
            window.localStorage.getItem.mockImplementation((key) => (key === 'player_id' ? 'imp' : null));
            const cards = [JSON.stringify({ id: 'c1', action: 'EMP', duration: 30 }), JSON.stringify({ id: 'c2', action: 'Reshuffle' })];
            const { contextValue } = renderWithContext(<CrewmemberPage setShowSusPage={mockSetShowSusPage} />, {
                ...intruderContext, playerState: { ...intruderContext.playerState, cards },
            });

            expect(screen.getAllByTestId('hand-card')).toHaveLength(2);
            expect(screen.getAllByText('You may draw a card after a meeting')).toHaveLength(1);

            fireEvent.click(screen.getByText('EMP'));
            fireEvent.click(screen.getByText('EMP'));
            act(() => { jest.advanceTimersByTime(2500); });
            expect(contextValue.socket.emit).not.toHaveBeenCalledWith('play_card', expect.anything());

            fireEvent.click(screen.getByText('Reshuffle'));
            act(() => { jest.advanceTimersByTime(2100); });
            expect(contextValue.socket.emit).toHaveBeenCalledWith('play_card', expect.objectContaining({ card_id: 'c2' }));
        });

        it('opens a sheet for Steal Tasks and sends the chosen crewmate', () => {
            const cards = [JSON.stringify({ id: 's1', action: 'Steal Tasks', requires_input: true })];
            const { contextValue } = renderWithContext(<CrewmemberPage setShowSusPage={mockSetShowSusPage} />, {
                ...intruderContext, playerState: { ...intruderContext.playerState, cards },
            });

            fireEvent.click(screen.getAllByText('Steal Tasks')[0]);
            fireEvent.change(screen.getByRole('combobox'), { target: { value: 'player2' } });
            fireEvent.click(screen.getByRole('button', { name: /Steal$/ }));

            expect(contextValue.socket.emit).toHaveBeenCalledWith('play_card', expect.objectContaining({
                card_id: 's1', extra_data: { target_player_id: 'player2' },
            }));
        });

        it('fills empty slots with stolen tasks until the next meeting', () => {
            renderWithContext(<CrewmemberPage setShowSusPage={mockSetShowSusPage} />, {
                ...intruderContext,
                handState: { hand: [], priority: null, swaps: 0, tasks_done: 0, stolen: { from: 'Bob', tasks: [{ task: 'Fold towels', location: 'Laundry' }] } },
            });

            expect(screen.getByText('Fold towels')).toBeInTheDocument();
            expect(screen.getByText('· from Bob')).toBeInTheDocument();
            expect(screen.getAllByText('You may draw a card after a meeting')).toHaveLength(2);
        });

        it('opens the vent on a tap and never calls a meeting', () => {
            const { contextValue } = renderWithContext(<CrewmemberPage setShowSusPage={mockSetShowSusPage} />, intruderContext);

            fireEvent.click(screen.getByText('ENTER VENT').closest('button'));

            expect(mockSetShowSusPage).toHaveBeenCalledWith(true);
            expect(contextValue.handleCallMeeting).not.toHaveBeenCalled();
        });

        it('logs a kill and starts the cooldown without playing a sound', () => {
            window.localStorage.getItem.mockImplementation((key) =>
                key === 'player_id' ? 'test_player_id' : null
            );
            const { contextValue } = renderWithContext(<CrewmemberPage setShowSusPage={mockSetShowSusPage} />, intruderContext);

            fireEvent.click(screen.getByTestId('slider-trigger'));

            expect(contextValue.setAudio).not.toHaveBeenCalled();
            expect(contextValue.socket.emit).toHaveBeenCalledWith('kill_player', {
                player_id: 'test_player_id',
            });
            expect(contextValue.setKillCooldown).toHaveBeenCalledWith(15);
            expect(contextValue.completeTask).not.toHaveBeenCalled();
        });

        it('locks the slider and shows the wait while the cooldown runs', () => {
            renderWithContext(<CrewmemberPage setShowSusPage={mockSetShowSusPage} />, { ...intruderContext, killCooldown: 10 });

            expect(screen.getByTestId('slider-trigger')).toBeDisabled();
            expect(screen.getByTestId('task-slider')).toHaveTextContent('Next kill in 10s');
        });
    });

    describe('Hand of tasks', () => {
        const hand = [
            { task: 'Make a sandwich', location: 'Kitchen', assignment_id: 'a1', round_id: 'round-1' },
            { task: 'Fold towels', location: 'Laundry', assignment_id: 'a2', round_id: 'round-1' },
            { task: 'Water the plants', location: 'Garden', assignment_id: 'a3', round_id: 'round-1' },
        ];
        const handContext = (handState = {}, extra = {}) => ({
            running: true,
            roomCode: 'ABCD',
            intrudersLeft: 1,
            crewScore: 3,
            taskGoal: 12,
            playerState: { username: 'CrewPlayer', sus: false, alive: true, pic: 1 },
            task: hand[0],
            handState: { hand, priority: null, swaps: 0, tasks_done: 2, stolen: null, received_at: Date.now(), ...handState },
            ...extra,
        });

        it('shows the room, intruders left, the crew bar and your own count', () => {
            renderWithContext(<CrewmemberPage setShowSusPage={mockSetShowSusPage} />, handContext());

            expect(screen.getByText('ABCD')).toBeInTheDocument();
            expect(screen.getByTestId('intruders-left')).toHaveTextContent('1 intruder');
            expect(screen.getByTestId('intruders-left')).toHaveTextContent('STILL AMONG YOU');
            expect(screen.getByText('25%')).toBeInTheDocument();
            expect(screen.getByTestId('tasks-you-did')).toHaveTextContent("You've done 2");
            expect(screen.getAllByTestId('hand-task')).toHaveLength(3);
        });

        it('shows ? for intruders left after someone joined mid-round', () => {
            renderWithContext(<CrewmemberPage setShowSusPage={mockSetShowSusPage} />, handContext({}, { intrudersLeft: null }));
            expect(screen.getByTestId('intruders-left')).toHaveTextContent('? intruders');
        });

        it('needs a tap on a task before the slide, then completes that task', async () => {
            const { contextValue } = renderWithContext(<CrewmemberPage setShowSusPage={mockSetShowSusPage} />, handContext());

            expect(screen.getByTestId('slider-trigger')).toBeDisabled();
            expect(screen.getByText('Tap a task first')).toBeInTheDocument();
            expect(screen.queryByText('DOING THIS')).not.toBeInTheDocument();

            fireEvent.click(screen.getByText('Fold towels'));
            expect(contextValue.selectTask).toHaveBeenCalledWith(hand[1]);
            expect(screen.getByText('DOING THIS')).toBeInTheDocument();
            fireEvent.click(screen.getByTestId('slider-trigger'));

            expect(contextValue.completeTask).toHaveBeenCalledWith(hand[1]);
            await waitFor(() => expect(contextValue.setAudio).toHaveBeenCalledWith('complete_task'));
        });

        it('reminds the player to tap a task when they slide with none picked', () => {
            renderWithContext(<CrewmemberPage setShowSusPage={mockSetShowSusPage} />, handContext());

            fireEvent.pointerDown(screen.getByTestId('slider-trigger'));

            expect(screen.getByRole('status')).toHaveTextContent('Tap the task you are doing first, then slide.');
            expect(screen.getByTestId('task-hand')).toHaveClass('is-nudged');
        });

        it('lets go of a task tapped twice', () => {
            const { contextValue } = renderWithContext(<CrewmemberPage setShowSusPage={mockSetShowSusPage} />, handContext());
            fireEvent.click(screen.getByText('Fold towels'));
            fireEvent.click(screen.getByText('Fold towels'));
            expect(contextValue.selectTask).toHaveBeenLastCalledWith(null);
            expect(screen.queryByText('DOING THIS')).not.toBeInTheDocument();
        });

        it('shows the swap buttons only while a swap is held', () => {
            const { unmount } = renderWithContext(<CrewmemberPage setShowSusPage={mockSetShowSusPage} />, handContext());
            expect(screen.queryByTestId('swap-task')).not.toBeInTheDocument();
            unmount();

            const { contextValue } = renderWithContext(<CrewmemberPage setShowSusPage={mockSetShowSusPage} />, handContext({ swaps: 1 }));
            expect(screen.getByTestId('swaps-left')).toHaveTextContent('1 swap');
            fireEvent.click(screen.getAllByTestId('swap-task')[2]);
            expect(contextValue.swapTask).toHaveBeenCalledWith(hand[2]);
        });

        it('shows a Priority task with its countdown', () => {
            const priority = { task: 'Count the spoons', location: 'Kitchen', assignment_id: 'p1', round_id: 'round-1', time_left: 42, seconds: 60 };
            renderWithContext(<CrewmemberPage setShowSusPage={mockSetShowSusPage} />, handContext({ priority }));
            expect(screen.getByTestId('priority-task')).toHaveTextContent('Count the spoons');
            expect(screen.getByTestId('priority-task')).toHaveTextContent('0:42');
        });

        it('locks tasks in an area under Area Denial', () => {
            renderWithContext(<CrewmemberPage setShowSusPage={mockSetShowSusPage} />, handContext({}, { deniedLocation: 'Laundry' }));
            expect(screen.getByText('Fold towels').closest('button')).toBeDisabled();
            expect(screen.getByText('Locked')).toBeInTheDocument();
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

import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react';
import { renderWithContext, screen } from '../../test-utils';
import { configureTestStorage } from '../../testing/gameFlowHarness';
import EndGameButtons from '../../components/EndGameButtons';

beforeAll(() => {
    // JSDOM lacks native dialog methods. Browser QA covers the real dialog.
    HTMLDialogElement.prototype.showModal = function () { this.open = true; };
    HTMLDialogElement.prototype.close = function () { this.open = false; };
});
beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 9, 16, 12));
    configureTestStorage({ localStorage: { player_id: 'test_player_id', room_code: 'TEST1' } });
});
afterEach(() => jest.useRealTimers());

// The end screen asks for a "Save this game" code on its own; these tests are about the feedback prompt.
const promptEmits = socket => socket.emit.mock.calls.filter(([event]) => event !== 'save_game_link');

function resultScreen(overrides = {}) {
    return renderWithContext(<EndGameButtons />, { endState: 'victory', isMobile: true, ...overrides });
}
function showPrompt(overrides = {}) {
    const result = resultScreen(overrides);
    act(() => jest.advanceTimersByTime(3000));
    return result;
}
function openForm() {
    const result = showPrompt();
    fireEvent.click(screen.getByRole('button', { name: 'Give feedback' }));
    return result;
}

test('waits three seconds before it shows the three choices and X', () => {
    const { contextValue } = resultScreen();
    act(() => jest.advanceTimersByTime(2999));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    act(() => jest.advanceTimersByTime(1));
    expect(screen.getByRole('dialog')).toBeVisible();
    for (const name of ['Give feedback', 'Maybe later', "Don't ask again", 'Dismiss feedback']) {
        expect(screen.getByRole('button', { name })).toBeEnabled();
    }
    expect(promptEmits(contextValue.socket)).toEqual([]);
});

test.each([['Play Again', 'reset'], ['Leave', 'leave_room']])('%s acts immediately and cancels the delayed popup', (button, event) => {
    const { contextValue } = resultScreen();
    fireEvent.click(screen.getByRole('button', { name: button }));
    expect(contextValue.socket.emit).toHaveBeenCalledWith(event, expect.objectContaining({ player_id: 'test_player_id', room_code: 'TEST1' }));
    act(() => jest.advanceTimersByTime(3000));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test.each(['Maybe later', 'Dismiss feedback'])('%s dismisses only the current game prompt', button => {
    for (const roundId of ['round-1', 'round-2', 'round-3']) {
        const result = showPrompt({ roundId });
        expect(screen.getByRole('dialog')).toBeVisible();
        fireEvent.click(screen.getByRole('button', { name: button }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        act(() => jest.advanceTimersByTime(5000));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(promptEmits(result.contextValue.socket)).toEqual([]);
        result.unmount();
    }
});

test("Don't ask again persists a one-week snooze across result screens", () => {
    const first = showPrompt();
    fireEvent.click(screen.getByRole('button', { name: "Don't ask again" }));
    first.unmount();
    jest.setSystemTime(new Date(2026, 9, 22, 12));
    const second = showPrompt({ roundId: 'round-2' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    second.unmount();
    jest.setSystemTime(new Date(2026, 9, 23, 12, 0, 4));
    showPrompt({ roundId: 'round-3' });
    expect(screen.getByRole('dialog')).toBeVisible();
});

test('Escape works like Maybe later without a reset or departure', () => {
    const { contextValue } = showPrompt();
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: false, cancelable: true }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(promptEmits(contextValue.socket)).toEqual([]);
});

test('sends a rating and comment and waits for acceptance before it closes', async () => {
    const { contextValue } = openForm();
    fireEvent.click(screen.getByLabelText('Fun'));
    fireEvent.change(screen.getByLabelText('Comment (optional)'), { target: { value: 'More tasks, please.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }));
    const request = contextValue.socket.emit.mock.calls.find(([event]) => event === 'submit_feedback');
    expect(request[1]).toEqual(expect.objectContaining({ room_code: 'TEST1', round_id: 'round-1', rating: 'fun', comment: 'More tasks, please.' }));
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Send feedback' })).toBeDisabled();
    act(() => request[2](null, { ok: true }));
    await waitFor(() => expect(screen.getByText('Thanks for the feedback!')).toBeInTheDocument());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(contextValue.socket.emit).not.toHaveBeenCalledWith('reset', expect.anything());
    expect(contextValue.socket.emit).not.toHaveBeenCalledWith('leave_room', expect.anything());
});

test('preserves the comment after a failed request and permits a retry or dismissal', async () => {
    const { contextValue } = openForm();
    fireEvent.change(screen.getByLabelText('Comment (optional)'), { target: { value: 'The round felt too short.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }));
    const request = contextValue.socket.emit.mock.calls.find(([event]) => event === 'submit_feedback');
    act(() => request[2](new Error('Socket command timed out.')));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/try again/i));
    expect(screen.getByRole('textbox')).toHaveValue('The round felt too short.');
    expect(screen.getByRole('button', { name: 'Send feedback' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss feedback' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('does not send an empty form', () => {
    const { contextValue } = openForm();
    expect(screen.getByRole('button', { name: 'Send feedback' })).toBeDisabled();
    expect(contextValue.socket.emit).not.toHaveBeenCalledWith('submit_feedback', expect.anything(), expect.anything());
});

test('never shows on the big screen, which is not a player', () => {
    resultScreen({ isMobile: false });
    act(() => jest.advanceTimersByTime(5000));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('does not show before the round has ended', () => {
    resultScreen({ endState: null });
    act(() => jest.advanceTimersByTime(5000));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react';
import { renderWithContext, screen } from '../../test-utils';
import { DataContext } from '../../GameContext';
import { configureTestStorage } from '../../testing/gameFlowHarness';
import EndGameButtons from '../../components/EndGameButtons';
import GameFeedback, { PROMPT_DELAY_MS, PROMPT_AFTER_SAVE_MS } from '../../components/GameFeedback';

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

// The end screen asks for a "Save this game" code on its own, and the prompt reports what happened to it
// (client_metric); these tests are about what the prompt sends.
const promptEmits = socket => socket.emit.mock.calls.filter(([event]) => !['save_game_link', 'client_metric'].includes(event));
const metrics = socket => socket.emit.mock.calls.filter(([event]) => event === 'client_metric').map(([, payload]) => payload.action);

// The prompt wraps the whole page in the app (PageController), so a reset can swap the screen under it.
const page = (contextValue, screenUi = <EndGameButtons />) => (
    <DataContext.Provider value={contextValue}><GameFeedback>{screenUi}</GameFeedback></DataContext.Provider>
);
function resultScreen(overrides = {}) {
    return renderWithContext(<GameFeedback><EndGameButtons /></GameFeedback>, { endState: 'victory', isMobile: true, ...overrides });
}
// The group's Play Again sends the room back to the lobby: no end state, a new round id.
function resetToLobby(result, overrides = {}) {
    const lobby = { ...result.contextValue, endState: null, roundId: 'round-2', ...overrides };
    result.rerender(page(lobby, <p>Lobby</p>));
    return lobby;
}
function showPrompt(overrides = {}) {
    const result = resultScreen(overrides);
    act(() => jest.advanceTimersByTime(PROMPT_DELAY_MS));
    return result;
}
function openForm() {
    const result = showPrompt();
    fireEvent.click(screen.getByRole('button', { name: 'Give feedback' }));
    return result;
}

test('waits 20 seconds, so Save this game has the screen first, then shows the three choices and X', () => {
    const { contextValue } = resultScreen();
    act(() => jest.advanceTimersByTime(PROMPT_DELAY_MS - 1));
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
    act(() => jest.advanceTimersByTime(PROMPT_DELAY_MS));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test.each(['Maybe later', 'Dismiss feedback'])('%s dismisses only the current game prompt', button => {
    for (const roundId of ['round-1', 'round-2', 'round-3']) {
        const result = showPrompt({ roundId });
        expect(screen.getByRole('dialog')).toBeVisible();
        fireEvent.click(screen.getByRole('button', { name: button }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        act(() => jest.advanceTimersByTime(PROMPT_DELAY_MS + 2000));
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
    expect(metrics(contextValue.socket)).toEqual(['feedback_shown', 'feedback_open', 'feedback_sent']);
    act(() => jest.advanceTimersByTime(4000));
    expect(screen.queryByText('Thanks for the feedback!')).not.toBeInTheDocument();
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
    act(() => jest.advanceTimersByTime(PROMPT_DELAY_MS + 2000));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('does not show before the round has ended', () => {
    resultScreen({ endState: null });
    act(() => jest.advanceTimersByTime(PROMPT_DELAY_MS + 2000));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('comes 2 seconds after the player is done with Save this game', async () => {
    navigator.share = jest.fn().mockResolvedValue();
    try {
        const { contextValue } = resultScreen();
        const call = contextValue.socket.emit.mock.calls.find(([event]) => event === 'save_game_link');
        act(() => call[2]({ ok: true, code: 'ZN5QF2' }));
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Save this game/ })); });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        act(() => jest.advanceTimersByTime(PROMPT_AFTER_SAVE_MS));
        expect(screen.getByRole('dialog')).toBeVisible();
    } finally {
        delete navigator.share;
    }
});

test('keeps a half-written answer open when the group taps Play Again, and sends it for the round that ended', async () => {
    const result = openForm();
    fireEvent.click(screen.getByLabelText('Okay'));
    fireEvent.change(screen.getByLabelText('Comment (optional)'), { target: { value: 'Needed more time to' } });
    resetToLobby(result);
    expect(screen.getByText('Lobby')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(screen.getByLabelText('Comment (optional)')).toHaveValue('Needed more time to');
    expect(screen.getByLabelText('Okay')).toBeChecked();
    fireEvent.change(screen.getByLabelText('Comment (optional)'), { target: { value: 'Needed more time to vote.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }));
    const request = result.contextValue.socket.emit.mock.calls.find(([event]) => event === 'submit_feedback');
    expect(request[1]).toEqual(expect.objectContaining({ round_id: 'round-1', rating: 'okay', comment: 'Needed more time to vote.' }));
    act(() => request[2](null, { ok: true }));
    await waitFor(() => expect(screen.getByText('Thanks for the feedback!')).toBeInTheDocument());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(metrics(result.contextValue.socket)).toEqual(['feedback_shown', 'feedback_open', 'feedback_kept_open', 'feedback_sent']);
});

test('the three choices stay up through a reset too, and the lobby never asks again for that round', () => {
    const result = showPrompt();
    const lobby = resetToLobby(result);
    expect(screen.getByRole('dialog')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Maybe later' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    act(() => jest.advanceTimersByTime(PROMPT_DELAY_MS * 2));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // The next round that ends asks again: one prompt per player per round.
    result.rerender(page({ ...lobby, endState: 'sus_victory', roundId: 'round-3' }));
    act(() => jest.advanceTimersByTime(PROMPT_DELAY_MS));
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(metrics(result.contextValue.socket)).toEqual(['feedback_shown', 'feedback_kept_open', 'feedback_later', 'feedback_shown']);
});

test('a reset before the 20 seconds are up means no prompt for that round', () => {
    const result = resultScreen();
    act(() => jest.advanceTimersByTime(PROMPT_DELAY_MS - 5000));
    resetToLobby(result);
    act(() => jest.advanceTimersByTime(PROMPT_DELAY_MS));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(metrics(result.contextValue.socket)).toEqual([]);
});

test('a player who already tapped Play Again is not asked', () => {
    resultScreen({ resetVotes: { current: 1, needed: 3, voters: ['test_player_id'] } });
    act(() => jest.advanceTimersByTime(PROMPT_DELAY_MS + 2000));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test.each([
    ["Don't ask again", false, 'feedback_snoozed'],
    ['Maybe later', true, 'feedback_abandoned'],
    ['Dismiss feedback', false, 'feedback_later'],
])('logs how the prompt was closed (%s), never what was typed', (button, writing, action) => {
    const result = writing ? openForm() : showPrompt();
    if (writing) fireEvent.change(screen.getByLabelText('Comment (optional)'), { target: { value: 'private words' } });
    fireEvent.click(screen.getByRole('button', { name: button }));
    const sent = metrics(result.contextValue.socket);
    expect(sent[sent.length - 1]).toBe(action);
    expect(JSON.stringify(result.contextValue.socket.emit.mock.calls)).not.toContain('private words');
});

import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import TaskGeneratorPage from './TaskGeneratorPage';
import { readGameDraft } from './gameDraft';

beforeEach(() => {
    window.history.replaceState({}, '', '/among-us-irl-task-generator');
    const items = new Map();
    sessionStorage.getItem.mockImplementation(key => items.get(key) || null);
    sessionStorage.setItem.mockImplementation((key, value) => items.set(key, value));
    sessionStorage.removeItem.mockImplementation(key => items.delete(key));
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: jest.fn().mockResolvedValue() } });
});

it('replaces movement and style dropdowns with a working style slider', () => {
    render(<TaskGeneratorPage />);
    expect(screen.queryByLabelText('Movement')).not.toBeInTheDocument();
    expect(screen.getByRole('slider', { name: /Task style/i })).toHaveValue('50');
    fireEvent.change(screen.getByRole('slider', { name: /Task style/i }), { target: { value: '100' } });
    expect(screen.getByRole('slider', { name: /Task style/i })).toHaveValue('100');
    expect(within(screen.getByRole('region', { name: 'Your task pack' })).getByText(/24 tasks/)).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
});

it('treats old seated links as room-to-room setups', () => {
    window.history.replaceState({}, '', '/among-us-irl-task-generator?venue=house&players=10&movement=low&style=mix');
    render(<TaskGeneratorPage />);
    expect(screen.getByRole('checkbox', { name: 'Kitchen', exact: true })).toBeChecked();
    expect(screen.queryByText('Station A')).not.toBeInTheDocument();
});

it('swaps one task without changing the other tasks or the task count', () => {
    render(<TaskGeneratorPage />);
    const pack = screen.getByRole('region', { name: 'Your task pack' });
    const rows = within(pack).getAllByTestId('task-row');
    const before = rows.map(row => within(row).getByTestId('task-text').textContent);
    fireEvent.click(within(rows[0]).getByRole('button', { name: /Swap/i }));
    const after = within(pack).getAllByTestId('task-row').map(row => within(row).getByTestId('task-text').textContent);
    expect(after[0]).not.toBe(before[0]);
    expect(after.slice(1)).toEqual(before.slice(1));
    expect(after).toHaveLength(24);
});

it('exports all tasks, including edits and collapsed rows, into the game draft', () => {
    render(<TaskGeneratorPage />);
    fireEvent.click(screen.getAllByRole('button', { name: /Edit task/i })[0]);
    const input = screen.getByRole('textbox', { name: /Edit task/i });
    fireEvent.change(input, { target: { value: 'Patrol the kitchen, then straighten one chair.' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    const usePack = screen.getByRole('link', { name: /Use this pack/i });
    usePack.addEventListener('click', event => event.preventDefault());
    fireEvent.click(usePack);
    const draft = readGameDraft();
    expect(draft.tasks).toHaveLength(24);
    expect(draft.tasks.some(task => task.task === 'Patrol the kitchen, then straighten one chair.')).toBe(true);
    expect(draft.locations).toEqual(['Kitchen', 'Living Room', 'Hallway']);
});

it('keeps edits when the player count changes', () => {
    render(<TaskGeneratorPage />);
    fireEvent.click(screen.getAllByRole('button', { name: /Edit task/i })[0]);
    const input = screen.getByRole('textbox', { name: /Edit task/i });
    fireEvent.change(input, { target: { value: 'My custom mission' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.change(screen.getByRole('slider', { name: /Players/i }), { target: { value: '15' } });
    expect(screen.getByText('My custom mission')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Your task pack' })).getByText(/45 tasks/)).toBeInTheDocument();
});

it('blocks import until at least two locations remain', () => {
    render(<TaskGeneratorPage />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Living Room', exact: true }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Hallway', exact: true }));
    expect(screen.queryByRole('link', { name: /Use this pack/i })).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/two locations/i);
});

it('shares the current setup without the obsolete movement filter', async () => {
    render(<TaskGeneratorPage />);
    fireEvent.click(screen.getByRole('button', { name: /Share setup/i }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled());
    const url = new URL(navigator.clipboard.writeText.mock.calls[0][0]);
    expect(url.searchParams.has('movement')).toBe(false);
    expect(url.searchParams.get('style')).toBe('50');
    expect(url.searchParams.getAll('room')).toEqual(['Kitchen', 'Living Room', 'Hallway']);
});

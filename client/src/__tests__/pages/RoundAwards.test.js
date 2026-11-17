/**
 * Round awards on the end screens: each medal with the player's name and the story, and a phone
 * that won one sees its own medal first.
 */
import React from 'react';
import { fireEvent } from '@testing-library/react';
import { renderWithContext, screen, mockPlayers } from '../../test-utils';
import CrewVictoryScreen from '../../pages/CrewVictory';

const awards = [
    { medal: 'called_it', player_id: 'player1', name: 'Alice', value: 1, detail: { caught: 'Charlie' } },
    { medal: 'prankster', player_id: 'player3', name: 'Charlie', value: 1, detail: { target: 'Bob', task: 'hop on one foot' } },
    { medal: 'task_machine', player_id: 'player2', name: 'Bob', value: 9 },
];

function context(extra = {}) {
    return { players: mockPlayers, endState: 'victory', gameStats: { tasks_completed: 12, awards }, isMobile: true, ...extra };
}


test('lists the round awards with who got them and why', () => {
    renderWithContext(<CrewVictoryScreen />, context());
    const list = screen.getByTestId('round-awards');
    expect(list).toHaveTextContent('Called it · Alice');
    expect(list).toHaveTextContent('Caught Charlie');
    expect(list).toHaveTextContent('Got Bob to “hop on one foot”');
    expect(list).toHaveTextContent('9 tasks done');
    expect(screen.queryByTestId('my-medal')).toBeNull();
});

test('no awards, no section', () => {
    renderWithContext(<CrewVictoryScreen />, context({ gameStats: { tasks_completed: 2 } }));
    expect(screen.queryByTestId('round-awards')).toBeNull();
});

test('a phone that won a medal sees it first, then the round', () => {
    renderWithContext(<CrewVictoryScreen />, context({ playerState: { playerId: 'player2' } }));
    const mine = screen.getByTestId('my-medal');
    expect(mine).toHaveTextContent('You got a medal');
    expect(mine).toHaveTextContent('Task machine');
    fireEvent.click(screen.getByText('See the round'));
    expect(screen.queryByTestId('my-medal')).toBeNull();
});

test('the laptop shows the awards but never a personal medal screen', () => {
    renderWithContext(<CrewVictoryScreen />, context({ isMobile: false, playerState: { playerId: 'player2' } }));
    expect(screen.getByTestId('round-awards')).toBeTruthy();
    expect(screen.queryByTestId('my-medal')).toBeNull();
});

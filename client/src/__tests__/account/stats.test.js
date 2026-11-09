import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import StatsPage from '../../pages/account/StatsPage';
import StatsLink from '../../account/StatsLink';
import { resetAccountStoreForTests } from '../../account/accountStore';
import { setLanguageForTesting } from '../../i18n';

function reply(body, status = 200) {
    return Promise.resolve({ status, json: () => Promise.resolve(body) });
}

const now = Date.now() / 1000;
const weeks = Array.from({ length: 12 }, (_, i) => ({ end: now - (11 - i) * 7 * 86400, games: i === 11 ? 4 : i % 3, wins: i === 11 ? 3 : 0 }));
const STATS = {
    games: 14, wins: 9, crew: { games: 11, wins: 8 }, intruder: { games: 3, wins: 1 },
    survived: 10, voted_out: 2, players_met: 120, biggest_party: 18, minutes: 190,
    best_streak: 4, current_streak: 2, first_played: now - 80 * 86400,
    tasks: 41, cards: 5, takedowns: 6, meetings: 7, votes: 20, sharp_votes: 8,
    weeks, recent: [{ role: 'crew', won: true, at: now - 100 }, { role: 'intruder', won: false, at: now - 50 }],
};

function mockServer({ account = { id: 'a_1', email: 'kim@example.com', name: 'Kim' }, stats = STATS } = {}) {
    const calls = [];
    global.fetch = jest.fn((url) => {
        calls.push(url);
        if (url.endsWith('/api/account')) return reply({ account, google: true, email: true });
        if (url.endsWith('/api/account/stats')) return account ? reply({ ok: true, stats }) : reply({ ok: false }, 401);
        return reply({ ok: true });
    });
    return calls;
}

beforeEach(() => resetAccountStoreForTests());
afterEach(() => { delete global.fetch; setLanguageForTesting('en'); });

test('shows a signed-in player their games, win rates and numbers', async () => {
    mockServer();
    render(<StatsPage />);
    expect(await screen.findByTestId('stats-games')).toHaveTextContent('14');
    expect(screen.getByText('Nice playing, Kim!')).toBeTruthy();
    expect(screen.getByTestId('stats-crew')).toHaveTextContent('73%');
    expect(screen.getByTestId('stats-crew')).toHaveTextContent('8 of 11 won');
    expect(screen.getByTestId('stats-intruder')).toHaveTextContent('33%');
    expect(screen.getByTestId('stats-tasks')).toHaveTextContent('41');
    expect(screen.getByText('Best win streak: 4 in a row')).toBeTruthy();
    expect(screen.getByText('Sharp eye: 8 votes found an intruder')).toBeTruthy();
    expect(screen.getByText('Intruder takedowns')).toBeTruthy();
    expect(screen.getByTestId('stats-privacy')).toHaveTextContent('Deleting your account deletes your stats too.');
});

test('a new account sees an empty state, not zeros everywhere', async () => {
    mockServer({ stats: { ...STATS, games: 0, recent: [] } });
    render(<StatsPage />);
    expect(await screen.findByTestId('stats-empty')).toHaveTextContent('No games yet');
});

test('signed out: asks to sign in and never asks the server for stats', async () => {
    const calls = mockServer({ account: null });
    render(<StatsPage />);
    expect(await screen.findByText('Sign in to see your stats')).toBeTruthy();
    expect(calls.some((url) => url.endsWith('/api/account/stats'))).toBe(false);
});

test('reads in another language', async () => {
    setLanguageForTesting('de');
    mockServer();
    render(<StatsPage />);
    expect(await screen.findByText('Gut gespielt, Kim!')).toBeTruthy();
    expect(screen.getByText('Siegquote')).toBeTruthy();
});

test('the end-screen link shows only for a signed-in phone', async () => {
    mockServer();
    render(<StatsLink />);
    expect(await screen.findByTestId('end-stats-link')).toHaveAttribute('href', '/account/stats');
});

test('no end-screen link and no sign-in nudge for a signed-out phone', async () => {
    const calls = mockServer({ account: null });
    const { container } = render(<StatsLink />);
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    await act(async () => {});
    expect(container).toBeEmptyDOMElement();
});

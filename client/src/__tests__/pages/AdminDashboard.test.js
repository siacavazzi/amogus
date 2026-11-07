import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AdminDashboard from '../../pages/admin/AdminDashboard';

const NOW = 1794052800;

function window(rounds) {
  return {
    start: NOW - 7 * 86400, end: NOW,
    totals: { rounds, rooms_played: 3, rooms_created: 9, seats: 31, devices: 0, returning_devices: 0, biggest_round: 14, median_round_seconds: 840, sessions: 3, in_progress: 1 },
    previous: { rounds: 4, rooms_played: 2, rooms_created: 5, seats: 20, devices: 0 },
    local_hours: Array.from({ length: 24 }, (_, h) => (h === 20 ? 5 : 0)),
    group_sizes: [{ key: '3–4', count: 2 }, { key: '10–14', count: rounds - 2 }],
    session_lengths: [{ key: '1', count: 1 }, { key: '3–4', count: 2 }],
    session_stats: { median_rounds: 3, multi_round_share: 0.667, rooms_per_session: 1 },
    endings: [
      { key: 'crew_vote', label: 'Crew voted the intruders out', count: 5 },
      { key: 'crew_tasks', label: 'Crew finished the tasks', count: 1 },
      { key: 'intruders', label: 'Intruders won', count: 2 },
      { key: 'abandoned', label: 'Stopped without a result', count: 0 },
    ],
    hosts: [{ key: 'phone', created: 4, played: 3 }, { key: 'desktop', created: 5, played: 0 }],
    sources: [{ key: 'direct', created: 3, played: 2 }],
    funnel: [{ key: 'created', label: 'Rooms created', count: 9 }, { key: 'opened', label: 'Opened to players', count: 6 },
      { key: 'three', label: '3+ phones joined', count: 4 }, { key: 'played', label: 'Played a round', count: 3 }],
    browsers: [{ key: 'safari', count: 20 }, { key: 'facebook_app', count: 11 }],
    in_app: { phones: 11, of: 31 },
    languages: [{ key: 'no', count: 20 }], translated: [], task_sources: [{ key: 'generator', count: 3 }],
    entry_methods: [{ key: 'typed', count: 25 }], join_rejections: [{ key: 'room_not_found', count: 4 }],
    client_errors: [{ key: 'TypeError on VotingPage', count: 2 }], socket_errors: [], error_totals: { client: 2, socket: 0 },
    feedback: [{ key: 'fun', count: 1 }, { key: 'okay', count: 0 }, { key: 'needs_work', count: 0 }, { key: 'comment_only', count: 0 }],
    recent_rooms: [{ code: 'YTXE', first_round: NOW - 3600, last_round: NOW - 600, rounds: 6, max_players: 14, phones: 16, crew_wins: 4, intruder_wins: 1, unfinished: 1, host_device: 'phone', source: 'direct', language: 'no', utc_offset_minutes: 60, in_app_share: 0.5, returning_devices: 0, devices: 0, task_source: 'generator' }],
  };
}

const stats = {
  generated_at: NOW,
  totals: { games_created: 300, games_completed: 400, unique_players: 1129, saved_task_lists: 14 },
  live: {
    active_games: 1, playing: 1, lobby: 0, idle: 2, players_in_games: 12, activity_window_seconds: 900,
    games: [
      { room_code: 'PLAY', status: 'playing', running: true, in_meeting: false, round_number: 2, player_count: 13, connected_players: 12, has_reactor: true, last_activity: NOW - 30, created_at: NOW - 3000 },
      { room_code: 'IDLE', status: 'idle', running: false, player_count: 5, connected_players: 0, last_activity: NOW - 7000, created_at: NOW - 8000 },
      { room_code: 'IDL2', status: 'idle', running: false, has_ended: true, player_count: 5, connected_players: 0, last_activity: NOW - 7000, created_at: NOW - 8000 },
    ],
  },
  game_feedback: [{ id: 'f1', rating: 'fun', comment: 'Loved it', submitted_at: NOW - 100, analytics_excluded: false }],
  report: {
    built_at: NOW, log_since: NOW - 30 * 86400, devices_since: null,
    daily: Array.from({ length: 28 }, (_, i) => ({ start: NOW - (27 - i) * 86400, label: `d${i}`, rounds: i % 5, rooms_played: 1, rooms_created: 2, seats: 6, big_rounds: 0, devices: 0, returning_devices: 0, new_devices: 0, partial: i === 27 })),
    weekly: Array.from({ length: 8 }, (_, i) => ({ start: NOW - (7 - i) * 7 * 86400, label: `w${i}`, rounds: 10 + i, rooms_played: 3, rooms_created: 7, seats: 30, big_rounds: 2, devices: 0, returning_devices: 0, new_devices: 0, partial: i === 7 })),
    windows: { 7: window(8), 28: window(40) },
  },
};

describe('AdminDashboard', () => {
  beforeEach(() => {
    sessionStorage.getItem.mockImplementation(key => (key === 'sus_party_admin_pw' ? 'pw' : null));
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(stats) }));
  });
  afterEach(() => {
    sessionStorage.getItem.mockReset();
  });

  test('shows rooms in use apart from idle ones, and the period totals', async () => {
    render(<AdminDashboard />);
    await waitFor(() => expect(screen.getByText('Right now')).toBeInTheDocument());
    expect(screen.getByText('room playing a round').previousSibling).toHaveTextContent('1');
    expect(screen.getByText(/2 more rooms are idle/)).toBeInTheDocument();
    expect(screen.getByText('Idle rooms (2)')).toBeInTheDocument();
    expect(screen.getByText('Rounds played').nextSibling).toHaveTextContent('8');
    expect(screen.getByText(/\+4 vs previous 7 days/)).toBeInTheDocument();
    expect(screen.getByText('35% of phones played inside an app\'s browser.')).toBeInTheDocument();
    expect(screen.getByText(/needs the anonymous device ID/)).toBeInTheDocument();
    expect(screen.getByText('YTXE')).toBeInTheDocument();
    expect(screen.getByText('Loved it')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: 'Last 28 days' }));
    expect(screen.getByText('Rounds played').nextSibling).toHaveTextContent('40');
  });

  test('still shows live rooms when the event log cannot be read', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ...stats, report: null }) }));
    render(<AdminDashboard />);
    await waitFor(() => expect(screen.getByText(/event log could not be read/)).toBeInTheDocument());
    expect(screen.getByText('PLAY')).toBeInTheDocument();
  });
});

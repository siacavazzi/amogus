import React, { useCallback, useEffect, useState } from 'react';
import { ENDPOINT } from '../../ENDPOINT';
import './AdminDashboard.css';

const STORAGE_KEY = 'sus_party_admin_pw';

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '-';
  const rounded = Math.round(seconds);
  const m = Math.floor(rounded / 60);
  const s = rounded % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function formatTime(epochSeconds) {
  if (!epochSeconds) return '-';
  const d = new Date(epochSeconds * 1000);
  return d.toLocaleString();
}

function relativeTime(epochSeconds) {
  if (!epochSeconds) return '-';
  const diff = Math.max(0, Date.now() / 1000 - epochSeconds);
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function useAdminDocument() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    const previousTitle = document.title;
    const previousTheme = themeMeta ? themeMeta.getAttribute('content') : null;

    html.classList.add('adm-document');
    body.classList.add('adm-document');
    document.title = 'Dashboard - Sus Party';
    if (themeMeta) themeMeta.setAttribute('content', '#030712');

    return () => {
      html.classList.remove('adm-document');
      body.classList.remove('adm-document');
      document.title = previousTitle;
      if (themeMeta && previousTheme) themeMeta.setAttribute('content', previousTheme);
    };
  }, []);
}

function AdminDashboard() {
  useAdminDocument();

  const [password, setPassword] = useState(() => sessionStorage.getItem(STORAGE_KEY) || '');
  const [authed, setAuthed] = useState(false);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async (pw) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${ENDPOINT}/api/admin/stats`, {
        headers: { 'X-Admin-Password': pw },
      });
      if (res.status === 401) {
        setError('Wrong password');
        setAuthed(false);
        sessionStorage.removeItem(STORAGE_KEY);
        return;
      }
      if (res.status === 503) {
        setError('Admin endpoint is disabled. Set ADMIN_PASSWORD on the server.');
        setAuthed(false);
        return;
      }
      if (!res.ok) {
        setError(`Error ${res.status}`);
        return;
      }
      const data = await res.json();
      setStats(data);
      setAuthed(true);
      sessionStorage.setItem(STORAGE_KEY, pw);
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-attempt with stored password on mount
  useEffect(() => {
    if (password) fetchStats(password);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh every 15s when authed
  useEffect(() => {
    if (!authed) return undefined;
    const id = setInterval(() => fetchStats(password), 15000);
    return () => clearInterval(id);
  }, [authed, password, fetchStats]);

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchStats(password);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setAuthed(false);
    setStats(null);
    setPassword('');
  };

  if (!authed) {
    return (
      <div className="adm-shell">
        <form className="adm-login" onSubmit={handleSubmit}>
          <h1 className="adm-login__title">Dashboard</h1>
          <input
            type="password"
            className="adm-login__input"
            placeholder="Admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          <button type="submit" className="adm-login__button" disabled={loading || !password}>
            {loading ? 'Checking…' : 'Sign in'}
          </button>
          {error && <p className="adm-login__error">{error}</p>}
        </form>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="adm-shell">
        <p className="adm-loading">Loading…</p>
      </div>
    );
  }

  const { totals, today, live, averages, recent_games: recentGames } = stats;
  const metrics = stats.metrics || {};
  const events = metrics.event_counts || {};
  const outcomes = metrics.round_outcomes || {};
  const failures = Object.entries(metrics.failure_reasons || {}).sort((a, b) => b[1] - a[1]);

  return (
    <div className="adm-shell">
      <header className="adm-topbar">
        <div>
          <p className="adm-eyebrow">Sus Party</p>
          <h1 className="adm-title">Usage dashboard</h1>
        </div>
        <div className="adm-topbar__meta">
          <span>Updated {relativeTime(stats.generated_at)}</span>
          <button className="adm-link-button" onClick={() => fetchStats(password)}>Refresh</button>
          <button className="adm-link-button" onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      <section className="adm-grid">
        <Stat label="Active games right now" value={live.active_games} />
        <Stat label="Players in active games" value={live.players_in_games} />
        <Stat label="Games completed today" value={today.games_completed} />
        <Stat label="Games created (retained stats)" value={totals.games_created} />
        <Stat label="Games completed (retained stats)" value={totals.games_completed} />
        <Stat label="Player IDs recorded" value={totals.unique_players} />
        <Stat label="Avg completed round" value={formatDuration(averages.game_duration_seconds)} />
        <Stat label="Saved task lists" value={totals.saved_task_lists} />
      </section>

      <section className="adm-card">
        <h2>Setup and recovery</h2>
        <p className="adm-empty">Metrics start {formatTime(metrics.since)}. Round duration excludes setup and prior rounds.</p>
        <p className="adm-empty">The average uses {averages.duration_sample_count || 0} completed rounds with a known start. Legacy durations remain separate.</p>
        <div className="adm-grid">
          <Stat label="Avg setup per round" value={formatDuration(averages.setup_seconds)} />
          <Stat label="Rejected room entries" value={events.join_rejected || 0} />
          <Stat label="Rejected starts" value={events.start_rejected || 0} />
          <Stat label="Disconnects" value={events.connection_closed || 0} />
          <Stat label="Reconnects" value={events.player_reconnected || 0} />
          <Stat label="Failed reconnects" value={events.reconnect_failed || 0} />
          <Stat label="Rounds closed without a result" value={outcomes.abandoned || 0} />
          <Stat label="Rounds lost at restart" value={outcomes.interrupted || 0} />
        </div>
        {failures.length > 0 && <div style={{ overflowX: 'auto' }}>
          <table className="adm-table">
            <thead><tr><th>Failure reason</th><th>Attempts</th></tr></thead>
            <tbody>{failures.map(([reason, count]) => <tr key={reason}><td>{reason.replace(/_/g, ' ')}</td><td>{count}</td></tr>)}</tbody>
          </table>
        </div>}
      </section>

      <section className="adm-card">
        <h2>Recent rounds</h2>
        <p className="adm-empty">Close time includes idle time for abandoned rooms. A restart cannot establish the round end time.</p>
        {(metrics.recent_rounds || []).length === 0 ? <p className="adm-empty">No new round records yet.</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table className="adm-table">
              <thead><tr><th>Room / round</th><th>Status</th><th>Players at start</th><th>Tasks / areas</th><th>Setup</th><th>First task</th><th>Round / close time</th><th>Start</th></tr></thead>
              <tbody>{metrics.recent_rounds.map(round => <tr key={`${round.room_session_id}:${round.round_id}`}>
                <td className="adm-mono">{round.room_code} / {round.round_number}</td>
                <td title={round.end_reason || ''}>{round.outcome.replace(/_/g, ' ')}</td>
                <td>{round.player_count_at_start}</td>
                <td>{round.task_count_at_start} / {round.used_location_count}</td>
                <td>{formatDuration(round.setup_seconds)}</td>
                <td>{formatDuration(round.first_task_seconds)}</td>
                <td>{formatDuration(round.duration_seconds)}</td>
                <td title={formatTime(round.started_at)}>{relativeTime(round.started_at)}</td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
      </section>

      <section className="adm-card">
        <h2>Discovery → playable games</h2>
        <p className="adm-empty">Source counts start {formatTime(stats.acquisition_since)}. Round counts include rounds that start with at least three players.</p>
        <p className="adm-empty">Sources describe host sessions. They do not identify people or prove search queries.</p>
        {(stats.acquisition || []).length === 0 ? <p className="adm-empty">No source data yet.</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table className="adm-table">
              <thead><tr><th>Source</th><th>Entry page</th><th>Rooms created</th><th>Rooms that start</th><th>Start rate</th><th>Rounds started</th><th>Rounds completed</th></tr></thead>
              <tbody>{stats.acquisition.map(row => <tr key={`${row.source}:${row.landing_page}`}>
                <td>{row.source === 'direct' ? 'No referrer' : row.source}</td><td>{row.landing_page}</td><td>{row.rooms_created}</td><td>{row.rooms_started}</td>
                <td>{row.rooms_created ? `${Math.round(row.rooms_started / row.rooms_created * 100)}%` : '—'}</td>
                <td>{row.rounds_started}</td><td>{row.rounds_completed}</td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
      </section>

      <section className="adm-card">
        <h2>Live games ({live.games.length})</h2>
        {live.games.length === 0 ? (
          <p className="adm-empty">No active games right now.</p>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>Room</th>
                <th>Players</th>
                <th>Status</th>
                <th>Created</th>
                <th>Last activity</th>
              </tr>
            </thead>
            <tbody>
              {live.games.map((g) => (
                <tr key={g.room_code}>
                  <td className="adm-mono">{g.room_code}</td>
                  <td>{g.player_count}</td>
                  <td>{liveStatusLabel(g)}</td>
                  <td>{relativeTime(g.created_at)}</td>
                  <td>{relativeTime(g.last_activity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="adm-card">
        <h2>Recent completed games</h2>
        {recentGames.length === 0 ? (
          <p className="adm-empty">No completed games yet.</p>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>Room</th>
                <th>Outcome</th>
                <th>Players</th>
                <th>Duration</th>
                <th>Meetings</th>
                <th>Tasks</th>
                <th>Cards</th>
                <th>Ended</th>
              </tr>
            </thead>
            <tbody>
              {recentGames.map((g, i) => (
                <tr key={`${g.room_code}-${g.ended_at}-${i}`}>
                  <td className="adm-mono">{g.room_code || '-'}</td>
                  <td>{outcomeLabel(g.end_state)}</td>
                  <td>{g.player_count}</td>
                  <td>{formatDuration(g.duration_seconds)}{g.duration_basis !== 'round_start' ? ' (legacy / unknown)' : ''}</td>
                  <td>{g.meetings_called}</td>
                  <td>{g.tasks_completed}</td>
                  <td>{g.cards_played}</td>
                  <td title={formatTime(g.ended_at)}>{relativeTime(g.ended_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="adm-stat">
      <div className="adm-stat__value">{value}</div>
      <div className="adm-stat__label">{label}</div>
    </div>
  );
}

function liveStatusLabel(g) {
  if (g.has_ended) return `Ended (${g.end_state || '-'})`;
  if (g.in_meeting) return 'In meeting';
  if (g.running) return 'Running';
  return 'Lobby';
}

function outcomeLabel(state) {
  switch (state) {
    case 'victory': return 'Crew win';
    case 'sus_victory': return 'Intruder win';
    case 'meltdown_fail': return 'Meltdown';
    default: return state || '-';
  }
}

export default AdminDashboard;

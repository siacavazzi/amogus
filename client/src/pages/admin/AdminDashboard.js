import React, { useCallback, useEffect, useState } from 'react';
import { ENDPOINT } from '../../ENDPOINT';
import './AdminDashboard.css';

const STORAGE_KEY = 'sus_party_admin_pw';

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '-';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
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
        <Stat label="Games created (all time)" value={totals.games_created} />
        <Stat label="Games completed (all time)" value={totals.games_completed} />
        <Stat label="Unique players (all time)" value={totals.unique_players} />
        <Stat label="Avg game duration" value={formatDuration(averages.game_duration_seconds)} />
        <Stat label="Saved task lists" value={totals.saved_task_lists} />
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
                  <td>{formatDuration(g.duration_seconds)}</td>
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

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ENDPOINT } from '../../ENDPOINT';
import { BarList, ColumnChart, RateList, Stat } from './charts';
import {
  IN_APP, dateTimeLabel, dayLabel, formatDuration, formatNumber, languageName, nameOf, percent,
  relativeTime, utcOffsetLabel, weekdayLabel,
} from './labels';
import './AdminDashboard.css';

const STORAGE_KEY = 'sus_party_admin_pw';
const RANGE_KEY = 'sus_party_admin_range';

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
    if (themeMeta) themeMeta.setAttribute('content', '#1b4fd8');

    return () => {
      html.classList.remove('adm-document');
      body.classList.remove('adm-document');
      document.title = previousTitle;
      if (themeMeta && previousTheme) themeMeta.setAttribute('content', previousTheme);
    };
  }, []);
}

function readStored(storage, key, fallback) {
  try {
    return storage.getItem(key) || fallback;
  } catch (err) {
    return fallback;
  }
}

function writeStored(storage, key, value) {
  try {
    if (value === null) storage.removeItem(key);
    else storage.setItem(key, value);
  } catch (err) {
    // Private windows can refuse storage; the dashboard still works for this visit.
  }
}

function AdminDashboard() {
  useAdminDocument();

  const [password, setPassword] = useState(() => readStored(sessionStorage, STORAGE_KEY, ''));
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
        writeStored(sessionStorage, STORAGE_KEY, null);
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
      writeStored(sessionStorage, STORAGE_KEY, pw);
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (password) fetchStats(password);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live rooms change fast; the rest of the report is rebuilt at most once a minute on the server.
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
    writeStored(sessionStorage, STORAGE_KEY, null);
    setAuthed(false);
    setStats(null);
    setPassword('');
  };

  if (!authed) {
    return (
      <div className="adm-shell adm-shell--login">
        <form className="adm-login" onSubmit={handleSubmit}>
          <h1 className="adm-login__title">Dashboard</h1>
          <label className="adm-login__label" htmlFor="adm-password">Admin password</label>
          <input
            id="adm-password"
            type="password"
            className="adm-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          <button type="submit" className="adm-button" disabled={loading || !password}>
            {loading ? 'Checking…' : 'Sign in'}
          </button>
          {error && <p className="adm-login__error" role="alert">{error}</p>}
        </form>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="adm-shell">
        <p className="adm-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="adm-shell">
      <header className="adm-top">
        <div className="adm-top__inner">
          <h1 className="adm-top__title">Sus Party dashboard</h1>
          <div className="adm-top__meta">
            <span className={loading ? 'adm-top__updating' : ''}>Updated {relativeTime(stats.generated_at)}</span>
            <button type="button" className="adm-top__link" onClick={() => fetchStats(password)}>Refresh</button>
            <button type="button" className="adm-top__link" onClick={handleLogout}>Sign out</button>
          </div>
        </div>
      </header>
      <main className="adm-main">
        {error && <p className="adm-alert" role="alert">Last refresh failed: {error}. Showing the previous numbers.</p>}
        <LiveNow live={stats.live} />
        {stats.report ? <Report report={stats.report} feedback={stats.game_feedback || []} /> : (
          <section className="adm-card">
            <h2 className="adm-h2">History</h2>
            <p className="adm-muted">The event log could not be read. The server log has the error.</p>
          </section>
        )}
        <footer className="adm-foot">
          <p>
            Since the stats file began: {formatNumber(stats.totals.games_created)} rooms created,{' '}
            {formatNumber(stats.totals.games_completed)} rounds finished. {formatNumber(stats.totals.saved_task_lists)} saved task lists.
          </p>
          {stats.report?.log_since && <p>Charts read the gameplay event log, which goes back to {dayLabel(stats.report.log_since)}. Days and weeks are UTC.</p>}
        </footer>
      </main>
    </div>
  );
}

// ---------- Right now ----------

function statusLabel(room) {
  if (room.status === 'playing') return room.in_meeting ? `Meeting, round ${room.round_number || 1}` : `Round ${room.round_number || 1}`;
  if (room.status === 'lobby') return room.has_ended ? 'Results screen' : room.round_number ? 'Lobby, between rounds' : 'Lobby';
  if (room.has_ended) return 'Idle on results';
  return room.running ? 'Idle mid-round' : 'Idle';
}

function LiveTable({ rooms }) {
  return (
    <div className="adm-scroll">
      <table className="adm-table">
        <thead>
          <tr><th>Room</th><th>Status</th><th className="adm-num">Phones online</th><th>Big screen</th><th>Last activity</th><th>Opened</th></tr>
        </thead>
        <tbody>
          {rooms.map(room => (
            <tr key={room.room_code}>
              <td className="adm-code">{room.room_code}{room.test_mode ? <span className="adm-muted"> test</span> : null}</td>
              <td><span className={`adm-dot adm-dot--${room.status}`} aria-hidden="true" />{statusLabel(room)}</td>
              <td className="adm-num">{room.connected_players} of {room.player_count}</td>
              <td>{room.has_reactor ? 'Yes' : 'No'}</td>
              <td>{relativeTime(room.last_activity)}</td>
              <td>{relativeTime(room.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LiveNow({ live }) {
  const games = live.games || [];
  const inUse = games.filter(g => g.status !== 'idle');
  const idle = games.filter(g => g.status === 'idle');
  const minutes = Math.round((live.activity_window_seconds || 900) / 60);
  return (
    <section className="adm-card adm-live" aria-labelledby="adm-live-title">
      <h2 className="adm-h2" id="adm-live-title">Right now</h2>
      <div className="adm-live__figures">
        <div><p className="adm-hero">{live.playing ?? 0}</p><p className="adm-live__label">{live.playing === 1 ? 'room playing a round' : 'rooms playing a round'}</p></div>
        <div><p className="adm-hero">{live.lobby ?? 0}</p><p className="adm-live__label">in a lobby or on results</p></div>
        <div><p className="adm-hero">{live.players_in_games ?? 0}</p><p className="adm-live__label">phones online in those rooms</p></div>
      </div>
      <p className="adm-muted">
        {idle.length} more {idle.length === 1 ? 'room is' : 'rooms are'} idle: still open, but nobody has done anything for {minutes} minutes.
        Rooms close 3 hours after their last activity.
      </p>
      {inUse.length > 0 && <LiveTable rooms={inUse} />}
      {idle.length > 0 && (
        <details className="adm-details">
          <summary>Idle rooms ({idle.length})</summary>
          <LiveTable rooms={idle} />
        </details>
      )}
    </section>
  );
}

// ---------- History ----------

function hourLabel(hour) {
  return `${String(hour).padStart(2, '0')}:00`;
}

function peakHour(hours) {
  const total = hours.reduce((a, b) => a + b, 0);
  if (!total) return null;
  // The busiest three-hour stretch, wrapping past midnight.
  let best = 0;
  let bestSum = -1;
  for (let h = 0; h < 24; h += 1) {
    const sum = hours[h] + hours[(h + 1) % 24] + hours[(h + 2) % 24];
    if (sum > bestSum) { best = h; bestSum = sum; }
  }
  return `${percent(bestSum, total)} start between ${hourLabel(best)} and ${hourLabel((best + 3) % 24)} local time.`;
}

const TREND_METRICS = [
  { key: 'rounds', label: 'Rounds' },
  { key: 'rooms_played', label: 'Rooms that played' },
  { key: 'rooms_created', label: 'Rooms created' },
  { key: 'players', label: 'Players' },
];

function Segmented({ options, value, onChange, label }) {
  return (
    <div className="adm-seg" role="radiogroup" aria-label={label}>
      {options.map(option => (
        <button
          type="button"
          key={option.key}
          role="radio"
          aria-checked={value === option.key}
          className={`adm-seg__btn${value === option.key ? ' is-on' : ''}`}
          onClick={() => onChange(option.key)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Trend({ report }) {
  const [metric, setMetric] = useState('rounds');
  const [grain, setGrain] = useState('daily');
  const rows = (report[grain] || []).filter(row => !row.no_data);
  const metricLabel = TREND_METRICS.find(m => m.key === metric).label;
  const columns = rows.map(row => ({
    key: row.label,
    label: grain === 'daily' ? `${weekdayLabel(row.start)} ${dayLabel(row.start)}${row.partial ? ' (so far)' : ''}`
      : `Week of ${dayLabel(row.start)}${row.partial ? ' (so far)' : row.partial_start ? ' (log starts mid-week)' : ''}`,
    tick: dayLabel(row.start),
    partial: row.partial || row.partial_start,
    segments: [{ series: 'main', value: row[metric] }],
    tooltip: [
      [metricLabel.toLowerCase(), formatNumber(row[metric])],
      ...TREND_METRICS.filter(m => m.key !== metric).map(m => [m.label.toLowerCase(), formatNumber(row[m.key])]),
      ['rounds with 7+ players', formatNumber(row.big_rounds)],
      ['player seats', formatNumber(row.seats)],
    ],
  }));
  return (
    <section className="adm-card adm-span-2" aria-labelledby="adm-trend-title">
      <div className="adm-card__head">
        <h2 className="adm-h2" id="adm-trend-title">{metricLabel} per {grain === 'daily' ? 'day' : 'week'}</h2>
        <div className="adm-card__controls">
          <Segmented label="Measure" options={TREND_METRICS} value={metric} onChange={setMetric} />
          <Segmented label="Group by" options={[{ key: 'daily', label: 'Days' }, { key: 'weekly', label: 'Weeks' }]} value={grain} onChange={setGrain} />
        </div>
      </div>
      <ColumnChart
        columns={columns}
        series={[{ key: 'main', label: metricLabel }]}
        height={200}
        tickEvery={grain === 'daily' ? 7 : 1}
        ariaLabel={`${metricLabel} per ${grain === 'daily' ? 'day' : 'week'}`}
      />
      <p className="adm-note">Paler columns are incomplete. Players adds up each room's biggest round, so a group that makes three rooms counts three times. Player seats (in the table) counts every phone that joined a room, including rejoins.</p>
      <details className="adm-details">
        <summary>Show as a table</summary>
        <div className="adm-scroll">
          <table className="adm-table">
            <thead><tr><th>{grain === 'daily' ? 'Day' : 'Week of'}</th>{TREND_METRICS.map(m => <th key={m.key} className="adm-num">{m.label}</th>)}<th className="adm-num">7+ player rounds</th><th className="adm-num">Player seats</th></tr></thead>
            <tbody>
              {[...rows].reverse().map(row => (
                <tr key={row.label}>
                  <td>{grain === 'daily' ? `${weekdayLabel(row.start)} ${dayLabel(row.start)}` : dayLabel(row.start)}</td>
                  {TREND_METRICS.map(m => <td key={m.key} className="adm-num">{formatNumber(row[m.key])}</td>)}
                  <td className="adm-num">{formatNumber(row.big_rounds)}</td>
                  <td className="adm-num">{formatNumber(row.seats)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

function Card({ title, children, lead, span }) {
  const id = `adm-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <section className={`adm-card${span ? ' adm-span-2' : ''}`} aria-labelledby={id}>
      <h2 className="adm-h2" id={id}>{title}</h2>
      {lead && <p className="adm-lead">{lead}</p>}
      {children}
    </section>
  );
}

function Devices({ report, w }) {
  if (!report.devices_since) {
    return (
      <Card title="New and returning players">
        <p className="adm-muted">This needs the anonymous device ID, which isn't logged yet. Once it ships, this shows how many phones are new each week and how many came back.</p>
      </Card>
    );
  }
  const weeks = (report.weekly || []).filter(row => !row.no_data && row.start + 7 * 86400 > report.devices_since);
  const columns = weeks.map(row => ({
    key: row.label,
    label: `Week of ${dayLabel(row.start)}${row.partial ? ' (so far)' : ''}`,
    tick: dayLabel(row.start),
    partial: row.partial,
    segments: [{ series: 'main', value: row.new_devices }, { series: 'second', value: row.returning_devices }],
    tooltip: [['new', formatNumber(row.new_devices), 'main'], ['returning', formatNumber(row.returning_devices), 'second']],
  }));
  return (
    <Card
      title="New and returning players"
      lead={`${formatNumber(w.totals.devices)} phones played. ${formatNumber(w.totals.returning_devices)} of them (${percent(w.totals.returning_devices, w.totals.devices)}) had played before this period.`}
    >
      <ColumnChart columns={columns} series={[{ key: 'main', label: 'New' }, { key: 'second', label: 'Returning' }]} ariaLabel="New and returning phones per week" />
      <p className="adm-note">Counted by anonymous device ID since {dayLabel(report.devices_since)}. Clearing the browser or switching from an app's browser to Safari makes a phone look new.</p>
    </Card>
  );
}

function Report({ report, feedback }) {
  const [range, setRange] = useState(() => readStored(localStorage, RANGE_KEY, '7'));
  const w = report.windows[range] || report.windows['7'];
  const prev = w.previous || {};
  const period = range === '7' ? 'previous 7 days' : 'previous 28 days';
  const t = w.totals;

  const changeRange = (value) => {
    setRange(value);
    writeStored(localStorage, RANGE_KEY, value);
  };

  const endings = w.endings.filter(e => e.count > 0 || ['crew_vote', 'crew_tasks', 'intruders', 'abandoned'].includes(e.key));
  const finished = w.endings.filter(e => !['abandoned', 'interrupted'].includes(e.key)).reduce((s, e) => s + e.count, 0);
  const crewWins = w.endings.filter(e => e.key.startsWith('crew')).reduce((s, e) => s + e.count, 0);
  const created = w.funnel[0]?.count || 0;

  const comments = useMemo(() => feedback.filter(f => f.comment && !f.analytics_excluded).slice(0, 8), [feedback]);
  const feedbackTotal = w.feedback.reduce((s, f) => s + f.count, 0);

  return (
    <>
      <div className="adm-filters">
        <Segmented label="Period" options={[{ key: '7', label: 'Last 7 days' }, { key: '28', label: 'Last 28 days' }]} value={range} onChange={changeRange} />
        <p className="adm-muted">Rounds with 3+ players. Solo test games and automated test runs are left out.</p>
      </div>

      <section className="adm-kpis" aria-label="Totals for the period">
        <Stat label="Rounds played" value={t.rounds} previous={prev.rounds} period={period} />
        <Stat label="Rooms that played" value={t.rooms_played} previous={prev.rooms_played} period={period} note={`of ${formatNumber(t.rooms_created)} rooms created`} />
        <Stat label="Players" value={t.players} previous={prev.players} period={period} note="Each room's biggest round, added up" />
        {report.devices_since
          ? <Stat label="Phones" value={t.devices} previous={prev.devices || undefined} period={period} note={`${formatNumber(t.returning_devices)} returning · since ${dayLabel(report.devices_since)}`} />
          : <Stat label="Biggest round" value={t.biggest_round} note="players at the start" />}
        <Stat label="Median round" value={formatDuration(t.median_round_seconds)} note="finished rounds" />
      </section>

      <div className="adm-grid">
        <Trend report={report} />

        <Card title="Players per round" lead={`Biggest round: ${t.biggest_round} players.`}>
          <ColumnChart
            columns={w.group_sizes.map(b => ({
              key: b.key, label: `${b.key} players`, tick: b.key,
              segments: [{ series: 'main', value: b.count }],
              tooltip: [['rounds', formatNumber(b.count)], ['of all rounds', percent(b.count, t.rounds)]],
            }))}
            series={[{ key: 'main', label: 'Rounds' }]}
            height={160}
            ariaLabel="Rounds by number of players"
          />
        </Card>

        <Card title="When rounds start" lead={peakHour(w.local_hours)}>
          <ColumnChart
            columns={w.local_hours.map((count, hour) => ({
              key: String(hour), label: `${hourLabel(hour)} to ${hourLabel((hour + 1) % 24)}`, tick: hourLabel(hour),
              segments: [{ series: 'main', value: count }],
              tooltip: [['rounds', formatNumber(count)]],
            }))}
            series={[{ key: 'main', label: 'Rounds' }]}
            height={160}
            tickEvery={6}
            lastTick={false}
            ariaLabel="Rounds by local hour of the day"
          />
          <p className="adm-note">On the host's own clock, so a party at 8 pm counts at 8 pm wherever it is.</p>
        </Card>

        <Card
          title="Back-to-back rounds"
          lead={w.session_stats.median_rounds === null ? null
            : `${percent(Math.round(w.session_stats.multi_round_share * t.sessions), t.sessions)} of play sessions went on to a second round. Median ${w.session_stats.median_rounds} rounds per session.`}
        >
          <ColumnChart
            columns={w.session_lengths.map(b => ({
              key: b.key, label: `${b.key} ${b.key === '1' ? 'round' : 'rounds'}`, tick: b.key,
              segments: [{ series: 'main', value: b.count }],
              tooltip: [['sessions', formatNumber(b.count)], ['of all sessions', percent(b.count, t.sessions)]],
            }))}
            series={[{ key: 'main', label: 'Sessions' }]}
            height={160}
            ariaLabel="Play sessions by number of rounds"
          />
          <p className="adm-note">
            A session is one group's rounds with no gap over 2 hours.
            {report.devices_since ? ' Rooms that share 2+ phones count as one session, since groups often make a new room instead of replaying.' : ' Until device IDs are logged, a room started within 30 minutes of another room\'s last round, by a host on the same clock with the same main language, counts as the same session. That is an estimate.'}
          </p>
        </Card>

        <Card title="How rounds end" lead={finished ? `Crew won ${percent(crewWins, finished)} of finished rounds.` : null}>
          <BarList rows={endings.map(e => ({ key: e.key, label: e.label, value: e.count }))} empty="No rounds in this period." />
          {t.in_progress > 0 && <p className="adm-note">{t.in_progress} still going.</p>}
        </Card>

        <Card title="From room to round" lead={created ? `${percent(w.funnel[3].count, created)} of new rooms played a round.` : null}>
          <BarList rows={w.funnel.map(f => ({ key: f.key, label: f.label, value: f.count }))} total={created} empty="No rooms in this period." />
          <p className="adm-note">Rooms created in this period, and how far each got.</p>
        </Card>

        <Card title="Who hosts">
          <RateList
            rows={w.hosts.map(h => ({ key: h.key, label: nameOf('host', h.key), count: h.played, of: h.created }))}
            countLabel="played a round" ofLabel="rooms played"
            empty="No rooms in this period."
          />
          <p className="adm-note">The device that created the room. A laptop or desktop host is usually the big screen.</p>
        </Card>

        <Card title="Where hosts came from">
          <RateList
            rows={w.sources.slice(0, 8).map(s => ({ key: s.key, label: nameOf('source', s.key), count: s.played, of: s.created }))}
            countLabel="played a round" ofLabel="rooms played"
            empty="No rooms in this period."
          />
          <p className="adm-note">The host's first page this visit. "No referrer" is mostly links opened from chat apps, or a typed address. "Not recorded" means the page never saved where it started.</p>
        </Card>

        <Devices report={report} w={w} />

        <Card title="Phone browsers" lead={w.in_app.of ? `${percent(w.in_app.phones, w.in_app.of)} of phones played inside an app's browser.` : null}>
          <BarList
            rows={w.browsers.slice(0, 9).map(b => ({ key: b.key, label: nameOf('browser', b.key), value: b.count, emphasis: IN_APP.has(b.key) }))}
            total={w.in_app.of}
            emphasize
            empty="No phones in this period."
          />
          <p className="adm-note">Blue bars are in-app browsers (Facebook, Instagram, Snapchat and others). Phones in rooms that played.</p>
        </Card>

        <Card title="Languages">
          <BarList rows={w.languages.map(l => ({ key: l.key, label: languageName(l.key), value: l.count }))} empty="No phones in this period." />
          {w.translated.length > 0 && (
            <p className="adm-note">
              Browser translation on: {w.translated.map(l => `${languageName(l.key)} ${l.count}`).join(', ')}. Only Chrome reports it.
            </p>
          )}
          <p className="adm-note">The phone's own language setting, for phones in rooms that played.</p>
        </Card>

        <Card title="Task lists">
          <BarList rows={w.task_sources.map(s => ({ key: s.key, label: nameOf('task_source', s.key), value: s.count }))} empty="No rounds in this period." />
          <p className="adm-note">Where each played room's first round got its tasks.</p>
        </Card>

        <Card title="How phones joined">
          <BarList rows={w.entry_methods.map(e => ({ key: e.key, label: nameOf('entry', e.key), value: e.count }))} empty="No joins in this period." />
          {w.join_rejections.length > 0 && (
            <>
              <h3 className="adm-h3">Failed tries</h3>
              <BarList rows={w.join_rejections.map(r => ({ key: r.key, label: nameOf('rejection', r.key), value: r.count }))} showShare={false} />
            </>
          )}
        </Card>

        <Card title="Feedback" lead={feedbackTotal ? `${feedbackTotal} ${feedbackTotal === 1 ? 'answer' : 'answers'} in this period.` : 'No answers in this period.'}>
          {feedbackTotal > 0 && <BarList rows={w.feedback.filter(f => f.count).map(f => ({ key: f.key, label: nameOf('feedback', f.key), value: f.count }))} />}
          {comments.length > 0 && (
            <>
              <h3 className="adm-h3">Latest comments</h3>
              <ul className="adm-comments">
                {comments.map(f => (
                  <li key={f.id}>
                    <p className="adm-comment__text">{f.comment}</p>
                    <p className="adm-note">{nameOf('feedback', f.rating || 'comment_only')} · {dateTimeLabel(f.submitted_at)}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        <Card title="Errors" lead={`${formatNumber(w.error_totals.client)} on phones and screens, ${formatNumber(w.error_totals.socket)} on the server.`}>
          {w.client_errors.length > 0 && (
            <>
              <h3 className="adm-h3">In the browser</h3>
              <BarList rows={w.client_errors.map(e => ({ key: e.key, label: e.key, value: e.count }))} showShare={false} />
            </>
          )}
          {w.socket_errors.length > 0 && (
            <>
              <h3 className="adm-h3">On the server</h3>
              <BarList rows={w.socket_errors.map(e => ({ key: e.key, label: e.key, value: e.count }))} showShare={false} />
            </>
          )}
          <p className="adm-note">Uncaught errors only. Details are in app.log.</p>
        </Card>

        <RoomsTable rooms={w.recent_rooms} devices={!!report.devices_since} />
      </div>
    </>
  );
}

function shortDateTime(epochSeconds) {
  const d = new Date(epochSeconds * 1000);
  return `${dayLabel(epochSeconds)}, ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

function shortSource(key) {
  return key === 'direct' ? 'No referrer' : nameOf('source', key);
}

function RoomsTable({ rooms, devices }) {
  return (
    <section className="adm-card adm-span-2" aria-labelledby="adm-rooms-title">
      <h2 className="adm-h2" id="adm-rooms-title">Rooms that played</h2>
      {rooms.length === 0 ? <p className="adm-muted">No rounds in this period.</p> : (
        <div className="adm-scroll">
          <table className="adm-table">
            <thead>
              <tr>
                <th>First round (UTC)</th><th>Room</th><th className="adm-num">Rounds</th><th className="adm-num">Most players</th>
                <th>Wins</th><th>Host on</th><th>Came from</th><th>Language</th><th>Time zone</th>
                <th className="adm-num">In-app browser</th>{devices && <th className="adm-num">Returning phones</th>}<th>Tasks</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map(room => (
                <tr key={`${room.code}-${room.first_round}`}>
                  <td>{shortDateTime(room.first_round)}</td>
                  <td className="adm-code">{room.code || '–'}</td>
                  <td className="adm-num">{room.rounds}</td>
                  <td className="adm-num">{room.max_players}</td>
                  <td>{[
                    room.crew_wins ? `${room.crew_wins} crew` : null,
                    room.intruder_wins ? `${room.intruder_wins} ${room.intruder_wins === 1 ? 'intruder' : 'intruders'}` : null,
                    room.unfinished ? `${room.unfinished} unfinished` : null,
                  ].filter(Boolean).join(', ') || '–'}</td>
                  <td>{nameOf('host', room.host_device)}</td>
                  <td>{shortSource(room.source)}</td>
                  <td>{languageName(room.language)}</td>
                  <td>{utcOffsetLabel(room.utc_offset_minutes)}</td>
                  <td className="adm-num">{room.in_app_share === null ? '–' : `${Math.round(room.in_app_share * 100)}%`}</td>
                  {devices && <td className="adm-num">{room.devices ? `${room.returning_devices} of ${room.devices}` : '–'}</td>}
                  <td>{nameOf('task_source', room.task_source)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default AdminDashboard;

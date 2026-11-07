// Plain-English names for the keys the dashboard report sends.

const NAMES = {
  source: {
    direct: 'No referrer',
    unknown: 'Not recorded',
    google: 'Google', bing: 'Bing', chatgpt: 'ChatGPT', facebook: 'Facebook', instagram: 'Instagram',
    snapchat: 'Snapchat', reddit: 'Reddit', youtube: 'YouTube', 'shared-link': 'Shared link', other: 'Other site',
  },
  browser: {
    safari: 'Safari', chrome: 'Chrome', firefox: 'Firefox', edge: 'Edge', opera: 'Opera',
    samsung: 'Samsung Internet', facebook_app: 'Facebook app', instagram: 'Instagram app',
    snapchat_app: 'Snapchat app', tiktok_app: 'TikTok app', google_app: 'Google app', line_app: 'LINE app',
    other: 'Other', unknown: 'Not recorded (older version)',
  },
  task_source: {
    generator: 'Task generator pack', saved_list: 'Saved or loaded list', group: 'Written together in the lobby',
    typed: 'Typed by the host', builtin: 'Built-in tasks', unknown: 'Not recorded (older version)',
  },
  entry: {
    typed: 'Typed the code', qr: 'Scanned the QR code', share_link: 'Share link', invite_link: 'Room link',
    host_return: 'Host coming back', unknown: 'Not recorded (older version)',
  },
  rejection: {
    room_not_found: 'Code matched no room', room_not_open: 'Room not open yet',
    username_required: 'No name entered', round_running: 'Round already running',
    round_in_progress: 'Round already running',
  },
  host: { phone: 'Phone', desktop: 'Laptop or desktop', tablet: 'Tablet', unknown: 'Not recorded' },
  feedback: { fun: 'Fun', okay: 'Okay', needs_work: 'Needs work', comment_only: 'Comment only' },
};

export const IN_APP = new Set(['facebook_app', 'instagram', 'snapchat_app', 'tiktok_app', 'google_app', 'line_app']);

function humanize(key) {
  const text = String(key || 'unknown').replace(/[_-]+/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function nameOf(kind, key) {
  return (NAMES[kind] && NAMES[kind][key]) || humanize(key);
}

let languageNames = null;
export function languageName(code) {
  if (!code) return 'Not recorded';
  try {
    languageNames = languageNames || new Intl.DisplayNames(['en'], { type: 'language' });
    return languageNames.of(code) || code;
  } catch (err) {
    return code;
  }
}

export function formatNumber(n) {
  if (n === null || n === undefined) return '–';
  if (Math.abs(n) >= 10000) return `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}K`;
  return n.toLocaleString('en-US');
}

export function percent(part, whole) {
  if (!whole) return '–';
  const value = (part / whole) * 100;
  return `${value > 0 && value < 1 ? '<1' : Math.round(value)}%`;
}

export function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return '–';
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

export function relativeTime(epochSeconds, now = Date.now() / 1000) {
  if (!epochSeconds) return '–';
  const diff = Math.max(0, now - epochSeconds);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  return `${Math.floor(diff / 86400)} d ago`;
}

const DAY_FORMAT = { month: 'short', day: 'numeric', timeZone: 'UTC' };
export function dayLabel(epochSeconds) {
  return new Date(epochSeconds * 1000).toLocaleDateString('en-US', DAY_FORMAT);
}

export function weekdayLabel(epochSeconds) {
  return new Date(epochSeconds * 1000).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
}

export function dateTimeLabel(epochSeconds) {
  return new Date(epochSeconds * 1000).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC',
  }) + ' UTC';
}

export function utcOffsetLabel(minutes) {
  if (minutes === null || minutes === undefined) return '–';
  const sign = minutes >= 0 ? '+' : '−';
  const abs = Math.abs(minutes);
  return `UTC${sign}${Math.floor(abs / 60)}${abs % 60 ? `:${String(abs % 60).padStart(2, '0')}` : ''}`;
}

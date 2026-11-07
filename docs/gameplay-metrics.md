# Gameplay metrics

## Storage

The server stores counters and the latest 1,000 round summaries in `server/stats.json`.
The server appends structured events to `server/logs/gameplay-events.jsonl`.
The log rotates at 10 MiB and retains nine backups.
The deployment workflow excludes both paths.

Each event has schema version 2, a UTC Unix timestamp, and a unique event ID.
The room session ID distinguishes rooms that reuse the same four-letter code.
The round ID distinguishes replays in one room.
The server run ID distinguishes server restarts.
The environment field distinguishes local development from production.

The event log flushes each write.
Event counters save on major lifecycle events or after ten seconds at the next event.
A crash can lose the latest counter changes even when the event log contains those events.

## Round measurements

| Field | Meaning |
| --- | --- |
| `started_at` | Time when the server accepts the round start |
| `ended_at` | Time when the game reaches a result or the server closes an unfinished round |
| `duration_seconds` | Elapsed time from the actual round start |
| `duration_basis` | `round_start` for a result, `round_start_to_close` for an unfinished round, or `unknown` |
| `setup_seconds` | Time from room creation or the latest reset to the next round start |
| `first_task_seconds` | Time from the round start to the first accepted real task completion |
| `last_gameplay_at` | Time of the latest accepted task, meeting, card, or meltdown event |
| `round_number` | Accepted round count within the room |
| `player_count_at_start` | Roster size at the start, before departures |
| `active_player_count_at_start` | Connected roster size at the start |
| `task_count_at_start` | Size of the task pool at the start |
| `used_location_count` | Distinct areas in the task pool, except generic areas such as Other |
| `configured_location_count` | Distinct configured areas, except Other |
| `task_list_code` | Saved list code, if present |
| `task_fingerprint` | SHA-256 digest of sorted task text and locations |

Round summaries also contain task goals, game settings, acquisition data, result counters, and the final roster size.
Elapsed durations use the monotonic clock. UTC timestamps use the server clock.
The dashboard average uses completed rounds with `duration_basis: round_start`.
Old duration values include setup time. The dashboard marks these values as legacy or unknown and excludes them from the average.

An unfinished round has outcome `abandoned` after a reset, room close, or inactivity timeout.
Its duration includes time until the close, which can include idle time.
A round without a result at server restart has outcome `interrupted` and no duration or end timestamp.
The restart timestamp does not prove when play stopped.

## Events

| Event | Purpose |
| --- | --- |
| `room_created`, `host_entered`, `room_opened` | Setup funnel and host context |
| `room_entered`, `player_joined` | Separate room entry from player registration |
| `join_rejected` | Closed room, missing room, active round, or missing username |
| `start_rejected` | Stable reason code and task or player counts at the failed start |
| `round_started`, `round_host_started`, `round_ended` | Round lifecycle, settings, and outcomes |
| `task_completed` | Accepted task completion, with real or fake status and score |
| `meeting_started`, `card_played`, `meltdown_started` | Accepted gameplay actions |
| `card_rejected`, `command_rejected` | Failed actions, stale commands, or unavailable effects |
| `connection_opened`, `connection_closed` | Connection lifecycle and disconnect reason |
| `player_reconnected` | Recovery after a recorded player disconnect |
| `session_resumed` | State refresh while the player still appears connected |
| `reconnect_failed` | Previous player session does not exist |
| `player_left`, `room_exited` | Explicit departures, separate from connection loss |
| `round_reset`, `room_closed` | Host reset, unanimous reset, host close, empty room, or inactivity |
| `server_started`, `round_interrupted` | Restart history |
| `socket_error` | Socket command name and exception type |
| `meeting_ended` | One per meeting: trigger (button or card), end reason (votes, veto, last stand, round ended, host reset, room closed), outcome (voted out, tie, below threshold, no votes), voted-out role, seconds in the ready stage and in voting, how voting opened (all ready, quorum, host), ready counts at vote open or at the end, ballots and vetoes |
| `meeting_stalled` | A ready stage still open at 90 s and again at 300 s: living, present, ready and needed counts, not-ready phones split into connected and offline, whether the host is connected |
| `meltdown_ended` | Codes needed, entered and handed out, wrong PIN tries, seconds used of the duration, trigger (card, reactor, phone), living crew and intruders |
| `player_died` | Cause, role, whether it happened in a meeting, a meltdown or the round, seconds into the round, living crew and intruders after |
| `settings_changed` | Host settings that moved, with their new values; locations only as a count |
| `setup_step` | Host setup screen reached (`tasklist`, `settings`), sent by the browser |
| `join_abandoned` | A socket that only got room-entry errors and disconnected: tries, error count, reasons |
| `client_error` | Uncaught browser error: error class, page path, minified bundle position, app version |
| `end_screen_action` | Allowlisted end-screen taps, for buttons that report them |

### Fields added on 2026-10-31

- Every connection event carries `os_family` and `browser_family` next to `device_class`. In-app browsers (Instagram, Facebook, Snapchat, TikTok, Google app) have their own family.
- `connection_opened`, `player_reconnected` and `session_resumed` carry `last_drop` after a dropped socket: whether the page was hidden (phone locked or app switched) when it dropped, for how long, whether the browser reported offline, and seconds since the drop.
- `join_rejected` and `room_entered` carry `entry_method`, `attempt` and `code_corrected`. `room_entered` also carries the errors that socket hit before it got in. Entry methods: `qr` (`/play?room=CODE&via=qr`, the reactor QR code), `share_link` (`&via=share`, the lobby Share button), `typed` (the join box, or the home page box, which adds `&via=home`), `invite_link` (a `?room=` link with no tag, such as an address bar copy), `host_return`, `unknown`.
- `host_entered` carries `setup_origin` (`generator` when "Use this pack" created the room) and the visit: `seconds_since_landing`, `pages_viewed` and `tools_used` (task generator, role generator, task ideas, how to play) in that browser session.
- `task_completed` carries `task_seconds` (assigned to done) and `task_key`: the first 16 hex digits of SHA-256 over `lowercased task words|lowercased location`, with runs of spaces collapsed. It is unsalted so the same task matches across rooms; hash a site-written task the same way to name it.
- Round summaries carry `meeting_quorum`, `auto_intruders`, `task_source` (`generator`, `saved_list`, `group`, `typed`, `builtin`) and `setup_origin`; the round end adds `median_task_seconds`, `slowest_task_seconds` and `tasks_held_over_5_min_at_end` (there is no skip button, so a task held that long is the abandoned-task signal).
- `room_closed` carries `was_opened`, `last_setup_step`, `setup_origin`, `task_source` and `has_reactor`, so rooms that never started show how far the host got.
- Source tracking now reads `utm_source=chatgpt.com` (and similar domain-style tags) as its channel. Before this, those rooms were filed as `direct`.

Repeated task commands return the cached result and do not add another completion event.
The card count includes accepted actions. Earlier card counts also included rejected attempts.
The app log records socket exception tracebacks without the request payload.

## Anonymous device ID (added 2026-11-07)

Room-scoped `participant_id` cannot follow a phone from one room to the next. To count new and returning players, and players who later host, each browser keeps a random UUID v4 in local storage under `sp_anon_device_id` (`client/src/utils/anonDeviceId.js`). It holds no name, account, or fingerprint. Clearing site data, a private tab, or another browser on the same phone gives a new ID, so counts are devices (browsers), not people.

The phone sends the ID in the socket handshake. The server keeps it only if it is a well-formed v4 UUID.

| Field | Where | Meaning |
| --- | --- | --- |
| `anon_device_id` | Every event sent from a socket | The device of the connection that sent the event (`connection_id`), like `os_family`. Read it from `host_entered` (the host's device) and `player_joined`, `player_reconnected`, `session_resumed` (the player's own device). In `player_died` or other events about someone else, it is the sender's device, not the subject's. |
| `anon_device_status` | Every event sent from a socket | `created`: no ID was stored, so this page load made one (a new browser, or one whose storage was wiped). `stored`: read back from storage, a returning browser. `unsaved`: storage is blocked, so the ID lasts only for this page load. Compare `created` rates by `browser_family` to see in-app browsers losing storage. |
| `anon_device_ids` | `round_started`, `round_ended`, `round_history` in `stats.json` | Sorted unique device IDs of the round's players: the start roster, plus late joiners at the end |
| `host_anon_device_id` | Same | The host player's device |
| `players_without_anon_device_id` | Same | Players on pages loaded before this change |

Events before 2026-11 have no device fields. Treat those rooms as unknown, not as new devices.
This is not the `device_id` in local storage that owns saved task lists: that one acts as a key and stays out of the logs.
The device ID is used only to count usage. It is not used for ads, shared, or joined to names.

## Identity and limits

New structured events and round history exclude names, photos, messages, raw task text, and IP addresses.
The existing completed-game record retains its legacy fields for compatibility.
Participant IDs use a hash with a room-specific salt. Connection IDs use a hash with a server-run salt.
These IDs support analysis within a room. Use `anon_device_id` to count devices across rooms.
The existing lifetime player-ID count also does not count distinct people.

Connection metadata contains a coarse device class, OS family, browser family and the browser UTC offset, if available. Raw user agents are not stored.
The UTC offset supports local-hour analysis. It does not establish a country or a location.
No event identifies a household, a school, or a test run.
List content and a separate audit remain necessary for those classifications.

## Optional game feedback

Three seconds after the result screen appears, each phone (never the big screen) asks "How was this game?"
with **Give feedback**, **Maybe later** and **Don't ask again**. The X button and Escape work like **Maybe later**.
**Don't ask again** stores a one-week snooze in local storage. Play Again and Leave act immediately and call off the prompt for that round.

Players can send a rating (Fun, Okay, Needs work), a comment of up to 1,000 characters, or both.
The server (`submit_feedback`) accepts one response per player per round, only after that round ends.
Retries and reconnects don't add duplicates, and the phone shows success only after the server saved it.

Feedback rows hold the rating, comment, result, submission time and a test-room flag. They carry no names,
player IDs, room codes or round IDs, and nothing about feedback goes into the gameplay event log except the
`end_screen_action` taps `feedback_open` and `feedback_sent`. The server keeps the latest 500 rows in `stats.json`;
the private dashboard shows the latest 25.

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

Repeated task commands return the cached result and do not add another completion event.
The card count includes accepted actions. Earlier card counts also included rejected attempts.
The app log records socket exception tracebacks without the request payload.

## Identity and limits

New structured events and round history exclude names, photos, messages, raw task text, and IP addresses.
The existing completed-game record retains its legacy fields for compatibility.
Participant IDs use a hash with a room-specific salt. Connection IDs use a hash with a server-run salt.
These IDs support analysis within a room and do not count distinct people across rooms.
The existing lifetime player-ID count also does not count distinct people.

Connection metadata contains a coarse device class and the browser UTC offset, if available.
The UTC offset supports local-hour analysis. It does not establish a country or a location.
No event identifies a household, a school, or a test run.
List content and a separate audit remain necessary for those classifications.

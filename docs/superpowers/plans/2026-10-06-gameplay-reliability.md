# Gameplay Reliability Implementation Plan

> **For agentic workers:** Use the approved assignments below. The root owns integration and final acceptance.

**Goal:** Correct the gameplay failures from the October 6 audit and retain WebSockets.

**Architecture:** One lock protects each room. Commands identify the round, meeting, and task assignment. Full state snapshots replace stale client state.

**Tech Stack:** Flask-SocketIO, Eventlet, Python, React, Socket.IO.

**Spec:** The user approved all fixes from the October 6 gameplay audit in this chat.

## Global Constraints

- Retain WebSockets.
- Preserve the existing SEO, statistics, and room timeout changes.
- Use isolated test data.
- Do not push or deploy this change without a release request.

## Review Focus

- A duplicate completion scores once and returns the same next task.
- A lost reply permits a retry with the same request ID.
- A disconnected living player blocks the meeting until ready or dead.
- A reconnect restores the current task list and task assignment.
- Both start commands enforce the same rules.

## Task 1: Room State and Timers

Files: `server/assets/game.py`, `meeting.py`, `card.py`, `meltdown.py`, model regression tests.

Interfaces: `Game.state_lock`, `revision`, `round_id`, `command_results`, `begin_round()`, `assign_task(player, task=None)`.

- [x] Add failing tests for strict readiness, room task refill, assignment IDs, and stale timers.
- [x] Run the tests and make sure that they fail for the audited defects.
- [x] Add a room lock, version fields, and phase guards.
- [x] Run the focused model tests.

## Task 2: Server Commands and Snapshots

Files: `server/app.py`, `server/assets/room_protocol.py`, integration regression tests.

Interfaces: `complete_task` returns `{ok, request_id, state}`. `get_room_state` returns `{ok, state}`. Rejoin emits `room_state`.

- [x] Add failing tests for duplicate commands, invalid phases, reconnect snapshots, and both start paths.
- [x] Run the tests and make sure that they fail.
- [x] Serialize each room event and validate the current socket owner.
- [x] Add confirmed completion commands and bounded duplicate results.
- [x] Use one start validator and broadcast complete lobby state after changes.
- [x] Run all backend tests with isolated data.

## Task 3: Client Commands and State

Files: `client/src/GameContext.js`, gameplay pages, `PreGamePage.js`, `swiper.jsx`, client regression tests.

Interfaces: Consume Task 2 snapshots. Send assignment, round, meeting, and request IDs.

- [x] Add failing tests for pending commands, retries, stale state, reconnects, and current task minimums.
- [x] Run the focused tests and make sure that they fail.
- [x] Add bounded retries and show success only after a positive reply.
- [x] Replace stale state from server snapshots.
- [x] Run the client tests and production build.

## Task 4: Integrated Validation

- [x] Run actual WebSocket commands with 13 clients and concurrent duplicate requests.
- [x] Test a representative mobile gameplay flow in a browser.
- [x] Review the final diff and report measured results.

## Results

- Backend tests: 82 passed with isolated data.
- Client tests: 299 passed across 32 suites.
- Thirteen WebSocket clients sent 720 task commands. The server recorded 90 tasks.
- A retry after a lost reply kept the same task request ID and scored once.
- Mobile checks at 390 pixels showed 12 ready players who waited for one offline living player.
- Production build and browser checks passed at 1280 and 390 pixels. Existing lint warnings remain.
- The protocol review found no blocker. Final guards reject delayed cards after death and death reports from an old meeting.
- The root preserved prior dirty source files and restored the original tracked build files.
- Deployment remains pending.

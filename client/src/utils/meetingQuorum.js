// How many present players must slide ready before voting opens. Mirrors Game.ready_needed on
// the server, which sends the quorum with the meeting: big rooms open at 80%, small ones wait
// for everyone, and the host can turn the quorum off in Advanced Settings.
export function readyNeeded(meetingState, present) {
  const quorum = meetingState?.ready_quorum;
  const minPlayers = meetingState?.ready_quorum_min_players;
  if (quorum && minPlayers && present >= minPlayers) return Math.ceil(present * quorum);
  return present;
}

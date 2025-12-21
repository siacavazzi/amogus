import React, { useState, useEffect, useContext } from "react";
import PlayerCard from "../components/PlayerCard";
import { DataContext } from "../GameContext";
import LeaveGameButton from "../components/LeaveGameButton";
import { CheckCircle, XCircle } from "lucide-react";

export default function VotingPage() {
  const { players, socket, setMessage, meetingState, vetoVotes, votes, playerState } = useContext(DataContext);

  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [timeLeft, setTimeLeft] = useState(meetingState.time_left);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedFor, setVotedFor] = useState(null); // null = not voted, 'veto' = vetoed, or player object

  useEffect(() => {
    for (const player of players) {
      player.ready = false;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVote = () => {
    if (selectedPlayer) {
      socket.emit("vote", { player_id: localStorage.getItem('player_id'), votedFor: selectedPlayer.player_id });
      setMessage({ text: `You voted for ${selectedPlayer.username}`, status: "success" });
      setHasVoted(true);
      setVotedFor(selectedPlayer);
    } else {
      setMessage({ text: "Please select a player to vote for.", status: "warning" });
    }
  };

  const handleVeto = () => {
    socket.emit("veto", { player_id: localStorage.getItem('player_id') });
    setMessage({ text: "You voted to veto.", status: "info" });
    setSelectedPlayer(null);
    setHasVoted(true);
    setVotedFor('veto');
  };

  const totalTime = meetingState.time_left;
  const progressPercentage = (timeLeft / totalTime) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-tr from-gray-900 via-gray-800 to-black p-4 pb-48 flex flex-col items-center text-white">
      {/* Leave Game Button */}
      <LeaveGameButton className="fixed top-4 right-4 z-50" />

      <div className="max-w-6xl w-full">
        <h1 className="pt-6 text-center text-3xl sm:text-4xl font-bold mb-4 tracking-wider text-indigo-300">Voting Round</h1>

        {/* Countdown Timer and Progress Bar */}
        <div className="text-center mb-4">
          <p className="text-xl font-semibold text-yellow-400 mb-2">
            Time Left: {timeLeft}s
          </p>
          <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden border border-gray-600 mx-auto max-w-md">
            <div
              className="bg-green-500 h-full transition-all duration-300 ease-out"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Vote Status Indicator */}
        {hasVoted && (
          <div className={`mb-4 p-3 rounded-lg border flex items-center justify-center gap-2 ${
            votedFor === 'veto' 
              ? 'bg-red-900 bg-opacity-30 border-red-500 text-red-300'
              : 'bg-green-900 bg-opacity-30 border-green-500 text-green-300'
          }`}>
            <CheckCircle size={20} />
            <span className="font-medium">
              {votedFor === 'veto' 
                ? "You voted to VETO this meeting" 
                : `You voted for ${votedFor?.username}`}
            </span>
          </div>
        )}

        {!hasVoted && (
          <div className="mb-4 p-3 rounded-lg border bg-yellow-900 bg-opacity-30 border-yellow-500 text-yellow-300 flex items-center justify-center gap-2">
            <XCircle size={20} />
            <span className="font-medium">You haven't voted yet - select a player below</span>
          </div>
        )}

        {/* Players Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
          {players.map((player) => {
            const isMe = playerState?.player_id === player.player_id;
            const isDead = !player.alive;

            return (
              <PlayerCard
                key={player.player_id}
                player={player}
                selected={selectedPlayer?.player_id === player.player_id}
                votes={(votes?.[player?.player_id] ?? 0)}
                onClick={
                  isDead || isMe
                    ? null
                    : () => setSelectedPlayer(player)
                }
                isMe={isMe}
                isClickable={!isDead && !isMe}
              />
            );
          })}
        </div>
      </div>

      {/* Fixed Bottom Voting Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900 via-gray-900 to-transparent pt-6 pb-6 px-4">
        <div className="max-w-md mx-auto flex flex-col gap-3">
          <button
            className={`w-full py-4 rounded-xl shadow-lg transition-all font-bold text-lg flex items-center justify-center gap-2 ${
              selectedPlayer
                ? "bg-green-600 hover:bg-green-700 focus:ring-green-500"
                : "bg-gray-600 hover:bg-gray-700 focus:ring-gray-500"
            } text-white focus:outline-none focus:ring-2`}
            onClick={handleVote}
          >
            {selectedPlayer ? `Vote for ${selectedPlayer.username}` : "Select a Player to Vote"}
          </button>

          <button
            className="w-full py-3 bg-red-600 text-white rounded-xl shadow-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 font-medium"
            onClick={handleVeto}
          >
            Veto ({vetoVotes} {vetoVotes === 1 ? "Vote" : "Votes"})
          </button>
        </div>
      </div>
    </div>
  );
}

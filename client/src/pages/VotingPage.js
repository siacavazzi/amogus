import React, { useState, useEffect, useContext } from "react";
import PlayerCard from "../components/PlayerCard";
import { DataContext } from "../GameContext";

export default function VotingPage() {
  const { players, socket, setMessage, meetingState, vetoVotes, votes, playerState } = useContext(DataContext);

  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [timeLeft, setTimeLeft] = useState(meetingState.time_left);

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
    } else {
      setMessage({ text: "Please select a player to vote for.", status: "warning" });
    }
  };

  const handleVeto = () => {
    socket.emit("veto", { player_id: localStorage.getItem('player_id') });
    setMessage({ text: "You voted to veto.", status: "info" });
    setSelectedPlayer(null);
  };

  const totalTime = meetingState.time_left;
  const progressPercentage = (timeLeft / totalTime) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-tr from-gray-900 via-gray-800 to-black p-6 flex flex-col items-center text-white">
      <div className="max-w-6xl w-full">
        <h1 className="text-center text-4xl font-bold mb-4 tracking-wider text-indigo-300">Voting Round</h1>

        {/* Countdown Timer and Progress Bar */}
        <div className="text-center mb-6">
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

        {/* Players Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
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

        {/* Veto and Vote Buttons */}
        <div className="mt-10 flex flex-col items-center space-y-6">
          <button
            className={`${
              selectedPlayer
                ? "bg-green-600 hover:bg-green-700 focus:ring-green-500"
                : "bg-gray-600 hover:bg-gray-700 focus:ring-gray-500"
            } text-white py-3 px-8 rounded-full shadow-lg transition-colors focus:outline-none focus:ring-2`}
            onClick={handleVote}
          >
            {selectedPlayer ? `Vote for ${selectedPlayer.username}` : "Select a Player to Vote"}
          </button>

          <button
            className="relative bg-red-600 text-white py-3 px-8 rounded-full shadow-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
            onClick={handleVeto}
          >
            Veto ({vetoVotes} {vetoVotes === 1 ? "Vote" : "Votes"})
          </button>
        </div>
      </div>
    </div>
  );
}

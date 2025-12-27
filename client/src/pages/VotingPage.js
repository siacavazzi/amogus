import React, { useState, useEffect, useContext } from "react";
import PlayerCard from "../components/PlayerCard";
import { DataContext } from "../GameContext";
import LeaveGameButton from "../components/LeaveGameButton";
import { CheckCircle, XCircle, Vote, Timer, Users, AlertTriangle, Gavel } from "lucide-react";
import { GridOverlay } from "../components/ui";
import { PrimaryButton, SecondaryButton, StatusBadge } from "../components/ui";

export default function VotingPage() {
  const { players, socket, setMessage, meetingState, vetoVotes, votes, playerState } = useContext(DataContext);

  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [timeLeft, setTimeLeft] = useState(meetingState.time_left);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedFor, setVotedFor] = useState(null);

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
  const isLowTime = timeLeft <= 10;
  const alivePlayers = players.filter(p => p.alive);

  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-gray-900 to-gray-900" />
      
      {/* Grid overlay */}
      <GridOverlay color="rgba(139, 92, 246, 0.3)" size={40} />
      
      {/* Leave Game Button */}
      <LeaveGameButton className="fixed top-4 right-4 z-50" />

      {/* Header Section */}
      <div className="relative z-10 pt-4 px-4">
        {/* Title */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <Gavel className="text-purple-400" size={28} />
          <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            Emergency Vote
          </h1>
        </div>
        
        {/* Timer Card */}
        <div className={`max-w-md mx-auto mb-4 p-4 rounded-2xl border backdrop-blur-sm transition-all ${
          isLowTime 
            ? 'bg-red-900/30 border-red-500/50 animate-pulse' 
            : 'bg-gray-800/60 border-purple-500/30'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Timer size={18} className={isLowTime ? 'text-red-400' : 'text-purple-400'} />
              <span className="text-gray-400 text-sm">Time Remaining</span>
            </div>
            <span className={`text-2xl font-mono font-bold ${isLowTime ? 'text-red-400' : 'text-white'}`}>
              {timeLeft}s
            </span>
          </div>
          <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ease-linear rounded-full ${
                isLowTime ? 'bg-gradient-to-r from-red-500 to-orange-500' : 'bg-gradient-to-r from-purple-500 to-pink-500'
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Vote Status Indicator */}
        <div className="max-w-md mx-auto mb-4">
          {hasVoted ? (
            <StatusBadge 
              icon={CheckCircle} 
              variant={votedFor === 'veto' ? 'orange' : 'emerald'}
              className="w-full justify-center py-3"
            >
              {votedFor === 'veto' 
                ? "You voted to VETO" 
                : `Voted for ${votedFor?.username}`}
            </StatusBadge>
          ) : (
            <div className="p-3 rounded-xl border bg-yellow-900/20 border-yellow-500/40 text-yellow-300 flex items-center justify-center gap-2">
              <AlertTriangle size={18} />
              <span className="font-medium text-sm">Select a player to vote</span>
            </div>
          )}
        </div>

        {/* Player count */}
        <div className="flex items-center justify-center gap-2 text-gray-500 text-sm mb-3">
          <Users size={14} />
          <span>{alivePlayers.length} players voting</span>
        </div>
      </div>

      {/* Scrollable Players Grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-44 relative z-10">
        <div className="max-w-2xl mx-auto grid grid-cols-2 sm:grid-cols-3 gap-3">
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
      <div className="fixed bottom-0 left-0 right-0 z-20">
        {/* Gradient fade */}
        <div className="h-8 bg-gradient-to-t from-gray-900 to-transparent" />
        
        <div className="bg-gray-900 border-t border-gray-800 px-4 pb-6 pt-2">
          <div className="max-w-md mx-auto flex flex-col gap-3">
            {/* Main vote button */}
            <PrimaryButton
              onClick={handleVote}
              disabled={!selectedPlayer}
              variant="purple"
            >
              <Vote size={22} />
              {selectedPlayer ? `Vote for ${selectedPlayer.username}` : "Select a Player"}
            </PrimaryButton>

            {/* Veto button */}
            <SecondaryButton onClick={handleVeto} variant="orange">
              <XCircle size={18} />
              <span>Veto Meeting</span>
              <span className="px-2 py-0.5 bg-orange-500/20 rounded-full text-xs">{vetoVotes}</span>
            </SecondaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}

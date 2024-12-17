import React, { useState, useEffect, useContext } from "react";
import PlayerCard from "../components/PlayerCard";
import { DataContext } from "../GameContext";

export default function VotingPage() {
    const { players, socket, setMessage, meetingState, vetoVotes, votes, playerState } = useContext(DataContext);

    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [timeLeft, setTimeLeft] = useState(meetingState.time_left);

    useEffect(() => {
        for (const player of players) {
            player.ready = false
        }
        const timer = setInterval(() => {
            setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(timer);
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
        setSelectedPlayer(null)
    };

    return (
        <div className="min-h-screen bg-gradient-to-tr from-gray-800 to-gray-900 p-6">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-center text-3xl text-white font-bold mb-4">Voting Page</h1>

                {/* Countdown Timer */}
                <div className="text-center text-xl text-yellow-400 font-semibold mb-6">
                    Time Left: {timeLeft}s
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
                                        ? null // Disable clicking if player is dead or 'me'
                                        : () => setSelectedPlayer(player)
                                }
                                isMe={isMe}
                                isClickable={!isDead && !isMe}
                            />
                        );
                    })}
                </div>

                {/* Veto Option */}
                <div className="mt-8 flex flex-col items-center space-y-4">
                    <button
                        className="bg-green-600 text-white py-2 px-6 rounded-full shadow-lg hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-400"
                        onClick={handleVote}
                    >
                        Vote for {selectedPlayer ? selectedPlayer.username : "a Player"}
                    </button>

                    <button
                        className="relative bg-red-600 text-white py-2 px-6 rounded-full shadow-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
                        onClick={handleVeto}
                    >
                        Veto {vetoVotes} {vetoVotes === 1 ? "Vote" : "Votes"}
                    </button>
                </div>

            </div>
        </div>
    );
}

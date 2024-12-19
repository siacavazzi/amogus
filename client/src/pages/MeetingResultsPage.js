import React, { useEffect, useState, useContext } from "react";
import { DataContext } from "../GameContext";

export default function MeetingResultPage() {
  const { meetingState, players, setMeetingState, setVotes, setVetoVotes } = useContext(DataContext);
  const [fadeIn, setFadeIn] = useState(false);
  const [votedOutPlayer, setVotedOutPlayer] = useState(undefined);

  useEffect(() => {
    setVotes(undefined);
    setVetoVotes(0);
    if (!meetingState?.voted_out) return;
    for (const player of players) {
      if (player.player_id === meetingState?.voted_out) {
        setVotedOutPlayer(player);
        return;
      }
    }
  }, [meetingState, players, setVotes, setVetoVotes]);

  // Trigger fade-in effect on mount
  useEffect(() => {
    setTimeout(() => setFadeIn(true), 300);
  }, []);

  const renderContent = () => {
    if (meetingState?.reason === "veto") {
      return (
        <div className="text-3xl text-gray-300 font-semibold mb-4">
          The vote was <span className="text-red-500">vetoed</span>.
        </div>
      );
    }

    if (!meetingState?.voted_out) {
      return (
        <div className="text-3xl text-gray-300 font-semibold mb-4">
          <span className="text-red-500">No one</span> was voted out.
        </div>
      );
    }

    return (
      <>
        <div className="text-4xl text-white font-bold mb-6">
          {votedOutPlayer?.username
            ? `${votedOutPlayer.username} was voted out!`
            : "No one was voted out!"}
        </div>
        {votedOutPlayer?.sus !== undefined && (
          <div
            className={`text-3xl font-semibold ${
              votedOutPlayer.sus ? "text-red-500" : "text-blue-400"
            }`}
          >
            {votedOutPlayer.sus
              ? "They were an Impostor!"
              : "They were not an Impostor."}
          </div>
        )}
      </>
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-800 p-6">
      <div
        className={`transition-opacity duration-1000 transform ${
          fadeIn ? "opacity-100 scale-100" : "opacity-0 scale-95"
        } flex flex-col items-center text-center`}
      >
        {renderContent()}
      </div>
      <button
        className="mt-12 bg-green-600 text-white py-3 px-8 rounded-full shadow-xl hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-400"
        onClick={() => setMeetingState(undefined)}
      >
        Acknowledge
      </button>
    </div>
  );
}

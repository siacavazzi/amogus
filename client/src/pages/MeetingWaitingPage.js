

import React, { useContext, useState, useEffect } from 'react';
import { DataContext } from '../GameContext';
import PlayerCard from '../components/PlayerCard';
import MUECustomSlider from '../components/swiper';

const MeetingWaitingPage = () => {
  const {
    playerState,
    players,
    meetingState,
    socket

  } = useContext(DataContext);

  useEffect(() => {
    let ready = 0
    for (const player of players) {
      if (player.ready) {
        ready = ready + 1
      }
    }
    setReadyPlayers(ready)
  }, [playerState, players])


  const [readyPlayers, setReadyPlayers] = useState(0);


  const handleReadyUp = () => {
    socket.emit("ready", { player_id: localStorage.getItem('player_id') })
  };


  const handleImDead = () => {
    if (socket) {
      socket.emit('player_dead', { player_id: localStorage.getItem('player_id') });
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-900 text-white">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Meeting Called!</h1>
        <p className="text-xl mb-6">
          <span className="font-semibold">Player {meetingState.player_who_started_it}</span> called
          the meeting.
        </p>
        <p className="text-lg mb-4">
          Players yet to ready up:{" "}
          <span className="font-bold">
            {players.filter(player => player.alive).length - readyPlayers}
          </span>
        </p>
      </div>
      <div className="flex flex-col md:flex-row gap-4">
        <button
          onClick={handleImDead}
          className={`px-6 py-3 text-lg font-medium bg-red-600 hover:bg-red-700 rounded`}
        >
          I'm Dead
        </button>
      </div>
      {!playerState.ready && <MUECustomSlider onSuccess={handleReadyUp} />}
    </div>
  );
};

export default MeetingWaitingPage;


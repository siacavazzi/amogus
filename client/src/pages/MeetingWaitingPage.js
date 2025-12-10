import React, { useContext, useState, useEffect } from 'react';
import { DataContext } from '../GameContext';
import MUECustomSlider from '../components/swiper';
import { AlertCircle } from 'lucide-react';

const MeetingWaitingPage = () => {
  const { playerState, players, meetingState, socket } = useContext(DataContext);

  const [readyPlayers, setReadyPlayers] = useState(0);
  const [waitingPlayers, setWaitingPlayers] = useState([]);

  useEffect(() => {
    let ready = 0;
    const waiting = [];
    for (const player of players) {
      if (player.alive) {
        if (player.ready) {
          ready++;
        } else {
          waiting.push(player);
        }
      }
    }
    setReadyPlayers(ready);
    setWaitingPlayers(waiting);
  }, [playerState, players]);

  const totalAlive = players.filter((player) => player.alive).length;
  const playersRemaining = totalAlive - readyPlayers;
  const progressPercentage = (readyPlayers / totalAlive) * 100;

  const handleReadyUp = () => {
    socket.emit('ready', { player_id: localStorage.getItem('player_id') });
  };

  const handleImDead = () => {
    if(!window.confirm('Are you sure?')) {
      return
    }
    if (socket) {
      socket.emit('player_dead', { player_id: localStorage.getItem('player_id') });
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-6">
      <div className="text-center max-w-lg">
        <h1 className="text-4xl font-bold mb-2 text-indigo-300 tracking-wider">
          Meeting Called!
        </h1>
        <p className="text-xl mb-6">
        Player {' '}
          <span className="font-semibold text-indigo-400">
            {meetingState.player_who_started_it}
          </span>{' '}
          initiated the discussion.
        </p>

        <div className="mb-8 space-y-2">
          <p className="text-lg">
            Players yet to ready up:{' '}
            <span className="font-bold text-red-400">{playersRemaining}</span> of{' '}
            {totalAlive}
          </p>
          {/* Progress Bar */}
          <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden border border-gray-600">
            <div
              className="bg-green-500 h-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* List of players who haven't responded */}
        {waitingPlayers.length > 0 && (
          <div className="mb-8 bg-gray-800 bg-opacity-50 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-center gap-2 mb-3">
              <AlertCircle className="text-yellow-400" size={20} />
              <h3 className="text-lg font-semibold text-yellow-400">Waiting for:</h3>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {waitingPlayers.map((player) => (
                <span
                  key={player.id || player.player_id}
                  className="px-3 py-1 bg-red-600 bg-opacity-30 border border-red-500 rounded-full text-red-300 text-sm font-medium"
                >
                  {player.username}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-4 items-center justify-center mb-8">
          <button
            onClick={handleImDead}
            className="px-6 py-3 text-lg font-medium bg-red-600 hover:bg-red-700 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            I'm Dead
          </button>
        </div>

        {/* Slider appears only if player not ready */}
        {!playerState.ready && (
          <div className="w-full max-w-sm mx-auto">
            <MUECustomSlider text="Slide to ready up" onSuccess={handleReadyUp} />
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingWaitingPage;

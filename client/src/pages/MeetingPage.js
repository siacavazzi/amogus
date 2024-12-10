// ./pages/EmergencyMeetingPage.jsx

import React, { useContext } from 'react';
import { DataContext } from '../GameContext';
import PlayerCard from '../components/PlayerCard';
import MUECustomSlider from '../components/swiper';

const EmergencyMeetingPage = () => {
  const { socket, players } = useContext(DataContext);

  const handleEndMeeting = () => {
    // Emit an event to end the meeting
    if (socket) {
      socket.emit('end_meeting');
    }
  };

  const handleImDead = () => {
    if (socket) {
      socket.emit('player_dead', { player_id: localStorage.getItem('player_id') });
    }
  };

  return (
    <div className="flex flex-col items-center p-8 bg-gray-800 text-white min-h-screen relative">
      <h1 className="mb-6 text-4xl font-bold text-red-500">Emergency Meeting</h1>
      
      <div className="w-full max-w-xl p-6 mb-8 text-center bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg">
        <p className="text-lg leading-relaxed">
          An emergency meeting has been called. Discuss and decide on your next steps.
        </p>
        <button
          onClick={handleImDead}
          className="mt-6 mb-4 bg-red-600 text-white py-2 px-6 rounded-full shadow-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
        >
          I'm Dead :(
        </button>
      </div>

      <div className="w-full grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {players.map((player) => (
          <PlayerCard key={player.id} player={player} />
        ))}
      </div>

      <MUECustomSlider sus onSuccess={handleEndMeeting} sliderColor="Tomato" text="Slide to end meeting" />
    </div>
  );
};

export default EmergencyMeetingPage;

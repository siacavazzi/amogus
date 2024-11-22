// ./pages/EmergencyMeetingPage.jsx

import React, { useContext } from 'react';
import { DataContext } from '../GameContext';
import './MeetingPage.css'; // Import CSS for styling
import PlayerCard from '../components/PlayerCard';
import MUECustomSlider from '../components/swiper';

const EmergencyMeetingPage = () => {
  const { 
    socket,
    players,
  } = useContext(DataContext);

  const handleEndMeeting = () => {
    // Emit an event to end the meeting
    if (socket) {
      socket.emit('end_meeting');
    }
  };

  const handleImDead = () => {
    if (socket) {
        socket.emit('player_dead', {player_id: localStorage.getItem('player_id')});
      }
  }

  return (
    <div className="emergency-meeting-page">
      <h1>Emergency Meeting</h1>
      <div className="meeting-message">
        <p>An emergency meeting has been called. Discuss and decide on your next steps.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {players.map((player) => (
                        <PlayerCard key={player.id} player={player} />
                    ))}
                </div>
        <button onClick={handleImDead} className=" mt-6 mb-4 bg-red-600 text-white py-2 px-6 rounded-full shadow-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400">
                    I'm Dead
        </button>

      <MUECustomSlider onSuccess={handleEndMeeting} sliderColor={"Tomato"} text={"Slide to end meeting"}/>
    </div>
  );
};

export default EmergencyMeetingPage;

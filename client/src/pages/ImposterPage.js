// src/pages/ImposterPage.jsx
import React, { useContext, useEffect } from 'react';
import { DataContext } from '../GameContext';
import MUECustomSlider from '../components/swiper';

const ImposterPage = () => {
  const {
    handleCallMeeting,
    setAudio,
    susPoints,
    socket,
  } = useContext(DataContext);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSwipe = () => {
    setAudio('complete_task');
  };

  // Conditions for sabotage buttons
  const canHack = susPoints >= 1;
  const canFake = susPoints >= 2;

  const handleSabotage = (type) => {
    if (type === 'hack' && canHack) {
      socket.emit('hack');
      // Optionally, deduct points if managed here
      // setSusPoints(prev => prev - 1);
    } else if (type === 'fake' && canFake) {
      socket.emit('fake_task');
      // Optionally, deduct points if managed here
      // setSusPoints(prev => prev - 2);
    }
  };

  return (
    <div className="flex flex-col items-center p-8 bg-gray-800 text-white min-h-screen">
      {/* Call Meeting Button */}
      <button
        onClick={handleCallMeeting}
        className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg shadow-lg hover:from-orange-600 hover:to-orange-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-orange-300"
      >
        Call Meeting
      </button>

      {/* Display Points */}
      <div className="mb-4 pt-4 text-2xl text-yellow-500">
        <p>Points: {susPoints}</p>
      </div>

      {/* Sabotage Actions */}
      <div className="w-full max-w-xl bg-gray-700 p-6 rounded-lg shadow-md flex flex-col items-center space-y-4">
        {/* Hack Players Button */}
        <button
          onClick={() => handleSabotage('hack')}
          className={`w-full px-6 py-3 rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-orange-300 ${
            !canHack
              ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
              : 'bg-orange-500 hover:bg-orange-700 text-white'
          }`}
          disabled={!canHack}
          data-tip={!canHack ? 'Not enough points to Hack Players' : 'Hack Players'}
        >
          Hack Players (1 Point)
        </button>

        {/* Send a Fake Task Button */}
        <button
          onClick={() => handleSabotage('fake')}
          className={`w-full px-6 py-3 rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-pink-300 ${
            !canFake
              ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
              : 'bg-pink-500 hover:bg-pink-700 text-white'
          }`}
          disabled={!canFake}
          data-tip={!canFake ? 'Not enough points to Send a Fake Task' : 'Send a Fake Task'}
        >
          Send a Fake Task (2 Points)
        </button>
      </div>

      <MUECustomSlider
      sus
        onSuccess={handleSwipe}
        text="Slide to pretend to do a task"
      />


    </div>
  );
};

export default ImposterPage;

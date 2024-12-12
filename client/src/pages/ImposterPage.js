// src/pages/ImposterPage.jsx
import React, { useContext, useState, useEffect } from 'react';
import { DataContext } from '../GameContext';
import MUECustomSlider from '../components/swiper';
import { FaExclamationTriangle } from 'react-icons/fa';

const ImposterPage = () => {
  const {
    handleCallMeeting,
    setAudio,
    susPoints,
    socket,
    taskLocations,
    deniedLocation
  } = useContext(DataContext);

  useEffect(() => {
    console.log(deniedLocation)
  },[deniedLocation])


  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSwipe = () => {
    setAudio('complete_task');
  };

  // Conditions for sabotage buttons
  const canHack = susPoints >= 1;
  const canDeny = susPoints >= 2;

  const handleSabotage = (type) => {
    if (type === 'hack' && canHack) {
      socket.emit('hack');
    }
    // If you have other sabotage types, handle them here
  };

  const handleDenyLocation = (location) => {
    if (!canDeny || deniedLocation) return;

    socket.emit('deny_location', location);
    // The server should handle point deduction and broadcasting the denial
  };

  return (
    <div className="flex flex-col items-center p-8 bg-gray-800 text-white min-h-screen">
      {/* Call Meeting Button */}
      <button
      onClick={handleCallMeeting}
      className="flex items-center px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg shadow-lg hover:from-orange-600 hover:to-orange-700 transition-colors duration-300"
    >
      <FaExclamationTriangle className="mr-2" />
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
          title={!canHack ? 'Not enough points to Hack Players' : 'Hack Players'}
        >
          Hack Players (1 Point)
        </button>

        {/* Deny a Location Button */}
        {/* Removed the generic 'Deny a floor' button since we're adding specific location buttons */}
      </div>

      {/* Location Denial Section */}
      <div className="w-full max-w-xl bg-gray-700 p-6 rounded-lg shadow-md mt-6">
        <h2 className="text-xl mb-4">Deny a Location</h2>
        <div className="grid grid-cols-2 gap-4">
          {taskLocations.map((location) => {
            if(location === 'Other') return
            const isDenied = deniedLocation === location;
            const isOtherDenied = deniedLocation && deniedLocation !== location;
            const isButtonDisabled = isOtherDenied || susPoints < 2;

            return (
              <button
                key={location}
                onClick={() => handleDenyLocation(location)}
                className={`w-full px-4 py-2 rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 ${
                  isDenied
                    ? 'bg-red-500 text-white cursor-not-allowed'
                    : isButtonDisabled
                    ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-700 text-white'
                }`}
                disabled={isDenied || isButtonDisabled}
                title={
                  isDenied
                    ? `${location} is currently denied`
                    : susPoints < 2
                    ? 'Not enough points to deny a location'
                    : `Deny ${location} for 1 minute`
                }
              >
                {location}
                {isDenied && ' (Denied)'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Task Slider */}
      <MUECustomSlider
        sus
        onSuccess={handleSwipe}
        text="Slide to pretend to do a task"
      />
    </div>
  );
};

export default ImposterPage;

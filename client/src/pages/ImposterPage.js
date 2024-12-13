// src/pages/ImposterPage.jsx
import React, { useContext, useEffect } from 'react';
import { DataContext } from '../GameContext';
import MUECustomSlider from '../components/swiper';



const ImposterPage = () => {
  const {
    setAudio,
    taskLocations,
    deniedLocation,
    playerState,
    socket
  } = useContext(DataContext);

  function playCard(id, action) {
    console.log("play card", id)
    if (action === 'area_denial' && deniedLocation) {
        return
    }
    socket.emit('play_card', {player_id: localStorage.getItem('player_id'), card_id: id})
  }


// ActionCard Component to display individual game actions
const ActionCard = ({ action, text, location, duration, id }) => (
    <div 
    className="bg-gray-300 text-gray-800 rounded-lg shadow-md p-6 flex flex-col hover:scale-105 transition-transform transform"
    onClick = {() => playCard(id, action)}
    >
      <h3 className="text-xl font-semibold mb-2 capitalize">
        {action.replace('_', ' ')}
      </h3>
      <p className="flex-grow">{text}</p>
      {/* Conditionally render Location if it's provided */}
      {location && (
        <div className="mt-4">
          <span className="block text-sm text-gray-600">Location: {location}</span>
        </div>
      )}
      {/* Conditionally render Duration if it's provided */}
      {duration && (
        <div className="mt-2">
          <span className="block text-sm text-gray-600">
            Duration: {duration} seconds
          </span>
        </div>
      )}
    </div>
  );
  



  useEffect(() => {
    console.log('Denied Locations:', deniedLocation);
  }, [deniedLocation]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSwipe = () => {
    setAudio('complete_task');
  };

  return (
    <div className="flex flex-col items-center p-8 bg-gray-800 text-white min-h-screen">
      
      {/* Denied Locations Section */}
      <div className="w-full max-w-xl bg-gray-700 p-6 rounded-lg shadow-md mt-6">
        <h2 className="text-xl mb-4">Denied Locations</h2>
        <div className="grid grid-cols-2 gap-4">
          {taskLocations.map((location) => {
            if (location === 'Other') return null;
            const isDenied = deniedLocation === location;

            return (
              <button
                key={location}
                className={`w-full px-4 py-2 rounded-lg transition-colors duration-300 focus:outline-none ${
                  isDenied
                    ? 'bg-red-500 text-white cursor-not-allowed'
                    : 'bg-blue-500 text-white cursor-not-allowed opacity-70'
                }`}
                disabled
                title={
                  isDenied
                    ? `${location} is currently denied`
                    : 'Location is denied and cannot be interacted with'
                }
              >
                {location}
                {isDenied && ' (Denied)'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Game Actions Cards Section */}
      <div className="w-full max-w-4xl bg-gray-700 p-6 rounded-lg shadow-md mt-6">
        <h2 className="text-xl mb-4">Cards</h2>
        {(!playerState.cards || playerState.cards.length === 0) ? (
          <p className="text-center text-gray-300">No cards available.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {playerState.cards.map((cardJson) => {
              try {
                // Parse each card JSON string into an object
                const card = JSON.parse(cardJson);

                // Destructure required fields, handling potential typos
                const { action, text, location, duration, id } = card;

                // Prepare the action object without 'id' and 'sound'
                const actionData = {
                  action,
                  text,
                  location,
                  duration: duration !== undefined && duration !== null ? duration : null,
                };

                return (
                  <ActionCard
                    key={id}
                    id={id} 
                    action={actionData.action}
                    text={actionData.text}
                    location={actionData.location}
                    duration={actionData.duration}
                  />
                );
              } catch (error) {
                console.error('Error parsing game action card:', error);
                return null; // Skip rendering this card if JSON is invalid
              }
            })}
          </div>
        )}
      </div>

      {/* Task Slider */}
      <MUECustomSlider
        sus
        onSuccess={handleSwipe}
        text="Slide to pretend to do a task"
        className="mt-6"
      />
    </div>
  );
};

export default ImposterPage;

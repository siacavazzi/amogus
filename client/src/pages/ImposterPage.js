// src/pages/ImposterPage.jsx
import React, { useContext, useEffect } from 'react';
import { DataContext } from '../GameContext';
import { FaSignOutAlt } from 'react-icons/fa';

const ImposterPage = ({ setShowSusPage }) => {
  const {
    playerState,
    socket,
    activeCards
  } = useContext(DataContext);

  function playCard(id) {
    socket.emit('play_card', { player_id: localStorage.getItem('player_id'), card_id: id });
  }

  function ActionCard({ action, text, location, duration, id, time_left, active = false, countdown }) {
    if (time_left <= 0) {
      return null;
    }

    const cardBaseClasses = `rounded-xl shadow-lg p-6 flex flex-col transition-transform duration-200 ease-out focus:outline-none`;
    const activeClasses = `bg-gradient-to-r from-green-500 to-green-400 text-white hover:scale-105`;
    const inactiveClasses = `bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:scale-105 hover:shadow-2xl border border-gray-200 dark:border-gray-700`;
    const cardClasses = active ? `${cardBaseClasses} ${activeClasses}` : `${cardBaseClasses} ${inactiveClasses}`;

    const formattedAction = action.replace('_', ' ');

    function handleClick() {
      playCard(id, action);
    }

    return (
      <div className={cardClasses} onClick={handleClick} tabIndex={0}>
        <h3 className="text-xl font-semibold mb-2 capitalize">{formattedAction}</h3>
        <p className="flex-grow">{text}</p>

        {location && (
          <div className="mt-4">
            <span className="block text-sm text-gray-600 dark:text-gray-400">
              Location: {location}
            </span>
          </div>
        )}

        {duration && (
          <div className="mt-2">
            {!countdown ? (
              <span className="block text-sm text-gray-600 dark:text-gray-400">
                Duration: {duration} seconds
              </span>
            ) : (
              <span className="block text-sm text-gray-600 dark:text-gray-400">
                Time left: {time_left} seconds
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="flex flex-col items-center p-8 min-h-screen bg-gradient-to-br from-red-600 via-red-700 to-red-800 text-white">
      <h2 className="text-3xl font-bold mb-6 tracking-wider text-white">
        Active Cards
      </h2>
      <div className="w-full max-w-xl bg-gray-700/90 backdrop-blur-md p-6 rounded-xl shadow-xl grid gap-6">
        {activeCards
          .filter((card) => !(card.time_left && card.time_left <= 0))
          .map((card) => {
            const { action, text, location, duration, id, time_left, countdown } = card;
            return (
              <ActionCard
                key={id}
                id={id}
                action={action}
                text={text}
                location={location}
                duration={duration}
                time_left={time_left}
                countdown={countdown}
                active
              />
            );
          })}
      </div>

      <div className="w-full max-w-4xl bg-gray-700/90 backdrop-blur-md p-6 rounded-xl shadow-xl mt-10">
        <h2 className="text-2xl font-semibold mb-4 text-white">Cards</h2>
        {(!playerState.cards || playerState.cards.length === 0) ? (
          <p className="text-center text-gray-300">No cards available.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {playerState.cards.map((cardJson) => {
              try {
                const card = JSON.parse(cardJson);
                const { action, text, location, duration, id } = card;
                return (
                  <ActionCard
                    key={id}
                    id={id}
                    action={action}
                    text={text}
                    location={location}
                    duration={duration}
                  />
                );
              } catch (error) {
                console.error('Error parsing game action card:', error);
                return null;
              }
            })}
          </div>
        )}
      </div>

      <div className="mt-10">
        <button
          onClick={() => setShowSusPage(false)}
          className="flex items-center px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full shadow-lg hover:from-orange-600 hover:to-orange-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <FaSignOutAlt className="mr-2" />
          Leave vent
        </button>
      </div>
    </div>
  );
};

export default ImposterPage;

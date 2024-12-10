// ./components/PlayerRole.jsx

import React from 'react';
import PropTypes from 'prop-types';

const PlayerRole = ({ sus }) => {
  const isCrewmate = !sus;
  const displayText = isCrewmate ? 'Crewmate' : 'Impostor';
  const roleIcon = isCrewmate ? '👩‍🚀' : '🕵️‍♂️';
  
  // Define gradient colors based on role
  const gradientClasses = isCrewmate
    ? 'bg-gradient-to-r from-blue-500 to-blue-300'
    : 'bg-gradient-to-r from-red-500 to-red-300';

  return (
    <div
      className={`flex items-center p-5 rounded-lg text-white text-xl shadow-md animate-fadeIn ${gradientClasses} my-5`}
    >
      <div className="mr-4 text-2xl">
        {roleIcon}
      </div>
      <div className="font-bold">
        {displayText}
      </div>
    </div>
  );
};

PlayerRole.propTypes = {
  sus: PropTypes.bool.isRequired, // Corrected PropType
};

export default PlayerRole;

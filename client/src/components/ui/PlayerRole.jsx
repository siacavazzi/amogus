import React from 'react';
import './PlayerRole.css'; // Make sure to create this CSS file
import PropTypes from 'prop-types';

const PlayerRole = ({ sus }) => {
  // Determine the role details based on the prop
  const isCrewmate = !sus;
  const displayText = isCrewmate ? 'Crewmate' : 'Impostor';
  const roleClass = isCrewmate ? 'crewmate' : 'impostor';

  return (
    <div className={`player-role ${roleClass}`}>
      <div className="role-icon">
        {/* You can replace these with actual icons or images */}
        {isCrewmate ? '👩‍🚀' : '🕵️‍♂️'}
      </div>
      <div className="role-text">{displayText}</div>
    </div>
  );
};

PlayerRole.propTypes = {
  role: PropTypes.oneOf(['crewmate', 'impostor']).isRequired,
};

export default PlayerRole;
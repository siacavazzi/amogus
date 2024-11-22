import React from 'react';
import '../CSS/PlayerRole.css';
import PropTypes from 'prop-types';

const PlayerRole = ({ sus }) => {
  const isCrewmate = !sus;
  const displayText = isCrewmate ? 'Crewmate' : 'Impostor';
  const roleClass = isCrewmate ? 'crewmate' : 'impostor';

  return (
    <div className={`player-role ${roleClass}`}>
      <div className="role-icon">

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
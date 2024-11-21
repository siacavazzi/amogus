// ./components/PlayerCard.jsx

import React from "react";
import PropTypes from "prop-types";

const PlayerCard = ({ player }) => {
    const avatarUrl = `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(player.username)}&background=%23ffffff`;

    return (
        <div className="bg-gray-800 shadow-md rounded-lg p-6 flex flex-col items-center transition-transform transform hover:scale-105">
            <div className="w-20 h-20 mb-4">
                <img
                    src={avatarUrl}
                    alt={`${player.username}'s avatar`}
                    className="w-full h-full rounded-full object-cover border-2 border-indigo-600"
                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/80'; }}
                />
            </div>
            <h3 className="text-xl font-semibold text-gray-200">{player.username}</h3>
            <p className={`mt-2 text-sm font-medium ${player.alive ? 'text-green-400' : 'text-red-500'}`}>
                {player.alive ? "Alive" : "Dead"}
            </p>
        </div>
    );
};

PlayerCard.propTypes = {
    player: PropTypes.shape({
        id: PropTypes.string.isRequired,
        username: PropTypes.string.isRequired,
        alive: PropTypes.bool.isRequired,
        avatar: PropTypes.string,
    }).isRequired,
};

export default PlayerCard;

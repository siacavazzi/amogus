import React from 'react';

const PlayerCard = ({ player }) => {
    const avatarUrl = `https://robohash.org/${encodeURIComponent(player.username)}.png?size=200x200`;


    return (
        <div className="bg-white shadow-md rounded-lg p-6 flex flex-col items-center transition-transform transform hover:scale-105">
            <div className="w-20 h-20 mb-4">
                <img
                    src={avatarUrl}
                    alt={`${player.username}'s avatar`}
                    className="w-full h-full rounded-full object-cover"
                />
            </div>
            <h3 className="text-xl font-semibold text-gray-800">{player.username}</h3>
            <p className={`mt-2 text-sm font-medium ${player.alive ? 'text-green-500' : 'text-red-500'}`}>
                {player.alive ? "Alive" : "Dead"}
            </p>
        </div>
    );
};

export default PlayerCard;

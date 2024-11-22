import React from "react";

const ProfilePicture = ({ imageCode }) => {
    // Ensure the code is within the range 0–9
  
    // Dynamically create the image path
    const imagePath = require(`../imgs/${imageCode}.gif`);
    console.log(`../imgs/${imageCode}.gif`)
  
    return (
      <div>
        <img 
          src={imagePath} 
          alt={`Profile ${imageCode}`} 
          style={{ width: 100, height: 100, borderRadius: '50%' }} 
        />
      </div>
    );
  };

const PlayerCard = ({ player }) => {
    console.log(player)

    return (
        <div className="bg-gray-800 shadow-md rounded-lg p-6 flex flex-col items-center transition-transform transform hover:scale-105">
            <div className="w-20 h-20 mb-2">
            <ProfilePicture imageCode={player.pic}/>
            </div>
            <h3 className="text-xl font-semibold text-gray-200">{player.username}</h3>
            <p className={`mt-1 text-sm font-medium ${player.alive ? 'text-green-400' : 'text-red-500'}`}>
                {player.alive ? "Alive" : "Dead"}
            </p>
        </div>
    );
};

export default PlayerCard;

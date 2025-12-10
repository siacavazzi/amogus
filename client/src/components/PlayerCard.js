import React from "react";
import { ENDPOINT } from "../ENDPOINT";

export const ProfilePicture = ({ imageCode, selfie, size = "large" }) => {
  // Size variants: "large" for prominent display, "medium" for standard cards
  const sizeClasses = size === "large" 
    ? "w-24 h-24 sm:w-28 sm:h-28" 
    : "w-16 h-16 sm:w-20 sm:h-20";
  
  // If player has a selfie, use it; otherwise fall back to GIF
  if (selfie) {
    const selfieUrl = `${ENDPOINT}/selfies/${selfie}`;
    return (
      <div className={`${sizeClasses} relative`}>
        <img
          src={selfieUrl}
          alt="Player selfie"
          className={`${sizeClasses} rounded-full object-cover ring-4 ring-indigo-500/50 shadow-lg`}
          onError={(e) => {
            // Fallback to GIF if selfie fails to load
            e.target.onerror = null;
            e.target.src = require(`../imgs/${imageCode}.gif`);
          }}
        />
      </div>
    );
  }

  const imagePath = require(`../imgs/${imageCode}.gif`);
  return (
    <div className={`${sizeClasses} relative`}>
      <img
        src={imagePath}
        alt={`Profile ${imageCode}`}
        className={`${sizeClasses} rounded-full ring-4 ring-indigo-500/50 shadow-lg`}
      />
    </div>
  );
};

const PlayerCard = ({
  player,
  selected = false,
  votes = 0,
  onClick,
  isMe = false,
  isClickable = true,
}) => {
  return (
    <div
      onClick={isClickable ? onClick : null}
      className={`relative bg-gray-800 shadow-md rounded-xl p-4 flex flex-col items-center transition-transform transform 
              ${isClickable ? "hover:scale-105 cursor-pointer" : "opacity-50 cursor-not-allowed"}
              ${selected ? "border-4 border-green-500" : "border-2 border-transparent"}`}
    >
      <div className="mb-3">
        <ProfilePicture imageCode={player.pic} selfie={player.selfie} />
      </div>
      <h3 className="text-base sm:text-lg font-semibold text-gray-200 text-center truncate w-full">
        {player.username} {isMe && <span className="text-indigo-400">(me)</span>}
      </h3>
      <p
        className={`mt-1 text-xs font-medium ${player.alive ? "text-green-400" : "text-red-500"
          }`}
      >
        {player.alive ? "Alive" : "Dead"}
      </p>

      {/* Optional Votes Display */}
      {votes > 0 && (
        <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold py-1 px-2 rounded-full shadow-md">
          {votes} {votes === 1 ? "Vote" : "Votes"}
        </div>
      )}
    </div>
  );
};


export default PlayerCard;

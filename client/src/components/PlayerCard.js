import React from "react";
import { ENDPOINT } from "../ENDPOINT";

export const ProfilePicture = ({ imageCode, selfie }) => {
  // If player has a selfie, use it; otherwise fall back to GIF
  if (selfie) {
    const selfieUrl = `${ENDPOINT}/selfies/${selfie}`;
    return (
      <div>
        <img
          src={selfieUrl}
          alt="Player selfie"
          style={{ width: 100, height: 100, borderRadius: "50%", objectFit: "cover" }}
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
    <div>
      <img
        src={imagePath}
        alt={`Profile ${imageCode}`}
        style={{ width: 100, height: 100, borderRadius: "50%" }}
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
      className={`relative bg-gray-800 shadow-md rounded-lg p-6 flex flex-col items-center transition-transform transform 
              ${isClickable ? "hover:scale-105 cursor-pointer" : "opacity-50 cursor-not-allowed"}
              ${selected ? "border-4 border-green-500" : "border-2 border-transparent"}`}
    >
      <div className="mb-2">
        <ProfilePicture imageCode={player.pic} selfie={player.selfie} />
      </div>
      <h3 className="text-xl font-semibold text-gray-200">
        {player.username} {isMe && "(me)"}
      </h3>
      <p
        className={`mt-1 text-sm font-medium ${player.alive ? "text-green-400" : "text-red-500"
          }`}
      >
        {player.alive ? "Alive" : "Dead"}
      </p>

      {/* Optional Votes Display */}
      {votes > 0 && (
        <div className="absolute top-2 right-2 bg-red-600 text-white text-sm font-bold py-1 px-2 rounded-full shadow-md">
          {votes} {votes === 1 ? "Vote" : "Votes"}
        </div>
      )}
    </div>
  );
};


export default PlayerCard;

import React from "react";
import Avatar, { AVATARS, AVATAR_COUNT, describeAvatar } from "./Avatar";

// Map of avatar index -> username for avatars other players in the room already have.
export const takenAvatars = (players = [], myPlayerId = null) => {
  const takenBy = {};
  players.forEach((player) => {
    const pic = player?.pic;
    if (player?.player_id === myPlayerId) return;
    if (!Number.isInteger(pic) || pic < 0 || pic >= AVATAR_COUNT) return;
    if (takenBy[pic] === undefined) takenBy[pic] = player.username;
  });
  return takenBy;
};

// Once every avatar is taken the server allows duplicates, so nothing is locked.
export const isAvatarLocked = (index, takenBy) =>
  takenBy[index] !== undefined && Object.keys(takenBy).length < AVATAR_COUNT;

export const randomFreeAvatar = (takenBy = {}, exclude = null) => {
  const free = AVATARS.map((_, index) => index).filter((index) => index !== exclude && !isAvatarLocked(index, takenBy));
  const pool = free.length ? free : AVATARS.map((_, index) => index);
  return pool[Math.floor(Math.random() * pool.length)];
};

const AvatarPicker = ({ selected, onSelect, takenBy = {} }) => (
  <div role="radiogroup" aria-label="Avatar" className="grid grid-cols-6 gap-2">
    {AVATARS.map((avatar, index) => {
      const owner = takenBy[index];
      const locked = isAvatarLocked(index, takenBy);
      const isSelected = index === selected;
      return (
        <button
          key={avatar.name}
          type="button"
          role="radio"
          aria-checked={isSelected}
          aria-label={owner ? `${describeAvatar(avatar)}, taken by ${owner}` : describeAvatar(avatar)}
          disabled={locked}
          onClick={() => onSelect(index)}
          className={`relative aspect-square rounded-full transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
            isSelected ? "ring-2 ring-white ring-offset-2 ring-offset-gray-900" : ""
          } ${locked ? "cursor-not-allowed" : "hover:scale-110 active:scale-95"}`}
        >
          <span className={`block w-full h-full rounded-full overflow-hidden ${locked ? "opacity-25 grayscale" : ""}`}>
            <Avatar id={index} decorative className="w-full h-full" />
          </span>
          {owner && (
            <span className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 max-w-[120%] truncate px-1 rounded bg-gray-900 text-[9px] leading-tight text-gray-400">
              {owner}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

export default AvatarPicker;

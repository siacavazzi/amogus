import React from 'react';

const RoomBanner = ({ roomId, onLeave }) => {
  if (!roomId) return null;
  return (
    <div className="fixed top-0 left-0 w-full z-50 bg-gray-900 text-gray-200 text-xs flex justify-end items-center p-2 space-x-4">
      <span>Room: {roomId}</span>
      <button onClick={onLeave} className="text-red-400 hover:text-red-500">Leave</button>
    </div>
  );
};

export default RoomBanner;

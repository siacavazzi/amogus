// src/pages/GameRunningPage.jsx
import React from 'react';

const GameRunningPage = () => {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-gray-800 text-white min-h-screen">
      <h1 className="mb-6 text-4xl font-bold text-blue-500">Game Already Running</h1>
      <p className="mb-8 text-lg text-center">
        RELOAD if you are already playing to remove this page
      </p>
      <button
        onClick={handleReload}
        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300"
      >
        Reload Page
      </button>
    </div>
  );
};

export default GameRunningPage;

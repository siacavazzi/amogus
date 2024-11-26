// src/pages/GameRunningPage.jsx
import React from 'react';
import './GameRunning.css';

const GameRunningPage = () => {

  const handleViewPlayers = () => {
    // Navigate to the PlayersInGamePage
  };

  return (
    <div className="gamerunning-page">
      <h1>Game Already Running</h1>
      <p>The game you are trying to join is currently in progress.</p>
      <button className="action-button view-players-button" onClick={handleViewPlayers}>
        View Players in Game
      </button>
    </div>
  );
};

export default GameRunningPage;

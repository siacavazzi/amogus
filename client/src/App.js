import React from 'react';
import { isMobile } from 'react-device-detect';
import GameContext from './GameContext';
import PageController from './PageController';

function App() {

  return (
      <GameContext>
        <PageController />
      </GameContext>
  );
}

export default App;


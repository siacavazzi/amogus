import React, { useState } from 'react';
import { isMobile } from 'react-device-detect';
import GameContext from './GameContext';
import PageController from './PageController';
import { Provider } from './components/ui/provider';

function App() {

  return (
    <Provider>
      <GameContext>
        <PageController />
      </GameContext>
    </Provider>
  );
}

export default App;


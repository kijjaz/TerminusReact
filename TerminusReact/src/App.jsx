import React from 'react';
import { GameProvider, useGameContext } from './context/GameContext';
import GameCanvas from './components/GameCanvas';
import LoginScreen from './components/LoginScreen';
import UIOverlay from './components/UIOverlay';
import HelpOverlay from './components/HelpOverlay';
import { MobileControls } from './components/MobileControls';
import CraftingMenu from './components/CraftingMenu';

const MainLayout = () => {
  const { gameState } = useGameContext();

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#050505', overflow: 'hidden', position: 'relative' }}>
      <GameCanvas />

      {!gameState.joined && <LoginScreen />}

      {gameState.joined && (
        <>
          <UIOverlay />
          <HelpOverlay />
          <CraftingMenu />
          <MobileControls />
        </>
      )}
    </div>
  );
};

const App = () => {
  return (
    <GameProvider>
      <MainLayout />
    </GameProvider>
  );
};

export default App;

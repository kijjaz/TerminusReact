import React, { useContext } from 'react';
import { GameProvider, GameContext, useGameContext } from './context/GameContext';
import GameCanvas from './components/GameCanvas';
import UIOverlay from './components/UIOverlay';
import LoginScreen from './components/LoginScreen';
import HelpOverlay from './components/HelpOverlay';
import { MobileControls } from './components/MobileControls';

const StatusOverlay = () => {
  const { gameState } = useContext(GameContext);
  // Minimal connection debug, can be removed or integrated into UIOverlay later
  if (!gameState.connected) {
    return (
      <div style={{
        position: 'absolute', top: 50, right: 10, color: '#f00',
        fontFamily: 'monospace', zIndex: 100, fontSize: '12px'
      }}>
        [SOCKET DISCONNECTED]
      </div>
    );
  }
  return null;
};

const MainLayout = () => {
  const { gameState } = useContext(GameContext);
  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#050505', overflow: 'hidden', position: 'relative' }}>
      <GameCanvas />
      {gameState.joined ? <UIOverlay /> : <LoginScreen />}
      {gameState.showHelp && <HelpOverlay />}
      <StatusOverlay />
    </div>
  );
};

function App() {
  return (
    <GameProvider>
      <MainLayout />
    </GameProvider>
  );
}

export default App;

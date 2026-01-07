import React, { createContext, useRef, useEffect, useState } from 'react';
import { GameEngine } from '../engine/GameEngine';

export const GameContext = createContext();

export const GameProvider = ({ children }) => {
    // Single Engine Instance
    const engineRef = useRef(new GameEngine());

    // Reactive State (Synced from Engine)
    const [gameState, setGameState] = useState(engineRef.current.state);

    useEffect(() => {
        const engine = engineRef.current;

        // Initialize Engine
        engine.init();

        // Subscribe to Engine State Changes
        const unsubscribe = engine.subscribe((newState) => {
            setGameState(newState);
        });

        return () => {
            unsubscribe();
            engine.stop();
        };
    }, []);

    // Helper Wrappers for Consumers
    const joinGame = (name) => engineRef.current.login(name);
    const toggleHelp = () => engineRef.current.handleInput('toggleHelp');

    const value = {
        // Expose Engine directly for Canvas/Systems
        engine: engineRef.current,

        // Expose Sub-systems for direct access if needed (optional)
        world: engineRef.current.world,
        player: engineRef.current.player,
        renderer: engineRef.current.renderer,
        sound: engineRef.current.sound,
        socket: engineRef.current.socket,

        // Expose Reactive State for UI
        gameState,

        // Actions
        joinGame,
        toggleHelp
    };

    return (
        <GameContext.Provider value={value}>
            {children}
        </GameContext.Provider>
    );
};

export const useGameContext = () => React.useContext(GameContext);

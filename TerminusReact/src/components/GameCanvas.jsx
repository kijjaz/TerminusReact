import React, { useRef, useEffect, useContext } from 'react';
import { GameContext } from '../context/GameContext';

const GameCanvas = () => {
    const canvasRef = useRef(null);
    const { engine } = useContext(GameContext);

    useEffect(() => {
        if (canvasRef.current && engine) {
            engine.renderer.attach(canvasRef.current);
            console.log("Renderer attached via Engine");

            // Initial Render if data exists
            if (engine.player && engine.world) {
                engine.renderer.resize();
                engine.renderer.renderWorld(engine.world, engine.player);
            }

            const handleResize = () => {
                engine.renderer.resize();
                // Force re-render on resize
                engine.renderer.renderWorld(engine.world, engine.player);
            };

            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }
    }, [engine]);

    // Handle Input at Component Level (Delegated to Engine)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key.toLowerCase() === 'h' || e.key === '?') {
                engine.handleInput('toggleHelp');
                return;
            }
            engine.handleInput('keydown', e.key);
        };
        const handleKeyUp = (e) => {
            engine.handleInput('keyup', e.key);
        };
        const handleMouseDown = (e) => {
            if (!canvasRef.current) return;
            const rect = canvasRef.current.getBoundingClientRect();
            // Pass client relative coordinates
            engine.handleInput('mousedown', {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            });
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        const canvas = canvasRef.current;
        if (canvas) canvas.addEventListener('mousedown', handleMouseDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            if (canvas) canvas.removeEventListener('mousedown', handleMouseDown);
        };
    }, [engine]);

    return (
        <canvas
            ref={canvasRef}
            style={{
                display: 'block',
                position: 'absolute',
                top: 0,
                left: 0,
                zIndex: 0
            }}
        />
    );
};

export default GameCanvas;

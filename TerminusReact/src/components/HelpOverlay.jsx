import React, { useContext } from 'react';
import { GameContext } from '../context/GameContext';

const HelpOverlay = () => {
    const { gameState, toggleHelp } = useContext(GameContext);

    if (!gameState.showHelp) return null;

    return (
        <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 150,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={toggleHelp}>
            <div style={{
                backgroundColor: '#111', border: '2px solid #aa5500', padding: '20px',
                color: '#ddd', fontFamily: 'monospace', maxWidth: '400px',
                boxShadow: '0 0 15px rgba(170, 85, 0, 0.5)'
            }} onClick={e => e.stopPropagation()}>
                <h2 style={{ color: '#ffaa00', borderBottom: '1px solid #555', marginTop: 0 }}>Terminus Help</h2>
                <div style={{ marginTop: '20px' }}>
                    <p style={{ margin: '5px 0' }}>[WASD / ARROWS] Move</p>
                    <p style={{ margin: '5px 0' }}>[CLICK] Mine / Interact</p>
                    <p style={{ margin: '5px 0' }}>[+/-] Zoom In/Out</p>
                    <p style={{ margin: '5px 0' }}>[T / ENTER] Chat</p>
                    <p style={{ margin: '5px 0' }}>Chat Cmds: /join [room], /world</p>
                    <p style={{ margin: '5px 0' }}>[H / ?] Toggle Help</p>
                </div>
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                    <button onClick={toggleHelp} style={{
                        background: '#aa5500', color: '#000', border: 'none',
                        padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer'
                    }}>CLOSE</button>
                </div>
            </div>
        </div>
    );
};

export default HelpOverlay;

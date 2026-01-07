import React, { useState, useContext } from 'react';
import { GameContext } from '../context/GameContext';

const LoginScreen = () => {
    const { joinGame, gameState } = useContext(GameContext);
    const [name, setName] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (name.trim()) {
            joinGame(name.trim());
        }
    };

    if (!gameState.connected) {
        return (
            <div style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                backgroundColor: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', zIndex: 200, color: '#aa5500', fontFamily: 'monospace'
            }}>
                <div>CONNECTING TO SERVER...</div>
            </div>
        );
    }

    return (
        <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100
        }}>
            <div style={{
                padding: '20px', border: '2px solid #aa5500', backgroundColor: '#1a0d00',
                width: '300px', display: 'flex', flexDirection: 'column', gap: '10px'
            }}>
                <h2 style={{ margin: 0, color: '#ffaa00', textAlign: 'center', fontFamily: 'monospace' }}>TERMINUS</h2>
                <div style={{ height: '1px', backgroundColor: '#aa5500' }}></div>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={{ color: '#aaa', fontFamily: 'monospace' }}>USERNAME:</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={12}
                        autoFocus
                        style={{
                            backgroundColor: '#000', border: '1px solid #555', color: '#fff',
                            padding: '8px', fontFamily: 'monospace', fontSize: '16px'
                        }}
                    />
                    <button
                        type="submit"
                        style={{
                            backgroundColor: '#aa5500', border: 'none', color: '#000',
                            padding: '10px', fontFamily: 'monospace', fontWeight: 'bold',
                            cursor: 'pointer', marginTop: '10px'
                        }}
                    >
                        ENTER WORLD
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginScreen;

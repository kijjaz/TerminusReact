import React, { useContext, useState, useEffect, useRef } from 'react';
import { GameContext } from '../context/GameContext';

const Chat = () => {
    const { gameState, engine, toggleHelp } = useContext(GameContext);
    const [input, setInput] = useState('');
    const historyRef = useRef(null);

    useEffect(() => {
        if (historyRef.current) {
            historyRef.current.scrollTop = historyRef.current.scrollHeight;
        }
    }, [gameState.chatMessages]);

    const handleSend = (e) => {
        e.preventDefault();
        const text = input.trim();
        if (text) {
            if (text.toLowerCase() === '/help') {
                toggleHelp();
            } else {
                if (engine) engine.sendChat(text);
            }
            setInput('');
        }
    };

    return (
        <div style={{
            position: 'absolute',
            bottom: 10, left: 10,
            width: '350px',
            backgroundColor: 'rgba(0,0,0,0.8)',
            border: '1px solid #333',
            padding: '10px',
            fontFamily: "'VT323', monospace",
            fontSize: '16px',
            color: '#eee',
            display: 'flex',
            flexDirection: 'column'
        }} onKeyDown={e => e.stopPropagation()}>
            <div ref={historyRef} style={{
                height: '150px',
                overflowY: 'auto',
                marginBottom: '10px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end'
            }}>
                {gameState.chatMessages.map((msg, i) => {
                    const isSystem = msg.user === 'System';
                    const isRoom = msg.channel && msg.channel !== 'global';

                    let color = '#eee'; // Default White
                    if (isSystem) color = '#0f0'; // Green
                    else if (isRoom) color = '#0ff'; // Cyan for Rooms

                    const prefix = isRoom ? `[${msg.channel}] ` : '';

                    return (
                        <div key={i} style={{ color, lineHeight: '1.2' }}>
                            <span style={{ opacity: 0.7 }}>{prefix}{msg.user}: </span>
                            {msg.text}
                        </div>
                    );
                })}
            </div>
            <form onSubmit={handleSend}>
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Type /help for commands..."
                    style={{
                        width: '100%',
                        background: 'transparent',
                        border: '1px solid #555',
                        color: '#fff',
                        fontFamily: "inherit",
                        fontSize: "inherit",
                        padding: '5px'
                    }}
                />
            </form>
        </div>
    );
};

const Inventory = () => {
    // Mock inventory for now, will connect to Player/GameState soon
    const { gameState } = useContext(GameContext);
    const { player } = gameState;

    return (
        <div style={{
            position: 'absolute', top: 10, right: 10, width: '200px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)', border: '1px solid #555',
            padding: '5px', color: '#fff', fontFamily: 'monospace', zIndex: 10
        }}>
            <div style={{ color: '#fb0', borderBottom: '1px solid #555', marginBottom: '5px' }}>
                GOLD: {player.gold}
            </div>
            <div>
                L: {player.equipment?.leftHand?.name || 'empty'}<br />
                R: {player.equipment?.rightHand?.name || 'empty'}
            </div>
            <hr style={{ borderColor: '#333' }} />
            {player.inventory.map((item, i) => (
                <div key={i} style={{ padding: '2px 0' }}>
                    {item.char} {item.name}
                </div>
            ))}
            {player.inventory.length === 0 && <div style={{ color: '#555' }}>No items</div>}
        </div>
    );
};

const UIOverlay = () => {
    return (
        <>
            <Chat />
            <Inventory />
        </>
    );
};

export default UIOverlay;

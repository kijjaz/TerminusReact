import React, { useContext } from 'react';
import { GameContext } from '../context/GameContext';

const InventoryScreen = () => {
    const { gameState, engine } = useContext(GameContext);
    const { player, showInventory } = gameState;

    if (!showInventory) return null;

    const slotStyle = {
        width: '50px', height: '50px',
        border: '1px solid #555',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)',
        fontSize: '24px',
        cursor: 'pointer',
        position: 'relative'
    };

    return (
        <div style={{
            position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100, pointerEvents: 'none' // Allow clicks through to background? No, modal should block
        }}>
            <div style={{
                background: '#111', border: '2px solid #666',
                padding: '20px', width: '600px', pointerEvents: 'auto',
                boxShadow: '0 0 20px #000'
            }}>
                <h2 style={{ color: '#fff', borderBottom: '1px solid #444', marginTop: 0 }}>INVENTORY</h2>

                {/* Equipment Slots */}
                <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', justifyContent: 'center' }}>
                    <div style={slotStyle} title="Left Hand">
                        {player.equipment?.leftHand?.char || <span style={{ opacity: 0.2 }}>L</span>}
                    </div>
                    <div style={{ ...slotStyle, borderColor: '#aa0' }} title="Right Hand (Main)">
                        {player.equipment?.rightHand?.char || <span style={{ opacity: 0.2 }}>R</span>}
                    </div>
                    <div style={slotStyle} title="Armor">
                        {player.equipment?.armor?.char || <span style={{ opacity: 0.2 }}>A</span>}
                    </div>
                </div>

                {/* Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '10px' }}>
                    {player.inventory.map((item, i) => (
                        <div key={i} style={{ ...slotStyle, color: item.color === 'y' ? '#ff0' : (item.color === 's' ? '#aaa' : '#fff') }}
                            title={item.name}
                            onClick={() => {
                                // Simple Equip Logic for now
                                if (item.type === 'tool') {
                                    engine.player.equipment.rightHand = item;
                                    engine.updateState({ player: { ...player, equipment: { ...engine.player.equipment } } });
                                }
                            }}>
                            {item.char}
                        </div>
                    ))}
                    {/* Empty Slots filler */}
                    {Array.from({ length: Math.max(0, 32 - player.inventory.length) }).map((_, i) => (
                        <div key={`empty-${i}`} style={{ ...slotStyle, opacity: 0.2 }}>.</div>
                    ))}
                </div>

                <div style={{ marginTop: '20px', textAlign: 'center', color: '#888', fontSize: '14px' }}>
                    [CLICK] Tool to Equip Right Hand • [ESC/I] Close
                </div>
            </div>
        </div>
    );
};

export default InventoryScreen;

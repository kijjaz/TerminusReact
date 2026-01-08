import React, { useState } from 'react';
import { useGameContext } from '../context/GameContext';

const RECIPES = [
    {
        name: 'Stone Pickaxe',
        char: 'T', color: 'w',
        desc: 'Tier 1: Mines Iron',
        cost: { 'Rubble': 5 },
        result: { name: 'Stone Pickaxe', type: 'tool', stats: { miningPower: 2 } }
    },
    {
        name: 'Iron Pickaxe',
        char: 'T', color: 's',
        desc: 'Tier 2: Mines Mese',
        cost: { 'Iron Ore': 3, 'Rubble': 2 },
        result: { name: 'Iron Pickaxe', type: 'tool', stats: { miningPower: 3 } }
    },
    {
        name: 'Mese Pickaxe',
        char: 'T', color: 'y',
        desc: 'Tier 3: Mines Diamantine',
        cost: { 'Mese Crystal': 3, 'Iron Ore': 2 },
        result: { name: 'Mese Pickaxe', type: 'tool', stats: { miningPower: 4, attack: 3 } }
    },
    {
        name: 'Iron Sword',
        char: '|', color: 's',
        desc: 'Attack: 6',
        cost: { 'Iron Ore': 4, 'Wood': 2 },
        result: { name: 'Iron Sword', type: 'tool', stats: { attack: 6, miningPower: 1 } }
    },
    {
        name: 'Iron Armor',
        char: 'A', color: 's',
        desc: 'Reduces damage',
        cost: { 'Iron Ore': 5 },
        result: { name: 'Iron Armor', type: 'armor', stats: { defense: 2 } }
    },
    {
        name: 'Mese Lamp',
        char: 'i', color: 'y',
        desc: 'Magical light source',
        cost: { 'Mese Crystal': 1, 'Rubble': 1 },
        result: { name: 'Mese Lamp', type: 'placeable' }
    },
    {
        name: 'Healing Potion',
        char: '!', color: 'r',
        desc: 'Restores 50 HP',
        cost: { 'Spore': 2, 'Rubble': 1 },
        result: { name: 'Healing Potion', type: 'consumable' }
    }
];

export default function CraftingMenu() {
    const { gameState, engine } = useGameContext();
    const inventory = gameState.player.inventory;

    // Helper to count items
    const countItem = (name) => inventory.filter(i => i.name === name).length;

    const canCraft = (cost) => {
        for (const [key, qty] of Object.entries(cost)) {
            if (countItem(key) < qty) return false;
        }
        return true;
    };

    const handleCraft = (recipe) => {
        if (!canCraft(recipe.cost)) return;
        engine.craft(recipe);
    };

    if (!gameState.showCrafting) return null;

    return (
        <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: '600px', height: '500px', backgroundColor: '#111', border: '2px solid #555',
            color: '#eee', fontFamily: 'monospace', padding: '20px', zIndex: 100
        }}>
            <h2 style={{ borderBottom: '1px solid #333', paddingBottom: '10px' }}>WORKBENCH</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', marginTop: '20px' }}>
                {RECIPES.map((r, i) => {
                    const affordable = canCraft(r.cost);
                    return (
                        <div key={i} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '10px', border: '1px solid #333', opacity: affordable ? 1 : 0.5
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <div style={{
                                    width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: '1px solid ' + (r.color === 'y' ? '#ff0' : '#888'), color: (r.color === 'y' ? '#ff0' : '#ccc'),
                                    fontSize: '20px'
                                }}>{r.char}</div>
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>{r.name}</div>
                                    <div style={{ fontSize: '12px', color: '#888' }}>{r.desc}</div>
                                    <div style={{ fontSize: '12px', color: '#aaa', marginTop: '4px' }}>
                                        Cost: {Object.entries(r.cost).map(([n, q]) => `${n} x${q}`).join(', ')}
                                    </div>
                                </div>
                            </div>
                            <button
                                disabled={!affordable}
                                onClick={() => handleCraft(r)}
                                style={{
                                    padding: '8px 16px', cursor: affordable ? 'pointer' : 'not-allowed',
                                    backgroundColor: affordable ? '#224422' : '#333', border: 'none', color: '#fff'
                                }}
                            >
                                CRAFT
                            </button>
                        </div>
                    );
                })}
            </div>
            <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '12px', color: '#888' }}>
                Press 'C' to Close
            </div>
        </div>
    );
}

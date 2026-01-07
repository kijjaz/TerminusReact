import React, { useEffect, useState } from 'react';

export function MobileControls({ engine }) {
    const [isTouch, setIsTouch] = useState(false);

    useEffect(() => {
        // Simple touch detection
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 1000) {
            setIsTouch(true);
        }
    }, []);

    // if (!isTouch) return null; // Show always for testing


    const btnStyle = {
        width: '50px',
        height: '50px',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        border: '1px solid #aaa',
        borderRadius: '8px',
        color: '#fff',
        fontSize: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        touchAction: 'none', // Prevent scrolling
        cursor: 'pointer'
    };

    const containerStyle = {
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 50px)',
        gap: '5px',
        zIndex: 20
    };

    // Helper to simulate key events
    const sendKey = (key, type) => {
        if (!engine) return;
        engine.handleInput(type, key);
    };

    const handleTouchStart = (e, key) => {
        e.preventDefault(); // Prevent default touch behavior
        sendKey(key, 'keydown');
    };

    const handleTouchEnd = (e, key) => {
        e.preventDefault();
        sendKey(key, 'keyup');
    };

    // Action button (Interact/Mine) - simulates space or specialized action?
    // Player.js currently uses mouse for mining. We might need a "Mine Center" or "Interact" key.
    // For now, let's Map center button to 'Enter' (Chat) or just rely on tapping screen for mining?
    // Tapping screen works for mining if we handle touchstart on canvas.
    // But let's add an action button for future use.

    return (
        <div style={containerStyle}>
            <div /> {/* Empty Top-Left */}
            <div
                style={btnStyle}
                onTouchStart={e => handleTouchStart(e, 'w')}
                onTouchEnd={e => handleTouchEnd(e, 'w')}
                onMouseDown={e => sendKey('w', 'keydown')} // For testing on desktop
                onMouseUp={e => sendKey('w', 'keyup')}
            >
                ▲
            </div>
            <div /> {/* Empty Top-Right */}

            <div
                style={btnStyle}
                onTouchStart={e => handleTouchStart(e, 'a')}
                onTouchEnd={e => handleTouchEnd(e, 'a')}
                onMouseDown={e => sendKey('a', 'keydown')}
                onMouseUp={e => sendKey('a', 'keyup')}
            >
                ◀
            </div>
            <div
                style={btnStyle}
                onTouchStart={e => handleTouchStart(e, 's')}
                onTouchEnd={e => handleTouchEnd(e, 's')}
                onMouseDown={e => sendKey('s', 'keydown')}
                onMouseUp={e => sendKey('s', 'keyup')}
            >
                ▼
            </div>
            <div
                style={btnStyle}
                onTouchStart={e => handleTouchStart(e, 'd')}
                onTouchEnd={e => handleTouchEnd(e, 'd')}
                onMouseDown={e => sendKey('d', 'keydown')}
                onMouseUp={e => sendKey('d', 'keyup')}
            >
                ▶
            </div>
        </div>
    );
}

import { TILE_TYPES } from './World';

export class Player {
    constructor(world) {
        this.world = world;
        this.x = 200;
        this.y = 200;
        this.z = 0; // Storey
        this.subX = 0;
        this.subY = 0;
        this.vx = 0;
        this.vy = 0;
        this.level = 'fungal_caverns';
        this.char = '@';
        this.color = 'w';

        // Physics
        this.runTime = 0;
        this.physics = {
            accel: 0.10,  // Slower acceleration
            maxVel: 0.45, // Slower max speed
            friction: 0.82 // Snappier stop
        };

        // UI State (synced to React later, but kept here for logic)
        this.gold = 0;
        this.bankGold = 0;
        this.hp = 100;
        this.inventory = [];
        this.equipment = { leftHand: null, rightHand: null };

        // Input State
        this.keys = new Set();

        // Camera (Centered on player)
        this.camera = { x: 0, y: 0 };
    }

    handleKeyDown(key) {
        this.keys.add(key.toLowerCase());
    }

    handleKeyUp(key) {
        this.keys.delete(key.toLowerCase());
    }

    handleMouseDown(mx, my, renderer, sound, engine) {
        if (!renderer || !renderer.charWidth || !renderer.charHeight) return;

        const gridX = Math.floor(mx / renderer.charWidth);
        const gridY = Math.floor(my / renderer.charHeight);

        const worldX = gridX + this.camera.x;
        const worldY = gridY + this.camera.y;

        const dx = worldX - this.x;
        const dy = worldY - this.y;

        if (Math.sqrt(dx * dx + dy * dy) < 5) {
            const tile = this.world.getTile(worldX, worldY);
            if (tile && tile.char !== ' ') {
                // Network Request
                if (engine) engine.sendMineRequest(worldX, worldY, this.level);

                // Play Sound
                if (sound) sound.play('DIG', 0.5, 0.9 + Math.random() * 0.2);

                // Drop Logic (Client Authority for responsiveness)
                // 1. Rubble (Always?)
                if (Math.random() < 0.25) {
                    this.inventory.push({ char: '.', name: 'Rubble', type: 'resource' });
                }

                // 2. Ores
                const roll = Math.random();
                if (tile.char === TILE_TYPES.STONE || tile.char === TILE_TYPES.MOUNTAIN) {
                    if (roll < 0.15) this.inventory.push({ char: 'I', name: 'Iron Ore', color: 's', type: 'resource' });
                    if (roll < 0.01) this.inventory.push({ char: 'M', name: 'Mese Crystal', color: 'y', type: 'rare' });
                }
                if (tile.char === TILE_TYPES.BEDROCK) { // Deep
                    if (roll < 0.05) this.inventory.push({ char: 'D', name: 'Diamantine', color: 'T', type: 'legendary' });
                }
            }
        }
    }

    update(remotePlayers) {
        this.updatePhysics(remotePlayers);
        this.updateCamera();
        return (Math.abs(this.vx) > 0.01 || Math.abs(this.vy) > 0.01);
    }

    updatePhysics(remotePlayers) {
        let ax = 0;
        let ay = 0;

        const isMoving = this.keys.has('w') || this.keys.has('arrowup') ||
            this.keys.has('s') || this.keys.has('arrowdown') ||
            this.keys.has('a') || this.keys.has('arrowleft') ||
            this.keys.has('d') || this.keys.has('arrowright');

        // Running Acceleration Mechanic
        if (isMoving) {
            this.runTime = Math.min(100, this.runTime + 1);
        } else {
            this.runTime = 0;
        }

        // Ramp acceleration: Starts at 1.0, builds to 1.5 over ~1.6s
        // Smoother start
        const runFactor = 1.0 + (Math.min(100, this.runTime) / 100) * 0.5;
        const currentAccel = this.physics.accel * runFactor;

        if (this.keys.has('w') || this.keys.has('arrowup')) ay -= currentAccel;
        if (this.keys.has('s') || this.keys.has('arrowdown')) ay += currentAccel;
        if (this.keys.has('a') || this.keys.has('arrowleft')) ax -= currentAccel;
        if (this.keys.has('d') || this.keys.has('arrowright')) ax += currentAccel;

        this.vx += ax;
        this.vy += ay;

        this.vx *= this.physics.friction;
        this.vy *= this.physics.friction;

        const vel = Math.sqrt(this.vx ** 2 + this.vy ** 2);
        if (vel > this.physics.maxVel) {
            const ratio = this.physics.maxVel / vel;
            this.vx *= ratio;
            this.vy *= ratio;
        }

        this.subX += this.vx;
        this.subY += this.vy;

        let moveX = 0;
        let moveY = 0;

        if (Math.abs(this.subX) >= 1) {
            moveX = Math.sign(this.subX);
            this.subX -= moveX;
        }
        if (Math.abs(this.subY) >= 1) {
            moveY = Math.sign(this.subY);
            this.subY -= moveY;
        }

        if (moveX !== 0 || moveY !== 0) {
            this.move(moveX, moveY, remotePlayers);
            return true;
        }
        return false;
    }

    move(dx, dy, remotePlayers) {
        const nx = this.x + dx;
        const ny = this.y + dy;
        const tile = this.world.getTile(nx, ny);

        // Basic Collision & Walkable tiles
        const walkable = [
            TILE_TYPES.DIRT,
            TILE_TYPES.GRASS,
            TILE_TYPES.SAND,
            TILE_TYPES.STAIR_UP,
            TILE_TYPES.STAIR_DOWN,
            TILE_TYPES.OPEN_DOOR,
            TILE_TYPES.WOOD,
            TILE_TYPES.ICE,
            TILE_TYPES.GOLD,
            TILE_TYPES.POTION,
            TILE_TYPES.SCROLL,
            TILE_TYPES.SWORD,
            TILE_TYPES.SHIELD,
            TILE_TYPES.ARMOR,
            TILE_TYPES.RING,
            TILE_TYPES.AMULET,
            TILE_TYPES.FOUNTAIN,
            TILE_TYPES.SIGN,
            TILE_TYPES.MESE_LAMP,
            TILE_TYPES.TORCH
        ];

        // 1. Check Walkable
        const isNumeric = !isNaN(tile.char) && tile.char !== ' ';
        if (!walkable.includes(tile.char) && !isNumeric) return;

        // 2. Check Player Collision
        if (remotePlayers) {
            for (const p of remotePlayers.values()) {
                if (Math.floor(p.x) === nx && Math.floor(p.y) === ny) {
                    return; // Blocked by player
                }
            }
        }

        // Apply Move
        this.x = nx;
        this.y = ny;
        this.updateFOV();
    }

    updateFOV() {
        const radius = 10;
        for (let j = -radius; j <= radius; j++) {
            for (let i = -radius; i <= radius; i++) {
                if (i * i + j * j <= radius * radius) {
                    this.world.setExplored(this.x + i, this.y + j, true);
                }
            }
        }
    }

    updateCamera() {
        this.camera.x = Math.floor(this.x);
        this.camera.y = Math.floor(this.y);
    }
}

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
            // Check for Monster Hit first
            if (this.world.level && this.world.level.mobs) {
                const mob = this.world.level.mobs.find(m => Math.floor(m.x) === worldX && Math.floor(m.y) === worldY);
                if (mob) {
                    // Attack Monster
                    const weapon = this.equipment.rightHand;
                    const damage = (weapon && weapon.stats ? weapon.stats.attack : 1); // Fist = 1

                    if (mob.takeDamage) {
                        mob.takeDamage(damage);
                        if (sound) sound.play('CLINK', 1.0, 0.8); // Combat hit
                        if (engine) engine.updateState({
                            chatMessages: [...engine.state.chatMessages.slice(-49),
                            { user: 'System', text: `You hit ${mob.name} for ${damage}!`, color: '#ff0' }]
                        });

                        // Death Logic
                        if (mob.hp <= 0) {
                            // Kill
                            const idx = this.world.level.mobs.indexOf(mob);
                            if (idx > -1) this.world.level.mobs.splice(idx, 1);
                            if (engine) engine.updateState({
                                chatMessages: [...engine.state.chatMessages.slice(-49),
                                { user: 'System', text: `You killed ${mob.name}!`, color: '#f00' }]
                            });
                            // Loot?
                        }
                    }
                    return; // Stood action used
                }
            }

            const tile = this.world.getTile(worldX, worldY);
            if (tile && tile.char !== ' ') {
                // Tier Check
                const tool = this.equipment.rightHand;
                const power = tool && tool.stats ? tool.stats.miningPower : 1; // Hand = 1

                let reqPower = 0;
                let hardness = 'soft';

                if (tile.char === TILE_TYPES.STONE || tile.char === TILE_TYPES.MOUNTAIN) {
                    reqPower = 2; // Needs Stone Pickaxe
                    hardness = 'stone';
                }
                if (tile.char === TILE_TYPES.BEDROCK) {
                    reqPower = 4; // Needs Mese Pickaxe
                    hardness = 'hard';
                }

                // Allow mining Wood/Dirt with Hand (Power 1)

                if (power < reqPower) {
                    if (sound) sound.play('CLINK', 0.8, 1.5); // High pitch clink
                    if (engine) engine.updateState({
                        chatMessages: [...engine.state.chatMessages.slice(-49),
                        { user: 'System', text: `Too hard! Needs Tier ${reqPower} Tool.`, channel: 'system' }]
                    });
                    return;
                }

                // Success - Mine it
                if (engine) engine.sendMineRequest(worldX, worldY, this.level);
                if (sound) sound.play('DIG', 0.5, 0.9 + Math.random() * 0.2);

                // Drop Logic
                // 1. Rubble / Resources
                if (tile.char === TILE_TYPES.DIRT || tile.char === TILE_TYPES.GRASS) {
                    if (Math.random() < 0.4) this.inventory.push({ char: '.', name: 'Rubble', type: 'resource' });
                }

                if (hardness === 'stone') {
                    // Stone Drops
                    this.inventory.push({ char: '.', name: 'Rubble', type: 'resource' }); // Always rubble
                    const roll = Math.random();
                    if (roll < 0.20) this.inventory.push({ char: 'I', name: 'Iron Ore', color: 's', type: 'resource' });
                    if (roll < 0.02) this.inventory.push({ char: 'M', name: 'Mese Crystal', color: 'y', type: 'rare' });
                }

                if (hardness === 'hard') { // Bedrock
                    const roll = Math.random();
                    if (roll < 0.10) this.inventory.push({ char: 'D', name: 'Diamantine', color: 'T', type: 'legendary' });
                }

                // Wood
                if (tile.char === TILE_TYPES.WOOD || tile.char === TILE_TYPES.TREE) {
                    this.inventory.push({ char: '=', name: 'Wood', color: 'u', type: 'resource' });
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

        // Stair Interaction
        if (this.keys.has('>') || this.keys.has('.')) {
            // Descend
            const tile = this.world.getTile(Math.floor(this.x), Math.floor(this.y), this.level, this.z);
            if (tile.char === TILE_TYPES.STAIR_DOWN) {
                // Check if target floor exists? Generator usually ensures this.
                // Assuming Logic: If z=-1 (Dungeon), go deeper? Or if z=0 (Surface), go to z=-1?
                // Standard: Stair Down goes Z-1.
                this.z -= 1;
                this.keys.delete('>'); // One-shot
                this.keys.delete('.');
                console.log("Descended to Z:", this.z);
                this.updateFOV();
                // Play sound
            }
        }
        if (this.keys.has('<') || this.keys.has(',')) {
            // Ascend
            const tile = this.world.getTile(Math.floor(this.x), Math.floor(this.y), this.level, this.z);
            if (tile.char === TILE_TYPES.STAIR_UP) {
                this.z += 1;
                this.keys.delete('<');
                this.keys.delete(',');
                console.log("Ascended to Z:", this.z);
                this.updateFOV();
            }
        }

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
            TILE_TYPES.PLANKS, // Walkable Floor
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
        // Reset current visibility
        this.visible = new Set(); // Store "x,y" strings
        const radius = 12;
        const originX = Math.floor(this.x);
        const originY = Math.floor(this.y);

        this.visible.add(`${originX},${originY}`);
        this.world.setExplored(originX, originY, true);

        // Simple Raycasting (360 degrees, step by 0.1 radians? approx)
        // Optimization: Cast to perimeter of square
        const steps = 360;
        const stepAngle = (Math.PI * 2) / steps;

        for (let i = 0; i < steps; i++) {
            const angle = i * stepAngle;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);

            let x = originX + 0.5; // Center of tile
            let y = originY + 0.5;

            for (let r = 0; r < radius; r++) {
                x += cos;
                y += sin;
                const tx = Math.floor(x);
                const ty = Math.floor(y);

                if (tx < 0 || ty < 0 || tx >= this.world.levels[this.level].width || ty >= this.world.levels[this.level].height) break;

                const key = `${tx},${ty}`;
                this.visible.add(key);
                this.world.setExplored(tx, ty, true);

                const tile = this.world.getTile(tx, ty);
                // Blocks light?
                if (tile.char === '#' || tile.char === 'X' || tile.char === 'T' || tile.char === 'W') {
                    // Wall blocks light
                    break;
                }
            }
        }
    }

    updateCamera() {
        this.camera.x = Math.floor(this.x);
        this.camera.y = Math.floor(this.y);
    }
}

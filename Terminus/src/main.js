/**
 * TERMINUS - MAIN
 */

import { Renderer } from './Renderer.js';
import { World, TILE_TYPES } from './World.js';
import { SoundEngine } from './Sound.js';
import { Noise } from './engine/Noise.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.renderer = new Renderer(this.canvas);
        this.world = new World();
        this.sound = new SoundEngine();
        this.noise = new Noise(Math.random());

        this.player = {
            id: null,
            level: 'town',
            x: Math.floor(this.world.levels.town.width / 2),
            y: Math.floor(this.world.levels.town.height / 2) + 10,
            vx: 0,
            vy: 0,
            subX: 0,
            subY: 0,
            char: '@',
            color: 'y',
            inventory: [],
            gold: 0,
            bankGold: 0,
            equipment: { leftHand: null, rightHand: null },
            runTime: 0,
            z: 0
        };

        this.physics = {
            accel: 0.4, // Fast buildup
            friction: 0.15, // Immediate slowdown
            maxVel: 0.5
        };

        this.remotePlayers = new Map();
        this.camera = { x: 0, y: 0 };
        this.keys = new Set();
        this.showHelp = false;
        this.time = 0;

        // Atmosphere State
        this.atmosphere = {
            type: 'fog', // 'none', 'fog', 'fire', 'spooky'
            windX: 0.05,
            windY: 0.02,
            targetWindX: 0.05,
            targetWindY: 0.02
        };

        // Minimap
        this.miniCanvas = document.getElementById('minimapCanvas');
        this.miniCtx = this.miniCanvas.getContext('2d', { alpha: false });
        this.miniCanvas.width = 190;
        this.miniCanvas.height = 170;

        // Interactive States
        this.lookMode = {
            active: false,
            x: 0,
            y: 0
        };

        // UI Elements
        this.loginOverlay = document.getElementById('login-overlay');
        this.loginButton = document.getElementById('login-button');
        this.usernameInput = document.getElementById('username-input');
        this.uiOverlay = document.getElementById('ui-overlay');
        this.onlineList = document.getElementById('online-list');
        this.invList = document.getElementById('inv-list');
        this.chatMessages = document.getElementById('chat-messages');
        this.chatInput = document.getElementById('chat-input');

        this.socket = io();
        this.setupSocket();

        this.pendingEquip = null;

        this.loginButton.addEventListener('click', () => this.attemptLogin());
        this.usernameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.attemptLogin();
        });

        window.addEventListener('resize', () => this.renderer.resize());
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));

        this.chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const text = this.chatInput.value.trim();
                if (text) {
                    this.socket.emit('chat_message', text);
                    this.chatInput.value = '';
                }
            }
        });

        this.init();
        this.setupTouchControls();
        requestAnimationFrame(() => this.loop());
    }

    attemptLogin() {
        const name = this.usernameInput.value.trim();
        if (name) {
            this.sound.init(); // Initialize audio on first user click
            this.sound.startAmbience();
            this.player.name = name;
            this.socket.emit('login', { name });
            this.loginOverlay.style.display = 'none';
            this.uiOverlay.style.display = 'block';
        }
    }

    setupTouchControls() {
        const btnMap = {
            'btn-up': 'w',
            'btn-down': 's',
            'btn-left': 'a',
            'btn-right': 'd',
            'btn-get': 'g',
            'btn-look': 'l',
            'btn-help': 'h'
        };

        Object.entries(btnMap).forEach(([id, key]) => {
            const btn = document.getElementById(id);
            if (!btn) return;

            // Touch Start - Simulate Key Down
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.handleKeyDown({ key: key, keyCode: 0, preventDefault: () => { } });
            }, { passive: false });

            // Touch End - Simulate Key Up
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.handleKeyUp({ key: key, keyCode: 0, preventDefault: () => { } });
            }, { passive: false });
        });
    }

    setupSocket() {
        this.socket.on('init', (data) => {
            this.player.id = data.id;

            // Restore persistent state if available
            const me = data.players.find(p => p.id === this.player.id);
            if (me) {
                this.player.x = me.x;
                this.player.y = me.y;
                this.player.level = me.level;
                this.player.inventory = me.inventory || [];
                this.player.friends = me.friends || [];
                this.player.gold = me.gold || 0;
                this.player.bankGold = me.bankGold || 0;
                this.player.equipment = me.equipment || { leftHand: null, rightHand: null };

                this.world.setLevel(this.player.level);
                this.updateCamera();
                this.updateInventoryUI();
            }

            data.players.forEach(p => {
                if (p.id !== this.player.id) this.remotePlayers.set(p.id, p);
            });
            this.addMessage('System', `Welcome back, ${this.player.name}! Press H for help.`, 'y');
        });

        this.socket.on('player_update', (p) => {
            if (p.id !== this.player.id) {
                this.remotePlayers.set(p.id, p);
            }
        });

        this.socket.on('player_disconnect', (id) => {
            this.remotePlayers.delete(id);
        });

        this.socket.on('chat_message', (data) => {
            this.addMessage(data.user, data.text);
        });

        this.socket.on('online_list', (list) => {
            this.updateOnlineList(list);
        });

        this.socket.on('summon_received', (data) => {
            if (confirm(`User ${data.fromName} is calling you. Accept?`)) {
                this.socket.emit('summon_accept', data.fromId);
            }
        });

        this.socket.on('teleported', (data) => {
            this.player.x = data.x;
            this.player.y = data.y;
            this.world.setLevel(data.level);
            this.player.level = data.level;
            this.updateCamera();
            this.addMessage('System', 'You have been summoned.', 'b');
        });
    }

    updateOnlineList(list) {
        this.onlineList.innerHTML = '';
        list.forEach(u => {
            if (u.id === this.player.id) return;

            const div = document.createElement('div');
            div.className = 'user-entry';

            const isFriend = this.player.friends && this.player.friends.includes(u.name);
            const friendTag = isFriend ? ' [FRIEND]' : '';

            div.innerHTML = `
                <span>${u.name}${friendTag}</span>
                <div class="user-actions">
                    <button class="call-btn">CALL</button>
                    ${!isFriend ? '<button class="friend-btn">ADD</button>' : ''}
                </div>
            `;

            div.querySelector('.call-btn').onclick = (e) => {
                e.stopPropagation();
                this.socket.emit('summon_request', u.id);
                this.addMessage('System', `Calling ${u.name}...`, 'b');
            };

            if (!isFriend) {
                div.querySelector('.friend-btn').onclick = (e) => {
                    e.stopPropagation();
                    this.socket.emit('add_friend', u.name);
                };
            }

            this.onlineList.appendChild(div);
        });
    }

    addMessage(user, text, color = 'g') {
        const div = document.createElement('div');
        div.innerHTML = `<span style="color: ${color}">[${user}]</span>: ${text}`;
        this.chatMessages.appendChild(div);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    init() {
        console.log('Terminus initialized');
        this.updateFOV();
        this.updateCamera();
    }

    handleKeyDown(e) {
        if (document.activeElement === this.chatInput) {
            if (e.key === 'Enter') {
                const text = this.chatInput.value.trim();
                if (text) this.socket.emit('chat_message', text);
                this.chatInput.value = '';
                this.chatInput.blur();
            }
            return;
        }

        this.keys.add(e.key.toLowerCase());

        // Shortcuts
        if (e.key === 'Enter' && document.activeElement !== this.chatInput) {
            this.chatInput.focus();
        }
        if (e.key.toLowerCase() === 'h') {
            this.showHelp = !this.showHelp;
        }
        if (e.key.toLowerCase() === 'l') {
            this.toggleLookMode();
        }
        if (e.key.toLowerCase() === 'g') {
            this.pickUpItem();
        }

        if (this.lookMode.active) {
            this.moveLookCursor(e.key.toLowerCase());
            return;
        }

        // Equipment Menu Selection
        if (this.pendingEquip !== null) {
            if (e.key === '1') this.equipItem(this.pendingEquip, 'left');
            if (e.key === '2') this.equipItem(this.pendingEquip, 'right');
            if (e.key === '3') this.equipItem(null, 'none');
            return;
        }

        // Zoom Controls
        if (e.key === '+' || e.key === '=') {
            const current = this.renderer.baseCharWidth / 8;
            this.renderer.setZoom(Math.min(4, current + 0.5));
        }
        if (e.key === '-' || e.key === '_') {
            const current = this.renderer.baseCharWidth / 8;
            this.renderer.setZoom(Math.max(0.5, current - 0.5));
        }
    }

    handleKeyUp(e) {
        this.keys.delete(e.key.toLowerCase());
    }

    updatePhysics() {
        let ax = 0;
        let ay = 0;

        const isMoving = this.keys.has('w') || this.keys.has('arrowup') ||
            this.keys.has('s') || this.keys.has('arrowdown') ||
            this.keys.has('a') || this.keys.has('arrowleft') ||
            this.keys.has('d') || this.keys.has('arrowright');

        // Running Acceleration Mechanic
        if (isMoving) {
            this.player.runTime = Math.min(100, this.player.runTime + 1);
        } else {
            this.player.runTime = 0;
        }

        // Ramp acceleration: Starts at 50% (0.2), builds to 200% (0.8) over ~1.6s
        const runFactor = 0.5 + (Math.min(100, this.player.runTime) / 100) * 1.5;
        const currentAccel = this.physics.accel * runFactor;

        if (this.keys.has('w') || this.keys.has('arrowup')) ay -= currentAccel;
        if (this.keys.has('s') || this.keys.has('arrowdown')) ay += currentAccel;
        if (this.keys.has('a') || this.keys.has('arrowleft')) ax -= currentAccel;
        if (this.keys.has('d') || this.keys.has('arrowright')) ax += currentAccel;

        this.player.vx += ax;
        this.player.vy += ay;

        this.player.vx *= this.physics.friction;
        this.player.vy *= this.physics.friction;

        const vel = Math.sqrt(this.player.vx ** 2 + this.player.vy ** 2);
        if (vel > this.physics.maxVel) {
            const ratio = this.physics.maxVel / vel;
            this.player.vx *= ratio;
            this.player.vy *= ratio;
        }

        this.player.subX += this.player.vx;
        this.player.subY += this.player.vy;

        let moveX = 0;
        let moveY = 0;

        if (Math.abs(this.player.subX) >= 1) {
            moveX = Math.sign(this.player.subX);
            this.player.subX -= moveX;
        }
        if (Math.abs(this.player.subY) >= 1) {
            moveY = Math.sign(this.player.subY);
            this.player.subY -= moveY;
        }

        if (moveX !== 0 || moveY !== 0) {
            this.movePlayer(moveX, moveY);
            this.updateFOV();
            this.world.updateMobs(); // Let animals wander 
        }
    }

    updateFOV() {
        const radius = 10;
        const px = this.player.x;
        const py = this.player.y;

        for (let j = -radius; j <= radius; j++) {
            for (let i = -radius; i <= radius; i++) {
                if (i * i + j * j <= radius * radius) {
                    this.world.setExplored(px + i, py + j, true);
                }
            }
        }
    }

    movePlayer(dx, dy) {
        const nx = this.player.x + dx;
        const ny = this.player.y + dy;
        const tile = this.world.getTile(nx, ny);

        // Basic Collision & Walkable tiles
        const walkable = [TILE_TYPES.FLOOR, TILE_TYPES.GRASS, TILE_TYPES.SAND, TILE_TYPES.STAIR_UP, TILE_TYPES.STAIR_DOWN, TILE_TYPES.OPEN_DOOR, TILE_TYPES.MARBLE, TILE_TYPES.ICE, TILE_TYPES.GOLD, TILE_TYPES.POTION, TILE_TYPES.SCROLL, TILE_TYPES.SWORD, TILE_TYPES.SHIELD, TILE_TYPES.ARMOR, TILE_TYPES.RING, TILE_TYPES.AMULET, TILE_TYPES.FOUNTAIN, TILE_TYPES.SIGN];

        // Also allow walking on numeric tiles (shops/vault symbols)
        const isNumeric = !isNaN(tile.char) && tile.char !== ' ';

        if (walkable.includes(tile.char) || isNumeric) {
            this.player.x = nx;
            this.player.y = ny;

            // Level & Storey Transitions
            if (tile.char === TILE_TYPES.STAIR_DOWN) {
                // Check if there is another storey below
                if (this.player.z > 0) {
                    this.player.z--;
                    this.addMessage('System', `Descending to floor ${this.player.z}...`, 'w');
                } else if (this.world.currentLevel === 'town') {
                    this.world.setLevel('dungeon_1');
                    this.player.x = 10;
                    this.player.y = 10;
                    this.player.level = 'dungeon_1';
                    this.player.z = 0;
                    this.addMessage('System', 'Descending into the deep...', 'r');
                }
            } else if (tile.char === TILE_TYPES.STAIR_UP) {
                // Check if we should go to another storey or level
                // For town, let's assume buildings can have upper storeys
                if (this.world.currentLevel === 'town' && this.player.z < 3) {
                    // Try to go up a storey
                    this.player.z++;
                    this.addMessage('System', `Ascending to floor ${this.player.z}...`, 'w');
                } else if (this.world.currentLevel === 'dungeon_1') {
                    this.world.setLevel('town');
                    this.player.x = Math.floor(this.world.levels.town.width / 2) + 40;
                    this.player.y = Math.floor(this.world.levels.town.height / 2) + 40;
                    this.player.level = 'town';
                    this.player.z = 0;
                    this.addMessage('System', 'Returning to the surface...', 'g');
                    this.sound.triggerPickUp();
                }
            }

            this.updateCamera();
            this.socket.emit('move', { x: this.player.x, y: this.player.y, level: this.player.level, char: this.player.char });
            const velocity = Math.sqrt(this.player.vx ** 2 + this.player.vy ** 2);
            this.sound.triggerMove(velocity);

            // Interaction Check
            if (tile.char === TILE_TYPES.GOLD) {
                this.pickUpItem();
                this.sound.triggerPickUp();
            } else if (tile.char === TILE_TYPES.FORGE) {
                this.interactForge();
                this.sound.triggerForge();
            } else if (tile.char === TILE_TYPES.BANK) {
                this.interactBank();
                this.sound.triggerPickUp(); // Tinking coins
            } else if (tile.char === TILE_TYPES.SHOP) {
                this.interactShop();
            } else if (tile.char === TILE_TYPES.HARVEST) {
                this.harvestCrop();
                this.sound.triggerHarvest();
            } else if (tile.char === TILE_TYPES.SIGN) {
                const signs = this.world.level.signs;
                const text = signs[`${nx},${ny}`];
                if (text) {
                    this.addMessage('Sign', text, 'y');
                    this.sound.triggerMenu();
                }
            }
        } else if (tile.char === TILE_TYPES.DOOR) {
            this.world.setTile(nx, ny, TILE_TYPES.OPEN_DOOR, 'u');
            this.addMessage('Action', 'You nudge the door open.');
            this.sound.triggerPickUp(); // Use pickup sound for doors
            this.player.x = nx;
            this.player.y = ny;
            this.updateCamera();
            this.socket.emit('move', { x: this.player.x, y: this.player.y, level: this.player.level, char: this.player.char });
            this.sound.triggerMove();
        } else {
            // Blocked
            this.player.vx = 0;
            this.player.vy = 0;
            this.player.subX = 0;
            this.player.subY = 0;
        }
    }

    toggleLookMode() {
        this.lookMode.active = !this.lookMode.active;
        if (this.lookMode.active) {
            this.lookMode.x = this.player.x;
            this.lookMode.y = this.player.y;
            this.addMessage('System', 'LOOK MODE: Move with arrows. ESC to exit.', 'y');
        }
    }

    moveLookCursor(key) {
        if (key === 'escape') { this.lookMode.active = false; return; }

        let dx = 0, dy = 0;
        if (key === 'w' || key === 'arrowup') dy = -1;
        if (key === 's' || key === 'arrowdown') dy = 1;
        if (key === 'a' || key === 'arrowleft') dx = -1;
        if (key === 'd' || key === 'arrowright') dx = 1;

        const nx = this.lookMode.x + dx;
        const ny = this.lookMode.y + dy;

        // Limit range to 10 cells
        const dist = Math.sqrt((nx - this.player.x) ** 2 + (ny - this.player.y) ** 2);
        if (dist <= 10) {
            this.lookMode.x = nx;
            this.lookMode.y = ny;
        }
    }

    interactForge() {
        const ironCount = this.player.inventory.filter(i => i.char === TILE_TYPES.IRON_SCRAP).length;
        const woodCount = this.player.inventory.filter(i => i.char === TILE_TYPES.WOOD).length;

        this.addMessage('Forge', `You have ${ironCount} Iron and ${woodCount} Wood.`, 'y');

        let crafted = null;
        if (ironCount >= 1 && woodCount >= 1) {
            crafted = { char: TILE_TYPES.HOE, name: 'Hoe' };
            this.consumeLoot(1, 1);
        } else if (ironCount >= 2 && woodCount >= 1) {
            crafted = { char: TILE_TYPES.SWORD, name: 'Iron Sword' };
            this.consumeLoot(2, 1);
        }

        if (crafted) {
            this.player.inventory.push(crafted);
            this.addMessage('Forge', `CLANG! You forged a ${crafted.name}!`, 'fb0');
            this.updateInventoryUI();
            this.syncState();
        } else {
            this.addMessage('Forge', "Need 1 Iron + 1 Wood for a Hoe.", 'w');
        }
    }

    consumeLoot(iron, wood) {
        for (let i = 0; i < iron; i++) {
            const idx = this.player.inventory.findIndex(item => item.char === TILE_TYPES.IRON_SCRAP);
            if (idx !== -1) this.player.inventory.splice(idx, 1);
        }
        for (let i = 0; i < wood; i++) {
            const idx = this.player.inventory.findIndex(item => item.char === TILE_TYPES.WOOD);
            if (idx !== -1) this.player.inventory.splice(idx, 1);
        }
    }

    pickUpItem() {
        const tile = this.world.getTile(this.player.x, this.player.y);
        const pickable = [TILE_TYPES.GOLD, TILE_TYPES.POTION, TILE_TYPES.SCROLL, TILE_TYPES.SWORD, TILE_TYPES.SHIELD, TILE_TYPES.ARMOR, TILE_TYPES.RING, TILE_TYPES.AMULET, TILE_TYPES.BOOK, TILE_TYPES.KEY, TILE_TYPES.HARVEST];

        if (pickable.includes(tile.char)) {
            if (tile.char === TILE_TYPES.GOLD) {
                const amount = Math.floor(Math.random() * 10) + 1;
                this.player.gold += amount;
                this.addMessage('Action', `You find ${amount} gold coins.`, 'y');
                this.world.setTile(this.player.x, this.player.y, TILE_TYPES.FLOOR, 'w');
            } else if (tile.char === TILE_TYPES.HARVEST) {
                this.harvestCrop();
            } else {
                const itemName = this.getItemName(tile.char);
                this.player.inventory.push({ char: tile.char, name: itemName });
                this.world.setTile(this.player.x, this.player.y, TILE_TYPES.FLOOR, 'w');
                this.addMessage('Action', `You pick up a ${itemName}.`, 'y');
            }

            this.updateInventoryUI();
            this.syncState();
        }
    }

    harvestCrop() {
        const itemName = "Fresh Veggies";
        this.player.inventory.push({ char: 'v', name: itemName });
        this.world.setTile(this.player.x, this.player.y, TILE_TYPES.SOIL, 's');
        this.addMessage('Farm', `You harvested some ${itemName}!`, 'g');
        this.updateInventoryUI();
        this.syncState();
    }

    interactBank() {
        if (this.player.gold > 0) {
            const amount = this.player.gold;
            this.player.bankGold += amount;
            this.player.gold = 0;
            this.addMessage('Bank', `Deposited ${amount} gold. Balance: ${this.player.bankGold}`, 'y');
        } else if (this.player.bankGold > 0) {
            const amount = Math.min(this.player.bankGold, 10);
            this.player.bankGold -= amount;
            this.player.gold += amount;
            this.addMessage('Bank', `Withdrew ${amount} gold. Balance: ${this.player.bankGold}`, 'y');
        } else {
            this.addMessage('Bank', "You have no gold to deposit.", 'w');
        }
        this.syncState();
    }

    interactShop() {
        const cost = 5;
        if (this.player.gold >= cost) {
            this.player.gold -= cost;
            this.player.inventory.push({ char: 'f', name: 'Vegan Roast' });
            this.addMessage('Shop', "You bought a delicious Vegan Roast!", 'g');
            this.updateInventoryUI();
        } else {
            this.addMessage('Shop', "Merchant: 'You need 5 gold for a Vegan Roast!'", 'r');
        }
        this.syncState();
    }

    syncState() {
        this.socket.emit('move', {
            x: this.player.x,
            y: this.player.y,
            level: this.player.level,
            char: this.player.char,
            inventory: this.player.inventory,
            gold: this.player.gold,
            bankGold: this.player.bankGold,
            equipment: this.player.equipment
        });
    }

    getItemName(char) {
        if (char === ':') return 'soil';
        if (char === 'v') return 'sprout';
        if (char === 'I') return 'plant';
        if (char === 'W') return 'harvest';
        if (char === 'm') return 'iron scrap';
        if (char === 'y') return 'wood';
        if (char === 'J') return 'hoe';
        if (char === 'i') return 'torch';
        if (char === 'o') return 'mese lamp';
        if (char === 'C') return 'cow';
        if (char === 's') return 'sheep';
        if (char === 'd') return 'deer';
        if (char === 'r') return 'rabbit';
        if (char === 'b') return 'bird';
        if (char === TILE_TYPES.SIGN) return 'wooden sign';

        for (const [name, c] of Object.entries(TILE_TYPES)) {
            if (c === char) return name.toLowerCase();
        }
        return 'item';
    }

    updateInventoryUI() {
        this.invList.innerHTML = '';

        // Gold display
        const goldDiv = document.createElement('div');
        goldDiv.className = 'inv-gold';
        goldDiv.style.color = '#fb0';
        goldDiv.textContent = `GOLD: ${this.player.gold} | BANK: ${this.player.bankGold}`;
        this.invList.appendChild(goldDiv);

        // Equipment display
        const eqDiv = document.createElement('div');
        eqDiv.className = 'inv-eq';
        eqDiv.style.borderBottom = '1px solid #444';
        eqDiv.style.marginBottom = '5px';
        eqDiv.innerHTML = `
            L: ${this.player.equipment.leftHand ? this.player.equipment.leftHand.name : 'empty'}<br>
            R: ${this.player.equipment.rightHand ? this.player.equipment.rightHand.name : 'empty'}
        `;
        this.invList.appendChild(eqDiv);

        this.player.inventory.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'inv-item';
            div.innerHTML = `<span>${item.char} ${item.name}</span>`;

            const equipBtn = document.createElement('button');
            equipBtn.textContent = 'E';
            equipBtn.className = 'item-btn';
            equipBtn.onclick = () => this.showEquipMenu(index);
            div.appendChild(equipBtn);

            this.invList.appendChild(div);
        });
    }

    showEquipMenu(index) {
        const item = this.player.inventory[index];
        this.addMessage('System', `Equip ${item.name}? [1] Left Hand [2] Right Hand [3] Unequip All`, 'y');
        // We'll handle this in handleKeyDown for simplicity
        this.pendingEquip = index;
    }

    equipItem(index, hand) {
        const item = this.player.inventory[index];
        if (hand === 'left') {
            this.player.equipment.leftHand = item;
        } else if (hand === 'right') {
            this.player.equipment.rightHand = item;
        } else if (hand === 'none') {
            this.player.equipment.leftHand = null;
            this.player.equipment.rightHand = null;
        }
        this.updateInventoryUI();
        this.syncState();
        this.addMessage('System', `Equipped ${item ? item.name : 'nothing'} to ${hand}.`, 'w');
        this.pendingEquip = null;
    }

    updateCamera() {
        this.camera.x = this.player.x - Math.floor(this.renderer.cols / 2);
        this.camera.y = this.player.y - Math.floor(this.renderer.rows / 2);
    }

    loop() {
        this.time += 0.01;

        // Modulate Wind - Favor a prevailing direction (East/Southeast)
        if (Math.random() > 0.98) {
            this.atmosphere.targetWindX = 0.05 + Math.random() * 0.1;
            this.atmosphere.targetWindY = 0.02 + (Math.random() - 0.5) * 0.05;
        }
        this.atmosphere.windX += (this.atmosphere.targetWindX - this.atmosphere.windX) * 0.005;
        this.atmosphere.windY += (this.atmosphere.targetWindY - this.atmosphere.windY) * 0.005;

        this.world.updateMobs();
        this.world.updateCrops();

        // Update Sound Ambience based on wind strength and fog density
        const fogDensity = this.atmosphere.type === 'fog' ? 1 : 0;

        // Calculate Light Source Proximity for Audio
        let torchProx = 0;
        let lampProx = 0;
        const viewDist = 15;
        for (let dy = -viewDist; dy <= viewDist; dy++) {
            for (let dx = -viewDist; dx <= viewDist; dx++) {
                const tx = this.player.x + dx;
                const ty = this.player.y + dy;
                const tile = this.world.getTile(tx, ty, this.world.currentLevel, this.player.z);
                const distSq = dx * dx + dy * dy;
                if (distSq < 10 * 10) {
                    const weight = 1.0 - (Math.sqrt(distSq) / 10);
                    if (tile.char === TILE_TYPES.TORCH) torchProx = Math.max(torchProx, weight);
                    if (tile.char === TILE_TYPES.MESE_LAMP) lampProx = Math.max(lampProx, weight);
                }
            }
        }

        // Night Sounds (Insects/Birds)
        if (Math.random() < 0.002 && this.world.currentLevel === 'town') {
            this.sound.triggerInsects();
        }
        if (Math.random() < 0.0005 && this.world.currentLevel === 'town') {
            this.sound.triggerBird();
        }

        // Mob Proximity Sounds
        // Mob Proximity Sounds
        this.world.level.mobs.forEach(mob => {
            const dx = mob.x - this.player.x;
            const dy = mob.y - this.player.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < 15 * 15 && Math.random() < 0.005) {
                // Stereo Panning Logic
                const pan = Math.max(-1, Math.min(1, dx / 10));

                if (mob.char === TILE_TYPES.COW) this.sound.triggerCow(pan);
                if (mob.char === TILE_TYPES.SHEEP) this.sound.triggerSheep(pan);
                if (mob.char === TILE_TYPES.RABBIT) this.sound.triggerRabbit(pan);
                if (mob.char === TILE_TYPES.DEER) this.sound.triggerDeer(pan);
            }
        });

        this.sound.updateAmbience(Math.abs(this.atmosphere.windX) * 2, fogDensity, torchProx, lampProx);

        this.updatePhysics();
        this.render();
        this.updateMinimap();
        requestAnimationFrame(() => this.loop());
    }

    updateMinimap() {
        const level = this.world.level;
        const ctx = this.miniCtx;
        const cw = this.miniCanvas.width;
        const ch = this.miniCanvas.height;

        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, cw, ch);

        const scale = 2; // 2x2 pixels per tile
        const viewW = Math.floor(cw / scale);
        const viewH = Math.floor(ch / scale);

        const startX = Math.max(0, this.player.x - Math.floor(viewW / 2));
        const startY = Math.max(0, this.player.y - Math.floor(viewH / 2));
        const endX = Math.min(level.width, startX + viewW);
        const endY = Math.min(level.height, startY + viewH);

        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                if (!this.world.isExplored(x, y)) continue;

                const tile = this.world.getTile(x, y);
                if (tile.char === ' ') continue;

                let color = '#333';
                if (tile.char === TILE_TYPES.WALL || tile.char === TILE_TYPES.BRICK) color = '#666';
                else if (tile.char === TILE_TYPES.WATER) color = '#00f';
                else if (tile.char === TILE_TYPES.LAVA) color = '#f00';
                else if (tile.char === TILE_TYPES.TREE) color = '#0f0';
                else if (tile.char === TILE_TYPES.STAIR_DOWN || tile.char === TILE_TYPES.STAIR_UP) color = '#ff0';

                ctx.fillStyle = color;
                ctx.fillRect((x - startX) * scale, (y - startY) * scale, scale, scale);
            }
        }

        // Other Players
        for (const [id, p] of this.remotePlayers) {
            if (p.level === this.world.currentLevel) {
                ctx.fillStyle = '#00f';
                ctx.fillRect((p.x - startX) * scale, (p.y - startY) * scale, scale, scale);
            }
        }

        // Local Player (Blinking or distinct color)
        ctx.fillStyle = '#fff';
        if (Math.floor(Date.now() / 250) % 2 === 0) {
            ctx.fillRect((this.player.x - startX) * scale, (this.player.y - startY) * scale, scale, scale);
        }
    }

    render() {
        this.renderer.clear();
        const level = this.world.level;

        // Draw World
        const startX = Math.max(0, this.camera.x);
        const startY = Math.max(0, this.camera.y);
        const endX = Math.min(level.width, this.camera.x + this.renderer.cols);
        const endY = Math.min(level.height, this.camera.y + this.renderer.rows);

        // Multi-Layer Rendering:
        // If z > 0, draw ground floor (z=0) with dimmed colors first
        if (this.player.z > 0) {
            for (let y = startY; y < endY; y++) {
                for (let x = startX; x < endX; x++) {
                    if (!this.world.isExplored(x, y, this.world.currentLevel, 0)) continue;
                    const tile = this.world.getTile(x, y, this.world.currentLevel, 0);
                    if (tile.char !== ' ') {
                        // Dimmed ground floor
                        this.renderer.drawChar(x - this.camera.x, y - this.camera.y, tile.char, 'D');
                    }
                }
            }
            // Add a slight dark overlay to push the ground floor further back
            this.renderer.drawGlobalFilter('black', 0.4);
        }

        // Current Storey
        const z = this.player.z;
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                if (!this.world.isExplored(x, y, this.world.currentLevel, z)) continue;

                const tile = this.world.getTile(x, y, this.world.currentLevel, z);
                if (tile.char !== ' ') {
                    this.renderer.drawChar(x - this.camera.x, y - this.camera.y, tile.char, tile.color);
                }
            }
        }

        // Draw Remote Players (Only if in same level and same storey)
        for (const [id, p] of this.remotePlayers) {
            if (p.level === this.world.currentLevel && (p.z || 0) === z) {
                this.renderer.drawChar(p.x - this.camera.x, p.y - this.camera.y, p.char, 'B');
            }
        }

        // Draw Mobs
        this.world.level.mobs.forEach(m => {
            if (this.world.isExplored(m.x, m.y)) {
                this.renderer.drawChar(m.x - this.camera.x, m.y - this.camera.y, m.char, m.color);
            }
        });

        // Draw Local Player
        this.renderer.drawChar(this.player.x - this.camera.x, this.player.y - this.camera.y, this.player.char, this.player.color);

        // Atmosphere Rendering
        this.drawAtmosphere();

        // Draw Look Cursor & Tooltip
        if (this.lookMode.active) {
            const lx = this.lookMode.x - this.camera.x;
            const ly = this.lookMode.y - this.camera.y;
            this.renderer.drawChar(lx, ly, 'X', 'y', 'D'); // Highlights with crosshair

            const target = this.world.getTile(this.lookMode.x, this.lookMode.y);
            const mobAt = this.world.level.mobs.find(m => m.x === this.lookMode.x && m.y === this.lookMode.y);

            let desc = "Nothingness";
            if (target.char !== ' ') {
                desc = this.getItemName(target.char);
            }
            if (mobAt) desc = `a peaceful ${mobAt.name}`;

            this.renderer.drawText(2, this.renderer.rows - 2, `LOOKING AT: ${desc}`, 'y', 'D');
        }

        // Help Overlay
        if (this.showHelp) {
            const hx = Math.floor(this.renderer.cols / 2) - 15;
            const hy = Math.floor(this.renderer.rows / 2) - 5;
            this.renderer.drawText(hx, hy, "┌──────────────────────────────┐", 'y', 'D');
            this.renderer.drawText(hx, hy + 1, "│       TERMINUS COMMANDS      │", 'y', 'D');
            this.renderer.drawText(hx, hy + 2, "├──────────────────────────────┤", 'y', 'D');
            this.renderer.drawText(hx, hy + 3, "│ WASD/ARROWS : Move (RunAccel)│", 'w', 'D');
            this.renderer.drawText(hx, hy + 4, "│ ENTER       : Chat / Send    │", 'w', 'D');
            this.renderer.drawText(hx, hy + 5, "│ H           : Toggle Help    │", 'w', 'D');
            this.renderer.drawText(hx, hy + 6, "│ G           : Get / Interact │", 'w', 'D');
            this.renderer.drawText(hx, hy + 7, "│ L           : Look Mode      │", 'w', 'D');
            this.renderer.drawText(hx, hy + 8, "│ 1,2,3       : Hand Slot      │", 'w', 'D');
            this.renderer.drawText(hx, hy + 9, "│ + / -       : Zoom In / Out  │", 'w', 'D');
            this.renderer.drawText(hx, hy + 10, "│ ESC         : Close Menus    │", 'w', 'D');
            this.renderer.drawText(hx, hy + 11, "└──────────────────────────────┘", 'y', 'D');
        }

        // Update UI
        document.getElementById('player-coords').textContent = `LVL: ${this.world.currentLevel.toUpperCase()} X: ${this.player.x} Y: ${this.player.y} | GP: ${this.player.gold}`;
    }

    drawAtmosphere() {
        const level = this.world.level;
        const startX = Math.max(0, this.camera.x);
        const startY = Math.max(0, this.camera.y);
        const endX = Math.min(level.width, this.camera.x + this.renderer.cols);
        const endY = Math.min(level.height, this.camera.y + this.renderer.rows);

        // Lighting Engine (Subtractive)
        const isDark = this.world.currentLevel === 'dungeon_1' || (this.world.currentLevel === 'town' && this.atmosphere.type === 'fog');
        if (isDark) {
            this.renderer.drawGlobalFilter('black', 0.6);
        }

        // Light Sources
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const tile = this.world.getTile(x, y, this.world.currentLevel, this.player.z);
                if (tile.char === TILE_TYPES.TORCH || tile.char === TILE_TYPES.MESE_LAMP) {
                    const flicker = tile.char === TILE_TYPES.TORCH ? (1.0 + Math.sin(this.time * 12) * 0.1 * Math.random()) : 1.0;
                    const radius = tile.char === TILE_TYPES.TORCH ? 4 * flicker : 6;
                    const color = tile.char === TILE_TYPES.TORCH ? 'rgba(255,200,100,0.3)' : 'rgba(100,200,255,0.2)';

                    for (let ly = -radius; ly <= radius; ly++) {
                        for (let lx = -radius; lx <= radius; lx++) {
                            const dSq = lx * lx + ly * ly;
                            if (dSq < radius * radius) {
                                const ctxX = (x + lx) - this.camera.x;
                                const ctxY = (y + ly) - this.camera.y;
                                if (ctxX >= 0 && ctxX < this.renderer.cols && ctxY >= 0 && ctxY < this.renderer.rows) {
                                    const strength = (1.0 - Math.sqrt(dSq) / radius) * 0.4;
                                    this.renderer.drawOverlay(ctxX, ctxY, ' ', strength, color);
                                }
                            }
                        }
                    }
                }
            }
        }

        if (this.atmosphere.type === 'fog') {
            const windOffsetX = this.time * this.atmosphere.windX * 0.1;
            const windOffsetY = this.time * this.atmosphere.windY * 0.1;

            for (let y = startY; y < endY; y++) {
                for (let x = startX; x < endX; x++) {
                    const tile = this.world.getTile(x, y, this.world.currentLevel, this.player.z);
                    const isSolid = tile.char === TILE_TYPES.WALL || tile.char === TILE_TYPES.BRICK || tile.char === TILE_TYPES.LOG || tile.char === TILE_TYPES.MOUNTAIN;
                    if (isSolid) continue;

                    let dx = x * 0.15 + windOffsetX;
                    let dy = y * 0.15 + windOffsetY;

                    const n1 = this.noise.get(dx, dy);
                    const n2 = this.noise.get(dx * 2.1 + this.time * 0.05, dy * 2.1 - this.time * 0.05);
                    const noise = (n1 + n2 * 0.5) / 1.5;

                    if (noise > 0.4) {
                        const alpha = 0.05 + (noise - 0.4) * 0.2;
                        this.renderer.drawOverlay(x - this.camera.x, y - this.camera.y, 'W', Math.min(0.2, alpha));
                    }
                }
            }
        } else if (this.atmosphere.type === 'spooky') {
            this.renderer.drawGlobalFilter('p', 0.1);
            const flicker = Math.sin(this.time * 5) > 0.8;
            if (flicker) {
                this.renderer.drawGlobalFilter('black', 0.05);
            }
        } else if (this.atmosphere.type === 'fire') {
            const pulse = (Math.sin(this.time * 10) + 1) / 2;
            this.renderer.drawGlobalFilter('o', 0.05 + pulse * 0.1);

            for (let i = 0; i < 5; i++) {
                const rx = Math.floor(Math.random() * this.renderer.cols);
                const ry = Math.floor(Math.random() * this.renderer.rows);
                this.renderer.drawOverlay(rx, ry, 'r', 0.3);
            }
        }
    }
}

const game = new Game();

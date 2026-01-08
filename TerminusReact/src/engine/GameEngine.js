import { io } from 'socket.io-client';
import { World } from './World';
import { Player } from './Player';
import { Renderer } from './Renderer';
import { SoundSystem } from './SoundSystem';
import { Monster } from './Monster';

export class GameEngine {
    constructor() {
        this.world = new World();
        this.player = new Player(this.world);
        this.renderer = new Renderer();
        this.sound = new SoundSystem();
        this.socket = null;
        this.rafId = null;
        this.lastTime = 0;
        this.remotePlayers = new Map(); // Store other players

        // Reactive State for UI (Subscribers)
        this.state = {
            connected: false,
            joined: false,
            showHelp: false,
            showCrafting: false,
            player: {
                name: '',
                gold: 0,
                hp: 100,
                level: 'fungal_caverns',
                inventory: [],
                equipment: { leftHand: null, rightHand: null }
            },
            onlineList: [],
            chatMessages: []
        };
        this.listeners = new Set();
    }

    // --- State Management ---
    subscribe(callback) {
        this.listeners.add(callback);
        callback(this.state); // Initial emission
        return () => this.listeners.delete(callback);
    }

    updateState(updates) {
        this.state = { ...this.state, ...updates };
        this.listeners.forEach(cb => cb(this.state));
    }

    // --- Initialization & Network ---
    init() {
        if (this.socket) return; // Already init

        console.log("[Engine] Initializing...");
        // Use relative URL in production (served by backend), localhost:8081 in dev
        const url = import.meta.env.PROD ? '/' : 'http://localhost:8081';
        this.socket = io(url);

        this.socket.on('connect', () => {
            console.log("[Engine] Socket Connected");
            this.updateState({ connected: true });
        });

        this.socket.on('init', (data) => {
            console.log("[Engine] Init Payload:", data);
            if (data.id) {
                this.player.id = data.id;
            }
            if (data.players) {
                data.players.forEach(p => {
                    if (p.id !== this.player.id) {
                        this.remotePlayers.set(p.id, p);
                    }
                });
            }
            if (data.worldChanges) {
                data.worldChanges.forEach(c => {
                    this.world.setTile(c.x, c.y, c.char, c.color, c.level);
                });
            }
        });

        this.socket.on('tile_update', (change) => {
            this.world.setTile(change.x, change.y, change.char, change.color, change.level);
        });

        this.socket.on('tile_restore', (data) => {
            this.world.regenerateTile(data.x, data.y, data.level);
        });

        this.socket.on('chat_message', (msg) => {
            this.updateState({
                chatMessages: [...this.state.chatMessages.slice(-49), msg]
            });
        });

        this.socket.on('online_list', (list) => {
            this.updateState({ onlineList: list });
        });

        this.socket.on('player_update', (p) => {
            if (p.id === this.player.id) return; // Ignore self
            this.remotePlayers.set(p.id, p);
        });

        this.socket.on('player_disconnect', (id) => {
            this.remotePlayers.delete(id);
        });
    }

    sendMineRequest(x, y, level) {
        if (this.socket) {
            this.socket.emit('mine_request', { x, y, level });
        } else {
            // Offline fallback?
            this.world.setTile(x, y, ' ', 'w', level);
        }
    }

    login(name) {
        if (!this.socket) return;

        console.log(`[Engine] Login: ${name}`);
        this.player.name = name;
        this.player.level = 'fungal_caverns';

        // Debug Spawn Tile
        const tile = this.world.getTile(Math.floor(this.player.x), Math.floor(this.player.y));
        console.log(`[Engine] Spawn Tile at (${Math.floor(this.player.x)},${Math.floor(this.player.y)}): '${tile.char}'`);

        // 1. Force FOV Update Immediately
        this.player.updateFOV();

        // 2. Determine initial render
        if (this.renderer.ctx) {
            this.renderer.resize();
            this.renderer.renderWorld(this.world, this.player, this.remotePlayers);
        }

        // 3. Emit Login
        this.socket.emit('login', { name });

        // 3.5 Initialize Monsters
        if (this.world.level.mobs) {
            this.world.level.mobs = this.world.level.mobs.map(m => new Monster(m.x, m.y, m));
        }

        // 4. Update UI State & Start Loop
        this.updateState({
            joined: true,
            player: { ...this.state.player, name }
        });

        this.start();
    }

    // --- Game Loop ---
    start() {
        if (this.rafId) return;
        console.log("[Engine] Starting Loop");
        this.lastTime = performance.now();
        this.loop();
    }

    stop() {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    loop() {
        const now = performance.now();
        const dt = (now - this.lastTime) / 1000;
        this.lastTime = now;

        // 1. Update Physics (pass remotePlayers for collision)
        const moved = this.player.update(this.remotePlayers);

        // 1.5 Update Monsters
        if (this.world.level && this.world.level.mobs) {
            this.world.level.mobs.forEach(mob => {
                if (mob.update) {
                    mob.update(dt, this.player, this.world);
                    // Simple Attack Check
                    if (mob.state === 'attack' && mob.timeSinceLastMove === 0) {
                        // Attack!
                        const dmg = Math.max(0, mob.attack - (this.player.equipment.armor?.stats?.defense || 0));
                        this.player.hp -= dmg;
                        this.sound.play('CLINK', 1.0, 0.5); // Hit sound
                        this.updateState({
                            chatMessages: [...this.state.chatMessages.slice(-49),
                            { user: 'System', text: `${mob.name} hits for ${dmg} dmg!`, color: '#f55' }]
                        });
                    }
                }
            });
        }

        // 2. Render (pass remotePlayers for drawing)
        this.renderer.renderWorld(this.world, this.player, this.remotePlayers, now / 1000, { type: 'none' });

        // 3. Network Sync
        if (moved && this.socket) {
            this.socket.emit('move', {
                x: this.player.x, y: this.player.y,
                level: this.player.level,
                char: this.player.char,
                inventory: this.player.inventory
            });
        }

        // 4. Sync UI State
        if (this.player.gold !== this.state.player.gold ||
            this.player.hp !== this.state.player.hp ||
            this.player.inventory.length !== this.state.player.inventory.length) {

            this.updateState({
                player: {
                    ...this.state.player,
                    gold: this.player.gold,
                    hp: this.player.hp,
                    inventory: [...this.player.inventory],
                    equipment: { ...this.player.equipment }
                }
            });
        }

        this.rafId = requestAnimationFrame(() => this.loop());
    }

    craft(recipe) {
        // Double check cost
        const inv = [...this.player.inventory];
        const costToPay = { ...recipe.cost };

        // Verification Loop
        for (const [name, qty] of Object.entries(costToPay)) {
            const have = inv.filter(i => i.name === name).length;
            if (have < qty) return; // Fail validation
        }

        // Consumption Loop (Iterate reverse to safely splice)
        for (const [name, qty] of Object.entries(costToPay)) {
            let removed = 0;
            for (let i = inv.length - 1; i >= 0; i--) {
                if (inv[i].name === name && removed < qty) {
                    inv.splice(i, 1);
                    removed++;
                }
            }
        }

        // Add Result
        inv.push(recipe.result);

        // Auto-equip if applicable
        if (recipe.result.type === 'tool') {
            this.player.equipment.rightHand = recipe.result;
            console.log("Equipped Tool:", recipe.result.name);
        }
        if (recipe.result.type === 'armor') {
            this.player.equipment.armor = recipe.result; // Need to add 'armor' slot to player logic if not exists
        }

        this.player.inventory = inv;
        this.sound.play('DIG', 1.5, 0.5); // Craft Sound (Heavy thud)

        // Update State
        this.updateState({
            player: {
                ...this.state.player,
                inventory: [...this.player.inventory],
                equipment: { ...this.player.equipment }
            }
        });

        this.socket.emit('update_inventory', this.player.inventory);
    }

    // --- Input & Actions ---
    handleInput(type, data) {
        // Delegate to player or UI logic
        if (type === 'keydown') {
            if (data === '=' || data === '+') {
                this.renderer.setZoom(0.1);
            } else if (data === '-' || data === '_') {
                this.renderer.setZoom(-0.1);
            } else if (data.toLowerCase() === 'c') {
                this.updateState({ showCrafting: !this.state.showCrafting, showInventory: false });
            } else if (data.toLowerCase() === 'i') {
                this.updateState({ showInventory: !this.state.showInventory, showCrafting: false });
            } else {
                this.player.handleKeyDown(data);
            }
        }
        if (type === 'keyup') this.player.handleKeyUp(data);
        if (type === 'mousedown') {
            // x, y passed from canvas
            this.player.handleMouseDown(data.x, data.y, this.renderer, this.sound, this);
        }
        if (type === 'toggleHelp') {
            this.updateState({ showHelp: !this.state.showHelp });
        }
    }

    sendChat(text) {
        if (this.socket) this.socket.emit('chat_message', text);
    }
}

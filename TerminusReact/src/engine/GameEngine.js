import { io } from 'socket.io-client';
import { World } from './World';
import { Player } from './Player';
import { Renderer } from './Renderer';
import { SoundSystem } from './SoundSystem';

export class GameEngine {
    constructor() {
        this.world = new World();
        this.player = new Player(this.world);
        this.renderer = new Renderer();
        this.sound = new SoundSystem();
        this.socket = null;
        this.rafId = null;
        this.lastTime = 0;

        // Reactive State for UI (Subscribers)
        this.state = {
            connected: false,
            joined: false,
            showHelp: false,
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
            // Handle other players moving
        });
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
            this.renderer.renderWorld(this.world, this.player);
        }

        // 3. Emit Login
        this.socket.emit('login', { name });

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

        // 1. Update Physics
        const moved = this.player.update();

        // 2. Render
        this.renderer.renderWorld(this.world, this.player, new Map(), now / 1000, { type: 'none' });

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

    // --- Input & Actions ---
    handleInput(type, data) {
        // Delegate to player or UI logic
        if (type === 'keydown') {
            if (data === '=' || data === '+') {
                this.renderer.setZoom(0.1);
            } else if (data === '-' || data === '_') {
                this.renderer.setZoom(-0.1);
            } else {
                this.player.handleKeyDown(data);
            }
        }
        if (type === 'keyup') this.player.handleKeyUp(data);
        if (type === 'mousedown') {
            // x, y passed from canvas
            this.player.handleMouseDown(data.x, data.y, this.renderer, this.sound);
        }
        if (type === 'toggleHelp') {
            this.updateState({ showHelp: !this.state.showHelp });
        }
    }

    sendChat(text) {
        if (this.socket) this.socket.emit('chat_message', text);
    }
}

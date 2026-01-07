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

    // ... (init, login, start, stop, loop stay same)

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
                this.updateState({ showCrafting: !this.state.showCrafting });
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

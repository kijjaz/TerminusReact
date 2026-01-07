/**
 * Minerio - Main Entry Point
 * Handles game loop, initialization, and global state.
 */

import Input from './engine/Input.js';
import Camera from './engine/Camera.js';
import { World } from './world/World.js';
import { PhysicsBody } from './engine/Physics.js';
import { resolveMapCollision } from './engine/Collision.js';
import { PALETTE, BLOCK_COLORS } from './render/Palette.js';
import AudioEngine from './audio/AudioEngine.js';
import { initAudioAssets, SFX } from './audio/Assets.js';
import NetworkClient from './network/NetworkClient.js';
import { Entity, AI } from './entities/Entity.js';
import { TextureLoader, TEXTURE_MAP } from './render/TextureLoader.js';

function surfaceAt(x) { return 30 * 16 - 16; } // Mock surface for spawning

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d', { alpha: false });

        this.width = window.innerWidth;
        this.height = window.innerHeight;

        // Logical resolution (Pixel Art scale)
        this.scale = 4;
        this.logicalWidth = Math.ceil(this.width / this.scale);
        this.logicalHeight = Math.ceil(this.height / this.scale);

        this.canvas.width = this.logicalWidth;
        this.canvas.height = this.logicalHeight;
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;

        this.lastTime = 0;
        this.accumulator = 0;
        this.step = 1 / 60;
        this.isRunning = false;

        this.ui = {
            fps: document.getElementById('fps'),
            startScreen: document.getElementById('start-screen')
        };

        // Engine Systems
        this.input = new Input(this.canvas);
        this.world = new World();
        this.textureLoader = new TextureLoader();

        // Player Entity (defined early for camera)
        this.player = new PhysicsBody(0, -50, 16, 32); // 1x2 tiles
        this.player.gravity = 800;

        this.camera = new Camera(this.logicalWidth, this.logicalHeight);
        this.camera.follow(this.player);

        this.audio = new AudioEngine();
        initAudioAssets(this.audio.ctx);

        this.network = new NetworkClient(this);

        // UI Elements
        this.chatContainer = document.getElementById('chat-container');
        this.chatInput = document.getElementById('chat-input');
        this.chatHistory = document.getElementById('chat-history');
        this.socialPanel = document.getElementById('social-panel');
        this.playerList = document.getElementById('player-list');

        this.chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && this.chatInput.value.trim()) {
                this.network.sendChatMessage(this.chatInput.value);
                this.chatInput.value = '';
                this.chatInput.blur();
            }
        });

        this.entities = [];

        // Player Entity
        this.player = new PhysicsBody(0, -50, 12, 12); // Start in Center/City
        this.player.gravity = 800;

        // Spawn test "Walking Spore"
        const spore = new Entity(40, surfaceAt(40), 12, 12, 'SPORE');
        spore.ai = AI.WALKING_SPORE;
        spore.color = PALETTE.MAGENTA;
        this.entities.push(spore);

        const shell = new Entity(-60, surfaceAt(-60), 12, 12, 'SHELL_HIDE');
        shell.ai = AI.SHELL_HIDE;
        shell.color = PALETTE.YELLOW;
        this.entities.push(shell);

        // Listeners
        window.addEventListener('resize', () => this.resize());
        window.addEventListener('keydown', (e) => this.handleGlobalInput(e));
        window.addEventListener('click', (e) => this.handleGlobalInput(e));
        window.addEventListener('touchstart', (e) => this.handleGlobalInput(e), { passive: false });

        console.log('Minerio Initialized');
    }

    addChatMessage(msg) {
        const div = document.createElement('div');
        div.textContent = msg;
        this.chatHistory.appendChild(div);
        this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
    }

    updatePlayerList(players) {
        this.playerList.innerHTML = '';
        players.forEach(p => {
            if (p.id === this.network.socket.id) return;
            const div = document.createElement('div');
            div.className = 'player-entry';
            div.innerHTML = `
                <span>${p.id.substring(0, 5)}</span>
                <button class="invite-btn" onclick="game.network.sendInvite('${p.id}')">Invite</button>
            `;
            this.playerList.appendChild(div);
        });
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.logicalWidth = Math.ceil(this.width / this.scale);
        this.logicalHeight = Math.ceil(this.height / this.scale);

        this.canvas.width = this.logicalWidth;
        this.canvas.height = this.logicalHeight;
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;

        if (this.camera) {
            this.camera.width = this.logicalWidth;
            this.camera.height = this.logicalHeight;
        }
    }

    handleGlobalInput(e) {
        if (!this.isRunning && (e.code === 'Space' || e.type === 'click' || e.type === 'touchstart')) {
            this.start();
        }
    }

    async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.isStarted = true;
        document.getElementById('start-screen').style.display = 'none';
        this.chatContainer.style.display = 'flex';
        this.socialPanel.style.display = 'block';

        // Load Textures
        await this.textureLoader.load(TEXTURE_MAP);

        await this.audio.resume();
        console.log('Minerio Initialized');
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    }

    loop(timestamp) {
        if (!this.isRunning) return;

        let dt = (timestamp - this.lastTime) / 1000;
        if (dt > 0.25) dt = 0.25;
        this.lastTime = timestamp;
        this.accumulator += dt;

        while (this.accumulator >= this.step) {
            this.update(this.step);
            this.accumulator -= this.step;
        }

        this.render();

        if (this.ui.fps && Math.random() > 0.95) {
            this.ui.fps.innerText = Math.round(1 / dt);
        }

        requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
        this.input.update();

        this.player.update(dt);
        resolveMapCollision(this.player, this.world);

        // Tick World (Nearby chunks)
        const pcx = Math.floor(this.player.pos.x / (16 * 32));
        const pcy = Math.floor(this.player.pos.y / (16 * 32));
        for (let ox = -1; ox <= 1; ox++) {
            for (let oy = -1; oy <= 1; oy++) {
                this.world.tick(pcx + ox, pcy + oy);
            }
        }

        // Inputs
        if (this.input.isDown('KeyA')) this.player.applyForce(-2000, 0);
        if (this.input.isDown('KeyD')) this.player.applyForce(2000, 0);

        if (this.input.isDown('Space') && this.player.onGround) {
            this.player.vel.y = -400;
            this.audio.play(SFX.JUMP, 8, 1.0);
            this.player.onGround = false;
        }

        // Digging
        if (this.input.mouse.leftDown) {
            const wx = this.input.mouse.x + this.camera.x;
            const wy = this.input.mouse.y + this.camera.y;
            const dx = wx - (this.player.pos.x + this.player.size.x / 2);
            const dy = wy - (this.player.pos.y + this.player.size.y / 2);
            if (dx * dx + dy * dy < 64 * 64) {
                if (this.world.setTileAtPos(wx, wy, 0)) {
                    this.audio.play(SFX.DIG, 5, 1.2 + Math.random() * 0.4);
                }
            }
        }

        // Warp
        if (this.input.isPressed('KeyT')) {
            this.player.pos.x = 0;
            this.player.pos.y = -50;
            this.player.vel.x = 0;
            this.audio.play(SFX.JUMP, 10, 0.5);
        }

        this.network.sendMove(this.player.pos.x, this.player.pos.y);
        this.network.update(dt);

        // Update Entities
        for (const ent of this.entities) {
            ent.update(dt, this.world);
            resolveMapCollision(ent, this.world);

            // Interaction with Player (Stomp/Kick)
            if (ent.alive) {
                const dx = Math.abs(this.player.pos.x - ent.pos.x);
                const dy = (this.player.pos.y + this.player.size.y) - ent.pos.y;

                if (this.player.vel.y > 0 && dy > 0 && dy < 10 && dx < 12) {
                    // Stomp
                    if (ent.type === 'SPORE') {
                        ent.alive = false;
                        this.audio.play(SFX.JUMP, 7, 1.5);
                    } else if (ent.type === 'SHELL_HIDE') {
                        if (ent.state === 'WALKING') {
                            ent.state = 'SHELL';
                            ent.color = PALETTE.YELLOW;
                        } else {
                            ent.state = 'KICKED';
                            ent.dir = (this.player.pos.x < ent.pos.x) ? 1 : -1;
                        }
                        this.audio.play(SFX.DIG, 8, 2.0);
                    }
                    this.player.vel.y = -300; // Bounce
                } else if (dx < 10 && Math.abs(this.player.pos.y - ent.pos.y) < 10) {
                    // Side collision (Damage or Kick)
                    if (ent.type === 'SHELL_HIDE' && ent.state === 'SHELL') {
                        ent.state = 'KICKED';
                        ent.dir = (this.player.pos.x < ent.pos.x) ? 1 : -1;
                        this.audio.play(SFX.DIG, 8, 2.0);
                    } else if (ent.state !== 'SHELL') {
                        // Simple damage knockback for now
                        this.player.vel.x = (this.player.pos.x < ent.pos.x) ? -300 : 300;
                        this.player.vel.y = -200;
                    }
                }
            }
        }

        this.camera.follow(this.player);
        this.camera.update();
    }

    render() {
        this.ctx.fillStyle = PALETTE.VOID;
        this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);

        const startCol = Math.floor(this.camera.x / 16);
        const endCol = startCol + (this.logicalWidth / 16) + 1;
        const startRow = Math.floor(this.camera.y / 16);
        const endRow = startRow + (this.logicalHeight / 16) + 1;

        for (let y = startRow; y <= endRow; y++) {
            for (let x = startCol; x <= endCol; x++) {
                const tile = this.world.getTile(x, y);
                if (tile !== 0) {
                    const tex = this.textureLoader.get(tile);
                    if (tex) {
                        this.ctx.drawImage(
                            tex,
                            Math.floor(x * 16 - this.camera.x),
                            Math.floor(y * 16 - this.camera.y),
                            16, 16
                        );
                    } else {
                        // Fallback to color
                        this.ctx.fillStyle = BLOCK_COLORS[tile] || PALETTE.MAGENTA;
                        this.ctx.fillRect(
                            Math.floor(x * 16 - this.camera.x),
                            Math.floor(y * 16 - this.camera.y),
                            16, 16
                        );
                    }
                }
            }
        }

        // Render Entities
        for (const ent of this.entities) {
            if (!ent.alive) continue;
            this.ctx.fillStyle = ent.color || PALETTE.PURPLE;
            this.ctx.fillRect(
                Math.floor(ent.pos.x - this.camera.x),
                Math.floor(ent.pos.y - this.camera.y),
                ent.size.x, ent.size.y
            );
        }

        // Remote Players
        this.ctx.fillStyle = PALETTE.BLUE;
        for (const [id, p] of this.network.remotePlayers) {
            this.ctx.fillRect(
                Math.floor(p.pos.x - this.camera.x),
                Math.floor(p.pos.y - this.camera.y),
                16, 32
            );
        }

        // Local Player
        this.ctx.fillStyle = PALETTE.RED;
        this.ctx.fillRect(
            Math.floor(this.player.pos.x - this.camera.x),
            Math.floor(this.player.pos.y - this.camera.y),
            this.player.size.x,
            this.player.size.y
        );
    }
}

// Start Game
window.game = new Game();

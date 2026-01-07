/**
 * Network Client
 * Handles communication with the Node.js server.
 */
export default class NetworkClient {
    constructor(game) {
        this.game = game;
        this.socket = io(); // Requires socket.io.js in index.html
        this.remotePlayers = new Map();

        this.setupListeners();
    }

    setupListeners() {
        this.socket.on('connect', () => {
            console.log('Connected to server as:', this.socket.id);
        });

        this.socket.on('chat_history', (history) => {
            console.log('Recieved Chat History:', history);
            // TODO: Display in UI
        });

        this.socket.on('chat_message', (msg) => {
            console.log('Chat:', `${msg.user}: ${msg.text}`);
            // TODO: Display in UI
        });

        // Player Synchronization
        this.socket.on('player_update', (data) => {
            if (data.id === this.socket.id) return; // Skip self

            if (!this.remotePlayers.has(data.id)) {
                this.remotePlayers.set(data.id, {
                    pos: { x: data.x, y: data.y },
                    target: { x: data.x, y: data.y },
                    lerp: 0
                });
            } else {
                const p = this.remotePlayers.get(data.id);
                p.target = { x: data.x, y: data.y };
                p.lerp = 0;
            }
        });

        this.socket.on('player_disconnect', (id) => {
            this.remotePlayers.delete(id);
        });

        this.socket.on('invite_received', (data) => {
            if (confirm(`User ${data.from} invited you to a Meeting Room. Accept?`)) {
                this.socket.emit('accept_invite', data.fromFull);
            }
        });

        this.socket.on('teleport', (pos) => {
            this.game.player.pos.x = pos.x;
            this.game.player.pos.y = pos.y;
            this.game.player.vel.x = 0;
            this.game.player.vel.y = 0;
            this.game.audio.play(SFX.JUMP, 10, 0.5); // Warp sound
        });
    }

    sendInvite(targetId) {
        this.socket.emit('send_invite', targetId);
    }

    sendMove(x, y) {
        if (this.socket.connected) {
            this.socket.emit('player_move', { x, y });
        }
    }

    sendChat(text) {
        if (this.socket.connected) {
            this.socket.emit('chat_message', text);
        }
    }

    update(dt) {
        // Interpolate remote players
        for (const [id, p] of this.remotePlayers) {
            p.lerp += dt * 10; // Speed of interpolation
            if (p.lerp > 1) p.lerp = 1;

            p.pos.x += (p.target.x - p.pos.x) * p.lerp;
            p.pos.y += (p.target.y - p.pos.y) * p.lerp;
        }
    }
}

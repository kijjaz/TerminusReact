import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Shared Engine Imports
import { World } from './TerminusReact/src/engine/World.js';
import { Monster } from './TerminusReact/src/engine/Monster.js';

// ESM Fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow Vite dev server
        methods: ["GET", "POST"]
    }
});

const LOG_FILE = path.join(__dirname, 'chat_logs.txt');
const DB_FILE = path.join(__dirname, 'users.json');

function logChat(user, text) {
    const entry = `[${new Date().toISOString()}] ${user}: ${text}\n`;
    fs.appendFileSync(LOG_FILE, entry);
}

const PORT = process.env.PORT || 8081;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
    const index = path.join(__dirname, 'public', 'index.html');
    if (fs.existsSync(index)) {
        res.sendFile(index);
    } else {
        res.status(404).send('Client not found. Please build the frontend.');
    }
});

// --- Server Game State ---
const players = new Map();
let userDb = {};

// Initialize World
console.log("Initializing Server World...");
const world = new World();
// Convert mobs to smart entities immediately
if (world.levels['fungal_caverns'] && world.levels['fungal_caverns'].mobs) {
    world.levels['fungal_caverns'].mobs = world.levels['fungal_caverns'].mobs.map(m => new Monster(m.x, m.y, m));
    console.log(`Server World Ready. Mobs: ${world.levels['fungal_caverns'].mobs.length}`);
} else {
    console.log("Server World Initialized (No Mobs Found/Empty).");
}

// Load DB
if (fs.existsSync(DB_FILE)) {
    try {
        userDb = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch (e) { console.error("DB Load Error", e); }
}

function saveDb() {
    fs.writeFileSync(DB_FILE, JSON.stringify(userDb, null, 2));
}

function broadcastOnlineList() {
    const list = Array.from(players.values()).map(p => ({
        id: p.id,
        name: p.name,
        level: p.level,
        friends: p.friends || []
    }));
    io.emit('online_list', list);
}

// --- Game Loop (AI & Physics) ---
const TICK_RATE = 100; // 100ms = 10 updates/sec
setInterval(() => {
    // Update Mobs
    // We only simulate active levels? For now just 'fungal_caverns'
    if (!world.levels['fungal_caverns']) return;

    const mobs = world.levels['fungal_caverns'].mobs;
    if (!mobs) return;

    const activePlayers = Array.from(players.values()).filter(p => p.level === 'fungal_caverns');

    let mobUpdates = [];

    // Let's iterate mobs
    mobs.forEach((mob, idx) => {
        if (!mob.hp || mob.hp <= 0) return; // Dead

        // Search for nearest player
        let target = null;
        let minDist = 999;

        activePlayers.forEach(p => {
            const dist = Math.sqrt((p.x - mob.x) ** 2 + (p.y - mob.y) ** 2);
            if (dist < minDist) {
                minDist = dist;
                target = p;
            }
        });

        // If target found within range, pass it to mob.update
        // We pass 0.1s as dt
        if (target && minDist < 20) {
            mob.update(0.1, target, world);
        } else {
            mob.update(0.1, { x: -999, y: -999 }, world);
        }

        // Push State
        mobUpdates.push({
            id: idx, // Use array index as ID for now
            x: mob.x, y: mob.y,
            char: mob.char, color: mob.color,
            hp: mob.hp, maxHp: mob.maxHp
        });
    });

    io.emit('mob_update', { level: 'fungal_caverns', mobs: mobUpdates });

}, TICK_RATE);


io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    socket.on('login', (data) => {
        const name = data.name || 'Stranger';
        if (!userDb[name]) {
            userDb[name] = {
                name: name, x: 200, y: 200, level: 'fungal_caverns',
                char: '@', inventory: [], friends: [], bankGold: 0,
                hp: 100
            };
        }
        const userData = userDb[name];
        players.set(socket.id, { ...userData, id: socket.id });

        socket.emit('init', { id: socket.id, players: Array.from(players.values()) });
        broadcastOnlineList();
        saveDb();
    });

    socket.on('move', (pos) => {
        const p = players.get(socket.id);
        if (p) {
            p.x = pos.x; p.y = pos.y; p.level = pos.level;
            p.char = pos.char; p.inventory = pos.inventory;
            userDb[p.name] = { ...p };
            delete userDb[p.name].id;
            socket.broadcast.emit('player_update', p);
        }
    });

    // Combat Request
    socket.on('attack_request', (data) => {
        const p = players.get(socket.id);
        if (!p) return;

        const mobs = world.levels[p.level].mobs;
        const mob = mobs.find(m => Math.floor(m.x) === data.x && Math.floor(m.y) === data.y);

        if (mob) {
            let damage = 1;
            if (data.damage) damage = Math.min(20, data.damage); // Clamp

            mob.takeDamage(damage);
            io.emit('chat_message', { user: 'System', text: `${p.name} hit ${mob.name} for ${damage}!`, color: '#ff0' });

            if (mob.hp <= 0) {
                const idx = mobs.indexOf(mob);
                if (idx > -1) mobs.splice(idx, 1);
                io.emit('chat_message', { user: 'System', text: `${mob.name} was killed by ${p.name}!`, color: '#f00' });
                io.emit('sound_effect', { name: 'KILL', x: mob.x, y: mob.y });
            } else {
                io.emit('sound_effect', { name: 'CLINK', x: mob.x, y: mob.y });
            }
        }
    });

    socket.on('update_inventory', (inv) => {
        const p = players.get(socket.id);
        if (p) {
            p.inventory = inv;
            userDb[p.name].inventory = inv;
            saveDb();
        }
    });

    socket.on('chat_message', (textOrMsg) => {
        const p = players.get(socket.id);
        if (!p) return;

        let text = typeof textOrMsg === 'string' ? textOrMsg : textOrMsg.text;
        const msg = { user: p.name, text, channel: 'global' };
        io.emit('chat_message', msg);
    });

    socket.on('disconnect', () => {
        const p = players.get(socket.id);
        if (p) saveDb();
        players.delete(socket.id);
        io.emit('player_disconnect', socket.id);
        broadcastOnlineList();
    });
});

server.listen(PORT, () => {
    console.log(`TERMINUS Server (ESM) running on http://localhost:${PORT}`);
});

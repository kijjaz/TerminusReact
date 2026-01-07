const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow Vite dev server
        methods: ["GET", "POST"]
    }
});

const LOG_FILE = path.join(__dirname, 'chat_logs.txt');

function logChat(user, text) {
    const entry = `[${new Date().toISOString()}] ${user}: ${text}\n`;
    fs.appendFileSync(LOG_FILE, entry);
}

const PORT = process.env.PORT || 8081;

// Serve static files from 'public' directory (React Build)
app.use(express.static(path.join(__dirname, 'public')));

// SPA Fallback: Send index.html for any other requests
app.get('*', (req, res) => {
    // Check if request is API-like?? No, socket.io handles its own path.
    // Ensure we don't block socket.io (it intercepts before or via upgrade).
    // Actually socket.io is attached to 'server', not 'app' routes, so this catch-all is fine for HTTP.
    // But we should verify file exists to avoid loop?
    const index = path.join(__dirname, 'public', 'index.html');
    if (fs.existsSync(index)) {
        res.sendFile(index);
    } else {
        res.status(404).send('Client not found. Please build the frontend.');
    }
});

const players = new Map();
const worldChanges = new Map();
const DB_FILE = path.join(__dirname, 'users.json');

let userDb = {};
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

io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    socket.on('login', (data) => {
        const name = data.name || 'Stranger';

        // Restore or Create
        if (!userDb[name]) {
            userDb[name] = {
                name: name,
                x: 200, y: 200,
                level: 'town',
                char: '@',
                inventory: [],
                friends: [],
                bankGold: 0
            };
        }

        const userData = userDb[name];
        players.set(socket.id, {
            ...userData,
            id: socket.id
        });

        // Send Initial State
        const changesList = Array.from(worldChanges.values());
        socket.emit('init', {
            id: socket.id,
            players: Array.from(players.values()),
            worldChanges: changesList
        });

        broadcastOnlineList();
        console.log(`User logged in: ${name} (${socket.id})`);
        saveDb();
    });

    socket.on('move', (pos) => {
        const p = players.get(socket.id);
        if (p) {
            p.x = pos.x;
            p.y = pos.y;
            p.level = pos.level || 'town';
            p.char = pos.char || '@';
            p.inventory = pos.inventory || p.inventory;

            // Sync to DB
            userDb[p.name] = { ...p };
            delete userDb[p.name].id; // Don't persist temporary socket id

            socket.broadcast.emit('player_update', p);

            // Periodically save
            if (Math.random() > 0.95) saveDb();
        }
    });

    // --- World Modification & Economy ---
    // key: "level:x,y" => { x, y, level, char, color, originalChar, originalColor }
    // We only store *changes*.

    socket.on('mine_request', (data) => {
        const p = players.get(socket.id);
        if (!p) return;

        // Vlaidate distance (Anti-cheat/Sanity)
        const dx = data.x - p.x;
        const dy = data.y - p.y;
        if (dx * dx + dy * dy > 100) return; // Too far

        const key = `${data.level}:${data.x},${data.y}`;

        // 1. Record Change (Hole)
        const change = {
            x: data.x, y: data.y, level: data.level,
            char: ' ', color: 'w' // Void/Air
        };
        worldChanges.set(key, change);

        // 2. Broadcast
        io.emit('tile_update', change);

        // 3. Respawn Timer (3 Minutes / 180s)
        // For testing, let's do 60s
        setTimeout(() => {
            if (worldChanges.has(key)) {
                worldChanges.delete(key);
                io.emit('tile_restore', { x: data.x, y: data.y, level: data.level });
            }
        }, 60000);
    });

    socket.on('place_request', (data) => {
        // Later: Logic for placing Mese Lamps
    });

    socket.on('update_inventory', (inv) => {
        const p = players.get(socket.id);
        if (p) {
            p.inventory = inv;
            userDb[p.name].inventory = inv;
            saveDb();
        }
    });

    socket.on('update_bank', (data) => {
        const p = players.get(socket.id);
        if (p) {
            p.bankGold = data.bankGold;
            userDb[p.name].bankGold = p.bankGold;
            saveDb();
        }
    });

    socket.on('add_friend', (friendName) => {
        const p = players.get(socket.id);
        if (p && userDb[friendName]) {
            if (!p.friends) p.friends = [];
            if (!p.friends.includes(friendName)) {
                p.friends.push(friendName);
                userDb[p.name].friends = p.friends;
                saveDb();
                socket.emit('chat_message', { user: 'System', text: `${friendName} added to your friends.` });
                broadcastOnlineList();
            }
        }
    });

    socket.on('chat_message', (text) => {
        const p = players.get(socket.id);
        if (!p) return;

        let user = p.name;

        // Command Parsing
        if (text.startsWith('/')) {
            const parts = text.split(' ');
            const cmd = parts[0].toLowerCase();
            const arg = parts.slice(1).join(' ');

            if (cmd === '/join' || cmd === '/room') {
                const roomName = arg || 'meeting';
                p.chatChannel = roomName;
                socket.emit('chat_message', { user: 'System', text: `Joined room: [${roomName}]` });
                return;
            }
            if (cmd === '/global' || cmd === '/world') {
                p.chatChannel = 'global';
                socket.emit('chat_message', { user: 'System', text: `Switched to World Chat.` });
                return;
            }
            if (cmd === '/me') {
                // Emote
                const msg = { user: user, text: `* ${arg} *`, type: 'emote', channel: p.chatChannel || 'global' };
                logChat(user, msg.text);
                io.emit('chat_message', msg); // Emotes are global for now? Or scoped? Let's scope them.
                // Actually fall through to scoped logic below for consistency if I extract it.
                // Let's just handle commands here and standard flows below.
            }
        }

        // Standard Message Logic
        const channel = p.chatChannel || 'global';
        const msgObj = { user, text, channel };
        logChat(user, text);

        if (channel === 'global') {
            io.emit('chat_message', msgObj);
        } else {
            // Room Broadcast
            Array.from(players.values()).forEach(target => {
                const targetSocket = io.sockets.sockets.get(target.id);
                if (targetSocket && (target.chatChannel === channel)) {
                    targetSocket.emit('chat_message', msgObj);
                }
            });
            // Also send to sender if not mapped above (it is mapped above)
        }
    });

    // Social Commands
    socket.on('summon_request', (targetId) => {
        const p = players.get(socket.id);
        if (p) {
            io.to(targetId).emit('summon_received', { fromId: socket.id, fromName: p.name });
        }
    });

    socket.on('summon_accept', (fromId) => {
        const target = players.get(socket.id);
        const caller = players.get(fromId);
        if (target && caller) {
            // Teleport caller to target
            caller.x = target.x;
            caller.y = target.y + 1;
            caller.level = target.level;
            io.emit('player_update', caller);
            io.to(fromId).emit('teleported', { x: caller.x, y: caller.y, level: caller.level });
        }
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
    console.log(`TERMINUS server running on http://localhost:${PORT}`);
});

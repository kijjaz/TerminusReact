const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 8080;

app.use(express.static(__dirname));

// Chat History State
const MAX_CHAT_HISTORY = 100;
let chatHistory = [];

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Send history to new user
    socket.emit('chat_history', chatHistory);

    // Player Sync
    socket.on('player_move', (data) => {
        socket.broadcast.emit('player_update', {
            id: socket.id,
            x: data.x,
            y: data.y
        });
    });

    // Meeting Room / Invite System
    socket.on('send_invite', (targetId) => {
        io.to(targetId).emit('invite_received', {
            from: socket.id.substring(0, 4),
            fromFull: socket.id
        });
    });

    socket.on('accept_invite', (fromId) => {
        // Teleport target to the sender (or a specific room)
        const roomPos = { x: 0, y: -50 }; // Default Meeting Room @ Castle
        socket.emit('teleport', roomPos);
    });

    socket.on('chat_message', (msg) => {
        const fullMsg = {
            id: Date.now() + Math.random(),
            user: socket.id.substring(0, 4), // Simple placeholder name
            text: msg,
            time: new Date().toLocaleTimeString()
        };

        // Add to history
        chatHistory.push(fullMsg);
        if (chatHistory.length > MAX_CHAT_HISTORY) {
            chatHistory.shift();
        }

        // Broadcast to all
        io.emit('chat_message', fullMsg);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

server.listen(port, () => {
    console.log(`Minerio server listening on port ${port}`);
});

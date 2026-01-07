/**
 * TERMINUS Terminal Client (AI Interface)
 * Usage: node terminal_client.js "Username" "Message"
 */
const { io } = require('socket.io-client');

const args = process.argv.slice(2);
const username = args[0] || 'TerminusBot';
const message = args[1];

const socket = io('http://localhost:8081');

socket.on('connect', () => {
    console.log(`[BOT] Connected as ${username}`);
    socket.emit('login', { name: username });

    if (message) {
        socket.emit('chat_message', message);
        console.log(`[BOT] Sent: ${message}`);
        setTimeout(() => process.exit(0), 500);
    } else {
        console.log('[BOT] No message provided. Staying connected to listen...');
    }
});

socket.on('chat_message', (data) => {
    console.log(`[CHAT] ${data.user}: ${data.text}`);
});

socket.on('connect_error', (err) => {
    console.error('[BOT] Connection error:', err.message);
    process.exit(1);
});

#!/bin/bash
echo "--- Minerio Local Test Script ---"

# Check for node
if ! command -v node &> /dev/null
then
    echo "Node.js not found. Please install it."
    exit
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

echo "Starting server on http://localhost:8080"
echo "Press Ctrl+C to stop."

# Start the server and open the browser
node server.js &
SERVER_PID=$!

# Wait for server to start
sleep 1

# Open browser (macOS)
open "http://localhost:8080"

# Wait for Ctrl+C
wait $SERVER_PID

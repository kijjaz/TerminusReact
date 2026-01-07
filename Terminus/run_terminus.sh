#!/bin/bash
echo "--- Terminus ANSI Multiplayer ---"
# Kill any existing server on port 8081
PORT=8081
PID=$(lsof -t -i:$PORT)
if [ -n "$PID" ]; then
    echo "Killing existing process $PID on port $PORT..."
    kill -9 $PID
fi
echo "Starting server on http://localhost:$PORT"
node server.js

#!/bin/bash

# Function to clean up background processes
cleanup() {
    echo "Stopping processes..."
    kill $SERVER_PID $FLUID_PID 2>/dev/null
    exit 0
}

# Set up trap for SIGINT (Ctrl+C)
trap cleanup SIGINT

# Create logs directory if it doesn't exist
mkdir -p logs

# Start OSC listener server in the background with no console output
cd osc-listener
npm run server -- --no-console --quiet --log-file ./logs/osc-listener.log &
SERVER_PID=$!

# Wait for the server to start
sleep 2

# Start the static file server for pure-js-fluid
echo "Starting static file server for pure-js-fluid..."
cd ../pure-js-fluid
npm install
npm start &
FLUID_PID=$!

# Wait for the fluid static server to start
sleep 2

# Open the pure-js-fluid page in the default web browser
open http://localhost:8000

echo "OSC listener and visualizer are running!"
echo "Logs are being written to:"
echo "- OSC Listener: logs/osc-listener.log"
echo "- Static Server: logs/static-server.log"
echo "Press Ctrl+C to stop both processes"

# Keep the script running and handle signals
while true; do
    sleep 1
done 

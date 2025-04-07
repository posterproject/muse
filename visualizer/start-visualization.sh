#!/bin/bash

# This script helps start the Muse brainwave visualization

echo "Starting Muse Brainwave Visualization..."
echo "----------------------------------------"

# Check if the OSC listener is running
nc -z localhost 3001 > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "⚠️  Warning: OSC listener does not appear to be running on port 3001."
    echo "   To start it, run the following in another terminal:"
    echo "   cd ~/Desktop/muse/osc-listener && npm run server"
    echo ""
    read -p "Do you want to continue anyway? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Navigate to the visualizer directory
cd ~/Desktop/muse/visualizer

# Check what server options are available
if command -v python3 > /dev/null 2>&1; then
    echo "Starting server with Python 3..."
    python3 -m http.server 8080
elif command -v python > /dev/null 2>&1; then
    # Check Python version
    PYTHON_VERSION=$(python -c 'import sys; print(sys.version_info[0])')
    if [ "$PYTHON_VERSION" -eq 3 ]; then
        echo "Starting server with Python 3..."
        python -m http.server 8080
    else
        echo "Starting server with Python 2..."
        python -m SimpleHTTPServer 8080
    fi
elif command -v npx > /dev/null 2>&1; then
    echo "Starting server with Node.js..."
    npx http-server -p 8080
else
    echo "❌ Error: Could not find Python or Node.js."
    echo "   Please install Python or Node.js to run the server,"
    echo "   or manually set up a web server to serve the files in:"
    echo "   ~/Desktop/muse/visualizer"
    exit 1
fi
# OSC Listener

A simple OSC (Open Sound Control) listener application that allows you to receive and display OSC messages in real-time.

## Features

* Listen for OSC messages on a specified UDP port
* Real-time message display
* Configurable update rate
* Start/Stop functionality
* Status indicator

## Prerequisites

* Node.js (version specified in .nvmrc)
* npm (comes with Node.js)

The project uses:
- Node.js 23.10.0
- TypeScript
- Vite for development and building
- OSC.js for OSC communication

## Installation

1. Clone the repository
2. Navigate to the project directory:
   ```bash
   cd osc-listener
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

## Development

To run the application locally:

1. Start the backend server:
   ```bash
   npm run server
   ```
   This will start the Express server on port 3001.

2. In a new terminal, start the frontend development server:
   ```bash
   npm run dev
   ```
   This will start the Vite development server on port 3000.

3. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Building for Production

To build the application for production:

```bash
npm run build
```

This will create a `dist` directory with the production-ready files.

## Testing

To test the OSC listener:

1. Start both the backend and frontend servers as described above
2. Use an OSC client (like TouchOSC, Max/MSP, or SuperCollider) to send messages to:
   ```
   localhost:9005 (or a port selected on the config web page)
   ```
3. The messages should appear in the web interface

## Project Structure

```
osc-listener/
├── frontend/           # Frontend source files
│   ├── index.html     # Main HTML file
│   └── index.ts       # Frontend TypeScript code
├── src/               # Backend source files
│   ├── server.ts      # Express server
│   ├── osc-listener.ts # OSC listener implementation
│   └── config.ts      # Configuration types
├── package.json       # Project dependencies and scripts
└── tsconfig.json      # TypeScript configuration
```

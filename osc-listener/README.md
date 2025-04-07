# OSC Listener

A Node.js server that listens for OSC messages and provides a REST API to access the transformed data.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to `http://localhost:3001`

## API Documentation

### Start OSC Listener
```http
POST /api/start
Content-Type: application/json

{
    "localAddress": "0.0.0.0",
    "localPort": 9005,
    "updateRate": 1
}
```

Starts listening for OSC messages on the specified address and port.

### Stop OSC Listener
```http
POST /api/stop
```

Stops the OSC listener and clears all buffers.

### Get Available Addresses
```http
GET /api/addresses
```

Returns an array of all OSC addresses that have received messages.

### Get All Transformed Messages
```http
GET /api/messages
```

Returns a JSON object with transformed values for all addresses:
```json
{
    "/address1": 0.5,
    "/address2": 0.8
}
```

### Get Transformed Message for Specific Address
```http
GET /api/messages/:address
```

Returns the transformed value for a specific OSC address. The address should be URL-encoded if it contains special characters.

Example request:
```http
GET /api/messages/%2Falpha
```

Example response:
```json
0.75
```

If the address hasn't received any messages, returns `null`:
```json
null
```

Error responses:
- 400 Bad Request: If the address is invalid
- 404 Not Found: If the address hasn't received any messages

### Health Check
```http
GET /api/health
```

Returns "OK" if the server is running.

## Configuration

- `localAddress`: IP address to listen on (default: "0.0.0.0")
- `localPort`: UDP port to listen on (default: 9005)
- `updateRate`: Update rate in Hz (default: 1)
- `debug`: Enable debug logging (default: false)

## Features

- Listens for OSC messages on any address
- Maintains separate buffers for each OSC address
- Provides transformed values through REST API
- Supports custom transformation functions
- Real-time updates

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

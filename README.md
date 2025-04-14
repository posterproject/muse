# Muse

A collection of tools for OSC message processing and visualization.

## Subprojects

### OSC Listener (`osc-listener/`)
A Node.js server that listens for OSC messages and provides a web interface for monitoring and transforming them. Features include:
- OSC message reception and transformation
- WebSocket-based real-time updates
- Configurable message filtering and aggregation
- REST API for message history and configuration

### Fluid Visualizer (`fluid-visualizer/`)
A previous version of the fluid dynamics visualization, using TypeScript

### Pure JS Fluid Visualizer (`pure-js-fluid/`)
A static file server that hosts the fluid visualization interface.
- Pure JavaScript implementation
- Real-time data visualization
- Responsive design

Provides:
- Simple HTTP server for static files
- Basic error handling and logging

## Getting Started

### Prerequisites
- Node.js (v18 or later)
- npm (v9 or later)

### Installation
1. Clone the repository
2. Install dependencies for each subproject:
   ```bash
   cd osc-listener && npm install
   cd ../pure-js-fluid && npm install
   ```

### Running the Application

The easiest way to start all components is using the provided `run.sh` script:

```bash
./run.sh
```

This will:
1. Start the OSC Listener server
2. Start the PureJS Fluid Visualizer
3. Open the visualization in your default web browser

### Logging

Logs are written to the following locations by default:
- OSC Listener: `logs/osc-listener.log`
- Static Server: `logs/static-server.log`

The logging system supports different verbosity levels (passed as command-line options to osc-listener in `run.sh`):
- Debug: Detailed logging for development
- Info: General operational information
- Error: Error messages only

### Stopping the Application

Press `Ctrl+C` in the terminal where `run.sh` is running to stop all components gracefully.

## Development

### Building
Each subproject can be built independently:

```bash
# Build OSC Listener
cd osc-listener && npm run build
```

### Testing
Run tests for each subproject:

```bash
# Test OSC Listener
cd osc-listener && npm test
```

## License

MIT

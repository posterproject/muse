# OSC Listener

A simple web-based OSC (Open Sound Control) listener with real-time message display.

## Features

- Configurable local address and port
- Real-time OSC message display
- Adjustable update rate
- Modern web interface
- TypeScript support

## Setup

1. Ensure you have Node.js 23.10.0 installed:
```bash
nvm install 23.10.0
nvm use
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## Configuration

Default settings:
- Local Address: 0.0.0.0
- Local Port: 9005
- Update Rate: 1 Hz

These can be adjusted through the web interface.

## Development

The project uses:
- Node.js 23.10.0
- TypeScript
- Vite for development and building
- OSC.js for OSC communication

## License

ISC 
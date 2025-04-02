# OSC Mock Stream

A command-line utility that generates mock OSC messages and sends them over UDP at a specified rate.

## Features

- Sends OSC messages at configurable rate (default: 256 messages/second)
- Can read messages from a CSV file if provided
- Generates random mock data if no CSV file is provided
- Configuration through JSON file

## Installation

```bash
npm install
npm run build
```

## Usage

Run without CSV file (generates random data):
```bash
npm start
```

Run with CSV file:
```bash
npm start path/to/your/data.csv
```

## Configuration

The application can be configured through `config.json`:

```json
{
    "targetAddress": "127.0.0.1",
    "targetPort": 9005,
    "messageRate": 256
}
```

- `targetAddress`: The IP address to send OSC messages to
- `targetPort`: The port to send OSC messages to
- `messageRate`: Number of messages to send per second

## CSV Format

The CSV file should have columns that match the OSC message format. Each row will be converted into an OSC message. 
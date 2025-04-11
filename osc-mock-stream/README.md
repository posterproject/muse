# OSC Mock Stream

A simple tool to generate mock OSC (Open Sound Control) data streams for testing and development.

## Features

- Streams OSC messages via UDP
- Configurable message rate
- Can read from CSV files or generate random data
- Supports multiple data formats:
  - Standard CSV format with OSC address and values
  - Columns format where each column is an OSC channel

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

Run with a standard CSV file:
```bash
npm start path/to/your/data.csv
```

Run with a columns format file:
```bash
npm start path/to/your/data.columns
```

## Configuration

Edit the `config.json` file to configure the OSC stream:

```json
{
  "targetAddress": "127.0.0.1", 
  "targetPort": 9005,           
  "messageRate": 10            
}
```

- `targetAddress`: The IP address to send OSC messages to
- `targetPort`: The port to send OSC messages to
- `messageRate`: Number of messages to send per second

## Input Data Formats

The tool automatically detects the file format based on the file extension:
- Files ending with `.columns` use the columns format
- All other files use the standard CSV format

### Standard CSV Format

The standard CSV format should have columns in this order:

1. Timestamp (ignored)
2. OSC address (e.g., `/device/sensor1`)
3. One or more values to be sent as floats

Example:
```
timestamp,/sensor/acc,10.5,20.3,30.1
timestamp,/sensor/gyro,1.2,2.3,3.4
```

### Columns Format (.columns extension)

The columns format has:
- A header row containing OSC addresses/channel names
- Each subsequent row contains values for each channel (one value per channel)
- Values are sent as arrays with a single element
- Columns are separated by whitespace (spaces or tabs)

Example:
```
muse/gyro1 muse/gyro2 muse/gyro3 muse/acc1 muse/acc2
0.127106 0.194397 -0.314026 0.222717 -0.0012207
-0.112152 -1.07666 -0.740204 0.221191 -0.00457764
```

This will send:
- `/muse/gyro1` with value `0.127106`
- `/muse/gyro2` with value `0.194397`
- etc.

## Development

```bash
npm install
npm run build
```

## License

MIT
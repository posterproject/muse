# Wave Visualizer

A real-time waveform visualizer that displays five different waves (alpha, beta, delta, gamma, theta) with smooth transitions. Connects to the OSC Listener service to fetch real brain wave data.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to `http://localhost:5173`

The visualizer will automatically start the OSC Listener service when the page loads and stop it when the page is closed.

## Features

- Five distinct wave types (alpha, beta, delta, gamma, theta)
- Sine wave visualization that peaks at data values and returns to zero
- Complete sine cycle synchronized with data update interval
- Real-time data from OSC Listener
- Fallback to alternative data sources if primary source unavailable
- Responsive canvas that adjusts to window size
- Color-coded waves for easy identification
- Auto-start and auto-stop of the OSC Listener server

## OSC Integration

The visualizer connects to the OSC Listener service and requests data from:
- Primary: `/muse/elements/alpha_absolute2`, `/muse/elements/beta_absolute2`, etc.
- Fallback: `/muse/dsp/elements/alpha`, `/muse/dsp/elements/beta`, etc.

This allows compatibility with different Muse headband data formats.

### Automatic Server Management

The visualizer now includes the following automated server management features:
- On page load, it automatically attempts to start the OSC Listener server
- If the server is already running, it connects to the existing instance
- When the page is closed, it gracefully disconnects from the server
- If it's the last client connected, it will stop the server completely
- Displays an error message if it cannot connect to the server

## Visualization Behavior

Each wave is displayed as a sine wave with the following characteristics:
- The amplitude is modulated by the incoming data value from the OSC Listener
- The sine wave completes one full cycle during each update interval
- At the beginning of each update, the wave starts at zero
- The wave peaks at the target value in the middle of the cycle
- The wave returns to zero by the end of the cycle

This creates a pulsing effect that represents the intensity of each brain wave type.

## Configuration

- `UPDATE_INTERVAL`: Frequency to fetch new data (default: 1000ms)
- `SINE_PERIOD`: Duration of one complete sine wave cycle (default: same as UPDATE_INTERVAL)
- `NUM_POINTS`: Number of points in each wave (default: 500)
- `WAVE_HEIGHT`: Percentage of vertical space for waves (default: 80%) 
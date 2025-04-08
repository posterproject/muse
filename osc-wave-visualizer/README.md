# Wave Visualizer

A real-time waveform visualizer that displays five different waves (alpha, beta, delta, gamma, theta) with smooth transitions. Connects to the OSC Listener service to fetch real brain wave data.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the OSC Listener service (from the osc-listener directory):
```bash
npm run server
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:5173`

## Features

- Five distinct waves (alpha, beta, delta, gamma, theta)
- Smooth bezier-curve transitions
- Real-time data from OSC Listener
- Fallback to alternative data sources if primary source unavailable
- Responsive canvas that adjusts to window size
- Color-coded waves for easy identification

## OSC Integration

The visualizer now connects to the OSC Listener service and requests data from:
- Primary: `/muse/elements/alpha_absolute2`, `/muse/elements/beta_absolute2`, etc.
- Fallback: `/muse/dsp/elements/alpha`, `/muse/dsp/elements/beta`, etc.

This allows compatibility with different Muse headband data formats.

## Configuration

- `UPDATE_INTERVAL`: Frequency to fetch new data (default: 1000ms)
- `TRANSITION_DURATION`: Duration of transitions in milliseconds (default: 5000)
- `NUM_POINTS`: Number of points in each wave (default: 500)
- `WAVE_HEIGHT`: Percentage of vertical space for waves (default: 80%) 
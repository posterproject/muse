# Wave Visualizer

A real-time waveform visualizer that displays five different waves (alpha, beta, delta, gamma, theta) with smooth transitions.

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

## Features

- Five distinct waves (alpha, beta, delta, gamma, theta)
- Smooth bezier-curve transitions
- Random value updates every second
- Responsive canvas that adjusts to window size
- Color-coded waves for easy identification

## Configuration

- `ZOOM_COEFFICIENT`: Controls the amplitude of the waves (default: 200)
- `NUM_POINTS`: Number of points in each wave (default: 100)
- `TRANSITION_DURATION`: Duration of transitions in milliseconds (default: 1000) 
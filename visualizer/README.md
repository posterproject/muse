# Muse Brainwave Visualization

A real-time 3D visualization system for Muse EEG headband data using WebGL and Three.js.

## Overview

This application provides a visual representation of brainwave activity captured by the Muse EEG headband. It connects to the headband via an OSC (Open Sound Control) server, processes the raw data, and creates an immersive 3D visualization that shows different brainwave frequencies (delta, theta, alpha, beta, and gamma).

The visualization uses color mapping to represent different mental states:
- **Delta (Blue)**: 0.5-4 Hz - Deep sleep, unconscious states
- **Theta (Light Blue)**: 4-8 Hz - Drowsiness, meditation, creativity
- **Alpha (Green)**: 8-13 Hz - Relaxed alertness, calm, tranquility
- **Beta (Yellow)**: 13-30 Hz - Active thinking, focus, attention
- **Gamma (Red)**: 30-100 Hz - Higher cognitive processing, peak concentration

## Getting Started

### Installation

1. This application is designed to work with the OSC listener application in the `~/Desktop/muse/osc-listener` directory.

2. The visualization files are located in the `~/Desktop/muse/visualizer` directory.

3. No additional installation is required if you've downloaded all the files.

### Running the Application

1. First, start the OSC listener:
   ```bash
   cd ~/Desktop/muse/osc-listener
   npm run server
   ```

2. Serve the visualization files using a simple web server. You can use any of these methods:

   **Using Python (if installed):**
   ```bash
   cd ~/Desktop/muse/visualizer
   python -m http.server 8080
   # OR for Python 2
   python -m SimpleHTTPServer 8080
   ```

   **Using Node.js (if installed):**
   ```bash
   cd ~/Desktop/muse/visualizer
   npx http-server -p 8080
   ```

3. Open your web browser and go to: http://localhost:8080

### Using the Visualization

1. When first loaded, the visualization will run in "simulation mode" showing generated brainwave patterns.

2. To connect to real Muse EEG data:
   - Ensure your Muse headband is sending OSC data to the OSC listener
   - Click the "Connect" button in the bottom right panel
   - The status indicator in the top right will change to "Connected"

3. The visualization shows five waves, each representing a different brainwave frequency band.

4. The state panel in the bottom left shows numerical values for each frequency band.

5. Click the status indicator in the top right to toggle the information panel.

## Project Structure

- `index.html` - Main HTML file
- `css/styles.css` - CSS styles for the UI
- `src/` - JavaScript source files:
  - `main.js` - Main application entry point
  - `visualization.js` - Three.js visualization of brainwaves
  - `osc-connector.js` - Connector to the OSC server
  - `ui-controller.js` - UI interaction handling

## Customization

You can customize the visualization by editing the configuration object in `visualization.js`:

- Change the colors associated with each brainwave type
- Adjust the animation speed multipliers
- Modify the amplitude multipliers

## Troubleshooting

- **No data received**: Check that the OSC server is running and properly configured
- **Visualization not appearing**: Ensure your browser supports WebGL
- **Poor headband connection**: Check that your Muse headband has good contact with your head
- **Browser compatibility**: Use a modern browser like Chrome, Firefox, or Edge
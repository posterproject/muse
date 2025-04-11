# WebGL Fluid Simulation

A real-time fluid simulation using WebGL, based on the [WebGL-Fluid-Simulation](https://github.com/PavelDoGreat/WebGL-Fluid-Simulation) project. This implementation features interactive fluid dynamics with support for EEG wave visualization and various visual effects.

## Features

- Real-time fluid simulation using WebGL
- Interactive fluid manipulation with mouse/touch input
- EEG wave visualization support (alpha, beta, theta, gamma, delta)
- Visual effects including:
  - Bloom
  - Sunrays
  - Colorful fluid dynamics
  - Shading
- Configurable simulation parameters
- Responsive design that works on both desktop and mobile
- OSC (Open Sound Control) integration for real-time EEG data
- Dynamic mapping of brain waves to fluid parameters

## EEG Wave Mapping

The simulation dynamically responds to EEG brain wave data through the following mappings:

1. **Alpha Waves (8-13 Hz)**
   - Controls the `CURL` parameter (0-30)
   - Higher alpha values create more swirling, meditative patterns
   - Associated with relaxed, meditative states

2. **Beta Waves (13-30 Hz)**
   - Controls the `SPLAT_FORCE` parameter (0-6000)
   - Higher beta values create more energetic, forceful fluid movements
   - Associated with active, focused states

3. **Theta Waves (4-8 Hz)**
   - Controls the `DENSITY_DISSIPATION` parameter (0-1)
   - Higher theta values create more persistent, dreamy fluid patterns
   - Associated with drowsiness and creativity

4. **Delta Waves (0.5-4 Hz)**
   - Controls the `VELOCITY_DISSIPATION` parameter (0-1)
   - Higher delta values create more stable, slow-moving fluid patterns
   - Associated with deep sleep

5. **Gamma Waves (30-100 Hz)**
   - Controls the `PRESSURE` parameter (0-1)
   - Higher gamma values create more complex, high-pressure fluid patterns
   - Associated with high-level cognitive processing

## OSC Integration

The simulation connects to an OSC server to receive real-time EEG data. The integration includes:

- Automatic server connection and session management
- Periodic data fetching and parameter updates
- Fallback mechanisms for data retrieval
- Configurable update rates and server settings

### OSC Components

1. **OSCServerManager**
   - Handles server connection and session management
   - Manages server configuration and status
   - Provides methods for starting/stopping the server

2. **OSCDataFetcher**
   - Fetches EEG wave data from the server
   - Implements fallback mechanisms for data retrieval
   - Normalizes wave data for fluid parameter mapping

3. **FluidOSCMapper**
   - Maps EEG wave values to fluid simulation parameters
   - Handles value normalization and range mapping
   - Provides real-time parameter updates

## Prerequisites

- Node.js (v23.10.0 or later)
- npm (comes with Node.js)
- Docker (optional, for containerized deployment)
- OSC server (for EEG data integration)

## Getting Started

### Local Development

1. Install Node.js using nvm:
```bash
nvm install --lts
```

2. Clone the repository and navigate to the project:
```bash
cd fluid-visualizer
```

3. Install dependencies:
```bash
npm install
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at http://localhost:5173

### OSC Server Setup

1. Ensure the OSC server is running (default port: 3001)
2. The application will automatically connect to the server
3. EEG data will be fetched and mapped to fluid parameters

### Docker Deployment

1. Build the Docker image:
```bash
npm run docker-build
```

2. Run the container:
```bash
docker run -p 8080:80 fluid-visualizer
```

The application will be available at http://localhost:8080

## Project Structure

- `webgl-demo.ts` - Main fluid simulation implementation
- `osc-data-fetcher.ts` - EEG data fetching and processing
- `osc-server-manager.ts` - OSC server connection management
- `fluid-osc-mapper.ts` - EEG wave to fluid parameter mapping
- `index.html` - Entry point that loads the application
- `package.json` - Project dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `.nvmrc` - Node.js version specification
- `nginx.conf` - Nginx configuration for production deployment
- `Dockerfile` - Container configuration

## Technical Details

### Core Technologies
- **WebGL**: Hardware-accelerated graphics rendering
- **TypeScript**: Adds type safety to JavaScript
- **Vite**: Modern build tool for fast development and optimized production builds
- **Docker**: Containerization for consistent deployment
- **Nginx**: Production-grade web server
- **OSC**: Open Sound Control protocol for EEG data integration

### Simulation Features
- Real-time fluid dynamics using Navier-Stokes equations
- Multiple framebuffer objects for various effects
- Interactive splat-based fluid manipulation
- Configurable simulation parameters:
  - Resolution settings
  - Dissipation rates
  - Pressure iterations
  - Visual effects parameters
  - EEG wave visualization parameters

### Development Scripts
- `npm run dev`: Starts the development server with hot module replacement
- `npm run build`: Creates a production build
- `npm run preview`: Previews the production build locally
- `npm run docker-build`: Builds the Docker image

### Dependencies
- `typescript`: TypeScript compiler and language service
- `vite`: Build tool and development server
- `@types/node`: TypeScript type definitions for Node.js

## What's Under the Hood

The simulation implements a real-time fluid solver using WebGL shaders, featuring:
- Multiple render passes for fluid dynamics
- Interactive fluid manipulation through splats
- Visual effects including bloom and sunrays
- EEG wave visualization support
- Responsive canvas sizing
- Touch and mouse input handling
- Performance optimizations for smooth animation
- OSC integration for real-time EEG data processing

The implementation is based on the original WebGL-Fluid-Simulation project by Pavel Dobryakov, with added features including TypeScript support and EEG wave integration. 
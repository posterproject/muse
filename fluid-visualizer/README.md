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

## Prerequisites

- Node.js (v23.10.0 or later)
- npm (comes with Node.js)
- Docker (optional, for containerized deployment)

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

The implementation is based on the original WebGL-Fluid-Simulation project by Pavel Dobryakov, with added features and TypeScript support. 
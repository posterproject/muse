# WebGL Three.js Demo

A simple Three.js demo showing a rotating cube using WebGL. This project uses TypeScript and Vite for a modern development experience.

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
cd webgl-test
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
docker run -p 8080:80 webgl-test
```

The application will be available at http://localhost:8080

## Project Structure

- `webgl-demo.ts` - Main application code using Three.js
- `index.html` - Entry point that loads the application
- `package.json` - Project dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `.nvmrc` - Node.js version specification

## Technical Details

### Build Tools
- **Vite**: Modern build tool that provides fast development server and optimized production builds
- **TypeScript**: Adds type safety to JavaScript
- **Three.js**: 3D graphics library for the web
- **Docker**: Containerization for consistent deployment
- **Nginx**: Production-grade web server

### Development Scripts
- `npm run dev`: Starts the development server with hot module replacement
- `npm run build`: Creates a production build
- `npm run preview`: Previews the production build locally
- `npm run docker-build`: Builds the Docker image using the shared Docker configuration

### Dependencies
- `three`: Core Three.js library for 3D graphics
- `@types/three`: TypeScript type definitions for Three.js
- `typescript`: TypeScript compiler and language service
- `vite`: Build tool and development server
- `@types/node`: TypeScript type definitions for Node.js

## What's Under the Hood

The demo creates a simple 3D scene with:
- A perspective camera
- A rotating cube using `MeshNormalMaterial`
- WebGL renderer with antialiasing
- Automatic window resize handling

The animation loop updates the cube's rotation based on time, creating a smooth spinning effect. 
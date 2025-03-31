# WebGL Three.js Demo

A simple Three.js demo showing a rotating cube using WebGL. This project uses TypeScript and Vite for a modern development experience.

## Prerequisites

- Node.js (v23.10.0 or later)
- npm (comes with Node.js)

## Getting Started

1. Check Node version:
```bash
node --version
```
Ensure your Node version is above `v23.10.0` - if so, skip to **step 3**

2. Install Node.js using `nvm` or your favourite method:
```bash
nvm install --lts
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

### Development Scripts
- `npm run dev`: Starts the development server with hot module replacement
- `npm run build`: Creates a production build
- `npm run preview`: Previews the production build locally

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
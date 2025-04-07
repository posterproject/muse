import * as THREE from 'three';

export class Visualization {
    constructor() {
        // Configuration for visualization
        this.config = {
            // Color mappings for different brain states
            colors: {
                delta: new THREE.Color(0x4287f5), // Blue - deep sleep, unconscious
                theta: new THREE.Color(0x42c5f5), // Light blue - drowsy, meditation
                alpha: new THREE.Color(0x42f5a7), // Green - relaxed, calm
                beta: new THREE.Color(0xf5d742),  // Yellow - alert, focused
                gamma: new THREE.Color(0xf54242)  // Red - highly engaged, agitated
            },
            // Animation speed multipliers
            speed: {
                delta: 0.2, // Slowest
                theta: 0.5,
                alpha: 1.0, // Base speed
                beta: 1.5,
                gamma: 2.5  // Fastest
            },
            // Wave amplitude multipliers
            amplitude: {
                delta: 0.8,
                theta: 0.6,
                alpha: 0.5,
                beta: 0.3,
                gamma: 0.2
            }
        };
        
        // Current brainwave data
        this.brainwaveData = {
            delta: 0.5,
            theta: 0.2,
            alpha: 0.4,
            beta: 0.3,
            gamma: 0.1
        };
        
        // Setup the Three.js scene
        this.initScene();
        
        // Create the wave visualizations
        this.createWaves();
        
        // Flags for simulation
        this.simulationActive = true;
    }
    
    // Initialize Three.js scene, camera, and renderer
    initScene() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );
        this.camera.position.z = 5;
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);
        
        // Handle window resizing
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }
    
    // Create wave meshes for each brainwave type
    createWaves() {
        // Create a group to hold all wave meshes
        this.waveGroup = new THREE.Group();
        this.scene.add(this.waveGroup);
        
        // Create meshes for each brainwave type
        this.waves = {};
        const waveTypes = Object.keys(this.brainwaveData);
        const waveWidth = 10;
        const waveSegments = 100;
        const waveSpacing = 1.2;
        
        waveTypes.forEach((type, index) => {
            // Create geometry
            const geometry = new THREE.PlaneGeometry(waveWidth, 1, waveSegments, 1);
            
            // Create material with custom color
            const material = new THREE.MeshBasicMaterial({
                color: this.config.colors[type],
                wireframe: false,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.7
            });
            
            // Create mesh
            const mesh = new THREE.Mesh(geometry, material);
            
            // Position vertically based on index
            mesh.position.y = (index - waveTypes.length / 2) * waveSpacing;
            
            // Store in waves object and add to group
            this.waves[type] = mesh;
            this.waveGroup.add(mesh);
            
            // Add label
            this.addLabel(type, mesh.position.y);
        });
    }
    
    // Add text labels for each wave
    addLabel(text, y) {
        // Create canvas for text
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 128;
        canvas.height = 64;
        
        // Draw text on canvas
        context.fillStyle = '#ffffff';
        context.font = '24px Arial';
        context.fillText(text, 10, 34);
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        
        // Create material and geometry
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true
        });
        const geometry = new THREE.PlaneGeometry(1, 0.5);
        
        // Create and position mesh
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(-5, y, 0);
        this.waveGroup.add(mesh);
    }
    
    // Update brainwave data from OSC
    updateBrainwaveData(data) {
        // Update our brainwave data with values from OSC
        if (data.delta !== undefined) this.brainwaveData.delta = data.delta;
        if (data.theta !== undefined) this.brainwaveData.theta = data.theta;
        if (data.alpha !== undefined) this.brainwaveData.alpha = data.alpha;
        if (data.beta !== undefined) this.brainwaveData.beta = data.beta;
        if (data.gamma !== undefined) this.brainwaveData.gamma = data.gamma;
        
        // Dispatch an event with the updated data
        window.dispatchEvent(new CustomEvent('brainwave-data', {
            detail: { ...this.brainwaveData }
        }));
    }
    
    // Update wave patterns based on brainwave data
    updateWaves(time) {
        const waveTypes = Object.keys(this.brainwaveData);
        
        waveTypes.forEach(type => {
            const wave = this.waves[type];
            const intensity = this.brainwaveData[type];
            const amplitude = this.config.amplitude[type] * intensity * 2;
            const speed = this.config.speed[type] * intensity;
            
            // Update color intensity based on brainwave strength
            wave.material.color.copy(this.config.colors[type]);
            if (intensity > 0.5) {
                // Make color more vivid for higher intensities
                wave.material.color.addScalar(intensity - 0.5);
            }
            
            // Update wave vertices
            const positions = wave.geometry.attributes.position.array;
            for (let i = 0; i < 101; i++) {  // waveSegments+1
                const x = i / 100 * 10 - 5;  // Map to -5 to 5
                
                // Create wave pattern with multiple frequencies
                const y = Math.sin(time * speed + i * 0.2) * amplitude * 0.6 +
                         Math.sin(time * speed * 1.3 + i * 0.3) * amplitude * 0.3 +
                         Math.sin(time * speed * 2.2 + i * 0.5) * amplitude * 0.1;
                
                // Update top vertices (y values)
                positions[i * 3 + 1] = y;
                
                // Update bottom vertices (y values)
                const bottomIndex = (i + 101) * 3 + 1;
                positions[bottomIndex] = -y;
            }
            wave.geometry.attributes.position.needsUpdate = true;
        });
    }
    
    // Start the animation loop
    start() {
        this.animate();
    }
    
    // Animation loop
    animate = () => {
        requestAnimationFrame(this.animate);
        
        const time = performance.now() * 0.001; // time in seconds
        
        // Rotate wave group slightly for visual appeal
        this.waveGroup.rotation.x = Math.sin(time * 0.1) * 0.05;
        
        // Update waves based on brainwave data
        this.updateWaves(time);
        
        // Render the scene
        this.renderer.render(this.scene, this.camera);
    }
    
    // Start simulating brainwave data
    startSimulation() {
        this.simulationActive = true;
        this.simulateData();
    }
    
    // Stop simulating brainwave data
    stopSimulation() {
        this.simulationActive = false;
    }
    
    // Simulate changing brainwave data for testing
    simulateData() {
        if (!this.simulationActive) return;
        
        const time = performance.now() * 0.001;
        const cyclePeriod = 10; // seconds
        const cyclePosition = (time % cyclePeriod) / cyclePeriod;
        
        if (cyclePosition < 0.2) {
            // Deep relaxation
            this.brainwaveData.delta = 0.7 + Math.sin(time * 2) * 0.1;
            this.brainwaveData.theta = 0.5 + Math.sin(time * 3) * 0.1;
            this.brainwaveData.alpha = 0.3 + Math.sin(time * 4) * 0.1;
            this.brainwaveData.beta = 0.2;
            this.brainwaveData.gamma = 0.1;
        } else if (cyclePosition < 0.4) {
            // Meditation state
            this.brainwaveData.delta = 0.3;
            this.brainwaveData.theta = 0.7 + Math.sin(time * 3) * 0.1;
            this.brainwaveData.alpha = 0.6 + Math.sin(time * 4) * 0.1;
            this.brainwaveData.beta = 0.2;
            this.brainwaveData.gamma = 0.1;
        } else if (cyclePosition < 0.6) {
            // Relaxed alertness
            this.brainwaveData.delta = 0.2;
            this.brainwaveData.theta = 0.3;
            this.brainwaveData.alpha = 0.8 + Math.sin(time * 4) * 0.1;
            this.brainwaveData.beta = 0.4 + Math.sin(time * 5) * 0.1;
            this.brainwaveData.gamma = 0.2;
        } else if (cyclePosition < 0.8) {
            // Focused work
            this.brainwaveData.delta = 0.1;
            this.brainwaveData.theta = 0.2;
            this.brainwaveData.alpha = 0.4;
            this.brainwaveData.beta = 0.8 + Math.sin(time * 5) * 0.1;
            this.brainwaveData.gamma = 0.3 + Math.sin(time * 6) * 0.1;
        } else {
            // High engagement/stress
            this.brainwaveData.delta = 0.1;
            this.brainwaveData.theta = 0.1;
            this.brainwaveData.alpha = 0.2;
            this.brainwaveData.beta = 0.5 + Math.sin(time * 5) * 0.1;
            this.brainwaveData.gamma = 0.8 + Math.sin(time * 6) * 0.1;
        }
        
        // Dispatch an event with the updated data
        window.dispatchEvent(new CustomEvent('brainwave-data', {
            detail: { ...this.brainwaveData }
        }));
        
        // Continue simulation
        setTimeout(() => this.simulateData(), 100);
    }
}
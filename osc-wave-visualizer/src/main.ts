import bezier from 'bezier-easing';

interface Wave {
    name: string;
    currentValue: number;
    targetValue: number;
    points: number[];
    color: string;
}

const WAVE_NAMES = ['alpha', 'beta', 'delta', 'gamma', 'theta'];
const WAVE_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD'];
const ZOOM_COEFFICIENT = 200;
const NUM_POINTS = 100;
const TRANSITION_DURATION = 1000; // ms

class WaveVisualizer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private waves: Wave[];
    private lastUpdate: number;
    private easing: (t: number) => number;

    constructor() {
        this.canvas = document.getElementById('waveCanvas') as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d')!;
        this.waves = this.initializeWaves();
        this.lastUpdate = performance.now();
        this.easing = bezier(0.25, 0.1, 0.25, 1); // Smooth easing function

        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        // Start the animation loop
        requestAnimationFrame(this.animate.bind(this));
        
        // Start updating values every second
        setInterval(() => this.updateValues(), 1000);
    }

    private initializeWaves(): Wave[] {
        return WAVE_NAMES.map((name, index) => ({
            name,
            currentValue: 0,
            targetValue: 0,
            points: new Array(NUM_POINTS).fill(0),
            color: WAVE_COLORS[index]
        }));
    }

    private resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    private updateValues() {
        this.waves.forEach(wave => {
            wave.targetValue = Math.random();
        });
        this.lastUpdate = performance.now();
    }

    private updateWaves(timestamp: number) {
        const elapsed = timestamp - this.lastUpdate;
        const progress = Math.min(elapsed / TRANSITION_DURATION, 1);
        const easedProgress = this.easing(progress);

        this.waves.forEach(wave => {
            wave.currentValue = wave.currentValue + (wave.targetValue - wave.currentValue) * easedProgress;
            
            // Shift points to the left
            wave.points.shift();
            wave.points.push(wave.currentValue * ZOOM_COEFFICIENT);
        });
    }

    private drawWaves() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const waveWidth = this.canvas.width / this.waves.length;
        const centerY = this.canvas.height / 2;

        this.waves.forEach((wave, index) => {
            const startX = index * waveWidth;
            const pointSpacing = waveWidth / (NUM_POINTS - 1);

            this.ctx.beginPath();
            this.ctx.strokeStyle = wave.color;
            this.ctx.lineWidth = 2;

            wave.points.forEach((point, pointIndex) => {
                const x = startX + pointIndex * pointSpacing;
                const y = centerY - point;

                if (pointIndex === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            });

            this.ctx.stroke();

            // Draw wave name
            this.ctx.fillStyle = wave.color;
            this.ctx.font = '14px Arial';
            this.ctx.fillText(wave.name, startX + 10, 20);
        });
    }

    private animate(timestamp: number) {
        this.updateWaves(timestamp);
        this.drawWaves();
        requestAnimationFrame(this.animate.bind(this));
    }
}

// Initialize the visualizer when the page loads
window.addEventListener('load', () => {
    new WaveVisualizer();
}); 
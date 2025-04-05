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
const NUM_POINTS = 500; // Show 5 seconds of data (100 points per second)
const TRANSITION_DURATION = 5000; // ms
const WAVE_HEIGHT = 0.8; // 80% of available vertical space per wave

class WaveVisualizer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private waves: Wave[];
    private lastUpdate: number;
    private easing: (t: number) => number;
    private zoomCoefficient: number;

    constructor() {
        this.canvas = document.getElementById('waveCanvas') as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d')!;
        this.waves = this.initializeWaves();
        this.lastUpdate = performance.now();
        this.easing = bezier(0.25, 0.1, 0.25, 1);
        this.zoomCoefficient = this.calculateZoomCoefficient();

        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        requestAnimationFrame(this.animate.bind(this));
        setInterval(() => this.updateValues(), 1000);
    }

    private calculateZoomCoefficient(): number {
        return (this.canvas.height * WAVE_HEIGHT) / (this.waves.length * 2);
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
        this.zoomCoefficient = this.calculateZoomCoefficient();
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
            wave.points.push(wave.currentValue * this.zoomCoefficient);
        });
    }

    private drawWaves() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const waveHeight = (this.canvas.height * WAVE_HEIGHT) / this.waves.length;
        const pointSpacing = this.canvas.width / (NUM_POINTS - 1);

        this.waves.forEach((wave, index) => {
            const centerY = (index + 0.5) * waveHeight + (this.canvas.height * (1 - WAVE_HEIGHT)) / 2;

            this.ctx.beginPath();
            this.ctx.strokeStyle = wave.color;
            this.ctx.lineWidth = 2;

            wave.points.forEach((point, pointIndex) => {
                const x = pointIndex * pointSpacing;
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
            this.ctx.fillText(wave.name, 10, centerY - waveHeight/2 + 20);
        });
    }

    private animate(timestamp: number) {
        this.updateWaves(timestamp);
        this.drawWaves();
        requestAnimationFrame(this.animate.bind(this));
    }
}

window.addEventListener('load', () => {
    new WaveVisualizer();
}); 
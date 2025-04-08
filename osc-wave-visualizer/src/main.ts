import bezier from 'bezier-easing';
import { OSCDataFetcher } from './osc-data-fetcher';

interface Wave {
    name: string;
    currentValue: number;
    targetValue: number;
    points: number[];
    color: string;
    lastUpdateTime: number;
}

const WAVE_NAMES = ['alpha', 'beta', 'delta', 'gamma', 'theta'];
const WAVE_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD'];
const NUM_POINTS = 500; // Show 5 seconds of data (100 points per second)
const WAVE_HEIGHT = 0.8; // 80% of available vertical space per wave
const UPDATE_INTERVAL = 100; // ms - interval for fetching new data
const SINE_PERIOD = UPDATE_INTERVAL; // ms - one complete sine wave per update interval

class WaveVisualizer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private waves: Wave[];
    private zoomCoefficient: number;
    private dataFetcher: OSCDataFetcher;
    private lastFetchTime: number;
    private frameCount: number;

    constructor() {
        this.canvas = document.getElementById('waveCanvas') as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d')!;
        this.waves = this.initializeWaves();
        this.zoomCoefficient = this.calculateZoomCoefficient();
        this.dataFetcher = new OSCDataFetcher();
        this.lastFetchTime = performance.now();
        this.frameCount = 0;

        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        this.updateValues(); // Initial fetch
        setInterval(() => this.updateValues(), UPDATE_INTERVAL);
        requestAnimationFrame(this.animate.bind(this));
    }

    private calculateZoomCoefficient(): number {
        return (this.canvas.height * WAVE_HEIGHT) / (this.waves.length * 4); // Divide by 4 to account for the full wave amplitude (-target to +target)
    }

    private initializeWaves(): Wave[] {
        const now = performance.now();
        return WAVE_NAMES.map((name, index) => ({
            name,
            currentValue: 0,
            targetValue: 0,
            points: new Array(NUM_POINTS).fill(0),
            color: WAVE_COLORS[index],
            lastUpdateTime: now
        }));
    }

    private resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.zoomCoefficient = this.calculateZoomCoefficient();
    }

    private async updateValues() {
        try {
            const waveData = await this.dataFetcher.fetchWaveData();
            const now = performance.now();
            
            this.waves.forEach(wave => {
                // Store the last update time to sync sine wave
                wave.lastUpdateTime = now;
                // Update target value from fetched data
                wave.targetValue = waveData[wave.name as keyof typeof waveData];
            });
            
            this.lastFetchTime = now;
        } catch (error) {
            console.error('Error updating wave values:', error);
        }
    }

    private updateWaves(timestamp: number) {
        this.waves.forEach(wave => {
            // Calculate time since last update
            const timeSinceUpdate = timestamp - wave.lastUpdateTime;
            
            // Calculate normalized progress in current sine wave cycle (0 to 1)
            const cycleProgress = (timeSinceUpdate % SINE_PERIOD) / SINE_PERIOD;
            
            // Calculate full sine wave value (-1 to 1)
            // sin(2πx) goes from 0 to 1 to 0 to -1 to 0 in one complete cycle
            const sineValue = Math.sin(cycleProgress * 2 * Math.PI);
            
            // Scale by the target value to get current value
            wave.currentValue = wave.targetValue * sineValue;
            
            // Shift points to the left
            wave.points.shift();
            
            // Add new point, scaled by zoom coefficient
            wave.points.push(wave.currentValue * this.zoomCoefficient);
        });
    }

    private drawWaves() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const waveHeight = (this.canvas.height * WAVE_HEIGHT) / this.waves.length;
        const pointSpacing = this.canvas.width / (NUM_POINTS - 1);

        this.waves.forEach((wave, index) => {
            const centerY = (index + 0.5) * waveHeight + (this.canvas.height * (1 - WAVE_HEIGHT)) / 2;

            // Draw zero line
            this.ctx.beginPath();
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            this.ctx.lineWidth = 1;
            this.ctx.setLineDash([5, 5]); // Make the line dotted (5px dash, 5px gap)
            this.ctx.moveTo(0, centerY);
            this.ctx.lineTo(this.canvas.width, centerY);
            this.ctx.stroke();
            this.ctx.setLineDash([]); // Reset to solid line for the wave

            // Draw wave
            this.ctx.beginPath();
            this.ctx.strokeStyle = wave.color;
            this.ctx.lineWidth = 2;

            wave.points.forEach((point, pointIndex) => {
                const x = pointIndex * pointSpacing;
                const y = centerY - point; // Negative values will draw below centerY

                if (pointIndex === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            });

            this.ctx.stroke();

            // Draw wave name and target value
            this.ctx.fillStyle = wave.color;
            this.ctx.font = '14px Arial';
            this.ctx.fillText(`${wave.name}: ${wave.targetValue.toFixed(4)}`, 10, centerY - waveHeight/3 + 20);
        });
    }

    private animate(timestamp: number) {
        this.updateWaves(timestamp);
        this.drawWaves();
        this.frameCount++;
        requestAnimationFrame(this.animate.bind(this));
    }
}

window.addEventListener('load', () => {
    new WaveVisualizer();
}); 
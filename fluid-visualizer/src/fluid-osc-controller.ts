// Add type declarations at the top of the file
declare global {
    interface Window {
        config: any;
        updateKeywords: () => void;
    }
}

import { OSCServerManager } from './osc-server-manager';
import { OSCDataFetcher } from './osc-data-fetcher';
import { FluidOSCMapper } from './fluid-osc-mapper';

export class FluidOSCController {
    private serverManager: OSCServerManager;
    private dataFetcher: OSCDataFetcher;
    private updateInterval: number | null = null;
    private updateFrequency: number = 4; // Hz
    private isRunning: boolean = false;

    constructor(port: number = 3001) {
        this.serverManager = new OSCServerManager(port);
        this.dataFetcher = new OSCDataFetcher(port);
    }

    /**
     * Start the OSC server and begin periodic updates
     */
    public async start(): Promise<boolean> {
        if (this.isRunning) {
            console.log('OSC controller is already running');
            return true;
        }

        try {
            // Start the OSC server
            const serverStarted = await this.serverManager.startServer();
            if (!serverStarted) {
                console.error('Failed to start OSC server');
                return false;
            }

            // Set up periodic updates
            this.isRunning = true;
            this.startUpdateLoop();

            return true;
        } catch (error) {
            console.error('Error starting OSC controller:', error);
            return false;
        }
    }

    /**
     * Stop the OSC server and updates
     */
    public async stop(): Promise<boolean> {
        if (!this.isRunning) {
            return true;
        }

        try {
            // Stop the update loop
            this.stopUpdateLoop();

            // Stop the OSC server
            const serverStopped = await this.serverManager.stopServer();
            if (!serverStopped) {
                console.error('Failed to stop OSC server');
                return false;
            }

            this.isRunning = false;
            return true;
        } catch (error) {
            console.error('Error stopping OSC controller:', error);
            return false;
        }
    }

    /**
     * Start the periodic update loop
     */
    private startUpdateLoop(): void {
        const intervalMs = 1000 / this.updateFrequency; // Convert Hz to milliseconds
        this.updateInterval = window.setInterval(async () => {
            try {
                // Fetch new wave data
                const waveData = await this.dataFetcher.fetchWaveData();
                
                // Map wave data to fluid parameters
                const fluidConfig = FluidOSCMapper.mapWavesToFluidConfig(waveData);
                
                // Update the fluid simulation with new parameters
                this.updateFluidSimulation(fluidConfig);
            } catch (error) {
                console.error('Error in update loop:', error);
            }
        }, intervalMs);
    }

    /**
     * Stop the periodic update loop
     */
    private stopUpdateLoop(): void {
        if (this.updateInterval !== null) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    /**
     * Update the fluid simulation with new parameters
     */
    private updateFluidSimulation(config: any): void {
        if (!this.isRunning) return;

        try {
            // Ensure window.config exists
            if (!window.config) {
                console.error('Global config object not found');
                return;
            }

            // Debug log the incoming config
            console.log('Updating fluid simulation with config:', config);

            // Update only the relevant properties
            const properties = ['CURL', 'SPLAT_FORCE', 'DENSITY_DISSIPATION', 'VELOCITY_DISSIPATION', 'PRESSURE'];
            properties.forEach(prop => {
                if (config[prop] !== undefined) {
                    window.config[prop] = config[prop];
                    console.log(`Updated ${prop} to ${config[prop]}`);
                }
            });
            
            // Force a visual update
            if (window.updateKeywords) {
                window.updateKeywords();
            }
        } catch (error) {
            console.error('Error updating fluid simulation:', error);
        }
    }

    /**
     * Set the update frequency in Hz
     */
    public setUpdateFrequency(frequency: number): void {
        this.updateFrequency = frequency;
        
        // Restart the update loop if it's running
        if (this.isRunning) {
            this.stopUpdateLoop();
            this.startUpdateLoop();
        }
    }

    /**
     * Get the current update frequency in Hz
     */
    public getUpdateFrequency(): number {
        return this.updateFrequency;
    }

    /**
     * Check if the controller is running
     */
    public isControllerRunning(): boolean {
        return this.isRunning;
    }
} 
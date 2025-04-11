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
        // Access the global config object from webgl-demo.ts
        if (typeof window !== 'undefined' && (window as any).config) {
            const globalConfig = (window as any).config;
            
            // Update the fluid parameters
            globalConfig.CURL = config.CURL;
            globalConfig.SPLAT_FORCE = config.SPLAT_FORCE;
            globalConfig.DENSITY_DISSIPATION = config.DENSITY_DISSIPATION;
            globalConfig.VELOCITY_DISSIPATION = config.VELOCITY_DISSIPATION;
            globalConfig.PRESSURE = config.PRESSURE;
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
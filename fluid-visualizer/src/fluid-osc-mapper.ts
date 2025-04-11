import { WaveData } from './osc-data-fetcher';

interface FluidConfig {
    CURL: number;
    SPLAT_FORCE: number;
    DENSITY_DISSIPATION: number;
    VELOCITY_DISSIPATION: number;
    PRESSURE: number;
}

export class FluidOSCMapper {
    private static readonly CURL_RANGE = { min: 0, max: 30 };
    private static readonly SPLAT_FORCE_RANGE = { min: 0, max: 6000 };
    private static readonly DISSIPATION_RANGE = { min: 0, max: 1 };
    private static readonly PRESSURE_RANGE = { min: 0, max: 1 };

    /**
     * Map EEG wave data to fluid simulation parameters
     */
    public static mapWavesToFluidConfig(waveData: WaveData): FluidConfig {
        return {
            CURL: this.mapValue(waveData.alpha, this.CURL_RANGE),
            SPLAT_FORCE: this.mapValue(waveData.beta, this.SPLAT_FORCE_RANGE),
            DENSITY_DISSIPATION: this.mapValue(waveData.theta, this.DISSIPATION_RANGE),
            VELOCITY_DISSIPATION: this.mapValue(waveData.delta, this.DISSIPATION_RANGE),
            PRESSURE: this.mapValue(waveData.gamma, this.PRESSURE_RANGE)
        };
    }

    /**
     * Map a normalized value (0-1) to a specific range
     */
    private static mapValue(value: number, range: { min: number, max: number }): number {
        // Ensure value is between 0 and 1
        const normalizedValue = Math.max(0, Math.min(1, value));
        // Map to the target range
        return range.min + (normalizedValue * (range.max - range.min));
    }
} 
import { AggregateConfig, AggregateFunction } from '../types/osc-listener';
import { AggregateTransformer } from './aggregate-transformer';
import { SimpleTransformer } from './transformer';

const primaryWaveChannels = ['alpha', 'beta', 'gamma', 'delta', 'theta'];

const elementTransform = (values: number[], address: string): number[] => {
    // Check if this is a primary wave channel
    const isPrimaryWave = primaryWaveChannels.some(channel => 
        address.toLowerCase().includes(channel)
    );
    
    if (!isPrimaryWave) {
        return values; // Return unchanged for non-primary channels
    }
    
    // For primary waves, calculate average of non-zero values
    const nonZeroValues = values.filter(v => v !== 0);
    if (nonZeroValues.length === 0) {
        return [0]; // Return [0] if all values are zero
    }
    
    const average = nonZeroValues.reduce((sum, val) => sum + val, 0) / nonZeroValues.length;
    return [average];
};

const averageTransform = (values: number[][]): number[] => {
    if (values.length === 0) return [];
    
    // Use first array as reference length
    const referenceLength = values[0].length;
    
    // Initialize accumulator with zeros and counts
    const initial = {
        sums: new Array(referenceLength).fill(0),
        counts: new Array(referenceLength).fill(0)
    };
    
    // Process all arrays
    const { sums, counts } = values.reduce((acc, array) => {
        // For each column up to the reference length
        for (let i = 0; i < referenceLength; i++) {
            if (i < array.length) {
                acc.sums[i] += array[i];
                acc.counts[i]++;
            }
        }
        return acc;
    }, initial);
    
    // Compute averages
    return sums.map((sum, i) => counts[i] > 0 ? sum / counts[i] : 0);
};

const lastValTransform = (values: number[][]): number[] => {
    if (values.length === 0) return [];
    return values[values.length - 1];
};

// Aggregate Functions
export const aggregateFunctions = {
    // Average all values across multiple addresses
    average: (sourceValues: Map<string, number[]>): number[] => {
        if (sourceValues.size === 0) return [];
        
        // Get the first value to determine the expected length
        const firstValue = Array.from(sourceValues.values())[0];
        if (!firstValue || !firstValue.length) return [];
        
        const valueLength = firstValue.length;
        
        // Initialize sums and counts arrays
        const sums = new Array(valueLength).fill(0);
        const counts = new Array(valueLength).fill(0);
        
        // Sum up all values
        for (const values of sourceValues.values()) {
            for (let i = 0; i < Math.min(valueLength, values.length); i++) {
                if (!isNaN(values[i])) {
                    sums[i] += values[i];
                    counts[i]++;
                }
            }
        }
        
        // Calculate averages
        return sums.map((sum, i) => counts[i] > 0 ? sum / counts[i] : 0);
    },
    
    // Average all non-zero values across multiple addresses
    nonZeroAverage: (sourceValues: Map<string, number[]>): number[] => {
        if (sourceValues.size === 0) return [];
        
        // Get the first value to determine the expected length
        const firstValue = Array.from(sourceValues.values())[0];
        if (!firstValue || !firstValue.length) return [];
        
        const valueLength = firstValue.length;
        
        // Initialize sums and counts arrays
        const sums = new Array(valueLength).fill(0);
        const counts = new Array(valueLength).fill(0);
        
        // Sum up all non-zero values
        for (const values of sourceValues.values()) {
            for (let i = 0; i < Math.min(valueLength, values.length); i++) {
                if (!isNaN(values[i]) && values[i] !== 0) {
                    sums[i] += values[i];
                    counts[i]++;
                }
            }
        }
        
        // Calculate averages of non-zero values
        return sums.map((sum, i) => counts[i] > 0 ? sum / counts[i] : 0);
    },
    
    // Sum all values across multiple addresses
    sum: (sourceValues: Map<string, number[]>): number[] => {
        if (sourceValues.size === 0) return [];
        
        // Get the first value to determine the expected length
        const firstValue = Array.from(sourceValues.values())[0];
        if (!firstValue || !firstValue.length) return [];
        
        const valueLength = firstValue.length;
        
        // Initialize sums array
        const sums = new Array(valueLength).fill(0);
        
        // Sum up all values
        for (const values of sourceValues.values()) {
            for (let i = 0; i < Math.min(valueLength, values.length); i++) {
                if (!isNaN(values[i])) {
                    sums[i] += values[i];
                }
            }
        }
        
        return sums;
    },
    
    // Get the maximum value for each position
    max: (sourceValues: Map<string, number[]>): number[] => {
        if (sourceValues.size === 0) return [];
        
        // Get the first value to determine the expected length
        const firstValue = Array.from(sourceValues.values())[0];
        if (!firstValue || !firstValue.length) return [];
        
        const valueLength = firstValue.length;
        
        // Initialize max array with negative infinity
        const maxValues = new Array(valueLength).fill(-Infinity);
        
        // Find max values
        for (const values of sourceValues.values()) {
            for (let i = 0; i < Math.min(valueLength, values.length); i++) {
                if (!isNaN(values[i]) && values[i] > maxValues[i]) {
                    maxValues[i] = values[i];
                }
            }
        }
        
        return maxValues;
    },
    
    // Get the minimum value for each position
    min: (sourceValues: Map<string, number[]>): number[] => {
        if (sourceValues.size === 0) return [];
        
        // Get the first value to determine the expected length
        const firstValue = Array.from(sourceValues.values())[0];
        if (!firstValue || !firstValue.length) return [];
        
        const valueLength = firstValue.length;
        
        // Initialize min array with positive infinity
        const minValues = new Array(valueLength).fill(Infinity);
        
        // Find min values
        for (const values of sourceValues.values()) {
            for (let i = 0; i < Math.min(valueLength, values.length); i++) {
                if (!isNaN(values[i]) && values[i] < minValues[i]) {
                    minValues[i] = values[i];
                }
            }
        }
        
        return minValues;
    }
};

export class TransformerFactory {
    static createAverageTransformer(): SimpleTransformer {
        return new SimpleTransformer(averageTransform, elementTransform);
    }

    static createLastValueTransformer(): SimpleTransformer {
        return new SimpleTransformer(lastValTransform, elementTransform);
    }
    
    static createAggregateTransformer(
        baseTransformer: SimpleTransformer,
        aggregateConfigs: AggregateConfig[]
    ): AggregateTransformer {
        return new AggregateTransformer(baseTransformer, aggregateConfigs);
    }
} 
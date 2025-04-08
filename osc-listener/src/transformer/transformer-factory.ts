import { TransformFunction, ElementTransformFunction } from '../types/osc';
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

export class TransformerFactory {
    static createAverageTransformer(): SimpleTransformer {
        return new SimpleTransformer(averageTransform, elementTransform);
    }

    static createLastValueTransformer(): SimpleTransformer {
        return new SimpleTransformer(lastValTransform, elementTransform);
    }
} 
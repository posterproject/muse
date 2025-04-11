import { describe, it, expect } from '@jest/globals';
import { AggregateTransformer } from '../src/transformer/aggregate-transformer';
import { SimpleTransformer } from '../src/transformer/transformer';
import { OSCMessage } from '../src/types/osc-listener';
import { aggregateFunctions } from '../src/transformer/transformer-factory';

describe('AggregateTransformer', () => {
    // Simple identity transform function for testing
    const identityTransform = (values: number[][]) => {
        return values.length > 0 ? values[values.length - 1] : [];
    };

    it('should delegate to base transformer for real addresses', () => {
        const baseTransformer = new SimpleTransformer(identityTransform);
        const aggregateTransformer = new AggregateTransformer(baseTransformer);
        
        // Add message to base transformer
        baseTransformer.addMessage({
            address: '/test',
            args: [1, 2, 3],
            timestamp: 1000
        } as OSCMessage);
        
        // Should be accessible through aggregate transformer
        const value = aggregateTransformer.getTransformedAddress('/test');
        expect(value).toEqual([1, 2, 3]);
    });

    it('should compute virtual address values using average function', () => {
        const baseTransformer = new SimpleTransformer(identityTransform);
        const aggregateTransformer = new AggregateTransformer(baseTransformer, [
            {
                virtualAddress: '/virtual/average',
                sourceAddresses: ['/source1', '/source2'],
                aggregateFunction: aggregateFunctions.average
            }
        ]);
        
        // Add messages to source addresses
        baseTransformer.addMessage({
            address: '/source1',
            args: [10, 20, 30],
            timestamp: 1000
        } as OSCMessage);
        
        baseTransformer.addMessage({
            address: '/source2',
            args: [20, 40, 60],
            timestamp: 1000
        } as OSCMessage);
        
        // Check virtual address value
        const value = aggregateTransformer.getTransformedAddress('/virtual/average');
        expect(value).toEqual([15, 30, 45]); // Average of [10, 20, 30] and [20, 40, 60]
    });

    it('should compute virtual address values using sum function', () => {
        const baseTransformer = new SimpleTransformer(identityTransform);
        const aggregateTransformer = new AggregateTransformer(baseTransformer, [
            {
                virtualAddress: '/virtual/sum',
                sourceAddresses: ['/source1', '/source2'],
                aggregateFunction: aggregateFunctions.sum
            }
        ]);
        
        // Add messages to source addresses
        baseTransformer.addMessage({
            address: '/source1',
            args: [10, 20, 30],
            timestamp: 1000
        } as OSCMessage);
        
        baseTransformer.addMessage({
            address: '/source2',
            args: [20, 40, 60],
            timestamp: 1000
        } as OSCMessage);
        
        // Check virtual address value
        const value = aggregateTransformer.getTransformedAddress('/virtual/sum');
        expect(value).toEqual([30, 60, 90]); // Sum of [10, 20, 30] and [20, 40, 60]
    });

    it('should compute virtual address values using max function', () => {
        const baseTransformer = new SimpleTransformer(identityTransform);
        const aggregateTransformer = new AggregateTransformer(baseTransformer, [
            {
                virtualAddress: '/virtual/max',
                sourceAddresses: ['/source1', '/source2'],
                aggregateFunction: aggregateFunctions.max
            }
        ]);
        
        // Add messages to source addresses
        baseTransformer.addMessage({
            address: '/source1',
            args: [10, 50, 30],
            timestamp: 1000
        } as OSCMessage);
        
        baseTransformer.addMessage({
            address: '/source2',
            args: [20, 40, 60],
            timestamp: 1000
        } as OSCMessage);
        
        // Check virtual address value
        const value = aggregateTransformer.getTransformedAddress('/virtual/max');
        expect(value).toEqual([20, 50, 60]); // Max of [10, 50, 30] and [20, 40, 60]
    });

    it('should compute virtual address values using min function', () => {
        const baseTransformer = new SimpleTransformer(identityTransform);
        const aggregateTransformer = new AggregateTransformer(baseTransformer, [
            {
                virtualAddress: '/virtual/min',
                sourceAddresses: ['/source1', '/source2'],
                aggregateFunction: aggregateFunctions.min
            }
        ]);
        
        // Add messages to source addresses
        baseTransformer.addMessage({
            address: '/source1',
            args: [10, 50, 30],
            timestamp: 1000
        } as OSCMessage);
        
        baseTransformer.addMessage({
            address: '/source2',
            args: [20, 40, 60],
            timestamp: 1000
        } as OSCMessage);
        
        // Check virtual address value
        const value = aggregateTransformer.getTransformedAddress('/virtual/min');
        expect(value).toEqual([10, 40, 30]); // Min of [10, 50, 30] and [20, 40, 60]
    });

    it('should compute virtual address values using nonZeroAverage function', () => {
        const baseTransformer = new SimpleTransformer(identityTransform);
        const aggregateTransformer = new AggregateTransformer(baseTransformer, [
            {
                virtualAddress: '/virtual/nonZeroAverage',
                sourceAddresses: ['/source1', '/source2'],
                aggregateFunction: aggregateFunctions.nonZeroAverage
            }
        ]);
        
        // Add messages to source addresses with zero values mixed in
        baseTransformer.addMessage({
            address: '/source1',
            args: [10, 0, 30],
            timestamp: 1000
        } as OSCMessage);
        
        baseTransformer.addMessage({
            address: '/source2',
            args: [0, 40, 60],
            timestamp: 1000
        } as OSCMessage);
        
        // Check virtual address value - should average only non-zero values
        const value = aggregateTransformer.getTransformedAddress('/virtual/nonZeroAverage');
        
        // Expected: [10/1, 40/1, (30+60)/2] = [10, 40, 45]
        // First value: only '/source1' has non-zero (10)
        // Second value: only '/source2' has non-zero (40)
        // Third value: both have non-zero (30, 60), average is 45
        expect(value).toEqual([10, 40, 45]);
    });

    it('should return all addresses including virtual ones', () => {
        const baseTransformer = new SimpleTransformer(identityTransform);
        const aggregateTransformer = new AggregateTransformer(baseTransformer, [
            {
                virtualAddress: '/virtual/average',
                sourceAddresses: ['/source1', '/source2'],
                aggregateFunction: aggregateFunctions.average
            }
        ]);
        
        // Add messages to source addresses
        baseTransformer.addMessage({
            address: '/source1',
            args: [10, 20, 30],
            timestamp: 1000
        } as OSCMessage);
        
        baseTransformer.addMessage({
            address: '/source2',
            args: [20, 40, 60],
            timestamp: 1000
        } as OSCMessage);
        
        // Check addresses
        const addresses = aggregateTransformer.getAddresses();
        expect(addresses).toContain('/source1');
        expect(addresses).toContain('/source2');
        expect(addresses).toContain('/virtual/average');
        expect(addresses.length).toBe(3);
        
        // Check virtual addresses
        const virtualAddresses = aggregateTransformer.getVirtualAddresses();
        expect(virtualAddresses).toContain('/virtual/average');
        expect(virtualAddresses.length).toBe(1);
        
        // Check real addresses
        const realAddresses = aggregateTransformer.getRealAddresses();
        expect(realAddresses).toContain('/source1');
        expect(realAddresses).toContain('/source2');
        expect(realAddresses.length).toBe(2);
    });

    it('should store last computed value in buffer for virtual addresses', () => {
        const baseTransformer = new SimpleTransformer(identityTransform);
        const aggregateTransformer = new AggregateTransformer(baseTransformer, [
            {
                virtualAddress: '/virtual/average',
                sourceAddresses: ['/source1', '/source2'],
                aggregateFunction: aggregateFunctions.average
            }
        ]);
        
        // Add initial messages
        baseTransformer.addMessage({
            address: '/source1',
            args: [10, 20, 30],
            timestamp: 1000
        } as OSCMessage);
        
        baseTransformer.addMessage({
            address: '/source2',
            args: [20, 40, 60],
            timestamp: 1000
        } as OSCMessage);
        
        // Get the value (should compute and store in buffer)
        const value = aggregateTransformer.getTransformedAddress('/virtual/average');
        expect(value).toEqual([15, 30, 45]);
        
        // Check buffer contents
        const bufferContents = aggregateTransformer.getBufferContents('/virtual/average');
        expect(bufferContents).toEqual([[15, 30, 45]]);
    });

    it('should persist virtual address buffer after reading until new source data arrives', () => {
        const baseTransformer = new SimpleTransformer(identityTransform);
        const aggregateTransformer = new AggregateTransformer(baseTransformer, [
            {
                virtualAddress: '/virtual/average',
                sourceAddresses: ['/source1', '/source2'],
                aggregateFunction: aggregateFunctions.average
            }
        ]);
        
        // Add initial messages
        baseTransformer.addMessage({
            address: '/source1',
            args: [10, 20, 30],
            timestamp: 1000
        } as OSCMessage);
        
        baseTransformer.addMessage({
            address: '/source2',
            args: [20, 40, 60],
            timestamp: 1000
        } as OSCMessage);
        
        // Get the value (should compute and store in buffer)
        const value = aggregateTransformer.getTransformedAddress('/virtual/average');
        expect(value).toEqual([15, 30, 45]);
        
        // Buffer should persist
        const bufferContents = aggregateTransformer.getBufferContents('/virtual/average');
        expect(bufferContents).toEqual([[15, 30, 45]]);
        
        // Add new message to one source
        baseTransformer.addMessage({
            address: '/source1',
            args: [30, 60, 90],
            timestamp: 2000
        } as OSCMessage);
        
        // Buffer should be updated with new computed value
        const updatedBufferContents = aggregateTransformer.getBufferContents('/virtual/average');
        expect(updatedBufferContents).toEqual([[25, 50, 75]]); // Average of [30, 60, 90] and [20, 40, 60]
    });

    it('should handle multiple virtual addresses independently', () => {
        const baseTransformer = new SimpleTransformer(identityTransform);
        const aggregateTransformer = new AggregateTransformer(baseTransformer, [
            {
                virtualAddress: '/virtual/average',
                sourceAddresses: ['/source1', '/source2'],
                aggregateFunction: aggregateFunctions.average
            },
            {
                virtualAddress: '/virtual/sum',
                sourceAddresses: ['/source1', '/source2'],
                aggregateFunction: aggregateFunctions.sum
            }
        ]);
        
        // Add initial messages
        baseTransformer.addMessage({
            address: '/source1',
            args: [10, 20, 30],
            timestamp: 1000
        } as OSCMessage);
        
        baseTransformer.addMessage({
            address: '/source2',
            args: [20, 40, 60],
            timestamp: 1000
        } as OSCMessage);
        
        // Read from average address
        const averageValue = aggregateTransformer.getTransformedAddress('/virtual/average');
        expect(averageValue).toEqual([15, 30, 45]);
        
        // Read from sum address
        const sumValue = aggregateTransformer.getTransformedAddress('/virtual/sum');
        expect(sumValue).toEqual([30, 60, 90]);
        
        // Add new message to one source
        baseTransformer.addMessage({
            address: '/source1',
            args: [30, 60, 90],
            timestamp: 2000
        } as OSCMessage);
        
        // Check both buffers are updated independently
        const averageBuffer = aggregateTransformer.getBufferContents('/virtual/average');
        expect(averageBuffer).toEqual([[25, 50, 75]]); // Average of [30, 60, 90] and [20, 40, 60]
        
        const sumBuffer = aggregateTransformer.getBufferContents('/virtual/sum');
        expect(sumBuffer).toEqual([[50, 100, 150]]); // Sum of [30, 60, 90] and [20, 40, 60]
    });

    it('should handle missing source data gracefully', () => {
        const baseTransformer = new SimpleTransformer(identityTransform);
        const aggregateTransformer = new AggregateTransformer(baseTransformer, [
            {
                virtualAddress: '/virtual/average',
                sourceAddresses: ['/source1', '/source2', '/source3'],
                aggregateFunction: aggregateFunctions.average
            }
        ]);
        
        // Add messages to only two source addresses
        baseTransformer.addMessage({
            address: '/source1',
            args: [10, 20, 30],
            timestamp: 1000
        } as OSCMessage);
        
        baseTransformer.addMessage({
            address: '/source2',
            args: [20, 40, 60],
            timestamp: 1000
        } as OSCMessage);
        
        // Should compute average using available data
        const value = aggregateTransformer.getTransformedAddress('/virtual/average');
        expect(value).toEqual([15, 30, 45]); // Average of [10, 20, 30] and [20, 40, 60]
        
        // Buffer should contain the computed value
        const bufferContents = aggregateTransformer.getBufferContents('/virtual/average');
        expect(bufferContents).toEqual([[15, 30, 45]]);
        
        // Add message to the third source
        baseTransformer.addMessage({
            address: '/source3',
            args: [30, 60, 90],
            timestamp: 2000
        } as OSCMessage);
        
        // Should update to include all three sources
        const updatedBufferContents = aggregateTransformer.getBufferContents('/virtual/average');
        expect(updatedBufferContents).toEqual([[20, 40, 60]]); // Average of [10, 20, 30], [20, 40, 60], and [30, 60, 90]
    });
}); 
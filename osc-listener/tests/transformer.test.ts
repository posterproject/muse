import { SimpleTransformer } from '../src/transformer/transformer';
import { OSCMessage } from '../src/types/osc-listener';
import { describe, it, expect } from '@jest/globals';

describe('SimpleTransformer', () => {
    // Simple identity transform function for testing
    const identityTransform = (values: number[][]) => {
        return values.length > 0 ? values[values.length - 1] : [];
    };

    it('should accumulate messages in buffer', () => {
        const transformer = new SimpleTransformer(identityTransform);
        
        // Add messages to the buffer
        transformer.addMessage({
            address: '/test',
            args: [1, 2, 3],
            timestamp: 1000
        } as OSCMessage);
        
        transformer.addMessage({
            address: '/test',
            args: [4, 5, 6],
            timestamp: 2000
        } as OSCMessage);
        
        // Check buffer contents
        const bufferContents = transformer.getBufferContents('/test');
        expect(bufferContents.length).toBe(2);
        expect(bufferContents[0]).toEqual([1, 2, 3]);
        expect(bufferContents[1]).toEqual([4, 5, 6]);
    });

    it('should persist buffer after reading until new message arrives', () => {
        const transformer = new SimpleTransformer(identityTransform);
        
        // Add a message
        transformer.addMessage({
            address: '/test',
            args: [1, 2, 3],
            timestamp: 1000
        } as OSCMessage);
        
        // Read the transformed data
        const value = transformer.getTransformedAddress('/test');
        expect(value).toEqual([1, 2, 3]);
        
        // Verify buffer still exists
        const bufferContents = transformer.getBufferContents('/test');
        expect(bufferContents.length).toBe(1);
        expect(bufferContents[0]).toEqual([1, 2, 3]);
        
        // Add a new message - this should flush the buffer
        transformer.addMessage({
            address: '/test',
            args: [4, 5, 6],
            timestamp: 2000
        } as OSCMessage);
        
        // Verify only the new message is in the buffer
        const updatedBufferContents = transformer.getBufferContents('/test');
        expect(updatedBufferContents.length).toBe(1);
        expect(updatedBufferContents[0]).toEqual([4, 5, 6]);
    });

    it('should not flush the buffer if address has not been read', () => {
        const transformer = new SimpleTransformer(identityTransform);
        
        // Add messages without reading
        transformer.addMessage({
            address: '/test',
            args: [1, 2, 3],
            timestamp: 1000
        } as OSCMessage);
        
        transformer.addMessage({
            address: '/test',
            args: [4, 5, 6],
            timestamp: 2000
        } as OSCMessage);
        
        // Buffer should contain both messages
        const bufferContents = transformer.getBufferContents('/test');
        expect(bufferContents.length).toBe(2);
        expect(bufferContents[0]).toEqual([1, 2, 3]);
        expect(bufferContents[1]).toEqual([4, 5, 6]);
    });

    it('should handle multiple addresses independently', () => {
        const transformer = new SimpleTransformer(identityTransform);
        
        // Add messages to two different addresses
        transformer.addMessage({
            address: '/test1',
            args: [1, 2, 3],
            timestamp: 1000
        } as OSCMessage);
        
        transformer.addMessage({
            address: '/test2',
            args: [4, 5, 6],
            timestamp: 2000
        } as OSCMessage);
        
        // Read only from test1
        transformer.getTransformedAddress('/test1');
        
        // Add new messages to both addresses
        transformer.addMessage({
            address: '/test1',
            args: [7, 8, 9],
            timestamp: 3000
        } as OSCMessage);
        
        transformer.addMessage({
            address: '/test2',
            args: [10, 11, 12],
            timestamp: 4000
        } as OSCMessage);
        
        // test1 should be flushed, test2 should accumulate
        const test1Contents = transformer.getBufferContents('/test1');
        expect(test1Contents.length).toBe(1);
        expect(test1Contents[0]).toEqual([7, 8, 9]);
        
        const test2Contents = transformer.getBufferContents('/test2');
        expect(test2Contents.length).toBe(2);
        expect(test2Contents[0]).toEqual([4, 5, 6]);
        expect(test2Contents[1]).toEqual([10, 11, 12]);
    });
}); 
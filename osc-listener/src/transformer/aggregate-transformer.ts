import { AggregateConfig, AggregateFunction, MessageTransformer, OSCMessage } from '../types/osc-listener';
import { SimpleTransformer } from './transformer';

export class AggregateTransformer implements MessageTransformer {
    private baseTransformer: MessageTransformer;
    private virtualAddresses: Map<string, AggregateConfig>;
    private virtualBuffers: Map<string, number[][]>;
    private readAddresses: Set<string>;

    constructor(baseTransformer: MessageTransformer, aggregateConfigs: AggregateConfig[] = []) {
        this.baseTransformer = baseTransformer;
        this.virtualAddresses = new Map();
        this.virtualBuffers = new Map();
        this.readAddresses = new Set();
        
        // Register all aggregate configs
        for (const config of aggregateConfigs) {
            this.registerVirtualAddress(config);
        }
    }

    /**
     * Register a new virtual address with its source addresses and aggregation function
     */
    registerVirtualAddress(config: AggregateConfig): void {
        this.virtualAddresses.set(config.virtualAddress, config);
        this.virtualBuffers.set(config.virtualAddress, []);
    }

    /**
     * Pass incoming messages to the base transformer and update virtual buffers if needed
     */
    addMessage(message: OSCMessage): void {
        // First, pass the message to the base transformer
        this.baseTransformer.addMessage(message);
        
        // Then, check if this message affects any virtual addresses
        for (const [virtualAddress, config] of this.virtualAddresses.entries()) {
            if (config.sourceAddresses.includes(message.address)) {
                if (this.readAddresses.has(virtualAddress)) {
                    // If this virtual address has been read and new data is coming in,
                    // compute the new value and update the buffer
                    const newValue = this.computeVirtualAddress(virtualAddress);
                    if (newValue !== null) {
                        this.virtualBuffers.set(virtualAddress, [newValue]);
                    }
                }
            }
        }
    }

    /**
     * Get all available addresses (real + virtual)
     */
    getAddresses(): string[] {
        const baseAddresses = this.baseTransformer.getAddresses();
        const virtualAddresses = Array.from(this.virtualAddresses.keys());
        return [...baseAddresses, ...virtualAddresses];
    }

    /**
     * Get all real addresses (excluding virtual ones)
     */
    getRealAddresses(): string[] {
        return this.baseTransformer.getAddresses();
    }

    /**
     * Get all virtual addresses
     */
    getVirtualAddresses(): string[] {
        return Array.from(this.virtualAddresses.keys());
    }

    /**
     * Get transformed messages for all addresses (real + virtual)
     */
    getTransformedMessages(): Map<string, number[]> {
        const result = new Map<string, number[]>();
        
        // Get base transformer results
        const baseResults = this.baseTransformer.getTransformedMessages();
        for (const [address, value] of baseResults.entries()) {
            result.set(address, value);
        }
        
        // Add virtual addresses
        for (const virtualAddress of this.virtualAddresses.keys()) {
            const value = this.getTransformedAddress(virtualAddress);
            if (value !== null) {
                result.set(virtualAddress, value);
            }
        }
        
        return result;
    }

    /**
     * Get transformed value for a specific address (real or virtual)
     */
    getTransformedAddress(address: string): number[] | null {
        // Check if this is a virtual address
        if (this.virtualAddresses.has(address)) {
            // Mark this address as read
            this.readAddresses.add(address);
            
            // Get the latest value
            const value = this.computeVirtualAddress(address);
            if (value !== null) {
                // Store in buffer
                this.virtualBuffers.set(address, [value]);
            }
            return value;
        }
        
        // Otherwise, delegate to base transformer
        return this.baseTransformer.getTransformedAddress(address);
    }

    /**
     * Get buffer contents for a real or virtual address
     */
    getBufferContents(address: string): number[][] {
        // For virtual addresses, return their buffer contents
        if (this.virtualAddresses.has(address)) {
            // Get the latest value to ensure buffer is up to date
            const value = this.computeVirtualAddress(address);
            if (value !== null) {
                this.virtualBuffers.set(address, [value]);
            }
            return this.virtualBuffers.get(address) || [];
        }
        
        // For SimpleTransformer, use its getBufferContents method
        if (this.baseTransformer instanceof SimpleTransformer) {
            return this.baseTransformer.getBufferContents(address);
        }
        
        // Default fallback
        return [];
    }

    /**
     * Compute the transformed value for a virtual address by applying its aggregate function
     */
    private computeVirtualAddress(virtualAddress: string): number[] | null {
        const config = this.virtualAddresses.get(virtualAddress);
        if (!config) return null;
        
        // Get the latest values from all source addresses
        const sourceValues = new Map<string, number[]>();
        for (const sourceAddress of config.sourceAddresses) {
            const value = this.baseTransformer.getTransformedAddress(sourceAddress);
            if (value !== null) {
                sourceValues.set(sourceAddress, value);
            }
        }
        
        // If we have no source values, return null
        if (sourceValues.size === 0) return null;
        
        // Apply the aggregate function to the collected values
        return config.aggregateFunction(sourceValues);
    }
} 
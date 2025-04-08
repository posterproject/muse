import { OSCMessage, TransformFunction, ElementTransformFunction, AddressBuffer } from '../types/osc';

export interface MessageTransformer {
    addMessage(message: OSCMessage): void;
    getAddresses(): string[];
    getTransformedMessages(): Map<string, number[]>;
    getTransformedAddress(address: string): number[] | null;
    getBufferContents(address: string): number[][];
}

export class SimpleTransformer implements MessageTransformer {
    private buffers: Map<string, AddressBuffer>;
    private transformFn: TransformFunction;
    private elementTransformFn: ElementTransformFunction;

    constructor(transformFn: TransformFunction, elementTransformFn?: ElementTransformFunction) {
        this.buffers = new Map();
        this.transformFn = transformFn;
        this.elementTransformFn = elementTransformFn || ((value: number[]) => value);
    }

    addMessage(message: OSCMessage): void {
        if (!this.buffers.has(message.address)) {
            this.buffers.set(message.address, { values: [], timestamps: [] });
        }
        const buffer = this.buffers.get(message.address)!;
        buffer.values.push(message.args);
        buffer.timestamps.push(message.timestamp);
    }

    getAddresses(): string[] {
        return Array.from(this.buffers.keys());
    }

    getBufferContents(address: string): number[][] {
        const buffer = this.buffers.get(address);
        if (!buffer?.values) return [];
        return buffer.values;
    }

    getTransformedAddress(address: string): number[] | null {
        const buffer = this.buffers.get(address);
        if (!buffer) return null;
        const transformedValues = buffer.values.map(value => this.elementTransformFn(value, address));
        return this.transformFn(transformedValues);
    }

    getTransformedMessages(): Map<string, number[]> {
        const result = new Map<string, number[]>();
        for (const address of this.getAddresses()) {
            const value = this.getTransformedAddress(address);
            if (value !== null) {
                result.set(address, value);
            }
        }
        return result;
    }
}

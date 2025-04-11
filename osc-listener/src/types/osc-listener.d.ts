import { Message } from 'osc';

// Our OSC Message with timestamp
export interface OSCMessage {
    address: string;
    args: number[];
    timestamp: number;
}

// Transformer types
export type TransformFunction = (values: number[][]) => number[];
export type ElementTransformFunction = (value: number[], address: string) => number[];
export type AddressBuffer = { 
    values: number[][];  // Array of message args arrays
    timestamps: number[] 
};

// Aggregate types
export type AggregateFunction = (sourceValues: Map<string, number[]>) => number[];

export interface AggregateConfig {
    virtualAddress: string;
    sourceAddresses: string[];
    aggregateFunction: AggregateFunction;
}

// Transformer interface
export interface MessageTransformer {
    addMessage(message: OSCMessage): void;
    getAddresses(): string[];
    getTransformedMessages(): Map<string, number[]>;
    getTransformedAddress(address: string): number[] | null;
    getBufferContents(address: string): number[][];
} 
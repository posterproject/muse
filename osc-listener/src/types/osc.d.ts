declare module 'osc' {
    export interface Message {
        address: string;
        args: Array<{
            type: string;
            value: number;
        }>;
    }

    export interface UDPPortOptions {
        localAddress: string;
        localPort: number;
    }

    export class UDPPort {
        constructor(options: UDPPortOptions);
        on(event: 'ready' | 'error' | 'message', callback: (data: any) => void): void;
        send(message: Message, address: string, port: number): void;
        open(): void;
        close(): void;
    }
}

declare module 'ws' {
    export class WebSocket {
        readyState: number;
        send(data: string): void;
        close(): void;
        on(event: string, callback: () => void): void;
    }

    export class WebSocketServer {
        constructor(options: { port: number });
        on(event: 'connection', callback: (ws: WebSocket) => void): void;
        close(): void;
    }
}

export interface OSCMessage {
    address: string;
    args: number[];
    timestamp: number;
}

export type TransformFunction = (values: number[][]) => number[];
export type AddressBuffer = { 
    values: number[][];  // Array of message args arrays
    timestamps: number[] 
};

export interface MessageTransformer {
    addMessage(message: OSCMessage): void;
    getAddresses(): string[];
    getTransformedMessages(): Map<string, number>;
    getTransformedAddress(address: string): number | null;
}

// Our own type that matches the OSC module's UDPPort
export interface UDPPort {
    constructor(options: { localAddress: string; localPort: number }): void;
    on(event: 'ready' | 'error' | 'message', callback: (data: any) => void): void;
    send(message: any, address: string, port: number): void;
    open(): void;
    close(): void;
}

// Re-export the types we need from the osc module
export { UDPPort, Message, UDPPortOptions } from 'osc';

export interface OSCMessage {
    address: string;
    args: number[];
    timestamp: number;
}

export type TransformFunction = (values: number[][]) => number[];
export type AddressBuffer = { 
    values: number[][];  // Array of message args arrays
    timestamps: number[] 
};

export interface MessageTransformer {
    addMessage(message: OSCMessage): void;
    getAddresses(): string[];
    getTransformedMessages(): Map<string, number>;
    getTransformedAddress(address: string): number | null;
} 
declare module 'osc' {
    export interface Message {
        address: string;
        args: any[];
    }

    export interface UDPPortOptions {
        localAddress: string;
        localPort: number;
    }

    export class UDPPort {
        constructor(options: UDPPortOptions);
        on(event: 'ready' | 'message' | 'error', callback: (data: any) => void): void;
        open(): void;
        close(): void;
    }
} 
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
        on(event: 'ready' | 'error', callback: (data: any) => void): void;
        send(message: Message, address: string, port: number): void;
        open(): void;
        close(): void;
    }
} 
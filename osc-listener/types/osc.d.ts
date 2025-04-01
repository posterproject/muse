declare module 'osc' {
    export interface Message {
        address: string;
        args: any[];
    }

    export interface UDPPortOptions {
        localAddress?: string;
        localPort?: number;
    }

    export class UDPPort {
        constructor(options: UDPPortOptions);
        on(event: string, callback: (data: any) => void): void;
        open(): void;
        close(): void;
    }
} 
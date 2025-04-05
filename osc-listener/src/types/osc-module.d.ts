declare module 'osc' {
    export class UDPPort {
        constructor(options: {
            localAddress: string;
            localPort: number;
        });
        on(event: string, callback: (data: any) => void): void;
        open(): void;
        close(): void;
    }
} 
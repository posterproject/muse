// OSC module declaration
declare namespace osc {
    interface UDPPortOptions {
        localAddress: string;
        localPort: number;
    }

    class UDPPort {
        constructor(options: UDPPortOptions);
        on(event: string, callback: (data: any) => void): void;
        open(): void;
        close(): void;
        send(message: any, address: string, port: number): void;
    }
}

declare module 'osc' {
    export = osc;
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
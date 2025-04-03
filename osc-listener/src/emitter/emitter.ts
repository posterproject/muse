import { Message } from '../types/message';
import osc from 'osc';
import { WebSocketServer, WebSocket as WSWebSocket } from 'ws';

export interface Emitter {
    emit(message: Message): void;
    close(): void;
}

export class UDPEmitter implements Emitter {
    private udpPort: any;

    constructor(targetAddress: string, targetPort: number) {
        this.udpPort = new osc.UDPPort({
            localAddress: '0.0.0.0',
            localPort: 0
        });

        this.udpPort.on('ready', () => {
            console.log(`UDP emitter ready, sending to ${targetAddress}:${targetPort}`);
        });

        this.udpPort.on('error', (err: Error) => {
            console.error('UDP emitter error:', err);
        });

        this.udpPort.open();
    }

    emit(message: Message): void {
        this.udpPort.send(message, '127.0.0.1', 9005);
    }

    close(): void {
        this.udpPort.close();
    }
}

export class WSEmitter implements Emitter {
    private wss: WebSocketServer;
    private clients: Set<WSWebSocket> = new Set();

    constructor(port: number) {
        this.wss = new WebSocketServer({ port });

        this.wss.on('connection', (ws: WSWebSocket) => {
            this.clients.add(ws);
            console.log('New WebSocket client connected');

            ws.on('close', () => {
                this.clients.delete(ws);
                console.log('WebSocket client disconnected');
            });
        });
    }

    emit(message: Message): void {
        const messageStr = JSON.stringify(message);
        this.clients.forEach(client => {
            if (client.readyState === 1) { // 1 = OPEN
                client.send(messageStr);
            }
        });
    }

    close(): void {
        this.wss.close();
    }
} 
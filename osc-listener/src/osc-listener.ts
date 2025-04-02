import osc from 'osc';
import { Config } from './config';

export class OSCListener {
    private udpPort: any;
    private onMessage: (message: any) => void;
    private config: Config;

    constructor(config: Config, onMessage: (message: any) => void) {
        this.config = config;
        this.onMessage = onMessage;
        this.udpPort = new osc.UDPPort({
            localAddress: config.localAddress,
            localPort: config.localPort
        });

        this.udpPort.on('ready', () => {
            console.log(`OSC listener ready on ${config.localAddress}:${config.localPort}`);
        });

        this.udpPort.on('message', (oscMessage: any) => {
            if (this.config.debug) {
                console.log('OSC Message:', oscMessage);
            }
            this.onMessage(oscMessage);
        });

        this.udpPort.on('error', (err: Error) => {
            console.error('OSC error:', err);
        });

        this.udpPort.open();
    }

    close() {
        this.udpPort.close();
    }
} 
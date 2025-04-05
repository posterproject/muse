import osc from 'osc';
import { Config, DebugLevel } from './config';
import { OSCMessage } from './types/osc';
import { MessageTransformer } from './transformer/transformer';

export class OSCListener {
    private udpPort: any;
    private transformer: MessageTransformer;
    private config: Config;

    constructor(config: Config, transformer: MessageTransformer) {
        this.config = config;
        this.transformer = transformer;

        this.udpPort = new osc.UDPPort({
            localAddress: config.localAddress,
            localPort: config.localPort
        });

        this.udpPort.on('ready', () => {
            console.log(`OSC listener ready on ${config.localAddress}:${config.localPort}`);
        });

        this.udpPort.on('message', (oscMessage: any) => {
            if (this.config.debug >= DebugLevel.High) {
                console.log('OSC Message:', oscMessage);
            }
            const message: OSCMessage = {
                address: oscMessage.address,
                args: oscMessage.args.map((arg: any) => arg.value),
                timestamp: Date.now()
            };
            this.transformer.addMessage(message);
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
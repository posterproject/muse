import { Config, DebugLevel } from './config';
import { OSCMessage, UDPPort } from './types/osc';
import { MessageTransformer } from './transformer/transformer';

export class OSCListener {
    private udpPort: UDPPort;
    private transformer: MessageTransformer;
    private config: Config;

    constructor(config: Config, transformer: MessageTransformer) {
        this.config = config;
        this.transformer = transformer;

        this.udpPort = new UDPPort({
            localAddress: config.localAddress,
            localPort: config.localPort
        });

        this.udpPort.on('ready', () => {
            console.log(`OSC listener ready on ${config.localAddress}:${config.localPort}`);
        });

        this.udpPort.on('message', (oscMessage: any) => {
            if (this.config.debug >= DebugLevel.High) {
                console.log('Raw OSC Message:', oscMessage);
            }
            const message: OSCMessage = {
                address: oscMessage.address,
                args: oscMessage.args.map((arg: any) => {
                    if (typeof arg === 'number') {
                        return arg;
                    }
                    if (this.config.debug >= DebugLevel.High) {
                        console.log('Non-number value:', arg);
                        console.log('Non-number value type:', typeof arg);
                    }
                    return 0; // Default to 0 if value is not a number
                }),
                timestamp: Date.now()
            };
            if (this.config.debug >= DebugLevel.High) {
                console.log('Processed Message:', message);
            }
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
import osc from 'osc';
import { Config } from './config';
import { Transformer, LatestValueTransformer } from './transformer/transformer';
import { Emitter } from './emitter/emitter';

export class OSCListener {
    private udpPort: any;
    private transformer: Transformer;
    private emitter: Emitter;

    constructor(config: Config, emitter: Emitter, transformer: Transformer = new LatestValueTransformer()) {
        this.transformer = transformer;
        this.emitter = emitter;

        this.udpPort = new osc.UDPPort({
            localAddress: config.localAddress,
            localPort: config.localPort
        });

        this.udpPort.on('ready', () => {
            console.log(`OSC listener ready on ${config.localAddress}:${config.localPort}`);
        });

        this.udpPort.on('message', (oscMessage: any) => {
            this.transformer.process(oscMessage);
            const transformedMessage = this.transformer.getTransformedData();
            this.emitter.emit(transformedMessage);
        });

        this.udpPort.on('error', (err: Error) => {
            console.error('OSC error:', err);
        });

        this.udpPort.open();
    }

    close() {
        this.udpPort.close();
        this.emitter.close();
        this.transformer.clear();
    }
} 
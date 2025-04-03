import express from 'express';
import cors from 'cors';
import { OSCListener } from './osc-listener';
import { Config, defaultConfig } from './config';
import { LatestValueTransformer, AverageTransformer } from './transformer/transformer';
import { UDPEmitter, WSEmitter, Emitter } from './emitter/emitter';
import { Message } from './types/message';

const app = express();
app.use(cors());
app.use(express.json());

let oscListener: OSCListener | null = null;
let lastMessage: Message | string = 'No data';

app.post('/api/start', (req, res) => {
    console.log('Received start request:', req.body);
    const config: Config = {
        localAddress: req.body.localAddress,
        localPort: req.body.localPort,
        updateRate: req.body.updateRate,
        debug: defaultConfig.debug
    };

    try {
        // Create emitter based on request
        const emitter = req.body.useWebSocket
            ? new WSEmitter(8080)
            : new UDPEmitter('127.0.0.1', 9005);

        // Create transformer based on request
        const transformer = req.body.useAverage
            ? new AverageTransformer(req.body.bufferSize || 10)
            : new LatestValueTransformer();

        // Create a wrapper emitter that also updates lastMessage
        const wrappedEmitter: Emitter = {
            emit: (message: Message) => {
                lastMessage = message;
                emitter.emit(message);
            },
            close: () => emitter.close()
        };

        oscListener = new OSCListener(config, wrappedEmitter, transformer);
        res.json({ success: true });
    } catch (error) {
        console.error('Error starting OSC listener:', error);
        res.status(500).json({ error: String(error) });
    }
});

app.post('/api/stop', (_, res) => {
    try {
        if (oscListener) {
            oscListener.close();
            oscListener = null;
            lastMessage = 'No data';
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error stopping OSC listener:', error);
        res.status(500).json({ error: String(error) });
    }
});

app.get('/api/messages', (_, res) => {
    res.send(typeof lastMessage === 'string' ? lastMessage : JSON.stringify(lastMessage, null, 2));
});

app.get('/api/health', (_, res) => {
    res.send('OK');
});

const port = 3001;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
}); 
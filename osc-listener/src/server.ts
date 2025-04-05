import express from 'express';
import cors from 'cors';
import { OSCListener } from './osc-listener';
import { Config, defaultConfig, DebugLevel } from './config';
import { SimpleTransformer } from './transformer/transformer';

const app = express();
app.use(cors());
app.use(express.json());

let oscListener: OSCListener | null = null;
let transformer: SimpleTransformer | null = null;

// Example transform function - can be replaced with any function that processes arrays of numbers
const averageTransform = (values: number[]) => {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
};

const lastValTransform = (values: number[][]) => {
    if (values.length === 0) return [0];
    return values[values.length - 1];
};

app.post('/api/start', (req, res) => {
    console.log('Received start request:', req.body);
    const config: Config = {
        localAddress: req.body.localAddress,
        localPort: req.body.localPort,
        updateRate: req.body.updateRate,
        debug: defaultConfig.debug
    };

    try {
        //transformer = new SimpleTransformer(averageTransform);
        transformer = new SimpleTransformer(lastValTransform); // for testing
        oscListener = new OSCListener(config, transformer);
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
            transformer = null;
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error stopping OSC listener:', error);
        res.status(500).json({ error: String(error) });
    }
});

app.get('/api/addresses', (_, res) => {
    if (!transformer) {
        res.json([]);
        return;
    }
    res.json(transformer.getAddresses());
});

app.get('/api/messages', (_, res) => {
    if (!transformer) {
        res.json({});
        return;
    }
    if (defaultConfig.debug >= DebugLevel.Medium) {
        console.log(`Addresses: ${transformer.getAddresses()}`);
        for (const address of transformer.getAddresses()) {
            console.log(`Buffer contents for ${address}:\n${JSON.stringify(transformer.getBufferContents(address))}`);
        }
    }
    const messages = transformer.getTransformedMessages();
    res.json(Object.fromEntries(messages));
    if (defaultConfig.debug >= DebugLevel.Low) console.log(`Transformed messages:\n${JSON.stringify(messages)}`);
});

app.get('/api/messages/:address', (req, res) => {
    if (!transformer) {
        res.json(null);
        return;
    }
    const addresses = transformer.getAddresses();
    if (!addresses.includes(req.params.address)) {
        res.status(404).json({ error: `Address ${req.params.address} not found` });
        return;
    }
    if (defaultConfig.debug >= DebugLevel.Medium) {
        console.log(`Buffer contents for ${req.params.address}:\n${JSON.stringify(transformer.getBufferContents(req.params.address))}`);
    }
    const value = transformer.getTransformedAddress(req.params.address);
    res.json(value);
    if (defaultConfig.debug >= DebugLevel.Low) console.log(`Transformed message for ${req.params.address}: ${JSON.stringify(value)}`);
});

app.get('/api/health', (_, res) => {
    res.send('OK');
});

const port = 3001;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
}); 
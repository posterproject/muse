import express from 'express';
import cors from 'cors';
import { Config, defaultConfig, DebugLevel } from './config';
import { OSCListener } from './osc-listener';
import { SimpleTransformer } from './transformer/transformer';
import { TransformerFactory } from './transformer/transformer-factory';

const app = express();
app.use(cors());
app.use(express.json());

let oscListener: OSCListener | null = null;
let transformer: SimpleTransformer | null = null;

app.post('/api/start', (req, res) => {
    console.log('Received start request:', req.body);
    const config: Config = {
        localAddress: req.body.localAddress,
        localPort: req.body.localPort,
        updateRate: req.body.updateRate,
        serverPort: defaultConfig.serverPort,
        debug: defaultConfig.debug,
        recordData: req.body.recordData || defaultConfig.recordData,
        recordFileName: defaultConfig.recordFileName
    };

    try {
        transformer = TransformerFactory.createAverageTransformer();
        oscListener = new OSCListener(config, transformer);
        res.json({ success: true });
    } catch (error) {
        console.error('Error starting OSC listener:', error);
        res.status(500).json({ error: String(error) });
    }
});

app.post('/api/stop', (_, res) => {
    if (oscListener) {
        oscListener.close();
        oscListener = null;
        transformer = null;
        res.json({ success: true });
    } else {
        res.status(400).json({ error: 'OSC listener not running' });
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
    const messagesObj = Object.fromEntries(transformer.getTransformedMessages());
    if (defaultConfig.debug >= DebugLevel.Low) console.log(`Transformed messages:\n${JSON.stringify(messagesObj)}`);
    res.json(messagesObj);
});

app.get('/api/messages/:address', (req, res) => {
    if (!transformer) {
        res.status(404).json({ error: 'No transformer available' });
        return;
    }
    const value = transformer.getTransformedAddress(req.params.address);
    if (value === null) {
        res.status(404).json({ error: 'Address not found' });
        return;
    }
    if (defaultConfig.debug >= DebugLevel.Medium) {
        console.log(`Buffer contents for ${req.params.address}:\n${JSON.stringify(transformer.getBufferContents(req.params.address))}`);
    }
    if (defaultConfig.debug >= DebugLevel.Low) console.log(`Transformed message for ${req.params.address}: ${JSON.stringify(value)}`);
    res.json(value);
});

app.get('/api/messages/*', (req, res) => {
    if (!transformer) {
        res.status(404).json({ error: 'No transformer available' });
        return;
    }
    
    const pathParam = req.path.substring('/api/messages/'.length);
    const address = pathParam.startsWith('/') ? pathParam : '/' + pathParam;
    
    if (defaultConfig.debug >= DebugLevel.Low) {
        console.log(`Accessing address via path: ${address}`);
    }
    
    const value = transformer.getTransformedAddress(address);
    if (value === null) {
        res.status(404).json({ error: 'Address not found' });
        return;
    }
    
    if (defaultConfig.debug >= DebugLevel.Medium) {
        console.log(`Buffer contents for ${address}:\n${JSON.stringify(transformer.getBufferContents(address))}`);
    }
    if (defaultConfig.debug >= DebugLevel.Low) {
        console.log(`Transformed message for ${address}: ${JSON.stringify(value)}`);
    }
    
    res.json(value);
});

app.get('/api/health', (_, res) => {
    res.status(200).send('OK');
});

app.listen(defaultConfig.serverPort, () => {
    console.log(`Server running on port ${defaultConfig.serverPort}`);
});
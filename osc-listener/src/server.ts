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

const primaryWaveChannels = ['alpha', 'beta', 'gamma', 'delta', 'theta'];

const averageTransform = (values: number[][]): number[] => {
    if (values.length === 0) return [];
    
    // Use first array as reference length
    const referenceLength = values[0].length;
    
    // Initialize accumulator with zeros and counts
    const initial = {
        sums: new Array(referenceLength).fill(0),
        counts: new Array(referenceLength).fill(0)
    };
    
    // Process all arrays
    const { sums, counts } = values.reduce((acc, array) => {
        // For each column up to the reference length
        for (let i = 0; i < referenceLength; i++) {
            if (i < array.length) {
                acc.sums[i] += array[i];
                acc.counts[i]++;
            }
        }
        return acc;
    }, initial);
    
    // Compute averages
    return sums.map((sum, i) => counts[i] > 0 ? sum / counts[i] : 0);
};

const lastValTransform = (values: number[][]) => {
    if (values.length === 0) return [0];
    return values[values.length - 1];
};

const elementTransformAvgWaveData = (values: number[], address: string): number[] => {
    // Check if this is a primary wave channel
    const isPrimaryWave = primaryWaveChannels.some(channel => 
        address.toLowerCase().includes(channel)
    );
    
    if (!isPrimaryWave) {
        return values; // Return unchanged for non-primary channels
    }
    
    // For primary waves, calculate average of non-zero values
    const nonZeroValues = values.filter(v => v !== 0);
    if (nonZeroValues.length === 0) {
        return [0]; // Return [0] if all values are zero
    }
    
    const average = nonZeroValues.reduce((sum, val) => sum + val, 0) / nonZeroValues.length;
    return [average];
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
        transformer = new SimpleTransformer(averageTransform, elementTransformAvgWaveData);
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
    const messagesObj = Object.fromEntries(transformer.getTransformedMessages());
    if (defaultConfig.debug >= DebugLevel.Low) console.log(`Transformed messages:\n${JSON.stringify(messagesObj)}`);
    res.json(messagesObj);
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
    if (defaultConfig.debug >= DebugLevel.Low) console.log(`Transformed message for ${req.params.address}: ${JSON.stringify(value)}`);
    res.json(value);
});

app.get('/api/health', (_, res) => {
    res.send('OK');
});

const port = 3001;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
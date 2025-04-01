import express from 'express';
import cors from 'cors';
import { OSCListener } from './osc-listener';
import { Config } from './config';

const app = express();
app.use(cors());
app.use(express.json());

let oscListener: OSCListener | null = null;
let lastMessage = 'Not started';

app.post('/api/start', (req, res) => {
    console.log('Received start request:', req.body);
    const config: Config = {
        localAddress: req.body.localAddress,
        localPort: req.body.localPort,
        updateRate: req.body.updateRate
    };

    try {
        oscListener = new OSCListener(config, (message) => {
            lastMessage = JSON.stringify(message, null, 2);
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Error starting OSC listener:', error);
        res.status(500).json({ error: String(error) });
    }
});

app.post('/api/stop', (req, res) => {
    try {
        if (oscListener) {
            oscListener.close();
            oscListener = null;
            lastMessage = 'Stopped';
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error stopping OSC listener:', error);
        res.status(500).json({ error: String(error) });
    }
});

app.get('/api/messages', (req, res) => {
    res.send(lastMessage);
});

const port = 3001;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
}); 
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import osc from 'osc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Middleware for parsing JSON bodies
app.use(express.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// OSC listener state
let oscListener = null;
let lastMessage = null;

// OSC listener class
class OSCListener {
    constructor(config) {
        this.config = config;
        this.udpPort = null;
    }

    start() {
        this.udpPort = new osc.UDPPort({
            localAddress: this.config.localAddress,
            localPort: this.config.localPort
        });

        this.udpPort.on('ready', () => {
            console.log('OSC listener ready');
        });

        this.udpPort.on('message', (oscMsg) => {
            console.log('Received message:', oscMsg);
            lastMessage = oscMsg;
        });

        this.udpPort.on('error', (err) => {
            console.error('OSC error:', err);
        });

        this.udpPort.open();
    }

    stop() {
        if (this.udpPort) {
            this.udpPort.close();
            this.udpPort = null;
        }
    }
}

// API endpoints
app.post('/api/start', (req, res) => {
    try {
        if (oscListener) {
            return res.status(400).json({ error: 'OSC listener already running' });
        }

        oscListener = new OSCListener(req.body);
        oscListener.start();
        res.json({ status: 'started' });
    } catch (error) {
        console.error('Error starting OSC listener:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/stop', (req, res) => {
    try {
        if (!oscListener) {
            return res.status(400).json({ error: 'No OSC listener running' });
        }

        oscListener.stop();
        oscListener = null;
        lastMessage = null;
        res.json({ status: 'stopped' });
    } catch (error) {
        console.error('Error stopping OSC listener:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/messages', (req, res) => {
    res.json({ message: lastMessage });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 
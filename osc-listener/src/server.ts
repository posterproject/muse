import express from 'express';
import cors from 'cors';
import { Config, defaultConfig, DebugLevel } from './config';
import { OSCListener } from './osc-listener';
import { SimpleTransformer } from './transformer/transformer';
import { TransformerFactory } from './transformer/transformer-factory';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

let oscListener: OSCListener | null = null;
let transformer: SimpleTransformer | null = null;
let currentConfig: Config | null = null;
const sessions = new Map<string, { timestamp: number }>();
const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes timeout

// Cleanup expired sessions periodically
const sessionCleanupInterval = setInterval(() => {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const [sessionId, session] of sessions.entries()) {
        if (now - session.timestamp > SESSION_TIMEOUT_MS) {
            sessions.delete(sessionId);
            expiredCount++;
        }
    }
    
    if (expiredCount > 0 && sessions.size === 0 && oscListener) {
        console.log('All sessions expired, stopping OSC listener');
        oscListener.close();
        oscListener = null;
        transformer = null;
        currentConfig = null;
    }
}, 60 * 1000); // Check every minute

app.post('/api/start', (req, res) => {
    console.log('Received start request:', req.body);
    
    // Generate a new session ID
    const sessionId = uuidv4();
    sessions.set(sessionId, { timestamp: Date.now() });
    
    // Check if OSC listener is already running
    if (oscListener) {
        console.log('OSC listener already running, ignoring new configuration');
        return res.json({
            success: true, 
            sessionId,
            config: currentConfig,
            noChanges: true
        });
    }
    
    // Start new OSC listener
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
        transformer = TransformerFactory.createLastValueTransformer();
        oscListener = new OSCListener(config, transformer);
        currentConfig = config;
        res.json({ 
            success: true,
            sessionId,
            config: currentConfig,
            noChanges: false
        });
    } catch (error) {
        console.error('Error starting OSC listener:', error);
        sessions.delete(sessionId);
        res.status(500).json({ error: String(error) });
    }
});

app.post('/api/stop', (req, res) => {
    const { sessionId } = req.body;
    
    // If server is not running, return no change instead of error
    if (!oscListener) {
        return res.json({ 
            success: true, 
            message: 'Server already stopped',
            noChanges: true
        });
    }
    
    // If no sessionId provided, assume it's an old client
    if (!sessionId || !sessions.has(sessionId)) {
        console.log('Stop request without valid sessionId');
        if (sessions.size === 0) {
            // Clean shutdown if no sessions
            oscListener.close();
            oscListener = null;
            transformer = null;
            currentConfig = null;
            return res.json({ 
                success: true,
                message: 'Server stopped'
            });
        } else {
            return res.json({
                success: true,
                message: 'Disconnect successful, but server still running',
                remainingSessions: sessions.size
            });
        }
    }
    
    // Remove the session
    sessions.delete(sessionId);
    
    // If this was the last session, stop the server
    if (sessions.size === 0) {
        oscListener.close();
        oscListener = null;
        transformer = null;
        currentConfig = null;
        return res.json({ 
            success: true,
            message: 'Server stopped (last client disconnected)'
        });
    } else {
        // Update the response that server is still running with remaining sessions
        return res.json({
            success: true,
            message: 'Client disconnected, but server still running',
            remainingSessions: sessions.size
        });
    }
});

app.get('/api/status', (_, res) => {
    if (!oscListener) {
        return res.json({
            running: false,
            message: 'Server not running'
        });
    }
    
    // Update timestamps for active sessions to prevent timeouts
    for (const [sessionId, session] of sessions.entries()) {
        session.timestamp = Date.now();
    }
    
    return res.json({
        running: true,
        message: 'Server running',
        config: currentConfig,
        sessionCount: sessions.size,
        sessionIds: Array.from(sessions.keys())
    });
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
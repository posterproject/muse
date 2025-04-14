import express from 'express';
import cors from 'cors';
import { Config, defaultConfig, DebugLevel } from './config';
import { OSCListener } from './osc-listener';
import { TransformerFactory, aggregateFunctions } from './transformer/transformer-factory';
import { AggregateTransformer } from './transformer/aggregate-transformer';
import { MessageTransformer, AggregateConfig } from './types/osc-listener';
import { v4 as uuidv4 } from 'uuid';
import logger, { debugLog } from './logger';

const app = express();
app.use(cors());
app.use(express.json());

let oscListener: OSCListener | null = null;
let transformer: MessageTransformer | null = null;
let currentConfig: Config | null = null;
const sessions = new Map<string, { timestamp: number }>();
const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes timeout

// Helper function to update session timestamps for active clients
const updateSessionTimestamps = (sessionId?: string) => {
    const now = Date.now();
    
    if (sessionId && sessions.has(sessionId)) {
        // Update specific session if sessionId provided
        const session = sessions.get(sessionId)!;
        session.timestamp = now;
    } else {
        // Update all sessions if no sessionId provided
        for (const [_, session] of sessions.entries()) {
            session.timestamp = now;
        }
    }
};

// Helper function to extract sessionId from request headers
const getSessionIdFromRequest = (req: express.Request): string | undefined => {
    return req.header('X-Session-ID');
};

// Middleware to update session timestamp for all API requests
const updateSessionTimestampMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!oscListener) {
        next();
        return;
    }
    
    const sessionId = getSessionIdFromRequest(req);
    if (sessionId && sessions.has(sessionId)) {
        updateSessionTimestamps(sessionId);
    }
    
    next();
};

// Apply the middleware to all API routes
app.use('/api', updateSessionTimestampMiddleware);

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
        logger.info('All sessions expired, stopping OSC listener');
        oscListener.close();
        oscListener = null;
        transformer = null;
        currentConfig = null;
    }
}, 60 * 1000); // Check every minute

app.post('/api/start', (req, res) => {
    logger.info('Received start request', { body: req.body });
    
    // Generate a new session ID
    const sessionId = uuidv4();
    sessions.set(sessionId, { timestamp: Date.now() });
    
    // Check if OSC listener is already running
    if (oscListener) {
        logger.info('OSC listener already running, ignoring new configuration');
        return res.json({
            success: true, 
            sessionId,
            config: currentConfig,
            noChanges: true
        });
    }
    
    // Start new OSC listener
    const config: Config = {
        localAddress: req.body.localAddress || defaultConfig.localAddress,
        localPort: req.body.localPort || defaultConfig.localPort,
        updateRate: req.body.updateRate || defaultConfig.updateRate,
        serverPort: defaultConfig.serverPort,
        debug: defaultConfig.debug,
        recordData: req.body.recordData || defaultConfig.recordData,
        recordFileName: defaultConfig.recordFileName,
        aggregateEndpoints: req.body.aggregateEndpoints || []
    };

    try {
        // Create the base transformer
        const baseTransformer = TransformerFactory.createLastValueTransformer();
        
        // Create aggregate transformer with custom configs if provided, otherwise use defaults
        const processedConfigs: AggregateConfig[] | undefined = config.aggregateEndpoints && config.aggregateEndpoints.length > 0
            ? config.aggregateEndpoints.map(endpoint => {
                // If the function is provided as a string (e.g., "average"), map it to the actual function
                if (typeof endpoint.aggregateFunction === 'string') {
                    const funcName = endpoint.aggregateFunction;
                    const func = aggregateFunctions[funcName];
                    
                    if (!func) {
                        logger.warn(`Unknown aggregate function: ${funcName}. Using 'average' instead.`);
                        return {
                            ...endpoint,
                            aggregateFunction: aggregateFunctions.average
                        };
                    }
                    
                    return {
                        ...endpoint,
                        aggregateFunction: func
                    };
                }
                
                return endpoint;
            })
            : undefined;
        
        transformer = TransformerFactory.createAggregateTransformer(baseTransformer, processedConfigs);
        logger.info(`Created aggregate transformer with ${processedConfigs ? processedConfigs.length : 'default'} virtual addresses`);
        
        oscListener = new OSCListener(config, transformer);
        currentConfig = config;
        res.json({ 
            success: true,
            sessionId,
            config
        });
    } catch (error) {
        logger.error('Error starting OSC listener', { error });
        res.status(500).json({ 
            success: false, 
            error: 'Error starting OSC listener',
            details: error instanceof Error ? error.message : String(error)
        });
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
        logger.info('Stop request without valid sessionId');
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
        logger.info('Stopping server (last client disconnected)');
        oscListener.close();
        oscListener = null;
        transformer = null;
        currentConfig = null;
        return res.json({ 
            success: true,
            message: 'Server stopped (last client disconnected)'
        });
    } else {
        logger.info('Client disconnected, server still running', { remainingSessions: sessions.size });
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
    
    // Session timestamp is updated by middleware
    
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
    
    // Session timestamp is updated by middleware
    
    res.json(transformer.getAddresses());
});

app.get('/api/messages', (_, res) => {
    if (!transformer) {
        res.json({});
        return;
    }
    
    // Session timestamp is updated by middleware
    
    if (defaultConfig.debug >= DebugLevel.Medium) {
        debugLog(DebugLevel.Medium, 'Addresses', { addresses: transformer.getAddresses() });
        for (const address of transformer.getAddresses()) {
            debugLog(DebugLevel.Medium, `Buffer contents for ${address}`, { contents: transformer.getBufferContents(address) });
        }
    }
    const messagesObj = Object.fromEntries(transformer.getTransformedMessages());
    if (defaultConfig.debug >= DebugLevel.Low) {
        debugLog(DebugLevel.Low, 'Transformed messages', { messages: messagesObj });
    }
    res.json(messagesObj);
});

app.get('/api/messages/:address', (req, res) => {
    if (!transformer) {
        res.status(404).json({ error: 'No transformer available' });
        return;
    }
    
    // Session timestamp is updated by middleware
    
    const value = transformer.getTransformedAddress(req.params.address);
    if (value === null) {
        res.status(404).json({ error: 'Address not found' });
        return;
    }
    if (defaultConfig.debug >= DebugLevel.Medium) {
        debugLog(DebugLevel.Medium, `Buffer contents for ${req.params.address}`, { contents: transformer.getBufferContents(req.params.address) });
    }
    if (defaultConfig.debug >= DebugLevel.Low) {
        debugLog(DebugLevel.Low, `Transformed message for ${req.params.address}`, { value });
    }
    res.json(value);
});

app.get('/api/messages/*', (req, res) => {
    if (!transformer) {
        res.status(404).json({ error: 'No transformer available' });
        return;
    }
    
    // Session timestamp is updated by middleware
    
    const pathParam = req.path.substring('/api/messages/'.length);
    const address = pathParam.startsWith('/') ? pathParam : '/' + pathParam;
    
    if (defaultConfig.debug >= DebugLevel.Low) {
        debugLog(DebugLevel.Low, `Accessing address via path`, { address });
    }
    
    const value = transformer.getTransformedAddress(address);
    if (value === null) {
        res.status(404).json({ error: 'Address not found' });
        return;
    }
    
    if (defaultConfig.debug >= DebugLevel.Medium) {
        debugLog(DebugLevel.Medium, `Buffer contents for ${address}`, { contents: transformer.getBufferContents(address) });
    }
    if (defaultConfig.debug >= DebugLevel.Low) {
        debugLog(DebugLevel.Low, `Transformed message for ${address}`, { value });
    }
    
    res.json(value);
});

app.get('/api/health', (_, res) => {
    res.status(200).send('OK');
});

// Add a new endpoint to get virtual addresses
app.get('/api/virtual-addresses', (_, res) => {
    if (!transformer) {
        res.json([]);
        return;
    }
    
    // Session timestamp is updated by middleware
    
    if (transformer instanceof AggregateTransformer) {
        res.json(transformer.getVirtualAddresses());
    } else {
        res.json([]);
    }
});

// Add a new endpoint to get real addresses (excluding virtual)
app.get('/api/real-addresses', (_, res) => {
    if (!transformer) {
        res.json([]);
        return;
    }
    
    // Session timestamp is updated by middleware
    
    if (transformer instanceof AggregateTransformer) {
        res.json(transformer.getRealAddresses());
    } else {
        res.json(transformer.getAddresses());
    }
});

app.listen(defaultConfig.serverPort, () => {
    logger.info(`Server running on port ${defaultConfig.serverPort}`);
});
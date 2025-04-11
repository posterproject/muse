/**
 * Interface for server configuration and status
 */
export interface ServerInfo {
    serverUrl: string;
    serverPort: number;
    localAddress: string;
    localPort: number;
    updateRate: number;
    recordData: boolean;
    isConnected: boolean;
    sessionId: string | null;
}

/**
 * Class to manage the OSC Listener server lifecycle
 */
export class OSCServerManager {
    private baseUrl: string;
    private sessionId: string | null = null;
    private serverInfo: ServerInfo;
    private serverPort: number;

    constructor(port: number = 3001) {
        this.serverPort = port;
        this.baseUrl = `http://localhost:${port}/api`;
        this.serverInfo = {
            serverUrl: `http://localhost:${port}`,
            serverPort: port,
            localAddress: "0.0.0.0",
            localPort: 9005,
            updateRate: 1,
            recordData: false,
            isConnected: false,
            sessionId: null
        };
    }

    /**
     * Start the OSC server with default configuration
     */
    public async startServer(): Promise<boolean> {
        try {
            // First check if the server is already running
            const statusResponse = await fetch(`${this.baseUrl}/status`);
            const statusData = await statusResponse.json();

            if (statusData.running) {
                console.log('OSC server is already running, connecting to existing instance');
                
                // Update server info with current config
                if (statusData.config) {
                    this.updateServerInfo(statusData.config);
                }
                
                // Connect to the existing server
                const startResponse = await fetch(`${this.baseUrl}/start`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        localAddress: this.serverInfo.localAddress,
                        localPort: this.serverInfo.localPort,
                        updateRate: this.serverInfo.updateRate,
                        recordData: this.serverInfo.recordData
                    })
                });
                
                const startData = await startResponse.json();
                if (startData.success) {
                    this.sessionId = startData.sessionId;
                    this.serverInfo.sessionId = startData.sessionId;
                    this.serverInfo.isConnected = true;
                    
                    // Update config if provided
                    if (startData.config) {
                        this.updateServerInfo(startData.config);
                    }
                    
                    console.log(`Connected to OSC server with session ID: ${this.sessionId}`);
                    return true;
                }
            } else {
                // Server is not running, start it
                console.log('Starting OSC server with default configuration');
                const startResponse = await fetch(`${this.baseUrl}/start`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        localAddress: this.serverInfo.localAddress,
                        localPort: this.serverInfo.localPort,
                        updateRate: this.serverInfo.updateRate,
                        recordData: this.serverInfo.recordData
                    })
                });
                
                const startData = await startResponse.json();
                if (startData.success) {
                    this.sessionId = startData.sessionId;
                    this.serverInfo.sessionId = startData.sessionId;
                    this.serverInfo.isConnected = true;
                    
                    // Update config if provided
                    if (startData.config) {
                        this.updateServerInfo(startData.config);
                    }
                    
                    console.log(`Started OSC server with session ID: ${this.sessionId}`);
                    return true;
                }
            }
            
            return false;
        } catch (error) {
            console.error('Error starting OSC server:', error);
            this.serverInfo.isConnected = false;
            return false;
        }
    }

    /**
     * Stop the OSC server (or just disconnect this client)
     */
    public async stopServer(): Promise<boolean> {
        try {
            if (!this.sessionId) {
                console.log('No active session to stop');
                this.serverInfo.isConnected = false;
                return true;
            }

            const response = await fetch(`${this.baseUrl}/stop`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ sessionId: this.sessionId })
            });

            const data = await response.json();
            if (data.success) {
                console.log(`Session ${this.sessionId} stopped. ${data.message}`);
                this.sessionId = null;
                this.serverInfo.sessionId = null;
                this.serverInfo.isConnected = false;
                return true;
            } else {
                console.error('Failed to stop OSC server:', data.error);
                return false;
            }
        } catch (error) {
            console.error('Error stopping OSC server:', error);
            return false;
        }
    }

    /**
     * Check server status and update info
     */
    public async checkStatus(): Promise<boolean> {
        try {
            const statusResponse = await fetch(`${this.baseUrl}/status`);
            const statusData = await statusResponse.json();
            
            // Update connection status
            this.serverInfo.isConnected = statusData.running;
            
            // Update config if server is running
            if (statusData.running && statusData.config) {
                this.updateServerInfo(statusData.config);
            }
            
            return statusData.running;
        } catch (error) {
            console.error('Error checking server status:', error);
            this.serverInfo.isConnected = false;
            return false;
        }
    }

    /**
     * Update server info from config
     */
    private updateServerInfo(config: any): void {
        if (config.localAddress) this.serverInfo.localAddress = config.localAddress;
        if (config.localPort) this.serverInfo.localPort = config.localPort;
        if (config.updateRate) this.serverInfo.updateRate = config.updateRate;
        if (config.recordData !== undefined) this.serverInfo.recordData = config.recordData;
        if (config.serverPort) this.serverInfo.serverPort = config.serverPort;
    }

    /**
     * Get the current session ID
     */
    public getSessionId(): string | null {
        return this.sessionId;
    }
    
    /**
     * Get server information
     */
    public getServerInfo(): ServerInfo {
        return this.serverInfo;
    }
    
    /**
     * Update server configuration and reconnect
     */
    public async updateConfig(
        localAddress?: string,
        localPort?: number,
        updateRate?: number,
        recordData?: boolean
    ): Promise<boolean> {
        // Only update provided values
        if (localAddress) this.serverInfo.localAddress = localAddress;
        if (localPort) this.serverInfo.localPort = localPort;
        if (updateRate) this.serverInfo.updateRate = updateRate;
        if (recordData !== undefined) this.serverInfo.recordData = recordData;
        
        // Disconnect if connected
        if (this.serverInfo.isConnected) {
            await this.stopServer();
        }
        
        // Reconnect with new config
        return await this.startServer();
    }
} 
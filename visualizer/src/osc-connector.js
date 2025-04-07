/**
 * OSC Connector for Muse Data
 * This script handles the communication between the OSC server and the visualization
 */

export class OSCConnector {
    constructor() {
        this.connected = false;
        this.serverUrl = 'http://localhost:3001';
        this.pollingInterval = null;
        this.dataCallback = null;
        this.pollingRate = 100; // ms between polls
        
        // Map of OSC addresses to brainwave types
        this.addressMapping = {
            // Main EEG channels
            '/muse/eeg1': 'eeg1',
            '/muse/eeg2': 'eeg2',
            '/muse/eeg3': 'eeg3',
            '/muse/eeg4': 'eeg4',
            
            // Brainwave bands - using absolute values (more stable)
            '/muse/elements/delta_absolute1': 'delta',
            '/muse/elements/theta_absolute1': 'theta',
            '/muse/elements/alpha_absolute1': 'alpha',
            '/muse/elements/beta_absolute1': 'beta',
            '/muse/elements/gamma_absolute1': 'gamma',
            
            // Alternative bands if needed
            '/muse/elements/delta_absolute2': 'delta2',
            '/muse/elements/theta_absolute2': 'theta2',
            '/muse/elements/alpha_absolute2': 'alpha2',
            '/muse/elements/beta_absolute2': 'beta2',
            '/muse/elements/gamma_absolute2': 'gamma2',
            
            // Accelerometer and gyroscope data
            '/muse/acc1': 'acc1',
            '/muse/acc2': 'acc2',
            '/muse/acc3': 'acc3',
            '/muse/gyro1': 'gyro1', 
            '/muse/gyro2': 'gyro2',
            '/muse/gyro3': 'gyro3',
            
            // Special indicators
            '/muse/elements/blink': 'blink',
            '/muse/elements/touching_forehead': 'contact'
        };
    }
    
    /**
     * Connect to the OSC server and start polling for data
     * @param {string} serverUrl The URL of the OSC server
     */
    connect(serverUrl) {
        if (serverUrl) {
            this.serverUrl = serverUrl;
        }
        
        console.log(`Connecting to OSC server at ${this.serverUrl}`);
        
        // Start the OSC server if it's not already running
        this.startOSCServer()
            .then(() => {
                this.connected = true;
                this.startPolling();
                console.log('Connected to OSC server');
            })
            .catch(error => {
                console.error('Failed to connect to OSC server:', error);
            });
    }
    
    /**
     * Disconnect from the OSC server and stop polling
     */
    disconnect() {
        this.stopOSCServer()
            .then(() => {
                this.connected = false;
                this.stopPolling();
                console.log('Disconnected from OSC server');
            })
            .catch(error => {
                console.error('Failed to disconnect from OSC server:', error);
            });
    }
    
    /**
     * Start the OSC server
     * @returns {Promise} A promise that resolves when the server is started
     */
    async startOSCServer() {
        try {
            const response = await fetch(`${this.serverUrl}/api/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    localAddress: '0.0.0.0',
                    localPort: 9005,
                    updateRate: 10
                })
            });
            
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }
            
            return true;
        } catch (error) {
            console.error('Error starting OSC server:', error);
            throw error;
        }
    }
    
    /**
     * Stop the OSC server
     * @returns {Promise} A promise that resolves when the server is stopped
     */
    async stopOSCServer() {
        try {
            const response = await fetch(`${this.serverUrl}/api/stop`, {
                method: 'POST'
            });
            
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }
            
            return true;
        } catch (error) {
            console.error('Error stopping OSC server:', error);
            throw error;
        }
    }
    
    /**
     * Start polling the OSC server for data
     */
    startPolling() {
        if (this.pollingInterval) {
            this.stopPolling();
        }
        
        this.pollingInterval = setInterval(() => {
            this.pollData();
        }, this.pollingRate);
    }
    
    /**
     * Stop polling the OSC server
     */
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }
    
    /**
     * Poll the OSC server for data
     */
    async pollData() {
        if (!this.connected) return;
        
        try {
            const response = await fetch(`${this.serverUrl}/api/messages`);
            
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            const processedData = this.processOSCData(data);
            
            // Call the callback if one is registered
            if (this.dataCallback) {
                this.dataCallback(processedData);
            }
        } catch (error) {
            console.error('Error polling OSC data:', error);
            // Don't disconnect on error - the server might be temporarily unavailable
        }
    }
    
    /**
     * Process OSC data into a format suitable for the visualization
     * @param {Object} oscData Raw OSC data from the server
     * @returns {Object} Processed data for visualization
     */
    processOSCData(oscData) {
        const result = {
            delta: 0,
            theta: 0,
            alpha: 0, 
            beta: 0,
            gamma: 0,
            eeg: [0, 0, 0, 0],
            contact: false,
            blink: false
        };
        
        // Process each OSC address
        for (const [address, value] of Object.entries(oscData)) {
            const mappedKey = this.addressMapping[address];
            
            if (!mappedKey) continue;
            
            if (mappedKey === 'delta' || mappedKey === 'theta' || 
                mappedKey === 'alpha' || mappedKey === 'beta' || mappedKey === 'gamma') {
                // Normalize value to 0-1 range if needed
                result[mappedKey] = this.normalizeValue(value, mappedKey);
            } else if (mappedKey.startsWith('eeg')) {
                // Handle EEG data
                const channel = parseInt(mappedKey.replace('eeg', '')) - 1;
                if (channel >= 0 && channel < 4) {
                    result.eeg[channel] = value;
                }
            } else if (mappedKey === 'contact') {
                result.contact = value > 0;
            } else if (mappedKey === 'blink') {
                result.blink = value > 0;
            }
        }
        
        return result;
    }
    
    /**
     * Normalize a value based on its type
     * @param {number} value The raw value from OSC
     * @param {string} type The type of value (delta, theta, etc.)
     * @returns {number} Normalized value between 0 and 1
     */
    normalizeValue(value, type) {
        // Different brainwave types have different typical ranges
        // These values are estimations and may need adjustment
        const ranges = {
            delta: [0, 4],   // Delta waves have larger amplitude
            theta: [0, 2],
            alpha: [0, 1.5],
            beta: [0, 1],
            gamma: [0, 0.5]  // Gamma waves typically have small amplitude
        };
        
        const [min, max] = ranges[type] || [0, 1];
        
        // Clamp the value to the range and normalize
        const clamped = Math.max(min, Math.min(max, value));
        return (clamped - min) / (max - min);
    }
    
    /**
     * Register a callback to receive processed data
     * @param {Function} callback The function to call with processed data
     */
    onData(callback) {
        this.dataCallback = callback;
    }
    
    /**
     * Set the polling rate
     * @param {number} rate The polling rate in milliseconds
     */
    setPollingRate(rate) {
        this.pollingRate = rate;
        if (this.connected && this.pollingInterval) {
            this.stopPolling();
            this.startPolling();
        }
    }
}

'use strict';

console.log('OSC Integration script loaded');

class OSCIntegration {
    constructor(port = 3001) {
        console.log('OSC Integration constructor called');
        this.baseUrl = `http://localhost:${port}/api`;
        this.waveAddresses = new Map([
            ['alpha', '/muse/alpha_average'],
            ['beta', '/muse/beta_average'],
            ['delta', '/muse/delta_average'],
            ['gamma', '/muse/gamma_average'],
            ['theta', '/muse/theta_average']
        ]);
        this.lastUpdate = 0;
        this.updateInterval = 500; // Update every 500ms for smoother updates
        this.waveData = {
            alpha: 0,
            beta: 0,
            delta: 0,
            gamma: 0,
            theta: 0
        };
        this.statusDiv = document.getElementById('oscStatus');
        if (!this.statusDiv) {
            console.error('Could not find oscStatus div');
        }
        this.serverStarted = false;
        this.statusCheckInterval = null;
    }

    async start() {
        console.log('Starting OSC integration...');
        try {
            // Check if server is running
            console.log('Checking server status at:', this.baseUrl);
            const statusResponse = await fetch(`${this.baseUrl}/status`);
            const statusData = await statusResponse.json();
            console.log('Server status:', statusData);

            if (!statusData.running) {
                this.updateStatus('Starting OSC server...');
                console.log('Server not running, attempting to start...');
                const startResponse = await fetch(`${this.baseUrl}/start`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        localAddress: "0.0.0.0",
                        localPort: 9005,
                        updateRate: 1,
                        recordData: false
                    })
                });
                
                const startData = await startResponse.json();
                console.log('Start server response:', startData);
                if (!startData.success) {
                    this.updateStatus('Failed to start OSC server');
                    return false;
                }
            }

            this.serverStarted = true;
            this.updateStatus('Connected');
            
            // Start the update loop with setInterval
            this.updateIntervalId = setInterval(() => this.update(), this.updateInterval);
            
            // Start periodic status checking
            this.statusCheckInterval = setInterval(() => this.checkServerStatus(), 3000);
            
            return true;
        } catch (error) {
            console.error('Error starting OSC integration:', error);
            this.updateStatus('Connection failed: ' + error.message);
            return false;
        }
    }

    async checkServerStatus() {
        try {
            const response = await fetch(`${this.baseUrl}/status`);
            const data = await response.json();
            
            if (!data.running) {
                console.error('Server stopped running');
                this.serverStarted = false;
                this.updateStatus('Server stopped');
                if (this.statusCheckInterval) {
                    clearInterval(this.statusCheckInterval);
                }
            }
        } catch (error) {
            console.error('Error checking server status:', error);
            this.serverStarted = false;
            this.updateStatus('Connection error');
            if (this.statusCheckInterval) {
                clearInterval(this.statusCheckInterval);
            }
        }
    }

    async update() {
        if (!this.serverStarted) {
            console.log('Update called but server not started');
            return;
        }

        console.log('Starting update cycle');
        try {
            await this.fetchWaveData();
            this.applyWaveData();
            this.updateStatus('Connected', true);
        } catch (error) {
            console.error('Error in update cycle:', error);
            this.updateStatus('Connection error');
        }
    }

    async fetchWaveData() {
        console.log('Starting fetchWaveData');
        for (const [wave, address] of this.waveAddresses) {
            console.log(`Fetching data for ${wave} at ${address}`);
            try {
                const response = await fetch(`${this.baseUrl}/messages${address}`);
                console.log(`Response status for ${wave}:`, response.status);
                if (!response.ok) {
                    console.error(`Failed to fetch ${wave} data:`, response.statusText);
                    
                    const fallbackAddress = `/muse/elements/${wave}_absolute2`;
                    console.log(`Trying fallback address: ${fallbackAddress}`);
                    
                    const fallbackResponse = await fetch(`${this.baseUrl}/messages${fallbackAddress}`);
                    if (!fallbackResponse.ok) {
                        console.error(`Fallback also failed for ${wave} data:`, fallbackResponse.statusText);
                        continue;
                    }
                    
                    const fallbackText = await fallbackResponse.text();
                    console.log(`Fallback response for ${wave}:`, fallbackText);
                    
                    try {
                        const fallbackData = JSON.parse(fallbackText);
                        if (Array.isArray(fallbackData) && fallbackData.length > 0) {
                            const value = parseFloat(fallbackData[0]);
                            if (!isNaN(value)) {
                                this.waveData[wave] = value;
                                console.log(`Using fallback ${wave} value:`, value);
                            } else {
                                console.error(`Invalid number format for ${wave} fallback:`, fallbackData[0]);
                            }
                        } else {
                            console.error(`Unexpected fallback data format for ${wave}:`, fallbackData);
                        }
                    } catch (parseError) {
                        console.error(`Error parsing fallback data for ${wave}:`, parseError);
                    }
                    continue;
                }
                
                const responseText = await response.text();
                console.log(`Response for ${wave}:`, responseText);
                
                try {
                    const data = JSON.parse(responseText);
                    // Check if the data is an array with at least one element
                    if (Array.isArray(data) && data.length > 0) {
                        const value = parseFloat(data[0]);
                        if (!isNaN(value)) {
                            this.waveData[wave] = value;
                            console.log(`Using ${wave} value:`, value);
                        } else {
                            console.error(`Invalid number format for ${wave}:`, data[0]);
                        }
                    } else {
                        console.error(`Unexpected data format for ${wave}:`, data);
                    }
                } catch (parseError) {
                    console.error(`Error parsing data for ${wave}:`, parseError);
                }
            } catch (error) {
                console.error(`Error fetching ${wave} data:`, error);
            }
        }
    }

    applyWaveData() {
        // Log raw wave data values
        console.log('Raw wave data:', this.waveData);
        
        // Available fluid simulation parameters and their ranges:
        // - CURL: Controls vorticity (swirling motion) [0-50]
        // - SPLAT_FORCE: Controls the force of new splats [1000-15000]
        // - DENSITY_DISSIPATION: Controls how quickly dye dissipates [0.7-0.99]
        // - PRESSURE: Controls pressure in the simulation [0.3-1.0]
        // - VELOCITY_DISSIPATION: Controls how quickly velocity dissipates [0.0-4.0]
        // - SPLAT_RADIUS: Controls the size of new splats [0.01-1.0]
        
        // Map wave data to fluid parameters
        config.CURL = this.mapValue(this.waveData.alpha, 0, 1, 0, 50);
        config.SPLAT_FORCE = this.mapValue(this.waveData.beta, 0, 1, 1000, 15000);
        config.DENSITY_DISSIPATION = this.mapValue(this.waveData.gamma, 0, 1, 0.7, 0.99);
        config.PRESSURE = this.mapValue(this.waveData.theta, 0, 1, 0.3, 1.0);

        // Log mapped values
        console.log('Mapped values:', {
            CURL: config.CURL,
            SPLAT_FORCE: config.SPLAT_FORCE,
            DENSITY_DISSIPATION: config.DENSITY_DISSIPATION,
            PRESSURE: config.PRESSURE
        });

        // Create a splat based on delta wave
        if (this.waveData.delta > 0.5) {
            const x = Math.random();
            const y = Math.random();
            const dx = (Math.random() - 0.5) * this.waveData.delta * 1000;
            const dy = (Math.random() - 0.5) * this.waveData.delta * 1000;
            const color = [Math.random() * 255, Math.random() * 255, Math.random() * 255];
            splat(x, y, dx, dy, color);
        }
    }

    mapValue(value, inMin, inMax, outMin, outMax) {
        return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
    }

    updateStatus(status, showData = false) {
        if (showData) {
            let dataText = 'OSC: Connected<br>';
            for (const [wave, value] of Object.entries(this.waveData)) {
                dataText += `${wave}: ${value.toFixed(2)}<br>`;
            }
            this.statusDiv.innerHTML = dataText;
        } else {
            this.statusDiv.textContent = `OSC: ${status}`;
        }
    }
}

// Start the OSC integration when the page loads
console.log('Setting up load event listener');
window.addEventListener('load', () => {
    console.log('Page loaded, starting OSC integration');
    const osc = new OSCIntegration();
    osc.start();
}); 
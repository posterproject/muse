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
        this.updateInterval = 100; // Update every 100ms like the wave visualizer
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
            
            // Start the update loop
            this.update();
            
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
            return;
        }

        const now = Date.now();
        if (now - this.lastUpdate >= this.updateInterval) {
            try {
                await this.fetchWaveData();
                this.applyWaveData();
                this.updateStatus('Connected', true);
                this.lastUpdate = now;
            } catch (error) {
                console.error('Error updating wave data:', error);
                this.updateStatus('Connection error');
            }
        }

        // Continue the update loop
        requestAnimationFrame(() => this.update());
    }

    async fetchWaveData() {
        for (const [wave, address] of this.waveAddresses) {
            try {
                const response = await fetch(`${this.baseUrl}/messages${address}`);
                
                if (!response.ok) {
                    console.error(`Failed to fetch ${wave} data:`, response.statusText);
                    
                    const fallbackAddress = `/muse/elements/${wave}_absolute2`;
                    console.log(`Trying fallback address: ${fallbackAddress}`);
                    
                    const fallbackResponse = await fetch(`${this.baseUrl}/messages${fallbackAddress}`);
                    if (!fallbackResponse.ok) {
                        console.error(`Fallback also failed for ${wave} data:`, fallbackResponse.statusText);
                        continue;
                    }
                    
                    const fallbackData = await fallbackResponse.json();
                    const value = fallbackData[fallbackAddress] ? fallbackData[fallbackAddress][0] : 0;
                    this.waveData[wave] = value;
                    console.log(`Fetched ${wave} data from fallback:`, value);
                    continue;
                }
                
                const data = await response.json();
                const value = data[address] ? data[address][0] : 0;
                this.waveData[wave] = value;
                console.log(`Fetched ${wave} data:`, value);
            } catch (error) {
                console.error(`Error fetching ${wave} data:`, error);
            }
        }
    }

    applyWaveData() {
        // Map wave data to fluid parameters
        config.CURL = this.mapValue(this.waveData.alpha, 0, 1, 0, 50);
        config.SPLAT_FORCE = this.mapValue(this.waveData.beta, 0, 1, 1000, 15000);
        config.DENSITY_DISSIPATION = this.mapValue(this.waveData.gamma, 0, 1, 0.7, 0.99);
        config.PRESSURE = this.mapValue(this.waveData.theta, 0, 1, 0.3, 1.0);

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
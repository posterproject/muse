/**
 * UI Controller for Muse Visualization
 * This script handles the user interface interactions
 */

export class UIController {
    constructor(visualization, oscConnector) {
        this.visualization = visualization;
        this.oscConnector = oscConnector;
        
        // Set up event handlers for brainwave data updates
        window.addEventListener('brainwave-data', (e) => {
            this.updateStatePanel(e.detail);
        });
        
        // Initialize UI elements
        this.initUIElements();
    }
    
    /**
     * Initialize UI elements and their event handlers
     */
    initUIElements() {
        // Get UI elements
        this.infoPanel = document.getElementById('info');
        this.connectionStatus = document.getElementById('connection-status');
        this.statePanel = document.getElementById('state-panel');
        this.connectionPanel = document.getElementById('connection-panel');
        
        // Add event handlers
        this.connectionStatus.addEventListener('click', () => {
            // Toggle info panel visibility
            this.infoPanel.style.display = 
                this.infoPanel.style.display === 'none' ? 'block' : 'none';
        });
        
        // Add controls for debugging/testing (optional)
        this.addDebugControls();
    }
    
    /**
     * Add debug controls for manually setting brainwave values
     */
    addDebugControls() {
        const debugPanel = document.createElement('div');
        debugPanel.style.position = 'absolute';
        debugPanel.style.top = '10px';
        debugPanel.style.right = '10px';
        debugPanel.style.backgroundColor = 'rgba(0,0,0,0.7)';
        debugPanel.style.padding = '10px';
        debugPanel.style.borderRadius = '5px';
        debugPanel.style.display = 'none'; // Hidden by default
        debugPanel.style.zIndex = '100';
        
        // Add debug toggle button
        const debugToggle = document.createElement('button');
        debugToggle.textContent = 'Show Debug';
        debugToggle.style.position = 'absolute';
        debugToggle.style.top = '40px';
        debugToggle.style.right = '10px';
        debugToggle.addEventListener('click', () => {
            debugPanel.style.display = 
                debugPanel.style.display === 'none' ? 'block' : 'none';
            debugToggle.textContent = 
                debugPanel.style.display === 'none' ? 'Show Debug' : 'Hide Debug';
        });
        
        // Add sliders for each brainwave type
        const waveTypes = ['delta', 'theta', 'alpha', 'beta', 'gamma'];
        
        waveTypes.forEach(type => {
            const label = document.createElement('label');
            label.textContent = `${type}: `;
            label.style.display = 'block';
            label.style.marginBottom = '5px';
            
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = '0';
            slider.max = '1';
            slider.step = '0.01';
            slider.value = this.visualization.brainwaveData[type];
            slider.style.width = '100px';
            
            slider.addEventListener('input', () => {
                if (!this.oscConnector.connected) {
                    this.visualization.brainwaveData[type] = parseFloat(slider.value);
                    
                    // Trigger an update event
                    window.dispatchEvent(new CustomEvent('brainwave-data', {
                        detail: { ...this.visualization.brainwaveData }
                    }));
                } else {
                    // Can't manually adjust when connected to real data
                    slider.value = this.visualization.brainwaveData[type];
                }
            });
            
            label.appendChild(slider);
            debugPanel.appendChild(label);
        });
        
        // Add to document
        document.body.appendChild(debugToggle);
        document.body.appendChild(debugPanel);
    }
    
    /**
     * Update the state panel with current brainwave data
     * @param {Object} data Current brainwave data
     */
    updateStatePanel(data) {
        Object.keys(data).forEach(type => {
            if (type === 'eeg' || type === 'contact' || type === 'blink') {
                return; // Skip non-brainwave data
            }
            
            const value = data[type];
            const indicator = document.querySelector(`.state-indicator.${type}`);
            
            if (indicator) {
                indicator.querySelector('.bar-fill').style.width = `${value * 100}%`;
                indicator.querySelector('.value').textContent = value.toFixed(2);
            }
        });
    }
}
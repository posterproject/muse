import { Visualization } from './visualization.js';
import { OSCConnector } from './osc-connector.js';
import { UIController } from './ui-controller.js';

// Main application class
class MuseVisualizationApp {
    constructor() {
        // Create visualization
        this.visualization = new Visualization();
        
        // Create OSC connector
        this.oscConnector = new OSCConnector();
        
        // Create UI controller
        this.uiController = new UIController(
            this.visualization,
            this.oscConnector
        );
        
        // Connect OSC data to visualization
        this.oscConnector.onData(data => {
            this.visualization.updateBrainwaveData(data);
        });
    }
    
    // Initialize the application
    init() {
        // Start animation loop
        this.visualization.start();
        
        // In demo mode, simulate data changes
        if (!this.oscConnector.connected) {
            this.visualization.startSimulation();
        }
    }
}

// Create and initialize application
const app = new MuseVisualizationApp();
app.init();

// Set up event handlers
document.addEventListener('DOMContentLoaded', () => {
    const connectButton = document.getElementById('connect-button');
    const disconnectButton = document.getElementById('disconnect-button');
    const oscServer = document.getElementById('osc-server');
    const connectionStatus = document.getElementById('connection-status');
    const infoPanel = document.getElementById('info');
    
    // Connect to OSC server
    connectButton.addEventListener('click', () => {
        const serverUrl = oscServer.value;
        app.oscConnector.connect(serverUrl);
        connectionStatus.className = 'connected';
        connectionStatus.textContent = 'Connected';
        app.visualization.stopSimulation();
    });
    
    // Disconnect from OSC server
    disconnectButton.addEventListener('click', () => {
        app.oscConnector.disconnect();
        connectionStatus.className = 'disconnected';
        connectionStatus.textContent = 'Disconnected';
        app.visualization.startSimulation();
    });
    
    // Toggle info panel
    connectionStatus.addEventListener('click', () => {
        infoPanel.style.display = infoPanel.style.display === 'none' ? 'block' : 'none';
    });
});
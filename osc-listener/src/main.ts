import { Config, defaultConfig } from './config';
import { OSCListener } from './osc-listener';

class App {
    private config: Config;
    private listener: OSCListener | null = null;
    private updateInterval: number | null = null;
    private messageDisplay: HTMLElement;

    constructor() {
        this.config = { ...defaultConfig };
        this.messageDisplay = document.getElementById('message-display')!;
        this.initializeUI();
    }

    private initializeUI() {
        // Initialize input fields with default values
        (document.getElementById('local-address') as HTMLInputElement).value = this.config.localAddress;
        (document.getElementById('local-port') as HTMLInputElement).value = this.config.localPort.toString();
        (document.getElementById('update-rate') as HTMLInputElement).value = this.config.updateRate.toString();

        // Add event listeners
        document.getElementById('start-button')?.addEventListener('click', () => this.start());
        document.getElementById('stop-button')?.addEventListener('click', () => this.stop());
    }

    private start() {
        // Update config from UI
        this.config = {
            localAddress: (document.getElementById('local-address') as HTMLInputElement).value,
            localPort: parseInt((document.getElementById('local-port') as HTMLInputElement).value),
            updateRate: parseFloat((document.getElementById('update-rate') as HTMLInputElement).value)
        };

        // Create OSC listener
        this.listener = new OSCListener(this.config, (message) => {
            this.messageDisplay.textContent = JSON.stringify(message, null, 2);
        });

        // Set up update interval
        this.updateInterval = window.setInterval(() => {
            // Update display at configured rate
            // (The actual OSC messages are handled in real-time, this just controls display updates)
        }, 1000 / this.config.updateRate);
    }

    private stop() {
        if (this.listener) {
            this.listener.close();
            this.listener = null;
        }
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        this.messageDisplay.textContent = 'Stopped';
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new App();
}); 
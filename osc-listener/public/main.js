class App {
    constructor() {
        this.config = {
            localAddress: '0.0.0.0',
            localPort: 9005,
            updateRate: 1
        };
        this.isRunning = false;
        
        this.initUI();
    }

    initUI() {
        // Configuration inputs
        const localAddressInput = document.getElementById('localAddress');
        const localPortInput = document.getElementById('localPort');
        const updateRateInput = document.getElementById('updateRate');

        // Set default values
        localAddressInput.value = this.config.localAddress;
        localPortInput.value = this.config.localPort.toString();
        updateRateInput.value = this.config.updateRate.toString();

        // Start/Stop buttons
        const startButton = document.getElementById('startButton');
        const stopButton = document.getElementById('stopButton');

        startButton.addEventListener('click', () => this.start());
        stopButton.addEventListener('click', () => this.stop());

        // Configuration change handlers
        localAddressInput.addEventListener('change', () => {
            this.config.localAddress = localAddressInput.value;
        });

        localPortInput.addEventListener('change', () => {
            this.config.localPort = parseInt(localPortInput.value);
        });

        updateRateInput.addEventListener('change', () => {
            this.config.updateRate = parseInt(updateRateInput.value);
        });
    }

    async start() {
        console.log('Start button clicked');
        if (this.isRunning) {
            console.log('Listener already running');
            return;
        }

        try {
            const response = await fetch('/api/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.config)
            });

            if (!response.ok) {
                throw new Error('Failed to start OSC listener');
            }

            this.isRunning = true;
            this.updateStatus(true);
            this.startPolling();
        } catch (error) {
            console.error('Error starting listener:', error);
            alert('Failed to start OSC listener: ' + error.message);
        }
    }

    async stop() {
        console.log('Stop button clicked');
        if (!this.isRunning) {
            return;
        }

        try {
            const response = await fetch('/api/stop', {
                method: 'POST'
            });

            if (!response.ok) {
                throw new Error('Failed to stop OSC listener');
            }

            this.isRunning = false;
            this.updateStatus(false);
            this.stopPolling();
            this.updateDisplay();
        } catch (error) {
            console.error('Error stopping listener:', error);
            alert('Failed to stop OSC listener: ' + error.message);
        }
    }

    startPolling() {
        this.pollInterval = setInterval(() => {
            this.pollMessages();
        }, 1000 / this.config.updateRate);
    }

    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    async pollMessages() {
        try {
            const response = await fetch('/api/messages');
            if (!response.ok) {
                throw new Error('Failed to fetch messages');
            }

            const data = await response.json();
            if (data.message) {
                this.updateDisplay(data.message);
            }
        } catch (error) {
            console.error('Error polling messages:', error);
        }
    }

    updateDisplay(message) {
        const display = document.getElementById('messageDisplay');
        
        if (!this.isRunning) {
            display.textContent = 'Not started';
            return;
        }

        if (!message) {
            display.textContent = 'Waiting for messages...';
            return;
        }

        display.textContent = JSON.stringify(message, null, 2);
    }

    updateStatus(isRunning) {
        const statusIcon = document.getElementById('statusIcon');
        const startButton = document.getElementById('startButton');
        const stopButton = document.getElementById('stopButton');

        statusIcon.className = isRunning ? 'running' : 'stopped';
        startButton.disabled = isRunning;
        stopButton.disabled = !isRunning;
    }
}

// Initialize the application
new App(); 
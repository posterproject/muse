// Frontend code for handling UI interactions
document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.getElementById('startButton');
    const stopButton = document.getElementById('stopButton');
    const localAddressInput = document.getElementById('localAddress');
    const localPortInput = document.getElementById('localPort');
    const updateRateInput = document.getElementById('updateRate');
    const messageDisplay = document.getElementById('messageDisplay');
    const statusIcon = document.getElementById('statusIcon');
    const statusText = document.getElementById('statusText');

    let isRunning = false;
    let updateInterval;

    function updateStatus(running) {
        isRunning = running;
        statusIcon.className = running ? 'running' : 'stopped';
        statusText.textContent = running ? 'Running' : 'Stopped';
        startButton.disabled = running;
        stopButton.disabled = !running;
    }

    function updateMessageDisplay(message) {
        messageDisplay.textContent = message;
    }

    startButton.addEventListener('click', async () => {
        const config = {
            localAddress: localAddressInput.value,
            localPort: parseInt(localPortInput.value),
            updateRate: parseFloat(updateRateInput.value)
        };

        try {
            const response = await fetch('/api/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(config)
            });

            if (response.ok) {
                updateStatus(true);
                // Start polling for messages
                updateInterval = setInterval(async () => {
                    const messageResponse = await fetch('/api/messages');
                    if (messageResponse.ok) {
                        const message = await messageResponse.text();
                        updateMessageDisplay(message);
                    }
                }, 1000 / config.updateRate);
            } else {
                console.error('Failed to start OSC listener');
            }
        } catch (error) {
            console.error('Error starting OSC listener:', error);
        }
    });

    stopButton.addEventListener('click', async () => {
        try {
            const response = await fetch('/api/stop', {
                method: 'POST'
            });

            if (response.ok) {
                updateStatus(false);
                clearInterval(updateInterval);
                updateMessageDisplay('Stopped');
            } else {
                console.error('Failed to stop OSC listener');
            }
        } catch (error) {
            console.error('Error stopping OSC listener:', error);
        }
    });

    // Initialize status
    updateStatus(false);
}); 
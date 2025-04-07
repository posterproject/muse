// Frontend code for handling UI interactions
interface Config {
    localAddress: string;
    localPort: number;
    updateRate: number;
}

// Get DOM elements with null checks
const startButton = document.getElementById('startButton') as HTMLButtonElement;
const stopButton = document.getElementById('stopButton') as HTMLButtonElement;
const localAddressInput = document.getElementById('localAddress') as HTMLInputElement;
const localPortInput = document.getElementById('localPort') as HTMLInputElement;
const updateRateInput = document.getElementById('updateRate') as HTMLInputElement;
const messageDisplay = document.getElementById('messageDisplay') as HTMLDivElement;
const statusIcon = document.getElementById('statusIcon') as HTMLDivElement;
const statusText = document.getElementById('statusText') as HTMLSpanElement;

// Verify all elements exist
if (!startButton || !stopButton || !localAddressInput || !localPortInput || 
    !updateRateInput || !messageDisplay || !statusIcon || !statusText) {
    throw new Error('Required DOM elements not found');
}

let isRunning = false;
let updateInterval: number | undefined;

const updateStatus = (running: boolean): void => {
    isRunning = running;
    statusIcon.className = running ? 'running' : 'stopped';
    statusText.textContent = running ? 'Running' : 'Stopped';
    startButton.disabled = running;
    stopButton.disabled = !running;
};

const updateMessageDisplay = (messages: Record<string, undefined>): void => {
    if (Object.keys(messages).length === 0) {
        messageDisplay.textContent = 'No messages received yet';
        return;
    }

    const formattedMessages = Object.entries(messages)
        .map(([address, value]) => `${address}: ${JSON.stringify(value)}`)
        .join('\n');
    
    messageDisplay.textContent = formattedMessages;
};

startButton.addEventListener('click', async () => {
    const config: Config = {
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
            updateInterval = window.setInterval(async () => {
                try {
                    const messageResponse = await fetch('/api/messages');
                    if (messageResponse.ok) {
                        const messages = await messageResponse.json();
                        updateMessageDisplay(messages);
                    } else {
                        console.error('Failed to fetch messages:', messageResponse.status);
                    }
                } catch (error) {
                    console.error('Error fetching messages:', error);
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
            if (updateInterval) {
                clearInterval(updateInterval);
                updateInterval = undefined;
            }
            // Don't clear the message display when stopped
        } else {
            console.error('Failed to stop OSC listener');
        }
    } catch (error) {
        console.error('Error stopping OSC listener:', error);
    }
});

// Initialize status
updateStatus(false); 
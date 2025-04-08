// Frontend code for handling UI interactions
interface Config {
    localAddress: string;
    localPort: number;
    updateRate: number;
    recordData: boolean;
}

interface StartResponse {
    success: boolean;
    sessionId: string;
    config: Config;
    noChanges: boolean;
}

interface StopResponse {
    success: boolean;
    message: string;
    noChanges?: boolean;
    remainingSessions?: number;
}

interface StatusResponse {
    running: boolean;
    message: string;
    config?: Config;
    sessionCount?: number;
    sessionIds?: string[];
}

// Get DOM elements with null checks
const startButton = document.getElementById('startButton') as HTMLButtonElement;
const stopButton = document.getElementById('stopButton') as HTMLButtonElement;
const localAddressInput = document.getElementById('localAddress') as HTMLInputElement;
const localPortInput = document.getElementById('localPort') as HTMLInputElement;
const updateRateInput = document.getElementById('updateRate') as HTMLInputElement;
const recordDataCheckbox = document.getElementById('recordData') as HTMLInputElement;
const messageDisplay = document.getElementById('messageDisplay') as HTMLDivElement;
const statusIcon = document.getElementById('statusIcon') as HTMLDivElement;
const statusText = document.getElementById('statusText') as HTMLSpanElement;

// Verify all elements exist
if (!startButton || !stopButton || !localAddressInput || !localPortInput || 
    !updateRateInput || !recordDataCheckbox || !messageDisplay || !statusIcon || !statusText) {
    throw new Error('Required DOM elements not found');
}

let isRunning = false;
let updateInterval: number | undefined;
let sessionId: string | null = null;

const updateStatus = (running: boolean): void => {
    isRunning = running;
    statusIcon.className = running ? 'running' : 'stopped';
    statusText.textContent = running ? 'Running' : 'Stopped';
    startButton.disabled = running;
    stopButton.disabled = !running;
};

const updateMessageDisplay = (messages: Record<string, unknown>): void => {
    if (Object.keys(messages).length === 0) {
        messageDisplay.textContent = 'No messages received yet';
        return;
    }

    const formattedMessages = Object.entries(messages)
        .map(([address, value]) => `${address}: ${JSON.stringify(value)}`)
        .join('\n');
    
    messageDisplay.textContent = formattedMessages;
};

// Check server status on page load
const checkServerStatus = async (): Promise<void> => {
    try {
        const response = await fetch('/api/status');
        if (response.ok) {
            const statusData: StatusResponse = await response.json();
            updateStatus(statusData.running);
            
            if (statusData.running) {
                // Automatically start polling for messages if server is running
                startPolling(1); // Default to 1Hz if not specified
            }
        }
    } catch (error) {
        console.error('Error checking server status:', error);
    }
};

const startPolling = (rate: number): void => {
    // Clear existing interval if any
    if (updateInterval) {
        clearInterval(updateInterval);
    }
    
    // Start new polling interval
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
    }, 1000 / rate);
};

startButton.addEventListener('click', async () => {
    const config: Config = {
        localAddress: localAddressInput.value,
        localPort: parseInt(localPortInput.value),
        updateRate: parseFloat(updateRateInput.value),
        recordData: recordDataCheckbox.checked
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
            const responseData: StartResponse = await response.json();
            
            if (responseData.success) {
                sessionId = responseData.sessionId;
                updateStatus(true);
                
                // If server was already running, show a notification
                if (responseData.noChanges) {
                    console.log('Server was already running, using existing configuration');
                    // Apply the existing server configuration to the UI
                    if (responseData.config) {
                        localAddressInput.value = responseData.config.localAddress;
                        localPortInput.value = responseData.config.localPort.toString();
                        updateRateInput.value = responseData.config.updateRate.toString();
                        recordDataCheckbox.checked = responseData.config.recordData;
                    }
                }
                
                // Start polling for messages
                startPolling(config.updateRate);
            }
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
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sessionId })
        });

        if (response.ok) {
            const responseData: StopResponse = await response.json();
            
            if (responseData.success) {
                // Only stop the UI if the server actually stopped
                if (!responseData.remainingSessions || responseData.remainingSessions === 0) {
                    updateStatus(false);
                    if (updateInterval) {
                        clearInterval(updateInterval);
                        updateInterval = undefined;
                    }
                } else {
                    console.log(`Disconnected from server, but it's still running with ${responseData.remainingSessions} active sessions`);
                }
                
                // Clear session ID regardless
                sessionId = null;
            }
        } else {
            console.error('Failed to stop OSC listener');
        }
    } catch (error) {
        console.error('Error stopping OSC listener:', error);
    }
});

// Initialize status by checking server
checkServerStatus(); 
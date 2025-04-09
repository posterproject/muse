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

// Connection states
enum ConnectionState {
    CONNECTED_RUNNING = 'running',
    CONNECTED_STOPPED = 'stopped',
    NOT_CONNECTED = 'not-connected'
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
let statusCheckInterval: number | undefined;
let sessionId: string | null = null;

const updateStatus = (state: ConnectionState): void => {
    isRunning = state === ConnectionState.CONNECTED_RUNNING;
    statusIcon.className = state;
    
    switch (state) {
        case ConnectionState.CONNECTED_RUNNING:
            statusText.textContent = 'Running';
            startButton.disabled = true;
            stopButton.disabled = false;
            break;
        case ConnectionState.CONNECTED_STOPPED:
            statusText.textContent = 'Stopped';
            startButton.disabled = false;
            stopButton.disabled = true;
            break;
        case ConnectionState.NOT_CONNECTED:
            statusText.textContent = 'Not connected';
            startButton.disabled = false;
            stopButton.disabled = true;
            break;
    }
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

// Check server status
const checkServerStatus = async (): Promise<void> => {
    try {
        const response = await fetch('/api/status');
        if (response.ok) {
            const statusData: StatusResponse = await response.json();
            
            // Update UI based on server status
            if (statusData.running) {
                updateStatus(ConnectionState.CONNECTED_RUNNING);
                
                // If we don't have a current session but server is running,
                // update the UI with the server's configuration
                if (!sessionId && statusData.config) {
                    localAddressInput.value = statusData.config.localAddress;
                    localPortInput.value = statusData.config.localPort.toString();
                    updateRateInput.value = statusData.config.updateRate.toString();
                    recordDataCheckbox.checked = statusData.config.recordData || false;
                }
                
                // Start/continue polling for messages
                if (!updateInterval) {
                    const rate = statusData.config?.updateRate || 1;
                    startPolling(rate);
                }
            } else {
                updateStatus(ConnectionState.CONNECTED_STOPPED);
                stopPolling();
            }
        }
    } catch (error) {
        console.error('Error checking server status:', error);
        updateStatus(ConnectionState.NOT_CONNECTED);
        stopPolling();
    }
};

// Start periodic status checking
const startStatusChecking = (): void => {
    if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
    }
    
    // Check status every 3 seconds
    statusCheckInterval = window.setInterval(checkServerStatus, 3000);
};

const startPolling = (rate: number): void => {
    // Clear existing interval if any
    stopPolling();
    
    // Start new polling interval
    updateInterval = window.setInterval(async () => {
        try {
            const messageResponse = await fetch('/api/messages');
            if (messageResponse.ok) {
                const messages = await messageResponse.json();
                updateMessageDisplay(messages);
            } else {
                console.error('Failed to fetch messages:', messageResponse.status);
                if (messageResponse.status === 404) {
                    // Server might have been stopped by another client
                    checkServerStatus();
                }
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
            // Server might be down, update status
            updateStatus(ConnectionState.NOT_CONNECTED);
        }
    }, 1000 / rate);
};

const stopPolling = (): void => {
    if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = undefined;
    }
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
                updateStatus(ConnectionState.CONNECTED_RUNNING);
                
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
            updateStatus(ConnectionState.NOT_CONNECTED);
        }
    } catch (error) {
        console.error('Error starting OSC listener:', error);
        updateStatus(ConnectionState.NOT_CONNECTED);
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
                    updateStatus(ConnectionState.CONNECTED_STOPPED);
                    stopPolling();
                } else {
                    console.log(`Disconnected from server, but it's still running with ${responseData.remainingSessions} active sessions`);
                    // We're disconnected but server is still running for other clients
                    updateStatus(ConnectionState.CONNECTED_STOPPED);
                }
                
                // Clear session ID regardless
                sessionId = null;
            }
        } else {
            console.error('Failed to stop OSC listener');
        }
    } catch (error) {
        console.error('Error stopping OSC listener:', error);
        updateStatus(ConnectionState.NOT_CONNECTED);
    }
});

// Initialize status by checking server and start periodic checks
checkServerStatus();
startStatusChecking(); 
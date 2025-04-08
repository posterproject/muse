import axios from 'axios';
import { spawn, type ChildProcess } from 'child_process';
import { promisify } from 'util';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { describe, expect, test, beforeAll, afterAll, afterEach } from '@jest/globals';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sleep = promisify(setTimeout);
const SERVER_URL = 'http://localhost:3001';
const SERVER_START_DELAY = 2000; // 2 seconds for server to start

describe('Session Management Integration Tests', () => {
  let serverProcess: ChildProcess;

  // Start the server before tests
  beforeAll(async () => {
    // Use the absolute path to the server script
    const serverPath = resolve(__dirname, '../../src/server.ts');
    console.log(`Starting server from: ${serverPath}`);
    
    // Start the server using tsx
    serverProcess = spawn('npx', ['tsx', serverPath], {
      stdio: 'pipe', // Capture stdout and stderr
      shell: true
    });

    // Log server output for debugging
    serverProcess.stdout?.on('data', (data) => {
      console.log(`[Server]: ${data.toString().trim()}`);
    });
    
    serverProcess.stderr?.on('data', (data) => {
      console.error(`[Server Error]: ${data.toString().trim()}`);
    });

    // Wait for server to start
    await sleep(SERVER_START_DELAY);
  });

  // Stop the server after tests
  afterAll(async () => {
    if (serverProcess) {
      // Ensure we stop the server
      serverProcess.kill();
      console.log('Server process terminated');
    }
  });

  // Reset the server state between tests
  afterEach(async () => {
    try {
      // Get status to check if server is running
      const statusRes = await axios.get(`${SERVER_URL}/api/status`);
      
      // If server is running, get all sessions and stop them
      if (statusRes.data.running && statusRes.data.sessionIds) {
        for (const sessionId of statusRes.data.sessionIds) {
          await axios.post(`${SERVER_URL}/api/stop`, { sessionId });
        }
      }
    } catch (error) {
      console.error('Error cleaning up between tests:', error);
    }
  });

  test('Check initial server status (not running)', async () => {
    const response = await axios.get(`${SERVER_URL}/api/status`);
    expect(response.status).toBe(200);
    expect(response.data.running).toBe(false);
    expect(response.data.message).toBe('Server not running');
  });

  test('Start the OSC listener and verify session created', async () => {
    const startResponse = await axios.post(`${SERVER_URL}/api/start`, {
      localAddress: '0.0.0.0',
      localPort: 9005,
      updateRate: 1
    });

    expect(startResponse.status).toBe(200);
    expect(startResponse.data.success).toBe(true);
    expect(startResponse.data.sessionId).toBeTruthy();
    expect(startResponse.data.noChanges).toBe(false);
    
    // Verify server is now running
    const statusResponse = await axios.get(`${SERVER_URL}/api/status`);
    expect(statusResponse.data.running).toBe(true);
    expect(statusResponse.data.sessionCount).toBe(1);
    expect(statusResponse.data.sessionIds.length).toBe(1);
    expect(statusResponse.data.sessionIds[0]).toBe(startResponse.data.sessionId);
  });

  test('Start listener when already running ignores new config', async () => {
    // First, start the server
    const startResponse1 = await axios.post(`${SERVER_URL}/api/start`, {
      localAddress: '0.0.0.0',
      localPort: 9005,
      updateRate: 1
    });
    
    expect(startResponse1.status).toBe(200);
    
    // Try to start again with different config
    const startResponse2 = await axios.post(`${SERVER_URL}/api/start`, {
      localAddress: '127.0.0.1',
      localPort: 9006,
      updateRate: 2
    });
    
    expect(startResponse2.status).toBe(200);
    expect(startResponse2.data.success).toBe(true);
    expect(startResponse2.data.noChanges).toBe(true);
    expect(startResponse2.data.config.localPort).toBe(9005); // Original value, not 9006
  });

  test('Session tokens are tracked and reported via status endpoint', async () => {
    // Start first client
    const client1 = await axios.post(`${SERVER_URL}/api/start`, {
      localAddress: '0.0.0.0',
      localPort: 9005,
      updateRate: 1
    });
    
    const client1Id = client1.data.sessionId;
    
    // Start second client
    const client2 = await axios.post(`${SERVER_URL}/api/start`, {
      localAddress: '0.0.0.0',
      localPort: 9005,
      updateRate: 1
    });
    
    const client2Id = client2.data.sessionId;
    
    // Check status shows both sessions
    const statusResponse = await axios.get(`${SERVER_URL}/api/status`);
    expect(statusResponse.data.sessionCount).toBe(2);
    expect(statusResponse.data.sessionIds).toContain(client1Id);
    expect(statusResponse.data.sessionIds).toContain(client2Id);
  });

  test('Stop server with valid sessionId when multiple clients connected', async () => {
    // Start two clients
    const client1 = await axios.post(`${SERVER_URL}/api/start`, {
      localAddress: '0.0.0.0',
      localPort: 9005,
      updateRate: 1
    });
    
    const client2 = await axios.post(`${SERVER_URL}/api/start`, {
      localAddress: '0.0.0.0',
      localPort: 9005,
      updateRate: 1
    });
    
    // Disconnect first client
    const stopResponse = await axios.post(`${SERVER_URL}/api/stop`, { 
      sessionId: client1.data.sessionId 
    });
    
    expect(stopResponse.data.success).toBe(true);
    expect(stopResponse.data.message).toContain('Client disconnected');
    expect(stopResponse.data.remainingSessions).toBe(1);
    
    // Check server still running
    const statusResponse = await axios.get(`${SERVER_URL}/api/status`);
    expect(statusResponse.data.running).toBe(true);
    expect(statusResponse.data.sessionCount).toBe(1);
    expect(statusResponse.data.sessionIds[0]).toBe(client2.data.sessionId);
  });

  test('Stop server with last sessionId should stop the server', async () => {
    // Start a client
    const client = await axios.post(`${SERVER_URL}/api/start`, {
      localAddress: '0.0.0.0',
      localPort: 9005,
      updateRate: 1
    });
    
    // Stop the client
    const stopResponse = await axios.post(`${SERVER_URL}/api/stop`, { 
      sessionId: client.data.sessionId 
    });
    
    expect(stopResponse.data.success).toBe(true);
    expect(stopResponse.data.message).toContain('Server stopped');
    
    // Verify server is stopped
    const statusResponse = await axios.get(`${SERVER_URL}/api/status`);
    expect(statusResponse.data.running).toBe(false);
  });

  test('Stopping an already stopped server returns no change', async () => {
    // Try to stop when already stopped
    const stopResponse = await axios.post(`${SERVER_URL}/api/stop`, {});
    
    expect(stopResponse.data.success).toBe(true);
    expect(stopResponse.data.message).toBe('Server already stopped');
    expect(stopResponse.data.noChanges).toBe(true);
  });
}); 
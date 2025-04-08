import osc from 'osc';
import { Config, DebugLevel } from './config';
import { OSCMessage } from './types/osc';
import { MessageTransformer } from './transformer/transformer';
import * as fs from 'fs';
import * as path from 'path';

export class OSCListener {
    private udpPort: osc.UDPPort;
    private transformer: MessageTransformer;
    private config: Config;
    private recordBuffer: string[] = [];
    private flushInterval: NodeJS.Timeout | null = null;
    private fileStream: fs.WriteStream | null = null;

    constructor(config: Config, transformer: MessageTransformer) {
        this.config = config;
        this.transformer = transformer;

        this.udpPort = new osc.UDPPort({
            localAddress: config.localAddress,
            localPort: config.localPort
        });

        this.udpPort.on('ready', () => {
            console.log(`OSC listener ready on ${config.localAddress}:${config.localPort}`);
        });

        // Initialize file recording if enabled
        if (this.config.recordData) {
            this.initializeRecording();
        }

        this.udpPort.on('message', (oscMessage: any) => {
            if (this.config.debug >= DebugLevel.High) {
                console.log('Raw OSC Message:', oscMessage);
            }
            const message: OSCMessage = {
                address: oscMessage.address,
                args: oscMessage.args.map((arg: any) => {
                    if (typeof arg === 'number') {
                        return arg;
                    }
                    if (arg && typeof arg === 'object' && 'value' in arg) {
                        return arg.value;
                    }
                    if (this.config.debug >= DebugLevel.High) {
                        console.log('Non-number value:', arg);
                        console.log('Non-number value type:', typeof arg);
                    }
                    return 0; // Default to 0 if value is not a number
                }),
                timestamp: Date.now()
            };
            if (this.config.debug >= DebugLevel.High) {
                console.log('Processed Message:', message);
            }
            
            // Record message if recording is enabled
            if (this.config.recordData) {
                this.recordMessage(message);
            }
            
            this.transformer.addMessage(message);
        });

        this.udpPort.on('error', (err: Error) => {
            console.error('OSC error:', err);
        });

        this.udpPort.open();
    }

    private initializeRecording(): void {
        const filePath = path.resolve(process.cwd(), this.config.recordFileName);
        console.log(`Initializing OSC recording to ${filePath}`);
        
        // Create file stream
        this.fileStream = fs.createWriteStream(filePath, { flags: 'w' });
        this.fileStream.on('error', (err) => {
            console.error('Error writing to recording file:', err);
        });
        
        // Set up periodic flushing (every 5 seconds)
        this.flushInterval = setInterval(() => this.flushRecordBuffer(), 5000);
    }

    private recordMessage(message: OSCMessage): void {
        if (!this.fileStream) return;
        
        // Format: timestamp,address,value1,value2,...
        const csvLine = `${message.timestamp},${message.address},${message.args.join(',')}`;
        this.recordBuffer.push(csvLine);
        
        // If buffer gets too large, flush immediately
        if (this.recordBuffer.length > 1000) {
            this.flushRecordBuffer();
        }
    }

    private flushRecordBuffer(): void {
        if (!this.fileStream || this.recordBuffer.length === 0) return;
        
        const dataToWrite = this.recordBuffer.join('\n') + '\n';
        this.fileStream.write(dataToWrite);
        this.recordBuffer = [];
        
        if (this.config.debug >= DebugLevel.Medium) {
            console.log(`Flushed ${this.recordBuffer.length} messages to recording file`);
        }
    }

    close() {
        // Flush any remaining data and close the file stream
        if (this.config.recordData && this.fileStream) {
            this.flushRecordBuffer();
            this.fileStream.end();
            
            if (this.flushInterval) {
                clearInterval(this.flushInterval);
                this.flushInterval = null;
            }
            
            console.log(`OSC recording completed and saved to ${this.config.recordFileName}`);
        }
        
        this.udpPort.close();
    }
} 
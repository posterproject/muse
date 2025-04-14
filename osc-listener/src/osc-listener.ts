import osc from 'osc';
import { Config, DebugLevel } from './config';
import { OSCMessage, MessageTransformer } from './types/osc-listener';
import * as fs from 'fs';
import * as path from 'path';
import logger, { debugLog } from './logger';

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
            logger.info(`OSC listener ready on ${config.localAddress}:${config.localPort}`);
        });

        // Initialize file recording if enabled
        if (this.config.recordData) {
            this.initializeRecording();
        }

        this.udpPort.on('message', (oscMessage: any) => {
            debugLog(DebugLevel.High, 'Raw OSC Message', { message: oscMessage });
            
            const message: OSCMessage = {
                address: oscMessage.address,
                args: oscMessage.args.map((arg: any) => {
                    if (typeof arg === 'number') {
                        return arg;
                    }
                    if (arg && typeof arg === 'object' && 'value' in arg) {
                        return arg.value;
                    }
                    debugLog(DebugLevel.High, 'Non-number value', { value: arg, type: typeof arg });
                    return 0; // Default to 0 if value is not a number
                }),
                timestamp: Date.now()
            };
            
            debugLog(DebugLevel.High, 'Processed Message', { message });
            
            // Record message if recording is enabled
            if (this.config.recordData) {
                this.recordMessage(message);
            }
            
            this.transformer.addMessage(message);
        });

        this.udpPort.on('error', (err: Error) => {
            logger.error('OSC error', { error: err });
        });

        this.udpPort.open();
    }

    private initializeRecording(): void {
        const filePath = path.resolve(process.cwd(), this.config.recordFileName);
        logger.info(`Initializing OSC recording to ${filePath}`);
        
        // Create file stream
        this.fileStream = fs.createWriteStream(filePath, { flags: 'w' });
        this.fileStream.on('error', (err) => {
            logger.error('Error writing to recording file', { error: err });
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
        
        debugLog(DebugLevel.Medium, `Flushed ${this.recordBuffer.length} messages to recording file`);
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
            
            logger.info(`OSC recording completed and saved to ${this.config.recordFileName}`);
        }
        
        this.udpPort.close();
    }
} 
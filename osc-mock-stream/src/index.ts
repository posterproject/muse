import { parse } from 'csv-parse';
import { createReadStream, readFileSync } from 'fs';
import osc from 'osc';
import { join, extname } from 'path';

interface Config {
    targetAddress: string;
    targetPort: number;
    messageRate: number; // messages per second
    csvPath?: string;
}

// Read configuration from JSON file
const configPath = join(__dirname, '..', 'config.json');
const configData = JSON.parse(readFileSync(configPath, 'utf-8'));
const config: Config = {
    ...configData,
    csvPath: process.argv[2] // Optional CSV file path from command line
};

// Define data format types
type DataFormat = 'standard' | 'columns';

class OSCMockStream {
    private udpPort: any;
    private messageQueue: any[] = [];
    private isRunning: boolean = false;
    private messageInterval: number;
    private dataFormat: DataFormat = 'standard';

    constructor(config: Config) {
        this.messageInterval = 1000 / config.messageRate;
        this.udpPort = new osc.UDPPort({
            localAddress: '0.0.0.0',
            localPort: 0
        });

        this.udpPort.on('ready', () => {
            console.log(`OSC sender ready, sending to ${config.targetAddress}:${config.targetPort}`);
            this.startSending();
        });

        this.udpPort.on('error', (err: Error) => {
            console.error('OSC error:', err);
        });

        this.udpPort.open();
    }

    private detectDataFormat(filePath: string): DataFormat {
        // Check file extension or name to determine format
        if (filePath.endsWith('.columns')) {
            return 'columns';
        }
        return 'standard';
    }

    private async loadCSVData(csvPath: string): Promise<void> {
        this.dataFormat = this.detectDataFormat(csvPath);
        console.log(`Detected data format: ${this.dataFormat}`);
        
        if (this.dataFormat === 'columns') {
            return this.loadColumnsData(csvPath);
        } else {
            return this.loadStandardCSVData(csvPath);
        }
    }

    private async loadColumnsData(csvPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            let fileContent: string;
            try {
                fileContent = readFileSync(csvPath, 'utf-8');
            } catch (err) {
                return reject(err);
            }
            
            // Split file into lines and filter out empty lines
            const lines = fileContent.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0 && !line.startsWith('#'));
            
            if (lines.length < 2) {
                return reject(new Error('File must contain at least a header line and one data line'));
            }
            
            // Process header line to get channel names
            const headers = lines[0].split(/\s+/).filter(item => item.trim() !== '');
            console.log(`Detected ${headers.length} channels: ${headers.slice(0, 5).join(', ')}...`);
            
            // Process data lines
            const records: any[] = [];
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(/\s+/).filter(item => item.trim() !== '');
                
                if (values.length > 0) {
                    const messages = [];
                    
                    for (let j = 0; j < Math.min(headers.length, values.length); j++) {
                        const value = parseFloat(values[j]);
                        
                        if (!isNaN(value) && headers[j]) {
                            messages.push({
                                address: headers[j],
                                args: [{ 
                                    type: 'f', 
                                    value: value 
                                }]
                            });
                        }
                    }
                    
                    if (messages.length > 0) {
                        records.push(messages);
                    }
                }
            }
            
            this.messageQueue = records;
            console.log(`Loaded ${records.length} message batches from columns format`);
            resolve();
        });
    }

    private async loadStandardCSVData(csvPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const records: any[] = [];
            createReadStream(csvPath)
                .pipe(parse({
                    columns: false, // Don't use header row
                    skip_empty_lines: true,
                    relax_column_count: true,
                    trim: true,
                    skip_records_with_error: true,
                    delimiter: ',', // Explicitly set comma as delimiter
                    quote: false // Disable quote handling since we don't need it
                }))
                .on('data', (record: string[]) => {
                    // Skip timestamp (first column) and process the rest
                    const address = record[1]?.trim();
                    const values = record.slice(2).map(value => parseFloat(value.trim()) || 0);

                    const message = {
                        address: address || '/mock/data',
                        args: values.map(value => ({
                            type: 'f',
                            value: value
                        }))
                    };
                    records.push(message);
                })
                .on('end', () => {
                    this.messageQueue = records;
                    console.log(`Loaded ${records.length} messages from standard CSV`);
                    resolve();
                })
                .on('error', reject);
        });
    }

    private generateMockMessage(): any {
        // Generate a simple mock message with random values
        return {
            address: '/mock/data',
            args: [
                { type: 'f', value: Math.random() * 100 },
                { type: 'f', value: Math.random() * 100 },
                { type: 'f', value: Math.random() * 100 }
            ]
        };
    }

    private async startSending(): Promise<void> {
        if (config.csvPath) {
            try {
                await this.loadCSVData(config.csvPath);
            } catch (error) {
                console.error('Error loading data:', error);
                process.exit(1);
            }
        }

        this.isRunning = true;
        this.sendNextMessage();
    }

    private sendNextMessage(): void {
        if (!this.isRunning) return;

        // If we have records, use them in a loop
        if (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift()!;
            
            if (this.dataFormat === 'columns') {
                // For columns format, each message is an array of messages
                // We need to send them all at once
                for (const individualMessage of message) {
                    this.udpPort.send(individualMessage, config.targetAddress, config.targetPort);
                }
            } else {
                // Standard format - just send the single message
                this.udpPort.send(message, config.targetAddress, config.targetPort);
            }
            
            // Add the message back to the end of the queue
            this.messageQueue.push(message);
        } else {
            // Only generate random messages if no CSV data was loaded
            const message = this.generateMockMessage();
            this.udpPort.send(message, config.targetAddress, config.targetPort);
        }

        setTimeout(() => this.sendNextMessage(), this.messageInterval);
    }

    public stop(): void {
        this.isRunning = false;
        this.udpPort.close();
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('Stopping OSC mock stream...');
    process.exit(0);
});

// Start the mock stream
const mockStream = new OSCMockStream(config); 
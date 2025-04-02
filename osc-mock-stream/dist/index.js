"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const csv_parse_1 = require("csv-parse");
const fs_1 = require("fs");
const osc_1 = __importDefault(require("osc"));
const path_1 = require("path");
// Read configuration from JSON file
const configPath = (0, path_1.join)(__dirname, '..', 'config.json');
const configData = JSON.parse((0, fs_1.readFileSync)(configPath, 'utf-8'));
const config = {
    ...configData,
    csvPath: process.argv[2] // Optional CSV file path from command line
};
class OSCMockStream {
    constructor(config) {
        this.messageQueue = [];
        this.isRunning = false;
        this.messageInterval = 1000 / config.messageRate;
        this.udpPort = new osc_1.default.UDPPort({
            localAddress: '0.0.0.0',
            localPort: 0
        });
        this.udpPort.on('ready', () => {
            console.log(`OSC sender ready, sending to ${config.targetAddress}:${config.targetPort}`);
            this.startSending();
        });
        this.udpPort.on('error', (err) => {
            console.error('OSC error:', err);
        });
        this.udpPort.open();
    }
    async loadCSVData(csvPath) {
        return new Promise((resolve, reject) => {
            const records = [];
            (0, fs_1.createReadStream)(csvPath)
                .pipe((0, csv_parse_1.parse)({
                columns: false, // Don't use header row
                skip_empty_lines: true,
                relax_column_count: true,
                trim: true,
                skip_records_with_error: true,
                delimiter: ',', // Explicitly set comma as delimiter
                quote: false // Disable quote handling since we don't need it
            }))
                .on('data', (record) => {
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
                console.log(`Loaded ${records.length} messages from CSV`);
                resolve();
            })
                .on('error', reject);
        });
    }
    generateMockMessage() {
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
    async startSending() {
        if (config.csvPath) {
            try {
                await this.loadCSVData(config.csvPath);
            }
            catch (error) {
                console.error('Error loading CSV:', error);
                process.exit(1);
            }
        }
        this.isRunning = true;
        this.sendNextMessage();
    }
    sendNextMessage() {
        if (!this.isRunning)
            return;
        // If we have records, use them in a loop
        if (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.udpPort.send(message, config.targetAddress, config.targetPort);
            // Add the message back to the end of the queue
            this.messageQueue.push(message);
        }
        else {
            // Only generate random messages if no CSV data was loaded
            const message = this.generateMockMessage();
            this.udpPort.send(message, config.targetAddress, config.targetPort);
        }
        setTimeout(() => this.sendNextMessage(), this.messageInterval);
    }
    stop() {
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

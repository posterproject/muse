import { AggregateConfig } from './types/osc-listener';

export enum DebugLevel {
    None = 0,
    Low = 1,
    Medium = 2,
    High = 3
}

export interface Config {
    localAddress: string;
    localPort: number;
    updateRate: number; // in Hz
    serverPort: number;
    debug: DebugLevel;
    recordData: boolean; // Whether to record raw OSC data to a file
    recordFileName: string;// The filename to record data to
    aggregateEndpoints?: AggregateConfig[];
}

// Parse command line arguments for debug level
const args = process.argv.slice(2);
const debugLevel = args.includes('--debug') ? DebugLevel.High :
                   args.includes('--verbose') ? DebugLevel.Medium :
                   args.includes('--quiet') ? DebugLevel.None :
                   DebugLevel.Low;

export const defaultConfig: Config = {
    localAddress: '0.0.0.0',
    localPort: 9005,
    updateRate: 1,
    serverPort: 3001,
    debug: debugLevel,
    recordData: false,
    recordFileName: 'raw-osc-data.csv'
}; 
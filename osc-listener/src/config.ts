export interface Config {
    localAddress: string;
    localPort: number;
    updateRate: number; // in Hz
}

export const defaultConfig: Config = {
    localAddress: '0.0.0.0',
    localPort: 9005,
    updateRate: 1
}; 
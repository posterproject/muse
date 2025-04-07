interface WaveData {
    alpha: number;
    beta: number;
    delta: number;
    gamma: number;
    theta: number;
}

export class OSCDataFetcher {
    private baseUrl: string;
    private waveAddresses: Map<string, string>;

    constructor(port: number = 3001) {
        this.baseUrl = `http://localhost:${port}/api/messages`;
        this.waveAddresses = new Map([
            ['alpha', '/muse/dsp/elements/alpha'],
            ['beta', '/muse/dsp/elements/beta'],
            ['delta', '/muse/dsp/elements/delta'],
            ['gamma', '/muse/dsp/elements/gamma'],
            ['theta', '/muse/dsp/elements/theta']
        ]);
    }

    async fetchWaveData(): Promise<WaveData> {
        const waveData: WaveData = {
            alpha: 0,
            beta: 0,
            delta: 0,
            gamma: 0,
            theta: 0
        };

        for (const [wave, address] of this.waveAddresses) {
            try {
                const response = await fetch(`${this.baseUrl}${encodeURIComponent(address)}`);
                if (!response.ok) {
                    console.error(`Failed to fetch ${wave} data:`, response.statusText);
                    continue;
                }
                const data = await response.json();
                waveData[wave as keyof WaveData] = data[0] || 0;
            } catch (error) {
                console.error(`Error fetching ${wave} data:`, error);
            }
        }

        return waveData;
    }
} 
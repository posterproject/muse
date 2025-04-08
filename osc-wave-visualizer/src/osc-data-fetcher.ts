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
        this.baseUrl = `http://localhost:${port}/api/messages/`;
        this.waveAddresses = new Map([
            ['alpha', '/muse/elements/alpha_absolute2'],
            ['beta', '/muse/elements/beta_absolute2'],
            ['delta', '/muse/elements/delta_absolute2'],
            ['gamma', '/muse/elements/gamma_absolute2'],
            ['theta', '/muse/elements/theta_absolute2']
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
                const response = await fetch(`${this.baseUrl}${address}`);
                
                if (!response.ok) {
                    console.error(`Failed to fetch ${wave} data:`, response.statusText);
                    
                    const fallbackAddress = `/muse/elements/${wave}_average`;
                    console.log(`Trying fallback address: ${fallbackAddress}`);
                    
                    const fallbackResponse = await fetch(`${this.baseUrl}${fallbackAddress}`);
                    if (!fallbackResponse.ok) {
                        console.error(`Fallback also failed for ${wave} data:`, fallbackResponse.statusText);
                        continue;
                    }
                    
                    const fallbackData = await fallbackResponse.json();
                    waveData[wave as keyof WaveData] = fallbackData[0] || 0;
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
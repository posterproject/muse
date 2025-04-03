import { Message, Transformer as TransformerInterface } from '../types/message';

export interface Transformer {
    process(message: Message): void;
    getTransformedData(): Message;
    clear(): void;
}

export class LatestValueTransformer implements TransformerInterface {
    private buffer: Message[] = [];
    private lastMessage: Message | null = null;

    process(message: Message): void {
        this.buffer.push(message);
        this.lastMessage = message;
    }

    getTransformedData(): Message {
        return this.lastMessage || {
            address: '/default',
            args: []
        };
    }

    clear(): void {
        this.buffer = [];
        this.lastMessage = null;
    }
}

export class AverageTransformer implements TransformerInterface {
    private buffer: Message[] = [];
    private readonly maxBufferSize: number;

    constructor(maxBufferSize: number = 10) {
        this.maxBufferSize = maxBufferSize;
    }

    process(message: Message): void {
        this.buffer.push(message);
        if (this.buffer.length > this.maxBufferSize) {
            this.buffer.shift();
        }
    }

    getTransformedData(): Message {
        if (this.buffer.length === 0) {
            return {
                address: '/default',
                args: []
            };
        }

        const firstMessage = this.buffer[0];
        const averagedArgs = firstMessage.args.map((_, index) => {
            const sum = this.buffer.reduce((acc, msg) => acc + msg.args[index].value, 0);
            return {
                type: 'f',
                value: sum / this.buffer.length
            };
        });

        return {
            address: firstMessage.address,
            args: averagedArgs
        };
    }

    clear(): void {
        this.buffer = [];
    }
} 
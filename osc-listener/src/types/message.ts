// TODO: Fix message types - currently unused but needed for emitter functionality
import { Message as OSCMessage } from 'osc';

export type Message = OSCMessage;

export interface Transformer {
    process(message: Message): void;
    getTransformedData(): Message;
    clear(): void;
} 
/**
 * Lightweight in-memory request queue with concurrency control.
 * Used to throttle expensive operations (e.g., LLM calls).
 */
export class RequestQueue {
    private active = 0;
    private waiting: Array<() => void> = [];

    constructor(private readonly concurrency: number) {}

    async run<T>(task: () => Promise<T>): Promise<T> {
        if (this.active >= this.concurrency) {
            await new Promise<void>((resolve) => this.waiting.push(resolve));
        }

        this.active++;
        try {
            return await task();
        } finally {
            this.active--;
            const next = this.waiting.shift();
            if (next) next();
        }
    }
}

// Shared queue for LLM requests (defaults to 3 concurrent)
export const llmQueue = new RequestQueue(3);

export default llmQueue;

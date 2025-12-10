import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RequestQueue } from "./requestQueue";

describe("RequestQueue", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("limits concurrent tasks to the configured concurrency", async () => {
        const queue = new RequestQueue(2);
        let active = 0;
        let maxActive = 0;

        const createTask = (result: string, delay = 10) => async () => {
            active++;
            maxActive = Math.max(maxActive, active);
            await new Promise((resolve) => setTimeout(resolve, delay));
            active--;
            return result;
        };

        const p1 = queue.run(createTask("t1"));
        const p2 = queue.run(createTask("t2"));
        const p3 = queue.run(createTask("t3"));

        // Advance timers to let tasks finish
        await vi.runAllTimersAsync();
        const results = await Promise.all([p1, p2, p3]);

        expect(maxActive).toBeLessThanOrEqual(2);
        expect(results.sort()).toEqual(["t1", "t2", "t3"]);
    });
});

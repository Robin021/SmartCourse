import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
    __esModule: true,
    default: vi.fn(async () => ({})),
}));

vi.mock("@/lib/llm", () => ({
    LLMClient: {
        chat: vi.fn(),
    },
}));

import { GenerationService } from "./generationService";
import * as promptModule from "@/lib/getPrompt";
import * as embeddingModule from "@/lib/embedding";
import * as vectorDbModule from "@/lib/vectorDb";
import { LLMClient } from "@/lib/llm";

describe("GenerationService caching", () => {
    beforeEach(() => {
        GenerationService.clearCache();
        vi.restoreAllMocks();
    });

    it("reuses cached results when payload is identical", async () => {
        vi.spyOn(promptModule, "getPrompt").mockResolvedValue({ template: "Hello {{name}}" } as any);
        vi.spyOn(embeddingModule, "generateEmbedding").mockResolvedValue([0.1, 0.2] as any);
        vi.spyOn(vectorDbModule, "searchSimilar").mockResolvedValue([]);
        const chatMock = vi.mocked(LLMClient.chat).mockResolvedValue({
            content: "Hello Cache",
            usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
            finishReason: "stop",
        });

        const payload = {
            projectId: "p1",
            stage: "Q2",
            userInput: { name: "Cache" },
            previousStagesContext: {},
            schoolInfo: {},
            conversationHistory: [{ role: "user" as const, content: "Hi" }],
        };

        const first = await GenerationService.generate(payload);
        const second = await GenerationService.generate(payload);

        expect(chatMock).toHaveBeenCalledTimes(1);
        expect(second.metadata.fromCache).toBe(true);
        expect(second.content).toBe(first.content);
    });
});

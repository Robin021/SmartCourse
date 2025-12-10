import connectDB from "@/lib/db";
import SystemConfig, { ILLMProvider } from "@/models/SystemConfig";
import { llmQueue } from "@/lib/utils/requestQueue";

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

export interface ChatOptions {
    temperature?: number;
    maxTokens?: number;
    model?: string;
}

export interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

export interface ChatResponse {
    content: string;
    usage: TokenUsage;
    finishReason: string;
}

export interface LLMProviderConfig {
    base_url: string;
    api_key: string;
    model: string;
    provider: string;
    name: string;
}

// ============================================================================
// Error Classes
// ============================================================================

export class LLMError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly retryable: boolean = false
    ) {
        super(message);
        this.name = "LLMError";
    }
}

// ============================================================================
// LLM Client Class
// ============================================================================

export class LLMClient {
    private static readonly MAX_RETRIES = 3;
    private static readonly RETRY_DELAYS = [1000, 2000, 4000]; // 1s, 2s, 4s
    private static readonly DEFAULT_TEMPERATURE = 0.7;
    private static readonly DEFAULT_MAX_TOKENS = 2000;
    private static readonly HTTP_TIMEOUT_MS = 300000; // allow longer streaming responses

    /**
     * Get the active chat provider from SystemConfig
     */
    static async getChatProvider(): Promise<LLMProviderConfig | null> {
        await connectDB();
        const config = await SystemConfig.findOne().sort({ createdAt: -1 });

        if (!config || !config.llm_providers) {
            return null;
        }

        const providers = config.llm_providers;

        // Prefer active chat providers
        let selected = providers.find((p: ILLMProvider) => p.type === "chat" && p.is_active);

        // Fallback to any non-embedding active provider (if admin accidentally activated only embedding)
        if (!selected) {
            selected = providers.find(
                (p: ILLMProvider) => p.is_active && p.type !== "embedding"
            );
            if (selected) {
                console.warn(
                    "[LLMClient] No active chat provider; using first non-embedding active provider:",
                    selected.name
                );
            }
        }

        // As a last resort, pick any provider to avoid null, but still warn
        if (!selected && providers.length > 0) {
            selected = providers[0] as ILLMProvider;
            console.warn(
                "[LLMClient] No active provider with chat capability; falling back to first configured provider:",
                selected.name
            );
        }

        if (!selected) {
            console.warn("[LLMClient] No active chat provider found");
            return null;
        }

        return {
            base_url: selected.base_url,
            api_key: selected.api_key,
            model: selected.model,
            provider: selected.provider,
            name: selected.name,
        };
    }

    /**
     * Main chat method - sends messages to LLM and returns response
     */
    static async chat(
        messages: ChatMessage[],
        options?: ChatOptions
    ): Promise<ChatResponse> {
        const provider = await this.getChatProvider();

        if (!provider) {
            throw new LLMError(
                "No active chat provider configured. Please configure one in Admin > LLM Settings.",
                "NO_PROVIDER",
                false
            );
        }

        const temperature = options?.temperature ?? this.DEFAULT_TEMPERATURE;
        const maxTokens = options?.maxTokens ?? this.DEFAULT_MAX_TOKENS;
        const model = this.normalizeChatModel(options?.model ?? provider.model);

        return llmQueue.run(() =>
            this.chatWithRetry(provider, messages, {
                temperature,
                maxTokens,
                model,
            })
        );
    }

    /**
     * Chat with retry mechanism
     */
    private static async chatWithRetry(
        provider: LLMProviderConfig,
        messages: ChatMessage[],
        options: { temperature: number; maxTokens: number; model: string }
    ): Promise<ChatResponse> {
        let lastError: Error | null = null;

        for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
            try {
                return await this.callLLMAPI(provider, messages, options);
            } catch (error: any) {
                lastError = error;

                // Don't retry non-retryable errors
                if (error instanceof LLMError && !error.retryable) {
                    throw error;
                }

                // Don't retry on last attempt
                if (attempt < this.MAX_RETRIES - 1) {
                    const delay = this.RETRY_DELAYS[attempt];
                    console.warn(
                        `[LLMClient] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`,
                        error.message
                    );
                    await this.sleep(delay);
                }
            }
        }

        // All retries exhausted
        throw new LLMError(
            `LLM call failed after ${this.MAX_RETRIES} attempts: ${lastError?.message || "Unknown error"}`,
            "MAX_RETRIES_EXCEEDED",
            false
        );
    }

    /**
     * Call the LLM API (OpenAI-compatible format)
     */
    private static async callLLMAPI(
        provider: LLMProviderConfig,
        messages: ChatMessage[],
        options: { temperature: number; maxTokens: number; model: string }
    ): Promise<ChatResponse> {
        const url = this.buildChatURL(provider.base_url);

        const requestBody = {
            model: options.model,
            messages: messages,
            temperature: options.temperature,
            max_tokens: options.maxTokens,
        };

        let response: Response;
        try {
            response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${provider.api_key}`,
                },
                body: JSON.stringify(requestBody),
            });
        } catch (error: any) {
            // Network errors are retryable
            throw new LLMError(
                `Network error: ${error.message}`,
                "NETWORK_ERROR",
                true
            );
        }

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            const errorMessage = data.error?.message || data.message || "LLM API call failed";
            const statusCode = response.status;

            // Determine if error is retryable based on status code
            const retryable = statusCode >= 500 || statusCode === 429;

            const unsupportedModel =
                statusCode === 400 ||
                statusCode === 404 ||
                (typeof errorMessage === "string" &&
                    /unsupported model|model not found|invalid model/i.test(errorMessage));
            if (unsupportedModel) {
                console.warn("[LLMClient] Unsupported model, returning fallback content:", errorMessage);
                return this.buildFallbackResponse(messages);
            }

            throw new LLMError(
                `LLM API error (${statusCode}): ${errorMessage}`,
                `HTTP_${statusCode}`,
                retryable
            );
        }

        // Parse response (OpenAI-compatible format)
        return this.parseOpenAIResponse(data);
    }

    /**
     * Build the chat completions URL
     */
    private static buildChatURL(baseUrl: string): string {
        const cleanUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
        
        // Handle different API formats
        if (cleanUrl.includes("/v1")) {
            return `${cleanUrl}/chat/completions`;
        }
        return `${cleanUrl}/v1/chat/completions`;
    }

    /**
     * Parse OpenAI-compatible response format
     */
    private static parseOpenAIResponse(data: any): ChatResponse {
        if (!data.choices || data.choices.length === 0) {
            throw new LLMError(
                "Invalid LLM response: no choices returned",
                "INVALID_RESPONSE",
                false
            );
        }

        const choice = data.choices[0];
        const usage = data.usage || {};

        return {
            content: choice.message?.content || "",
            usage: {
                promptTokens: usage.prompt_tokens || 0,
                completionTokens: usage.completion_tokens || 0,
                totalTokens: usage.total_tokens || 0,
            },
            finishReason: choice.finish_reason || "unknown",
        };
    }

    /**
     * Sleep utility for retry delays
     */
    private static sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Stream chat response (optional feature)
     * Returns an async generator that yields content chunks
     */
    static async *chatStream(
        messages: ChatMessage[],
        options?: ChatOptions
    ): AsyncGenerator<string, TokenUsage, unknown> {
        const provider = await this.getChatProvider();

        if (!provider) {
            throw new LLMError(
                "No active chat provider configured. Please configure one in Admin > LLM Settings.",
                "NO_PROVIDER",
                false
            );
        }

        const temperature = options?.temperature ?? this.DEFAULT_TEMPERATURE;
        const maxTokens = options?.maxTokens ?? this.DEFAULT_MAX_TOKENS;
        const model = this.normalizeChatModel(options?.model ?? provider.model);

        const url = this.buildChatURL(provider.base_url);

        const requestBody = {
            model: model,
            messages: messages,
            temperature: temperature,
            max_tokens: maxTokens,
            stream: true,
        };

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.HTTP_TIMEOUT_MS);

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${provider.api_key}`,
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
        }).finally(() => clearTimeout(timeout));

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            const errorMessage = data.error?.message || data.message || "Unknown error";
            const unsupportedModel =
                response.status === 400 ||
                response.status === 404 ||
                (typeof errorMessage === "string" &&
                    /unsupported model|model not found|invalid model/i.test(errorMessage));
            if (unsupportedModel) {
                console.warn("[LLMClient] Unsupported model (stream), returning fallback content:", errorMessage);
                return this.buildFallbackResponse(messages);
            }
            throw new LLMError(
                `LLM API error (${response.status}): ${errorMessage}`,
                `HTTP_${response.status}`,
                false
            );
        }

        if (!response.body) {
            throw new LLMError("No response body for streaming", "NO_BODY", false);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let totalUsage: TokenUsage = {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
        };

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || trimmed === "data: [DONE]") continue;
                    if (!trimmed.startsWith("data: ")) continue;

                    try {
                        const json = JSON.parse(trimmed.slice(6));
                        const delta = json.choices?.[0]?.delta?.content;
                        if (delta) {
                            yield delta;
                        }

                        // Capture usage if provided (some providers include it in final chunk)
                        if (json.usage) {
                            totalUsage = {
                                promptTokens: json.usage.prompt_tokens || 0,
                                completionTokens: json.usage.completion_tokens || 0,
                                totalTokens: json.usage.total_tokens || 0,
                            };
                        }
                    } catch {
                        // Skip malformed JSON lines
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }

        return totalUsage;
    }

    /**
     * Choose a safe chat model; avoid embedding models being used for chat calls.
     */
    private static normalizeChatModel(model?: string): string {
        const fallback = process.env.DEFAULT_CHAT_MODEL || "gpt-3.5-turbo";
        if (!model) return fallback;
        if (/embed/i.test(model)) {
            console.warn("[LLMClient] Detected embedding model for chat; using fallback:", fallback);
            return fallback;
        }
        return model;
    }

    /**
     * Minimal fallback when LLM provider is misconfigured.
     */
    private static buildFallbackResponse(messages: ChatMessage[]): ChatResponse {
        const userMessage = [...messages].reverse().find((m) => m.role === "user");
        const content =
            "LLM provider is not configured correctly. Here is a placeholder based on your last input:\n\n" +
            (userMessage?.content || "请稍后重试。");
        return {
            content,
            usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
            finishReason: "fallback",
        };
    }
}

// ============================================================================
// Convenience exports
// ============================================================================

export default LLMClient;

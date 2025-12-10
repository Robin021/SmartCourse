import connectDB from "@/lib/db";
import SystemConfig from "@/models/SystemConfig";

interface EmbeddingProvider {
    base_url: string;
    api_key: string;
    model: string;
    provider: string;
}

/**
 * Get the active embedding provider from SystemConfig
 */
async function getEmbeddingProvider(): Promise<EmbeddingProvider | null> {
    await connectDB();
    const config = await SystemConfig.findOne().sort({ createdAt: -1 });

    if (!config || !config.llm_providers) {
        return null;
    }

    // Find active embedding provider
    const embeddingProvider = config.llm_providers.find(
        (p: any) => p.type === "embedding" && p.is_active
    );

    if (!embeddingProvider) {
        console.warn("[Embedding] No active embedding provider found");
        return null;
    }

    return {
        base_url: embeddingProvider.base_url,
        api_key: embeddingProvider.api_key,
        model: embeddingProvider.model,
        provider: embeddingProvider.provider,
    };
}

/**
 * Generate embedding for a single text using Aliyun DashScope
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    const trimmed = (text || "").slice(0, 2000);
    const embeddings = await generateEmbeddings([trimmed]);
    return embeddings[0];
}

/**
 * Generate embeddings for multiple texts (batch)
 * Supports Aliyun DashScope and OpenAI-compatible APIs
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
        const provider = await getEmbeddingProvider();

        if (!provider) {
            throw new Error("No active embedding provider configured. Please configure one in Admin > LLM Settings.");
        }

        const isDashscope = provider.provider === "dashscope" || provider.base_url.includes("dashscope");
        const isCompatibleMode = provider.base_url.includes("compatible-mode");

        // Handle different provider formats
        // DashScope 直连接口
        if (isDashscope && !isCompatibleMode) {
            return generateDashScopeEmbeddings(texts, provider);
        } else {
            // OpenAI-compatible format (包括 dashscope compatible-mode/v1)
            return generateOpenAIEmbeddings(texts, provider);
        }
    } catch (err) {
        console.warn("[Embedding] Fallback to zero vectors due to error:", err);
        return texts.map(() => zeroEmbedding());
    }
}

/**
 * Aliyun DashScope embedding API
 * https://help.aliyun.com/zh/dashscope/developer-reference/text-embedding-api-details
 */
async function generateDashScopeEmbeddings(
    texts: string[],
    provider: EmbeddingProvider
): Promise<number[][]> {
    const url = provider.base_url.endsWith("/")
        ? `${provider.base_url}services/embeddings/text-embedding/text-embedding`
        : `${provider.base_url}/services/embeddings/text-embedding/text-embedding`;

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${provider.api_key}`,
        },
        body: JSON.stringify({
            model: provider.model || "text-embedding-v3",
            input: {
                texts: texts,
            },
            parameters: {
                dimension: 1536,
                text_type: "document",
            },
        }),
    });

    const text = await response.text();
    if (!text) {
        console.warn("[DashScope] Empty response, returning zero vectors");
        return texts.map(() => zeroEmbedding());
    }

    const data = JSON.parse(text);

    if (!response.ok) {
        console.error("[DashScope] Error:", data);
        throw new Error(data.message || "DashScope embedding failed");
    }

    // DashScope returns embeddings in output.embeddings
    if (!data.output?.embeddings) {
        console.warn("[DashScope] Missing embeddings, returning zero vectors");
        return texts.map(() => zeroEmbedding());
    }

    return data.output.embeddings.map((e: any) => e.embedding);
}

/**
 * OpenAI-compatible embedding API
 */
async function generateOpenAIEmbeddings(
    texts: string[],
    provider: EmbeddingProvider
): Promise<number[][]> {
    const url = provider.base_url.endsWith("/")
        ? `${provider.base_url}embeddings`
        : `${provider.base_url}/embeddings`;

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${provider.api_key}`,
        },
        body: JSON.stringify({
            model: provider.model,
            input: texts,
        }),
    });

    const text = await response.text();
    if (!text) {
        console.warn("[OpenAI Embedding] Empty response, returning zero vectors");
        return texts.map(() => zeroEmbedding());
    }

    const data = JSON.parse(text);

    if (!response.ok) {
        console.error("[OpenAI Embedding] Error:", data);
        throw new Error(data.error?.message || "Embedding API failed");
    }

    // OpenAI returns embeddings sorted by index
    if (!data.data || !Array.isArray(data.data)) {
        console.warn("[OpenAI Embedding] Missing data array, returning zero vectors");
        return texts.map(() => zeroEmbedding());
    }
    const sorted = data.data.sort((a: any, b: any) => a.index - b.index);
    return sorted.map((item: any) => item.embedding || zeroEmbedding());
}

async function safeJson(response: Response) {
    const text = await response.text();
    if (!text) {
        return {};
    }
    return JSON.parse(text);
}

function zeroEmbedding(length = 1536): number[] {
    return Array.from({ length }, () => 0);
}

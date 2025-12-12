import connectDB from "@/lib/db";
import SystemConfig from "@/models/SystemConfig";

interface EmbeddingProvider {
    base_url: string;
    api_key: string;
    model: string;
    provider: string;
}

// 配置：是否在 embedding 失败时抛出错误（而不是返回零向量）
// 生产环境建议设为 true，以便及时发现问题
export const EMBEDDING_STRICT_MODE = process.env.EMBEDDING_STRICT_MODE !== "false";

// 网络请求超时配置（毫秒）
const FETCH_TIMEOUT_MS = 60000; // 60 秒

export class EmbeddingError extends Error {
    constructor(message: string, public readonly cause?: Error) {
        super(message);
        this.name = "EmbeddingError";
    }
}

/**
 * 带超时的 fetch 封装
 */
async function fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs: number = FETCH_TIMEOUT_MS
): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/17efb887-18fc-4865-bc2f-4d26d39f8f0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'embedding.ts:fetchWithTimeout',message:'Starting fetch request',data:{url,timeoutMs},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/17efb887-18fc-4865-bc2f-4d26d39f8f0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'embedding.ts:fetchWithTimeout',message:'Fetch completed',data:{url,status:response.status,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        return response;
    } catch (error: any) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/17efb887-18fc-4865-bc2f-4d26d39f8f0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'embedding.ts:fetchWithTimeout',message:'Fetch error',data:{url,errorName:error?.name,errorMessage:error?.message,errorCode:error?.code},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        if (error.name === 'AbortError') {
            throw new EmbeddingError(`[Fetch] Request timeout after ${timeoutMs}ms: ${url}`);
        }
        // 网络错误的详细信息
        const errorDetails = error.cause 
            ? `${error.message} (cause: ${error.cause.code || error.cause.message})`
            : error.message;
        throw new EmbeddingError(`[Fetch] Network error: ${errorDetails}`, error);
    } finally {
        clearTimeout(timeoutId);
    }
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
 * Generate embedding for a single text
 * @param text - Text to embed (will be trimmed to 2000 chars)
 * @param options - Optional configuration
 * @param options.strictMode - Override global EMBEDDING_STRICT_MODE
 */
export async function generateEmbedding(
    text: string,
    options?: { strictMode?: boolean }
): Promise<number[]> {
    const trimmed = (text || "").slice(0, 2000);
    const embeddings = await generateEmbeddings([trimmed], options);
    return embeddings[0];
}

/**
 * Generate embeddings for multiple texts (batch)
 * Supports Aliyun DashScope and OpenAI-compatible APIs
 * 
 * @param texts - Array of texts to embed
 * @param options - Optional configuration
 * @param options.strictMode - Override global EMBEDDING_STRICT_MODE
 * @throws EmbeddingError when strictMode is true and embedding fails
 */
export async function generateEmbeddings(
    texts: string[],
    options?: { strictMode?: boolean }
): Promise<number[][]> {
    const useStrictMode = options?.strictMode ?? EMBEDDING_STRICT_MODE;
    
    try {
        const provider = await getEmbeddingProvider();

        if (!provider) {
            const error = new EmbeddingError(
                "No active embedding provider configured. Please configure one in Admin > LLM Settings."
            );
            if (useStrictMode) throw error;
            console.warn("[Embedding] No provider:", error.message);
            return texts.map(() => zeroEmbedding());
        }

        const isDashscope = provider.provider === "dashscope" || provider.base_url.includes("dashscope");
        const isCompatibleMode = provider.base_url.includes("compatible-mode");

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/17efb887-18fc-4865-bc2f-4d26d39f8f0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'embedding.ts:generateEmbeddings',message:'Provider config resolved',data:{providerName:provider.provider,baseUrl:provider.base_url,model:provider.model,isDashscope,isCompatibleMode,textCount:texts.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
        // #endregion

        // Handle different provider formats
        // DashScope 直连接口
        if (isDashscope && !isCompatibleMode) {
            return generateDashScopeEmbeddings(texts, provider);
        } else {
            // OpenAI-compatible format (包括 dashscope compatible-mode/v1)
            return generateOpenAIEmbeddings(texts, provider);
        }
    } catch (err) {
        // 如果已经是 EmbeddingError，直接重新抛出
        if (err instanceof EmbeddingError) {
            if (useStrictMode) throw err;
            console.warn("[Embedding] Error:", err.message);
            return texts.map(() => zeroEmbedding());
        }
        
        // 包装其他错误
        const wrappedError = new EmbeddingError(
            `Embedding generation failed: ${err instanceof Error ? err.message : String(err)}`,
            err instanceof Error ? err : undefined
        );
        
        if (useStrictMode) throw wrappedError;
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

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/17efb887-18fc-4865-bc2f-4d26d39f8f0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'embedding.ts:generateDashScopeEmbeddings',message:'Calling DashScope API',data:{url,model:provider.model,textCount:texts.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    const response = await fetchWithTimeout(url, {
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
        throw new EmbeddingError("[DashScope] Empty response from embedding API");
    }

    let data: any;
    try {
        data = JSON.parse(text);
    } catch (parseErr) {
        throw new EmbeddingError(`[DashScope] Invalid JSON response: ${text.slice(0, 200)}`);
    }

    if (!response.ok) {
        throw new EmbeddingError(
            `[DashScope] API error (${response.status}): ${data.message || JSON.stringify(data)}`
        );
    }

    // DashScope returns embeddings in output.embeddings
    if (!data.output?.embeddings) {
        throw new EmbeddingError(
            `[DashScope] Missing embeddings in response: ${JSON.stringify(data).slice(0, 200)}`
        );
    }

    const embeddings = data.output.embeddings.map((e: any) => e.embedding);
    
    // 验证返回的 embeddings 数量与输入一致
    if (embeddings.length !== texts.length) {
        throw new EmbeddingError(
            `[DashScope] Embedding count mismatch: expected ${texts.length}, got ${embeddings.length}`
        );
    }

    return embeddings;
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

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/17efb887-18fc-4865-bc2f-4d26d39f8f0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'embedding.ts:generateOpenAIEmbeddings',message:'Calling OpenAI-compatible API',data:{url,model:provider.model,textCount:texts.length,baseUrl:provider.base_url},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    const response = await fetchWithTimeout(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${provider.api_key}`,
        },
        body: JSON.stringify({
            model: provider.model,
            input: texts,
            // 指定输出维度为1536，与数据库vector列维度一致
            // 支持 OpenAI text-embedding-3 系列和 DashScope compatible-mode
            dimensions: 1536,
        }),
    });

    const text = await response.text();
    if (!text) {
        throw new EmbeddingError("[OpenAI] Empty response from embedding API");
    }

    let data: any;
    try {
        data = JSON.parse(text);
    } catch (parseErr) {
        throw new EmbeddingError(`[OpenAI] Invalid JSON response: ${text.slice(0, 200)}`);
    }

    if (!response.ok) {
        throw new EmbeddingError(
            `[OpenAI] API error (${response.status}): ${data.error?.message || JSON.stringify(data)}`
        );
    }

    // OpenAI returns embeddings sorted by index
    if (!data.data || !Array.isArray(data.data)) {
        throw new EmbeddingError(
            `[OpenAI] Missing data array in response: ${JSON.stringify(data).slice(0, 200)}`
        );
    }
    
    const sorted = data.data.sort((a: any, b: any) => a.index - b.index);
    const embeddings = sorted.map((item: any) => {
        if (!item.embedding || !Array.isArray(item.embedding)) {
            throw new EmbeddingError(
                `[OpenAI] Invalid embedding at index ${item.index}: missing or invalid embedding array`
            );
        }
        return item.embedding;
    });

    // 验证返回的 embeddings 数量与输入一致
    if (embeddings.length !== texts.length) {
        throw new EmbeddingError(
            `[OpenAI] Embedding count mismatch: expected ${texts.length}, got ${embeddings.length}`
        );
    }

    return embeddings;
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

import { LLMClient, ChatMessage, TokenUsage } from "@/lib/llm";
import { searchSimilar } from "@/lib/vectorDb";
import { generateEmbedding } from "@/lib/embedding";
import { getPrompt } from "@/lib/getPrompt";
import { runWebSearch, type WebSearchResult } from "@/lib/webSearch";
import { Q1_PROMPT_TEMPLATE } from "@/lib/q1/q1PromptTemplate";
import {
    hasUnresolvedVariables,
    extractVariables,
    interpolatePromptVariables,
} from "./interpolation";

// Re-export interpolation utilities for convenience
export { hasUnresolvedVariables, extractVariables, interpolatePromptVariables };

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface GenerationRequest {
    projectId: string;
    stage: string; // Q1-Q10
    userInput: Record<string, any>;
    previousStagesContext?: Record<string, any>;
    schoolInfo?: Record<string, any>;
    conversationHistory?: Message[];
    useRag?: boolean;
    useWeb?: boolean;
    includeCitations?: boolean;  // Whether to include citations in output (default: true)
}

export interface Message {
    role: "user" | "assistant";
    content: string;
    timestamp?: Date;
}

export interface SearchResult {
    id: number;
    document_id: string;
    chunk_index: number;
    content: string;
    metadata: Record<string, any>;
    score: number;
}

export interface DiagnosticScore {
    overall: number; // 0-100
    dimensions?: Record<string, number>;
    suggestions: string[];
}

export interface GenerationResult {
    content: string;
    diagnosticScore?: DiagnosticScore;
    ragResults: SearchResult[];
    webResults: WebSearchResult[];
    usage: TokenUsage;
    metadata: GenerationMetadata;
}

export interface GenerationMetadata {
    promptUsed: string;
    ragResults: SearchResult[];
    webResults: WebSearchResult[];
    tokenUsage: TokenUsage;
    stage: string;
    timestamp: Date;
    fromCache?: boolean;
}

function stableSerialize(value: any): string {
    if (value === null || typeof value !== "object") {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        return `[${value.map((v) => stableSerialize(v)).join(",")}]`;
    }
    const keys = Object.keys(value).sort();
    const serialized = keys.map((k) => `"${k}":${stableSerialize(value[k])}`);
    return `{${serialized.join(",")}}`;
}

// ============================================================================
// Generation Service Class
// ============================================================================

export class GenerationService {
    private static readonly DEFAULT_RAG_TOP_K = 5;
    private static readonly DEFAULT_TEMPERATURE = 0.7;
    // max_tokens is now controlled by the LLM provider config (Admin > LLM Settings)
    // Set to undefined to use provider's max_output_tokens setting
    private static readonly CACHE_TTL_MS = 2 * 60 * 1000;
    private static cache: Map<string, { expiresAt: number; result: GenerationResult }> = new Map();

    static clearCache(): void {
        this.cache.clear();
    }
    private static withCitationPolicy(
        promptTemplate: string,
        ragResults?: SearchResult[],
        webResults?: WebSearchResult[],
        includeCitations: boolean = true
    ): string {
        const hasReferences =
            (ragResults?.length || 0) + (webResults?.length || 0) > 0;
        if (!hasReferences || !includeCitations) return promptTemplate;
        const citationPolicy =
            "引用要求：如使用参考资料，请在相关句末标注对应编号（如 [1] 或 [1][3]），编号必须与“参考资料列表”一致，并在文末保留“参考资料列表”。不得编造引用。";
        return `${citationPolicy}\n\n${promptTemplate}`;
    }

    /**
     * Strip citation references and reference list from generated content
     */
    private static stripCitationsFromContent(content: string): string {
        if (!content) return content;

        // Remove inline citations like [1], [2][3], etc.
        let cleaned = content.replace(/\[\d+\](?:\[\d+\])*/g, '');

        // Remove reference list section at the end
        const refPatterns = [
            /\n*#{1,3}\s*(参考文献|引用来源|参考资料|文献引用|参考资料列表|References|Citations|Bibliography|Sources)[\s\S]*$/i,
            /\n*(参考文献|引用来源|参考资料|文献引用|参考资料列表|References|Citations|Bibliography|Sources)\s*[:：]?[\s\S]*$/i,
        ];

        for (const pattern of refPatterns) {
            cleaned = cleaned.replace(pattern, '');
        }

        // Clean up extra whitespace at the end
        cleaned = cleaned.trim();

        return cleaned;
    }

    /**
     * Main generation method - integrates RAG + Prompt + LLM
     */
    static async generate(request: GenerationRequest): Promise<GenerationResult> {
        const {
            projectId,
            stage,
            userInput,
            previousStagesContext,
            schoolInfo,
            conversationHistory,
            useRag = true,
            useWeb = false,
            includeCitations = true,
        } = request;

        const cacheKey = this.buildCacheKey(
            projectId,
            stage,
            userInput,
            previousStagesContext,
            schoolInfo,
            conversationHistory,
            useRag,
            useWeb
        );
        const cached = this.cache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            return {
                ...cached.result,
                ragResults: [...cached.result.ragResults],
                webResults: [...cached.result.webResults],
                metadata: { ...cached.result.metadata, fromCache: true },
            };
        }

        // 1. Perform retrievals (optional)
        const ragPromise = useRag
            ? this.performRAGRetrieval(stage, userInput)
            : Promise.resolve([]);
        const webPromise = useWeb
            ? this.performWebRetrieval(projectId, stage, userInput)
            : Promise.resolve([]);
        const [ragResults, webResults] = await Promise.all([ragPromise, webPromise]);

        // 2. Get prompt template for the stage
        const promptKey = `stage_${stage.toLowerCase()}`;
        const promptResult = await getPrompt({ key: promptKey });

        const fallbackTemplate =
            DEFAULT_STAGE_PROMPTS[stage] ||
            `You are creating content for stage ${stage}. User Input:\n{{user_input}}\nPrevious Stages:\n{{previous_stages}}\nRAG:\n{{rag_results}}\nGenerate a concise, well-structured report.`;

        const promptTemplate = this.withCitationPolicy(
            promptResult?.template || fallbackTemplate,
            ragResults,
            webResults,
            includeCitations
        );

        // 3. Build variables for interpolation
        const variables = this.buildPromptVariables(
            userInput,
            previousStagesContext,
            ragResults,
            schoolInfo,
            webResults
        );

        // 4. Interpolate the prompt
        const interpolatedPrompt = interpolatePromptVariables(
            promptTemplate,
            variables
        );

        // 5. Validate no unresolved variables remain
        if (hasUnresolvedVariables(interpolatedPrompt)) {
            const unresolvedVars = extractVariables(interpolatedPrompt);
            console.warn(
                `[GenerationService] Unresolved variables in prompt: ${unresolvedVars.join(", ")}`
            );
        }

        // 6. Build chat messages
        const messages = this.buildChatMessages(
            interpolatedPrompt,
            conversationHistory
        );

        // 7. Call LLM (maxTokens controlled by provider config)
        const llmResponse = await LLMClient.chat(messages, {
            temperature: this.DEFAULT_TEMPERATURE,
            // maxTokens is omitted - uses provider's max_output_tokens from Admin settings
        });

        // 8. Build metadata
        const metadata: GenerationMetadata = {
            promptUsed: interpolatedPrompt,
            ragResults,
            webResults,
            tokenUsage: llmResponse.usage,
            stage,
            timestamp: new Date(),
            fromCache: false,
        };

        const result: GenerationResult = {
            content: llmResponse.content,
            ragResults,
            webResults,
            usage: llmResponse.usage,
            metadata,
        };

        this.cache.set(cacheKey, {
            result,
            expiresAt: Date.now() + this.CACHE_TTL_MS,
        });

        return result;
    }

    /**
     * Streaming generation - mirrors generate() but streams tokens via onToken callback.
     */
    static async generateStream(
        request: GenerationRequest,
        options?: { onToken?: (chunk: string) => void }
    ): Promise<GenerationResult> {
        const {
            projectId,
            stage,
            userInput,
            previousStagesContext,
            schoolInfo,
            conversationHistory,
            useRag = true,
            useWeb = false,
            includeCitations = true,
        } = request;

        const ragPromise = useRag
            ? this.performRAGRetrieval(stage, userInput)
            : Promise.resolve([]);
        const webPromise = useWeb
            ? this.performWebRetrieval(projectId, stage, userInput)
            : Promise.resolve([]);
        const [ragResults, webResults] = await Promise.all([ragPromise, webPromise]);

        const promptKey = `stage_${stage.toLowerCase()}`;
        const promptResult = await getPrompt({ key: promptKey });

        const fallbackTemplate =
            DEFAULT_STAGE_PROMPTS[stage] ||
            `You are creating content for stage ${stage}. User Input:\n{{user_input}}\nPrevious Stages:\n{{previous_stages}}\nRAG:\n{{rag_results}}\nGenerate a concise, well-structured report.`;

        const promptTemplate = this.withCitationPolicy(
            promptResult?.template || fallbackTemplate,
            ragResults,
            webResults,
            includeCitations
        );

        const variables = this.buildPromptVariables(
            userInput,
            previousStagesContext,
            ragResults,
            schoolInfo,
            webResults
        );

        const interpolatedPrompt = interpolatePromptVariables(
            promptTemplate,
            variables
        );

        if (hasUnresolvedVariables(interpolatedPrompt)) {
            const unresolvedVars = extractVariables(interpolatedPrompt);
            console.warn(
                `[GenerationService] Unresolved variables in prompt (stream): ${unresolvedVars.join(", ")}`
            );
        }

        const messages = this.buildChatMessages(
            interpolatedPrompt,
            conversationHistory
        );

        const stream = LLMClient.chatStream(messages, {
            temperature: this.DEFAULT_TEMPERATURE,
            // maxTokens is omitted - uses provider's max_output_tokens from Admin settings
        });

        let content = "";
        let usage: TokenUsage = {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
        };

        while (true) {
            const { value, done } = await stream.next();
            if (done) {
                usage = (value as TokenUsage) || usage;
                break;
            }
            const chunk = value as string;
            content += chunk;
            options?.onToken?.(chunk);
        }

        const metadata: GenerationMetadata = {
            promptUsed: interpolatedPrompt,
            ragResults,
            webResults,
            tokenUsage: usage,
            stage,
            timestamp: new Date(),
            fromCache: false,
        };

        return {
            content,
            ragResults,
            webResults,
            usage,
            metadata,
        };
    }

    private static buildCacheKey(
        projectId: string,
        stage: string,
        userInput: Record<string, any>,
        previousStagesContext?: Record<string, any>,
        schoolInfo?: Record<string, any>,
        conversationHistory?: Message[],
        useRag?: boolean,
        useWeb?: boolean
    ): string {
        return stableSerialize({
            projectId,
            stage,
            userInput,
            previousStagesContext,
            schoolInfo,
            useRag: !!useRag,
            useWeb: !!useWeb,
            conversationHistory: (conversationHistory || []).map((m) => ({
                role: m.role,
                content: m.content,
            })),
        });
    }

    /**
     * Perform RAG retrieval based on stage and user input
     */
    private static async performRAGRetrieval(
        stage: string,
        userInput: Record<string, any>
    ): Promise<SearchResult[]> {
        try {
            // Build query from user input
            const queryText = this.buildRAGQuery(stage, userInput);

            if (!queryText) {
                return [];
            }

            // Generate embedding for the query
            const queryEmbedding = await generateEmbedding(queryText);

            // Search for similar documents
            const results = await searchSimilar(queryEmbedding, this.DEFAULT_RAG_TOP_K, {
                stageId: stage,
            });

            return results;
        } catch (error) {
            console.warn("[GenerationService] RAG retrieval failed, continue without RAG:", error);
            // Degrade gracefully - continue without RAG results
            return [];
        }
    }

    private static async performWebRetrieval(
        projectId: string,
        stage: string,
        userInput: Record<string, any>
    ): Promise<WebSearchResult[]> {
        try {
            const { results } = await runWebSearch({
                projectId,
                stageId: stage,
                formData: userInput,
                fetchContent: true,
            });
            return results;
        } catch (error) {
            console.warn("[GenerationService] Web search failed, continue without web:", error);
            return [];
        }
    }

    /**
     * Build RAG query from stage and user input
     */
    private static buildRAGQuery(
        stage: string,
        userInput: Record<string, any>
    ): string {
        // Combine relevant user input fields into a query
        const inputValues = Object.values(userInput)
            .filter((v) => typeof v === "string" && v.trim())
            .join(" ")
            .slice(0, 2000); // guard against huge payloads

        // Add stage-specific context
        const stageContext = this.getStageContext(stage);

        return `${stageContext} ${inputValues}`.trim();
    }

    /**
     * Get stage-specific context for RAG queries
     */
    private static getStageContext(stage: string): string {
        const contexts: Record<string, string> = {
            Q1: "学校课程情境分析 SWOT分析 教育资源",
            Q2: "教育哲学 教育理论 地域文化",
            Q3: "办学理念 价值观 教育方针",
            Q4: "育人目标 五育并举 德智体美劳",
            Q5: "课程模式 课程命名 文化内涵",
            Q6: "课程理念 价值取向 课程论",
            Q7: "课程目标 学段目标 课程标准",
            Q8: "课程结构 课程群 模块设计",
            Q9: "课程实施 实施方案 教学路径",
            Q10: "课程评价 评价体系 335成长体系",
        };
        return contexts[stage] || "";
    }

    /**
     * Build variables for prompt interpolation
     */
    private static buildPromptVariables(
        userInput: Record<string, any>,
        previousStagesContext?: Record<string, any>,
        ragResults?: SearchResult[],
        schoolInfo?: Record<string, any>,
        webResults?: WebSearchResult[]
    ): Record<string, string> {
        const variables: Record<string, string> = {};

        // Aggregate user input for prompts expecting a single blob
        if (userInput && Object.keys(userInput).length > 0) {
            variables["user_input"] = JSON.stringify(userInput);
        }

        // Add user input variables
        for (const [key, value] of Object.entries(userInput)) {
            if (typeof value === "string") {
                variables[key] = value;
            } else if (value !== null && value !== undefined) {
                variables[key] = JSON.stringify(value);
            }
        }

        // Add previous stages context
        if (previousStagesContext) {
            variables["previous_stages"] = JSON.stringify(previousStagesContext);
            // Also add individual stage outputs
            for (const [stage, output] of Object.entries(previousStagesContext)) {
                if (typeof output === "string") {
                    variables[`${stage}_output`] = output;
                } else if (output !== null && output !== undefined) {
                    variables[`${stage}_output`] = JSON.stringify(output);
                }
            }
        } else {
            variables["previous_stages"] = "{}";
        }

        const citationGuide =
            "引用格式：在正文中引用参考资料时，请在相关句尾添加对应编号，如 [1] 或 [1][3]；并在文末保留“参考资料”列表，列出 [编号] 文件名/来源。";

        const formatReferences = (
            items: Array<{
                title: string;
                body: string;
                source: string;
                chunkInfo?: string;
            }>,
            startIndex: number
        ) => {
            const blocks: string[] = [];
            const notes: string[] = [];
            items.forEach((item, idx) => {
                const index = startIndex + idx;
                const label = `${item.title}${item.source ? ` (${item.source})` : ""}`;
                const chunkInfo = item.chunkInfo ? ` ${item.chunkInfo}` : "";
                blocks.push(`[${index}] ${label}${chunkInfo}\n${item.body}`);
                notes.push(`[${index}] ${label}`);
            });
            return { blocks, notes };
        };

        const ragItems =
            (ragResults || []).map((r, idx) => {
                const title =
                    (r.metadata &&
                        (r.metadata.original_name ||
                            r.metadata.title ||
                            r.metadata.heading ||
                            r.metadata.source)) ||
                    r.document_id ||
                    `R${idx + 1}`;
                const body = (r.content || "").trim();
                const chunkInfo =
                    r.metadata && (r.metadata.chunk_index !== undefined || r.metadata.total_chunks)
                        ? `(Chunk ${(r.metadata.chunk_index ?? 0) + 1}/${r.metadata.total_chunks || "?"})`
                        : "";
                return {
                    title,
                    body,
                    source: "Knowledge Base",
                    chunkInfo,
                };
            }) || [];

        const webItems =
            (webResults || []).map((r) => ({
                title: r.title || r.url || "Web Source",
                body: (r.content || r.snippet || "").trim(),
                source: r.source || "Web",
                chunkInfo: "",
            })) || [];

        const ragFormatted = formatReferences(ragItems, 1);
        const webFormatted = formatReferences(webItems, ragItems.length + 1);
        const combinedBlocks = [...ragFormatted.blocks, ...webFormatted.blocks];
        const combinedNotes = [...ragFormatted.notes, ...webFormatted.notes];

        const buildReferenceSection = (blocks: string[], notes: string[]) => {
            if (!blocks.length) return "";
            const list = notes.join("\n");
            return `${blocks.join("\n\n---\n\n")}\n\n${citationGuide}\n参考资料列表：\n${list}`;
        };

        const combinedSection = buildReferenceSection(combinedBlocks, combinedNotes);
        const webSection = buildReferenceSection(webFormatted.blocks, webFormatted.notes);

        variables["rag_results"] = combinedSection;
        variables["reference_materials"] = combinedSection;
        variables["web_results"] = webSection;
        variables["rag_citation_note"] = combinedBlocks.length ? citationGuide : "";
        variables["rag_references"] = combinedNotes.join("\n");

        // Add school info
        if (schoolInfo) {
            variables["school_info"] = JSON.stringify(schoolInfo);
            for (const [key, value] of Object.entries(schoolInfo)) {
                if (typeof value === "string") {
                    variables[`school_${key}`] = value;
                }
            }
        }

        return variables;
    }

    /**
     * Build chat messages for LLM call
     */
    private static buildChatMessages(
        systemPrompt: string,
        conversationHistory?: Message[]
    ): ChatMessage[] {
        const messages: ChatMessage[] = [
            {
                role: "system",
                content: systemPrompt,
            },
        ];

        // Add conversation history (last 5 rounds)
        if (conversationHistory && conversationHistory.length > 0) {
            const recentHistory = conversationHistory.slice(-10); // 5 rounds = 10 messages
            for (const msg of recentHistory) {
                messages.push({
                    role: msg.role === "user" ? "user" : "assistant",
                    content: msg.content,
                });
            }
        }

        // Add a user message to trigger generation if no history
        if (!conversationHistory || conversationHistory.length === 0) {
            messages.push({
                role: "user",
                content: "请根据以上信息生成内容。",
            });
        }

        return messages;
    }
}

const DEFAULT_STAGE_PROMPTS: Record<string, string> = {
    Q1: Q1_PROMPT_TEMPLATE,
    Q2: `你是一名课程哲学顾问，需基于用户输入生成教育哲学陈述。
用户输入：{{user_input}}
前序阶段：{{previous_stages}}
参考资料：{{rag_results}}
请给出：核心关键词、适配性评分、教育哲学陈述（分段阐述）。`,
};

export default GenerationService;

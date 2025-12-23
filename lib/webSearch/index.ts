import connectDB from "@/lib/db";
import SystemConfig from "@/models/SystemConfig";
import Project from "@/models/Project";

export interface WebSearchConfig {
    enabled: boolean;
    serper_api_key: string;
    firecrawl_api_key: string;
    jina_api_key: string;
    max_k: number;
    language: string;
    region: string;
    use_firecrawl: boolean;
    use_jina: boolean;
}

export interface WebSearchResult {
    id: string;
    title: string;
    url: string;
    snippet: string;
    content: string;
    score?: number;
    source: string;
    metadata?: Record<string, any>;
}

export interface WebSearchRequest {
    projectId: string;
    stageId: string;
    query?: string;
    topK?: number;
    fetchContent?: boolean;
    formData?: Record<string, any>;
}

const DEFAULT_CONFIG: WebSearchConfig = {
    enabled: false,
    serper_api_key: "",
    firecrawl_api_key: "",
    jina_api_key: "",
    max_k: 5,
    language: "zh-CN",
    region: "",
    use_firecrawl: true,
    use_jina: true,
};

const SERPER_ENDPOINT = "https://google.serper.dev/search";
const FIRECRAWL_ENDPOINT = "https://api.firecrawl.dev/v1/scrape";

const MAX_QUERY_LEN = 2000;
const MAX_CONTENT_LEN = 3000;

const stageContextMap: Record<string, string> = {
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

const clampText = (value: string, maxLen: number) =>
    value.length > maxLen ? value.slice(0, maxLen) : value;

const normalizeMaxK = (value: any, fallback: number) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(20, Math.max(1, Math.floor(parsed)));
};

const buildJinaUrl = (targetUrl: string) => {
    const withoutScheme = targetUrl.replace(/^https?:\/\//i, "");
    const scheme = targetUrl.toLowerCase().startsWith("https://") ? "https" : "http";
    return `https://r.jina.ai/${scheme}://${withoutScheme}`;
};

const fetchWithTimeout = async (
    url: string,
    options: RequestInit,
    timeoutMs: number
) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timeout);
    }
};

const getStageContext = (stageId: string) =>
    stageContextMap[(stageId || "").toUpperCase()] || "";

const findFieldValue = (
    input: any,
    matcher: (key: string) => boolean
): string | undefined => {
    if (!input || typeof input !== "object") return undefined;

    for (const [key, value] of Object.entries(input)) {
        if (matcher(key) && typeof value === "string" && value.trim()) {
            return value.trim();
        }
        if (value && typeof value === "object") {
            const nested = findFieldValue(value, matcher);
            if (nested) return nested;
        }
    }
    return undefined;
};

const extractSchoolInfo = (
    project: any,
    stageId: string,
    formData?: Record<string, any>
) => {
    const q1Input = project?.stages?.Q1?.input;
    const stageInput = formData || project?.stages?.[stageId]?.input;

    const schoolName =
        findFieldValue(q1Input, (k) => /school.*name|学校名称|school_name/i.test(k)) ||
        findFieldValue(stageInput, (k) => /school.*name|学校名称|school_name/i.test(k)) ||
        "";
    const region =
        findFieldValue(q1Input, (k) => /school_region|region|地区|城市|province|city/i.test(k)) ||
        findFieldValue(stageInput, (k) => /school_region|region|地区|城市|province|city/i.test(k)) ||
        "";

    return { schoolName: schoolName.trim(), region: region.trim() };
};

const buildInputText = (input?: Record<string, any>) => {
    if (!input || typeof input !== "object") return "";
    return Object.values(input)
        .filter((v) => typeof v === "string" && v.trim())
        .join(" ")
        .slice(0, MAX_QUERY_LEN);
};

const ensureIncluded = (base: string, extra: string) => {
    if (!extra) return base;
    const normalizedBase = base.toLowerCase();
    if (normalizedBase.includes(extra.toLowerCase())) return base;
    return `${extra} ${base}`.trim();
};

const buildSearchQuery = (args: {
    stageId: string;
    query?: string;
    schoolName?: string;
    region?: string;
    input?: Record<string, any>;
}) => {
    const stageContext = getStageContext(args.stageId);
    const inputText = buildInputText(args.input);
    const defaultQuery = `${stageContext} ${inputText}`.trim();
    let query = (args.query || "").trim() || defaultQuery;
    if (args.schoolName) {
        query = ensureIncluded(query, args.schoolName);
    }
    if (args.region) {
        query = ensureIncluded(query, args.region);
    }
    return clampText(query, MAX_QUERY_LEN);
};

const resolveConfig = async (): Promise<WebSearchConfig> => {
    await connectDB();
    const config = await SystemConfig.findOne().sort({ createdAt: -1 });
    const hasStored = !!config?.web_search;
    const stored = (config?.web_search || {}) as Partial<WebSearchConfig>;

    const resolved: WebSearchConfig = {
        ...DEFAULT_CONFIG,
        ...stored,
        max_k: normalizeMaxK(stored.max_k, DEFAULT_CONFIG.max_k),
    };

    if (!hasStored) {
        if (process.env.WEB_SEARCH_ENABLED === "true") {
            resolved.enabled = true;
        }
        if (!resolved.serper_api_key && process.env.SERPER_API_KEY) {
            resolved.serper_api_key = process.env.SERPER_API_KEY;
        }
        if (!resolved.firecrawl_api_key && process.env.FIRECRAWL_API_KEY) {
            resolved.firecrawl_api_key = process.env.FIRECRAWL_API_KEY;
        }
        if (!resolved.jina_api_key && process.env.JINA_API_KEY) {
            resolved.jina_api_key = process.env.JINA_API_KEY;
        }
        if (process.env.WEB_SEARCH_MAX_K) {
            resolved.max_k = normalizeMaxK(process.env.WEB_SEARCH_MAX_K, resolved.max_k);
        }
    }

    return resolved;
};

const serperSearch = async (
    query: string,
    config: WebSearchConfig,
    topK: number
) => {
    if (!config.serper_api_key) {
        throw new Error("Serper API key is missing");
    }

    const payload: Record<string, any> = {
        q: query,
        num: topK,
    };
    if (config.language) {
        payload.hl = config.language;
    }
    if (config.region && /^[a-z]{2}$/i.test(config.region.trim())) {
        payload.gl = config.region.trim().toLowerCase();
    }

    const response = await fetchWithTimeout(
        SERPER_ENDPOINT,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-KEY": config.serper_api_key,
            },
            body: JSON.stringify(payload),
        },
        12000
    );

    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || response.statusText || "Serper search failed");
    }

    const data = await response.json();
    return Array.isArray(data?.organic) ? data.organic : [];
};

const fetchFromFirecrawl = async (url: string, config: WebSearchConfig) => {
    if (!config.firecrawl_api_key) return null;

    try {
        const response = await fetchWithTimeout(
            FIRECRAWL_ENDPOINT,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${config.firecrawl_api_key}`,
                },
                body: JSON.stringify({
                    url,
                    formats: ["markdown"],
                }),
            },
            15000
        );

        const text = await response.text();
        let data: any = null;
        try {
            data = text ? JSON.parse(text) : null;
        } catch {
            data = null;
        }

        if (!response.ok || data?.success === false) {
            return null;
        }

        const content =
            data?.data?.markdown || data?.data?.content || data?.data?.text || "";
        return content ? clampText(content.trim(), MAX_CONTENT_LEN) : null;
    } catch (error) {
        return null;
    }
};

const fetchFromJina = async (url: string, config: WebSearchConfig) => {
    if (!config.jina_api_key) return null;

    try {
        const response = await fetchWithTimeout(
            buildJinaUrl(url),
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${config.jina_api_key}`,
                },
            },
            12000
        );

        if (!response.ok) return null;

        const text = await response.text();
        return text ? clampText(text.trim(), MAX_CONTENT_LEN) : null;
    } catch (error) {
        return null;
    }
};

const enrichResults = async (
    results: WebSearchResult[],
    config: WebSearchConfig,
    fetchContent: boolean
) => {
    if (!fetchContent) return results;

    const enriched: WebSearchResult[] = [];
    for (const item of results) {
        let content = "";
        let provider = "";

        if (config.use_firecrawl) {
            content = (await fetchFromFirecrawl(item.url, config)) || "";
            if (content) provider = "firecrawl";
        }
        if (!content && config.use_jina) {
            content = (await fetchFromJina(item.url, config)) || "";
            if (content) provider = "jina";
        }

        enriched.push({
            ...item,
            content: content || item.content,
            metadata: {
                ...item.metadata,
                content_provider: provider || item.metadata?.provider,
            },
        });
    }

    return enriched;
};

export async function runWebSearch(
    request: WebSearchRequest
): Promise<{ query: string; results: WebSearchResult[] }> {
    const config = await resolveConfig();
    if (!config.enabled) {
        throw new Error("Web search is disabled");
    }

    const project = await Project.findById(request.projectId).lean();
    if (!project) {
        throw new Error("Project not found");
    }

    const { schoolName, region } = extractSchoolInfo(
        project,
        request.stageId,
        request.formData
    );
    if (!schoolName) {
        throw new Error("请先填写学校名称（Q1）后再进行网络搜索");
    }
    const query = buildSearchQuery({
        stageId: request.stageId,
        query: request.query,
        schoolName,
        region,
        input: request.formData || project?.stages?.[request.stageId]?.input,
    });

    const topK = normalizeMaxK(request.topK, config.max_k);
    const organicResults = await serperSearch(query, config, topK);

    const normalized = organicResults
        .map((item: any, idx: number) => {
            const url = item.link || item.url || "";
            const title = item.title || item.name || url;
            const snippet = item.snippet || item.description || "";
            const domain = (() => {
                try {
                    return url ? new URL(url).hostname : "";
                } catch {
                    return "";
                }
            })();
            const score = topK > 0 ? Math.max(0, 1 - idx / topK) : undefined;
            return {
                id: `web_${idx + 1}`,
                title,
                url,
                snippet,
                content: snippet,
                score,
                source: "Web",
                metadata: {
                    provider: "serper",
                    position: idx + 1,
                    domain,
                    published_at: item.date || "",
                },
            } as WebSearchResult;
        })
        .filter((item) => item.url && item.title);

    const deduped = Array.from(
        new Map(normalized.map((item) => [item.url, item])).values()
    );

    const fetchContent = request.fetchContent !== false;
    const results = await enrichResults(deduped, config, fetchContent);

    return { query, results };
}

export default runWebSearch;

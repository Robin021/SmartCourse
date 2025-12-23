import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import SystemConfig from "@/models/SystemConfig";

const MASKED_VALUE = "********";

const DEFAULT_WEB_SEARCH = {
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

const normalizeMaxK = (value: any) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return DEFAULT_WEB_SEARCH.max_k;
    return Math.min(20, Math.max(1, Math.floor(parsed)));
};

const maskConfig = (config: typeof DEFAULT_WEB_SEARCH) => ({
    ...config,
    serper_api_key: config.serper_api_key ? MASKED_VALUE : "",
    firecrawl_api_key: config.firecrawl_api_key ? MASKED_VALUE : "",
    jina_api_key: config.jina_api_key ? MASKED_VALUE : "",
});

const resolveMaskedKey = (incoming: any, existing: string) => {
    if (incoming === undefined) return existing;
    if (incoming === MASKED_VALUE) return existing;
    if (incoming === null) return "";
    return typeof incoming === "string" ? incoming : existing;
};

export async function GET() {
    try {
        await connectDB();
        const config = await SystemConfig.findOne().sort({ createdAt: -1 });
        const raw =
            (config?.web_search && { ...config.web_search }) || DEFAULT_WEB_SEARCH;
        const normalized = {
            ...DEFAULT_WEB_SEARCH,
            ...raw,
            max_k: normalizeMaxK(raw.max_k),
        };

        return NextResponse.json({
            success: true,
            web_search: maskConfig(normalized),
        });
    } catch (error) {
        console.error("Get web search config error:", error);
        return NextResponse.json(
            { error: "Failed to fetch configuration" },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        await connectDB();
        const { web_search: incoming } = await req.json();

        if (!incoming || typeof incoming !== "object") {
            return NextResponse.json(
                { error: "web_search payload is required" },
                { status: 400 }
            );
        }

        let config = await SystemConfig.findOne().sort({ createdAt: -1 });
        if (!config) {
            config = new SystemConfig({ llm_providers: [], storage_providers: [] });
        }

        const current =
            (config.web_search && { ...config.web_search }) || DEFAULT_WEB_SEARCH;

        const normalized = {
            ...current,
            enabled:
                typeof incoming.enabled === "boolean"
                    ? incoming.enabled
                    : current.enabled,
            max_k:
                incoming.max_k !== undefined
                    ? normalizeMaxK(incoming.max_k)
                    : normalizeMaxK(current.max_k),
            language:
                typeof incoming.language === "string"
                    ? incoming.language
                    : current.language,
            region:
                typeof incoming.region === "string" ? incoming.region : current.region,
            use_firecrawl:
                typeof incoming.use_firecrawl === "boolean"
                    ? incoming.use_firecrawl
                    : current.use_firecrawl,
            use_jina:
                typeof incoming.use_jina === "boolean"
                    ? incoming.use_jina
                    : current.use_jina,
            serper_api_key: resolveMaskedKey(
                incoming.serper_api_key,
                current.serper_api_key
            ),
            firecrawl_api_key: resolveMaskedKey(
                incoming.firecrawl_api_key,
                current.firecrawl_api_key
            ),
            jina_api_key: resolveMaskedKey(
                incoming.jina_api_key,
                current.jina_api_key
            ),
        };

        config.web_search = normalized as any;
        config.markModified("web_search");
        await config.save();

        return NextResponse.json({
            success: true,
            web_search: maskConfig(normalized),
        });
    } catch (error) {
        console.error("Save web search config error:", error);
        return NextResponse.json(
            { error: "Failed to save configuration" },
            { status: 500 }
        );
    }
}

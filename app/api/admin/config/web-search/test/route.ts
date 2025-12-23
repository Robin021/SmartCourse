import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import SystemConfig, { IWebSearchConfig } from "@/models/SystemConfig";

const MASKED_VALUE = "********";
const SERPER_ENDPOINT = "https://google.serper.dev/search";
const FIRECRAWL_ENDPOINT = "https://api.firecrawl.dev/v1/scrape";
const JINA_ENDPOINT = "https://r.jina.ai/http://example.com";

type ProviderStatus = "ok" | "error" | "missing" | "skipped";

interface ProviderResult {
    status: ProviderStatus;
    message: string;
}

const resolveKey = (incoming: any, stored: string | undefined) => {
    if (incoming === "") return "";
    if (incoming === MASKED_VALUE) return stored || "";
    if (typeof incoming === "string") return incoming;
    return stored || "";
};

const fetchWithTimeout = async (
    url: string,
    options: RequestInit,
    timeoutMs = 10000
) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timeout);
    }
};

const formatOk = (latencyMs: number) => `OK (${latencyMs}ms)`;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const incoming = body?.web_search || {};

        await connectDB();
        const config = await SystemConfig.findOne().sort({ createdAt: -1 });
        const stored = (config?.web_search || {}) as Partial<IWebSearchConfig>;

        const serperKey = resolveKey(incoming.serper_api_key, stored.serper_api_key);
        const firecrawlKey = resolveKey(
            incoming.firecrawl_api_key,
            stored.firecrawl_api_key
        );
        const jinaKey = resolveKey(incoming.jina_api_key, stored.jina_api_key);

        const useFirecrawl =
            typeof incoming.use_firecrawl === "boolean"
                ? incoming.use_firecrawl
                : stored.use_firecrawl ?? true;
        const useJina =
            typeof incoming.use_jina === "boolean"
                ? incoming.use_jina
                : stored.use_jina ?? true;

        const results: Record<string, ProviderResult> = {
            serper: { status: "missing", message: "Missing key" },
            firecrawl: { status: "missing", message: "Missing key" },
            jina: { status: "missing", message: "Missing key" },
        };

        // Serper
        if (serperKey) {
            const started = Date.now();
            const response = await fetchWithTimeout(
                SERPER_ENDPOINT,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-API-KEY": serperKey,
                    },
                    body: JSON.stringify({
                        q: "education policy",
                        num: 1,
                    }),
                },
                10000
            );

            const latency = Date.now() - started;
            if (!response.ok) {
                const text = await response.text();
                results.serper = {
                    status: "error",
                    message: text || response.statusText || "Request failed",
                };
            } else {
                results.serper = { status: "ok", message: formatOk(latency) };
            }
        }

        // Firecrawl
        if (!useFirecrawl) {
            results.firecrawl = { status: "skipped", message: "Disabled" };
        } else if (firecrawlKey) {
            const started = Date.now();
            const response = await fetchWithTimeout(
                FIRECRAWL_ENDPOINT,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${firecrawlKey}`,
                    },
                    body: JSON.stringify({
                        url: "https://example.com",
                        formats: ["markdown"],
                    }),
                },
                12000
            );

            const latency = Date.now() - started;
            const text = await response.text();
            let parsed: any = null;
            try {
                parsed = text ? JSON.parse(text) : null;
            } catch {
                parsed = null;
            }

            if (!response.ok || parsed?.success === false) {
                results.firecrawl = {
                    status: "error",
                    message:
                        parsed?.error ||
                        parsed?.message ||
                        response.statusText ||
                        "Request failed",
                };
            } else {
                results.firecrawl = { status: "ok", message: formatOk(latency) };
            }
        }

        // Jina
        if (!useJina) {
            results.jina = { status: "skipped", message: "Disabled" };
        } else if (jinaKey) {
            const started = Date.now();
            const response = await fetchWithTimeout(
                JINA_ENDPOINT,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${jinaKey}`,
                    },
                },
                10000
            );

            const latency = Date.now() - started;
            if (!response.ok) {
                const text = await response.text();
                results.jina = {
                    status: "error",
                    message: text || response.statusText || "Request failed",
                };
            } else {
                results.jina = { status: "ok", message: formatOk(latency) };
            }
        }

        return NextResponse.json({ success: true, results });
    } catch (error: any) {
        const message =
            error?.name === "AbortError" ? "Request timed out" : error?.message || "Test failed";
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

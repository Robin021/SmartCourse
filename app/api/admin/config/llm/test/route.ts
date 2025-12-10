import { NextResponse } from "next/server";

interface TestRequestBody {
    base_url: string;
    api_key: string;
    model: string;
    type: "chat" | "embedding";
}

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as Partial<TestRequestBody>;
        const { base_url, api_key, model, type } = body;

        if (!base_url || !api_key || !model || !type) {
            return NextResponse.json(
                { success: false, error: "base_url, api_key, model, type are required" },
                { status: 400 }
            );
        }

        const isChat = type === "chat";
        const url = buildUrl(base_url, isChat);

        const payload = isChat
            ? {
                  model,
                  messages: [
                      { role: "system", content: "You are a helpful assistant." },
                      { role: "user", content: "ping" },
                  ],
                  stream: false,
              }
            : {
                  model,
                  input: ["ping"],
              };

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const started = Date.now();
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${api_key}`,
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
        }).finally(() => clearTimeout(timeout));

        const text = await response.text();
        let data: any = {};
        try {
            data = text ? JSON.parse(text) : {};
        } catch {
            // ignore parse errors
        }

        if (!response.ok) {
            const msg = data?.error?.message || data?.message || response.statusText || "Unknown error";
            return NextResponse.json(
                { success: false, error: msg, status: response.status },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            latency_ms: Date.now() - started,
            status: response.status,
        });
    } catch (error: any) {
        const message = error?.name === "AbortError" ? "Request timed out" : error?.message || "Test failed";
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

function buildUrl(baseUrl: string, isChat: boolean): string {
    const clean = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    if (isChat) {
        return clean.includes("/v1") ? `${clean}/chat/completions` : `${clean}/v1/chat/completions`;
    }
    // embedding
    if (clean.includes("/v1")) {
        return `${clean}/embeddings`;
    }
    return `${clean}/v1/embeddings`;
}

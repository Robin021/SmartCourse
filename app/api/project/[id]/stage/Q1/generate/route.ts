/**
 * Q1 Stage Generation API
 * 
 * POST /api/project/:id/stage/Q1/generate
 * 
 * Generates 《学校课程资源分析》 based on SWOT input.
 * Based on Requirements 1.3, 1.4, 1.7
 */

import { NextRequest, NextResponse } from "next/server";
import { q1GenerationService } from "@/lib/q1";
import { stageService } from "@/lib/stage";

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await context.params;
        const body = await request.json();
        const { searchParams } = new URL(request.url);
        const shouldStream = searchParams.get("stream") === "1";
        
        const { formData, schoolInfo, conversationHistory, useRag } = body;

        if (!formData) {
            return NextResponse.json(
                { success: false, error: "Form data is required" },
                { status: 400 }
            );
        }

        // Save input first (Requirements 1.2)
        await stageService.saveStageInput(projectId, "Q1", formData);

        const run = async (onToken?: (chunk: string) => void) => {
            const result = await q1GenerationService.generate({
                projectId,
                formData,
                schoolInfo,
                conversationHistory,
                useRag,
                stream: shouldStream,
                onToken,
            });

            return {
                success: true,
                report: result.content,
                swotAnalysis: result.swotAnalysis,
                validation: result.validation,
                ragResults: result.ragResults,
                metadata: result.metadata,
            };
        };

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                const send = (data: any) => {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
                };

                try {
                    send({ event: "start", message: "开始生成..." });

                    const timeoutMs = shouldStream ? 120000 : 45000;
                    const payload = await new Promise<any>((resolve, reject) => {
                        let timeoutId: ReturnType<typeof setTimeout> | null = null;
                        const resetTimeout = () => {
                            if (timeoutId) clearTimeout(timeoutId);
                            timeoutId = setTimeout(
                                () => reject(new Error("生成超时，请稍后重试")),
                                timeoutMs
                            );
                        };

                        const onToken = shouldStream
                            ? (chunk: string) => {
                                  resetTimeout();
                                  send({ event: "token", content: chunk });
                              }
                            : undefined;

                        resetTimeout();
                        run(onToken)
                            .then((res) => {
                                if (timeoutId) clearTimeout(timeoutId);
                                resolve(res);
                            })
                            .catch((err) => {
                                if (timeoutId) clearTimeout(timeoutId);
                                reject(err);
                            });
                    });

                    send({ event: "done", ...(payload as any) });
                    controller.close();
                } catch (err: any) {
                    send({ event: "error", message: err.message || "Generation failed" });
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
                "X-Accel-Buffering": "no",
            },
        });
    } catch (error) {
        console.error("[Q1 Generate API] Error:", error);
        
        const errorMessage = error instanceof Error 
            ? error.message 
            : "Generation failed";
        
        return NextResponse.json(
            { success: false, error: errorMessage },
            { status: 500 }
        );
    }
}

/**
 * GET /api/project/:id/stage/Q1/generate
 * 
 * Get current Q1 stage data
 */
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await context.params;
        
        const stageData = await stageService.getStageData(projectId, "Q1");
        
        return NextResponse.json({
            success: true,
            data: stageData,
        });
    } catch (error) {
        console.error("[Q1 Generate API] GET Error:", error);
        
        const errorMessage = error instanceof Error 
            ? error.message 
            : "Failed to get stage data";
        
        return NextResponse.json(
            { success: false, error: errorMessage },
            { status: 500 }
        );
    }
}

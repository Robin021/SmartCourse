import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { q1GenerationService } from "@/lib/q1";
import { q2GenerationService } from "@/lib/q2";
import { q3GenerationService } from "@/lib/q3";
import { q4GenerationService } from "@/lib/q4";
import { q5GenerationService } from "@/lib/q5";
import { q6GenerationService } from "@/lib/q6";
import { q7GenerationService } from "@/lib/q7";
import { q8GenerationService } from "@/lib/q8";
import { q9GenerationService } from "@/lib/q9";
import { q10GenerationService } from "@/lib/q10";

export async function POST(
    req: Request,
    context: { params: Promise<{ id: string; stageId: string }> }
) {
    const { id: projectId, stageId } = await context.params;

    try {
        const { formData, conversationHistory, useRag } = await req.json();
        const { searchParams } = new URL(req.url);
        const shouldStream = searchParams.get("stream") === "1";
        await connectDB();

        const runGeneration = async (onToken?: (chunk: string) => void) => {
            if (stageId === "Q1") {
                const result = await q1GenerationService.generate({
                    projectId,
                    formData: formData || {},
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
            }

            if (stageId === "Q2") {
                const result = await q2GenerationService.generate({
                    projectId,
                    formData: formData || {},
                    conversationHistory,
                    useRag,
                    stream: shouldStream,
                    onToken,
                });
                return {
                    success: true,
                    report: result.report,
                    keywords: result.keywords,
                    theoryFitScore: result.theoryFitScore,
                    ragResults: result.ragResults,
                    validation: result.validation,
                    metadata: result.metadata,
                };
            }

            if (stageId === "Q3") {
                const result = await q3GenerationService.generate({
                    projectId,
                    formData: formData || {},
                    conversationHistory,
                    useRag,
                    stream: shouldStream,
                    onToken,
                });
                return {
                    success: true,
                    report: result.report,
                    keywords: result.keywords,
                    coreConcept: result.coreConcept,
                    positive: result.positive,
                    suggestions: result.suggestions,
                    ragResults: result.ragResults,
                    metadata: result.metadata,
                };
            }

            if (stageId === "Q4") {
                const result = await q4GenerationService.generate({
                    projectId,
                    formData: formData || {},
                    conversationHistory,
                    useRag,
                    stream: shouldStream,
                    onToken,
                });
                return {
                    success: true,
                    report: result.report,
                    keywords: result.keywords,
                    coverage: result.coverage,
                    suggestions: result.validation.suggestions,
                    ragResults: result.ragResults,
                    metadata: result.metadata,
                };
            }

            if (stageId === "Q5") {
                const result = await q5GenerationService.generate({
                    projectId,
                    formData: formData || {},
                    conversationHistory,
                    useRag,
                    stream: shouldStream,
                    onToken,
                });
                return {
                    success: true,
                    report: result.report,
                    keywords: result.keywords,
                    nameSuggestion: result.nameSuggestion,
                    tagline: result.tagline,
                    suitability: result.suitability,
                    suggestions: result.validation.suggestions,
                    ragResults: result.ragResults,
                    metadata: result.metadata,
                };
            }

            if (stageId === "Q6") {
                const result = await q6GenerationService.generate({
                    projectId,
                    formData: formData || {},
                    conversationHistory,
                    useRag,
                    stream: shouldStream,
                    onToken,
                });
                return {
                    success: true,
                    report: result.report,
                    keywords: result.keywords,
                    consistency: result.consistency,
                    suggestions: result.validation.suggestions,
                    ragResults: result.ragResults,
                    metadata: result.metadata,
                };
            }

            if (stageId === "Q7") {
                const result = await q7GenerationService.generate({
                    projectId,
                    formData: formData || {},
                    conversationHistory,
                    useRag,
                    stream: shouldStream,
                    onToken,
                });
                return {
                    success: true,
                    report: result.report,
                    keywords: result.keywords,
                    gapAnalysis: result.gapAnalysis,
                    suggestions: result.validation.suggestions,
                    ragResults: result.ragResults,
                    metadata: result.metadata,
                };
            }

            if (stageId === "Q8") {
                const result = await q8GenerationService.generate({
                    projectId,
                    formData: formData || {},
                    conversationHistory,
                    useRag,
                    stream: shouldStream,
                    onToken,
                });
                return {
                    success: true,
                    report: result.report,
                    keywords: result.keywords,
                    structureScore: result.structureScore,
                    suggestions: result.validation.suggestions,
                    ragResults: result.ragResults,
                    metadata: result.metadata,
                };
            }

            if (stageId === "Q9") {
                const result = await q9GenerationService.generate({
                    projectId,
                    formData: formData || {},
                    conversationHistory,
                    useRag,
                    stream: shouldStream,
                    onToken,
                });
                return {
                    success: true,
                    report: result.report,
                    keywords: result.keywords,
                    feasibility: result.feasibility,
                    suggestions: result.validation.suggestions,
                    ragResults: result.ragResults,
                    metadata: result.metadata,
                };
            }

            if (stageId === "Q10") {
                const result = await q10GenerationService.generate({
                    projectId,
                    formData: formData || {},
                    conversationHistory,
                    useRag,
                    stream: shouldStream,
                    onToken,
                });
                return {
                    success: true,
                    report: result.report,
                    keywords: result.keywords,
                    evaluationScore: result.evaluationScore,
                    suggestions: result.validation.suggestions,
                    ragResults: result.ragResults,
                    metadata: result.metadata,
                };
            }

            throw new Error(`Stage ${stageId} generation is not implemented yet.`);
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
                        runGeneration(onToken)
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
    } catch (error: any) {
        console.error("[Stage Generate] Error:", error);
        return NextResponse.json(
            { error: error.message || "Generation failed" },
            { status: 500 }
        );
    }
}

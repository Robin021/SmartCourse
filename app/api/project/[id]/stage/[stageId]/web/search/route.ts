import { NextResponse } from "next/server";
import { runWebSearch } from "@/lib/webSearch";

export async function POST(
    req: Request,
    context: { params: Promise<{ id: string; stageId: string }> }
) {
    try {
        const { id: projectId, stageId } = await context.params;
        const { query, top_k, fetch_content, formData } = await req.json();

        if (!projectId || !stageId) {
            return NextResponse.json(
                { success: false, error: "Project ID and stage ID are required" },
                { status: 400 }
            );
        }

        const result = await runWebSearch({
            projectId,
            stageId,
            query,
            topK: top_k,
            fetchContent: fetch_content,
            formData,
        });

        return NextResponse.json({
            success: true,
            query: result.query,
            results: result.results,
            total: result.results.length,
        });
    } catch (error: any) {
        console.error("[Web Search] Error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Web search failed" },
            { status: 500 }
        );
    }
}

import { NextResponse } from "next/server";
import { retryFailedDocuments, processDocument } from "@/lib/processDocument";

/**
 * POST /api/admin/kb/retry
 * 重试处理失败的文档
 */
export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));
        const { document_id, max_attempts = 5 } = body;

        // 如果指定了单个文档，只重试这个
        if (document_id) {
            const result = await processDocument(document_id);
            
            if (result.success) {
                return NextResponse.json({
                    ...result,
                    success: true,
                    message: `Document reprocessed successfully (${result.chunkCount} chunks)`,
                });
            } else {
                return NextResponse.json({
                    ...result,
                    success: false,
                    message: `Retry failed: ${result.error}`,
                });
            }
        }

        // 否则重试所有失败的文档
        const result = await retryFailedDocuments(max_attempts);

        return NextResponse.json({
            ...result,
            success: true,
            message: `Retried ${result.retried} documents: ${result.succeeded} succeeded, ${result.stillFailed} still failed`,
        });
    } catch (error: any) {
        console.error("[Retry] Error:", error);
        return NextResponse.json(
            { error: error.message || "Retry operation failed" },
            { status: 500 }
        );
    }
}




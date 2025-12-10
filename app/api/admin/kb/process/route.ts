import { NextResponse } from "next/server";
import { processDocument, processPendingDocuments } from "@/lib/processDocument";

export async function POST(req: Request) {
    try {
        const { document_id, process_all } = await req.json();

        if (process_all) {
            // Process all pending documents
            const result = await processPendingDocuments();
            return NextResponse.json({
                success: true,
                message: `Processed ${result.processed} documents, ${result.failed} failed`,
                ...result,
            });
        }

        if (!document_id) {
            return NextResponse.json(
                { error: "document_id is required" },
                { status: 400 }
            );
        }

        // Process single document
        const result = await processDocument(document_id);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || "Processing failed" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Document processed successfully",
            chunkCount: result.chunkCount,
        });
    } catch (error: any) {
        console.error("Process API error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to process document" },
            { status: 500 }
        );
    }
}

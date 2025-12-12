import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import { generateEmbedding } from "@/lib/embedding";
import { searchSimilar, initVectorDb } from "@/lib/vectorDb";

export async function POST(
    req: Request,
    context: { params: Promise<{ id: string; stageId: string }> }
) {
    try {
        const { stageId } = await context.params;
        const { query, top_k = 5 } = await req.json();

        if (!query || query.trim().length === 0) {
            return NextResponse.json(
                { error: "Query is required" },
                { status: 400 }
            );
        }

        await connectDB();

        // Initialize vector DB (creates table if not exists)
        try {
            await initVectorDb();
        } catch (e) {
            console.warn("[RAG] Vector DB init warning:", e);
        }

        // 1. Generate embedding for query
        let queryEmbedding: number[];
        try {
            queryEmbedding = await generateEmbedding(query);
        } catch (embeddingError: any) {
            console.error("[RAG] Embedding error:", embeddingError);
            // Fall back to mock results if embedding fails
            return NextResponse.json({
                success: true,
                results: getMockResults(),
                query,
                warning: "Embedding service unavailable, showing sample results",
            });
        }

        // 2. Search similar chunks in vector DB
        const chunks = await searchSimilar(queryEmbedding, top_k, {
            stageId,
        });

        if (chunks.length === 0) {
            return NextResponse.json({
                success: true,
                results: [],
                query,
                message: "No relevant documents found",
            });
        }

        // 3. Get document metadata from MongoDB
        const documentIds = Array.from(new Set(chunks.map((c) => c.document_id)));
        const documents = await DocumentModel.find({
            _id: { $in: documentIds },
        }).lean();

        const docMap = new Map(
            documents.map((d: any) => [d._id.toString(), d])
        );

        // 4. Format results
        const results = chunks.map((chunk) => {
            const doc = docMap.get(chunk.document_id);
            return {
                id: chunk.id.toString(),
                document_id: chunk.document_id,
                title: doc?.original_name || "Unknown Document",
                content: chunk.content,
                score: Math.round(chunk.score * 100) / 100,
                source: "Knowledge Base",
                chunk_index: chunk.chunk_index,
                metadata: chunk.metadata,
            };
        });

        return NextResponse.json({
            success: true,
            results,
            query,
            total: chunks.length,
        });
    } catch (error: any) {
        console.error("[RAG] Search error:", error);
        return NextResponse.json(
            { error: error.message || "Search failed" },
            { status: 500 }
        );
    }
}

/**
 * Mock results for fallback when embedding service is unavailable
 */
function getMockResults() {
    return [
        {
            id: "mock_1",
            title: "National Education Reform 2025",
            content:
                "The new reform emphasizes holistic development (Five-Edu) and student-centered learning...",
            score: 0.92,
            source: "Sample Data",
        },
        {
            id: "mock_2",
            title: "Local Cultural Heritage Guide",
            content:
                "Our region is known for its rich history in ceramic arts and Confucian philosophy...",
            score: 0.88,
            source: "Sample Data",
        },
    ];
}

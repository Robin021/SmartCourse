import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import { updateChunkStageIds, initVectorDb } from "@/lib/vectorDb";

/**
 * POST /api/admin/kb/update-stages
 * 更新文档的 stage_ids（同时更新 MongoDB 和 pgvector）
 * 无需重新处理文档
 */
export async function POST(req: Request) {
    try {
        const { document_id, stage_ids } = await req.json();

        if (!document_id) {
            return NextResponse.json(
                { error: "document_id is required" },
                { status: 400 }
            );
        }

        if (!Array.isArray(stage_ids)) {
            return NextResponse.json(
                { error: "stage_ids must be an array" },
                { status: 400 }
            );
        }

        // 验证 stage_ids 格式
        const validStages = ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "Q7", "Q8", "Q9", "Q10"];
        const cleanedStageIds = stage_ids.filter(
            (s): s is string => typeof s === "string" && validStages.includes(s.toUpperCase())
        ).map(s => s.toUpperCase());

        await connectDB();
        await initVectorDb();

        // 1. 检查文档是否存在
        const doc = await DocumentModel.findById(document_id);
        if (!doc) {
            return NextResponse.json(
                { error: "Document not found" },
                { status: 404 }
            );
        }

        // 2. 更新 MongoDB
        await DocumentModel.findByIdAndUpdate(document_id, {
            stage_ids: cleanedStageIds,
        });

        // 3. 更新 pgvector chunks 的 metadata
        let updatedChunks = 0;
        if (doc.status === "processed" && doc.chunk_count > 0) {
            updatedChunks = await updateChunkStageIds(document_id, cleanedStageIds);
        }

        return NextResponse.json({
            success: true,
            message: `Updated stage_ids for document and ${updatedChunks} chunks`,
            document_id,
            stage_ids: cleanedStageIds,
            updatedChunks,
        });
    } catch (error: any) {
        console.error("[UpdateStages] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to update stage_ids" },
            { status: 500 }
        );
    }
}





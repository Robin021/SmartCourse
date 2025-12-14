import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import {
    checkDocumentHealth,
    findOrphanChunks,
    cleanupOrphanChunks,
    getVectorDbStats,
    initVectorDb,
    HealthCheckResult,
} from "@/lib/vectorDb";

/**
 * GET /api/admin/kb/health
 * 检查知识库数据一致性
 */
export async function GET() {
    try {
        await connectDB();
        await initVectorDb();

        // 1. 获取所有已处理的文档
        const documents = await DocumentModel.find({ status: "processed" }).lean();

        // 2. 检查每个文档的健康状态
        const healthResults: HealthCheckResult[] = [];
        let healthyCount = 0;
        let mismatchCount = 0;

        for (const doc of documents) {
            const result = await checkDocumentHealth(
                doc._id.toString(),
                (doc as any).chunk_count || 0
            );
            healthResults.push(result);
            
            if (result.healthy) {
                healthyCount++;
            }
            if (result.mismatch) {
                mismatchCount++;
            }
        }

        // 3. 查找孤儿 chunks（pgvector 中有但 MongoDB 中没有的）
        const allPgDocIds = await findOrphanChunks();
        const mongoDocIds = new Set(documents.map(d => d._id.toString()));
        const orphanDocIds = allPgDocIds.filter(id => !mongoDocIds.has(id));

        // 4. 获取向量库统计
        const stats = await getVectorDbStats();

        // 5. 统计各状态的文档数
        const statusCounts = await DocumentModel.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } },
        ]);

        const statusMap: Record<string, number> = {};
        for (const s of statusCounts) {
            statusMap[s._id] = s.count;
        }

        return NextResponse.json({
            success: true,
            health: {
                overall: mismatchCount === 0 && orphanDocIds.length === 0 ? "healthy" : "issues_found",
                totalDocuments: documents.length,
                healthyDocuments: healthyCount,
                mismatchedDocuments: mismatchCount,
                orphanChunkSets: orphanDocIds.length,
            },
            stats: {
                ...stats,
                documentsByStatus: statusMap,
            },
            issues: {
                mismatches: healthResults.filter(r => r.mismatch),
                orphans: orphanDocIds,
            },
        });
    } catch (error: any) {
        console.error("[Health] Error:", error);
        return NextResponse.json(
            { error: error.message || "Health check failed" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/admin/kb/health
 * 修复数据一致性问题
 */
export async function POST(req: Request) {
    try {
        const { action, documentIds } = await req.json();

        if (action === "cleanup_orphans") {
            // 清理孤儿 chunks
            await connectDB();
            await initVectorDb();
            
            const allPgDocIds = await findOrphanChunks();
            const documents = await DocumentModel.find({}, { _id: 1 }).lean();
            const mongoDocIds = new Set(documents.map(d => d._id.toString()));
            const orphanDocIds = allPgDocIds.filter(id => !mongoDocIds.has(id));

            let cleanedCount = 0;
            for (const docId of orphanDocIds) {
                const count = await cleanupOrphanChunks(docId);
                cleanedCount += count;
            }

            return NextResponse.json({
                success: true,
                message: `Cleaned up ${cleanedCount} orphan chunks from ${orphanDocIds.length} document sets`,
                orphanDocIds,
            });
        }

        if (action === "reprocess" && Array.isArray(documentIds)) {
            // 重新处理指定文档
            await connectDB();
            
            const updated = await DocumentModel.updateMany(
                { _id: { $in: documentIds } },
                { 
                    $set: { 
                        status: "pending",
                        error_message: null,
                    } 
                }
            );

            return NextResponse.json({
                success: true,
                message: `Marked ${updated.modifiedCount} documents for reprocessing`,
            });
        }

        return NextResponse.json(
            { error: "Invalid action. Use 'cleanup_orphans' or 'reprocess'" },
            { status: 400 }
        );
    } catch (error: any) {
        console.error("[Health] Fix error:", error);
        return NextResponse.json(
            { error: error.message || "Fix operation failed" },
            { status: 500 }
        );
    }
}





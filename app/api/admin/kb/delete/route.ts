import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import SystemConfig from "@/models/SystemConfig";
import { deleteByDocumentId, initVectorDb, getChunkCount } from "@/lib/vectorDb";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import OSS from "ali-oss";
import { unlink } from "fs/promises";
import path from "path";

interface DeleteResult {
    storage: { success: boolean; error?: string };
    vector: { success: boolean; chunksDeleted: number; error?: string };
    mongo: { success: boolean; error?: string };
}

export async function DELETE(req: Request) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const documentId = searchParams.get("id");
        const force = searchParams.get("force") === "true";

        if (!documentId) {
            return NextResponse.json(
                { error: "Document ID is required" },
                { status: 400 }
            );
        }

        // 1. Find document
        const doc = await DocumentModel.findById(documentId);
        if (!doc) {
            // 如果 MongoDB 中没有但可能有孤儿 chunks
            if (force) {
                try {
                    await initVectorDb();
                    const chunksDeleted = await deleteByDocumentId(documentId);
                    return NextResponse.json({
                        success: true,
                        message: `Force deleted ${chunksDeleted} orphan chunks`,
                        partial: true,
                    });
                } catch (e: any) {
                    return NextResponse.json(
                        { error: `Force delete failed: ${e.message}` },
                        { status: 500 }
                    );
                }
            }
            return NextResponse.json(
                { error: "Document not found" },
                { status: 404 }
            );
        }

        // 跟踪每个步骤的结果
        const result: DeleteResult = {
            storage: { success: false },
            vector: { success: false, chunksDeleted: 0 },
            mongo: { success: false },
        };

        // 2. Get storage config
        const config = await SystemConfig.findOne().sort({ createdAt: -1 });
        const providers = config?.storage_providers || [];
        const activeProvider = providers.find((p: any) => p.is_active) || { provider: "local" };
        const storage = activeProvider as any;

        // 3. Delete from storage
        try {
            if (storage.provider === "local") {
                // Local storage
                const filePath = doc.s3_key.startsWith("/")
                    ? doc.s3_key
                    : path.join(process.cwd(), "uploads", doc.filename);
                await unlink(filePath);
            } else if (storage.provider === "aliyun") {
                // Aliyun OSS
                const client = new OSS({
                    region: storage.region,
                    accessKeyId: storage.access_key,
                    accessKeySecret: storage.secret_key,
                    bucket: storage.bucket,
                    secure: true,
                });
                await client.delete(doc.s3_key);
            } else {
                // S3 / MinIO
                const s3Client = new S3Client({
                    region: storage.region || "us-east-1",
                    endpoint: storage.endpoint,
                    credentials: {
                        accessKeyId: storage.access_key,
                        secretAccessKey: storage.secret_key,
                    },
                    forcePathStyle: true,
                });
                await s3Client.send(
                    new DeleteObjectCommand({
                        Bucket: storage.bucket,
                        Key: doc.s3_key,
                    })
                );
            }
            result.storage.success = true;
        } catch (storageError: any) {
            result.storage.error = storageError.message;
            console.warn("[Delete] Storage delete warning:", storageError.message);
            // 继续执行，但记录错误
        }

        // 4. Delete from vector database
        try {
            await initVectorDb();
            const chunksDeleted = await deleteByDocumentId(documentId);
            result.vector.success = true;
            result.vector.chunksDeleted = chunksDeleted;
        } catch (vectorError: any) {
            result.vector.error = vectorError.message;
            console.warn("[Delete] Vector delete warning:", vectorError.message);
            // 继续执行，但记录错误
        }

        // 5. Delete from MongoDB (这是最关键的，必须成功)
        try {
            await DocumentModel.findByIdAndDelete(documentId);
            result.mongo.success = true;
        } catch (mongoError: any) {
            result.mongo.error = mongoError.message;
            console.error("[Delete] MongoDB delete error:", mongoError);
            
            // 如果 MongoDB 删除失败，这是严重错误
            return NextResponse.json({
                success: false,
                error: "Failed to delete document from database",
                partial: true,
                details: result,
            }, { status: 500 });
        }

        // 6. 检查是否有部分失败
        const hasWarnings = !result.storage.success || !result.vector.success;

        return NextResponse.json({
            success: true,
            message: hasWarnings 
                ? "Document deleted with warnings (some cleanup may have failed)"
                : "Document deleted successfully",
            partial: hasWarnings,
            details: result,
        });
    } catch (error: any) {
        console.error("[Delete] API error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to delete document" },
            { status: 500 }
        );
    }
}

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import SystemConfig from "@/models/SystemConfig";
import { deleteByDocumentId } from "@/lib/vectorDb";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import OSS from "ali-oss";
import { unlink } from "fs/promises";
import path from "path";

export async function DELETE(req: Request) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const documentId = searchParams.get("id");

        if (!documentId) {
            return NextResponse.json(
                { error: "Document ID is required" },
                { status: 400 }
            );
        }

        // 1. Find document
        const doc = await DocumentModel.findById(documentId);
        if (!doc) {
            return NextResponse.json(
                { error: "Document not found" },
                { status: 404 }
            );
        }

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
        } catch (storageError: any) {
            console.warn("Storage delete warning:", storageError.message);
            // Continue even if storage delete fails
        }

        // 4. Delete from vector database
        try {
            await deleteByDocumentId(documentId);
        } catch (vectorError: any) {
            console.warn("Vector delete warning:", vectorError.message);
            // Continue even if vector delete fails
        }

        // 5. Delete from MongoDB
        await DocumentModel.findByIdAndDelete(documentId);

        return NextResponse.json({
            success: true,
            message: "Document deleted successfully",
        });
    } catch (error: any) {
        console.error("Delete API error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to delete document" },
            { status: 500 }
        );
    }
}

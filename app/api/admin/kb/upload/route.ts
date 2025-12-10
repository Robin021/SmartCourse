import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import SystemConfig from "@/models/SystemConfig";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import OSS from "ali-oss";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: Request) {
    try {
        await connectDB();
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const stageIdsRaw = formData.get("stage_ids") as string | null;

        if (!file) {
            return NextResponse.json(
                { error: "No file uploaded" },
                { status: 400 }
            );
        }

        // Fetch ACTIVE Storage Config
        const config = await SystemConfig.findOne().sort({ createdAt: -1 });
        const providers = config?.storage_providers || [];
        const activeProvider = providers.find((p: any) => p.is_active) || { provider: "local" };

        const storage = activeProvider as any; // Cast for easier access

        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
        let s3_key = "";

        if (storage.provider === "local") {
            // Local Storage
            const uploadDir = path.join(process.cwd(), "uploads");
            await mkdir(uploadDir, { recursive: true });
            const filePath = path.join(uploadDir, filename);
            await writeFile(filePath, buffer);
            s3_key = filePath; // For local, key is path

        } else if (storage.provider === "aliyun") {
            // Aliyun OSS Upload
            if (!storage.bucket || !storage.access_key || !storage.secret_key) {
                throw new Error("Aliyun storage missing credentials.");
            }

            const client = new OSS({
                region: storage.region,
                accessKeyId: storage.access_key,
                accessKeySecret: storage.secret_key,
                bucket: storage.bucket,
                secure: true,
            });

            s3_key = `documents/${filename}`;
            // Use put for simple upload
            await client.put(s3_key, buffer);

        } else {
            // S3 / MinIO
            if (!storage.bucket || !storage.access_key || !storage.secret_key) {
                throw new Error("Storage provider missing credentials.");
            }

            const s3Client = new S3Client({
                region: storage.region || "us-east-1",
                endpoint: storage.endpoint,
                credentials: {
                    accessKeyId: storage.access_key,
                    secretAccessKey: storage.secret_key,
                },
                forcePathStyle: true, // Needed for MinIO
            });

            s3_key = `documents/${filename}`;

            await s3Client.send(
                new PutObjectCommand({
                    Bucket: storage.bucket,
                    Key: s3_key,
                    Body: buffer,
                    ContentType: file.type,
                })
            );
        }

        let stage_ids: string[] = [];
        if (stageIdsRaw) {
            try {
                const parsed = JSON.parse(stageIdsRaw);
                if (Array.isArray(parsed)) {
                    stage_ids = parsed.filter((id) => typeof id === "string" && id.trim().length > 0);
                }
            } catch (e) {
                // Ignore parse errors; treat as no tags
            }
        }

        // Save Metadata to DB
        const doc = await DocumentModel.create({
            filename: filename,
            original_name: file.name,
            mime_type: file.type,
            size: file.size,
            s3_key: s3_key,
            status: "pending",
            uploaded_by: "system", // TODO: Get from session
            stage_ids,
        });

        return NextResponse.json({ success: true, document: doc });
    } catch (error: any) {
        console.error("Upload error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to upload file" },
            { status: 500 }
        );
    }
}

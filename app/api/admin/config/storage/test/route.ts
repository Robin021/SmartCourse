import { NextResponse } from "next/server";
import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3";
import OSS from "ali-oss";
import connectDB from "@/lib/db";
import SystemConfig from "@/models/SystemConfig";

export async function POST(req: Request) {
    let storage: any;
    try {
        const body = await req.json();
        storage = body.storage;

        if (storage.provider === "local") {
            return NextResponse.json({
                success: true,
                message: "Local storage is always available.",
            });
        }

        // Resolve Masked Key
        if (storage.secret_key === "********") {
            if (storage._id) {
                await connectDB();
                const config = await SystemConfig.findOne().sort({ createdAt: -1 });
                const providers = config?.storage_providers || [];
                const savedProvider = providers.find((p: any) => p._id.toString() === storage._id);

                if (savedProvider && savedProvider.secret_key) {
                    storage.secret_key = savedProvider.secret_key;
                } else {
                    return NextResponse.json(
                        { error: "Original secret key not found. Please re-enter it." },
                        { status: 400 }
                    );
                }
            } else {
                return NextResponse.json(
                    { error: "Please enter the Secret Key." },
                    { status: 400 }
                );
            }
        }

        if (
            !storage.endpoint ||
            !storage.access_key ||
            !storage.secret_key
        ) {
            return NextResponse.json(
                { error: "Missing required storage credentials." },
                { status: 400 }
            );
        }

        if (storage.provider === "aliyun") {
            // Aliyun OSS Native Implementation
            // OSS Region format is usually 'oss-cn-hangzhou'

            try {
                const client = new OSS({
                    region: storage.region,
                    accessKeyId: storage.access_key,
                    accessKeySecret: storage.secret_key,
                    bucket: storage.bucket,
                    secure: true,
                });

                // Test connection by checking bucket info
                await client.getBucketInfo(storage.bucket);

                return NextResponse.json({
                    success: true,
                    message: `Successfully authenticated with Aliyun OSS bucket '${storage.bucket}'.`,
                });
            } catch (error: any) {
                console.error("Aliyun OSS Error:", error);
                let msg = "Aliyun connection failed.";
                if (error.code === "NoSuchBucket") msg = `Bucket '${storage.bucket}' does not exist.`;
                if (error.code === "InvalidAccessKeyId") msg = "Invalid Access Key ID.";
                if (error.code === "SignatureDoesNotMatch") msg = "Invalid Secret Key.";

                throw new Error(msg);
            }

        } else {
            // S3 / MinIO Implementation
            const s3Client = new S3Client({
                region: storage.region || "us-east-1",
                endpoint: storage.endpoint,
                credentials: {
                    accessKeyId: storage.access_key,
                    secretAccessKey: storage.secret_key,
                },
                forcePathStyle: true,
            });

            // 1. Test Single Bucket Access (Least Privilege)
            await s3Client.send(
                new HeadBucketCommand({
                    Bucket: storage.bucket,
                })
            );

            return NextResponse.json({
                success: true,
                message: `Successfully authenticated with ${storage.provider} bucket '${storage.bucket}'.`,
            });
        }
    } catch (error: any) {
        console.error("Storage test error:", error);

        let errorMessage = error.message;

        if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
            errorMessage = `Bucket '${storage?.bucket}' does not exist.`;
        } else if (error.name === "Forbidden" || error.$metadata?.httpStatusCode === 403) {
            errorMessage = `Access Denied to bucket '${storage?.bucket}'. Check your permissions.`;
        } else if (error.code === "ECONNREFUSED") {
            errorMessage = "Connection refused. Check your Endpoint URL.";
        } else if (error.toString().includes("InvalidAccessKeyId")) {
            errorMessage = "Invalid Access Key ID.";
        } else if (error.toString().includes("SignatureDoesNotMatch")) {
            errorMessage = "Invalid Secret Key (Signature mismatch).";
        }

        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}

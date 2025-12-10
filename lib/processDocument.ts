import { readFile, writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import SystemConfig from "@/models/SystemConfig";
import { generateEmbeddings } from "@/lib/embedding";
import { insertChunks, initVectorDb, deleteByDocumentId } from "@/lib/vectorDb";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import OSS from "ali-oss";

// Dynamic imports for optional dependencies
let pdfParse: any = null;
let mammoth: any = null;

async function loadPdfParse() {
    if (!pdfParse) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require("pdf-parse");
        // Handle both ESM default export and CJS module.exports
        pdfParse = mod.default || mod;
    }
    return pdfParse;
}

async function loadMammoth() {
    if (!mammoth) {
        mammoth = await import("mammoth");
    }
    return mammoth;
}

/**
 * Download file from cloud storage to temp location
 */
async function downloadFromStorage(s3Key: string, filename: string): Promise<string> {
    await connectDB();
    const config = await SystemConfig.findOne().sort({ createdAt: -1 });
    const providers = config?.storage_providers || [];
    const activeProvider = providers.find((p: any) => p.is_active);

    if (!activeProvider || activeProvider.provider === "local") {
        // Local storage - file should already be accessible
        const localPath = s3Key.startsWith("/") ? s3Key : path.join(process.cwd(), "uploads", filename);
        return localPath;
    }

    // Create temp directory
    const tempDir = path.join(process.cwd(), ".temp");
    await mkdir(tempDir, { recursive: true });
    const tempPath = path.join(tempDir, filename);

    const storage = activeProvider as any;

    if (storage.provider === "aliyun") {
        // Aliyun OSS download
        const client = new OSS({
            region: storage.region,
            accessKeyId: storage.access_key,
            accessKeySecret: storage.secret_key,
            bucket: storage.bucket,
            secure: true,
        });

        const result = await client.get(s3Key);
        if (result.content) {
            await writeFile(tempPath, result.content);
        }
    } else {
        // S3 / MinIO download
        const s3Client = new S3Client({
            region: storage.region || "us-east-1",
            endpoint: storage.endpoint,
            credentials: {
                accessKeyId: storage.access_key,
                secretAccessKey: storage.secret_key,
            },
            forcePathStyle: true,
        });

        const response = await s3Client.send(
            new GetObjectCommand({
                Bucket: storage.bucket,
                Key: s3Key,
            })
        );

        if (response.Body) {
            const chunks: Uint8Array[] = [];
            const reader = response.Body as any;
            for await (const chunk of reader) {
                chunks.push(chunk);
            }
            const buffer = Buffer.concat(chunks);
            await writeFile(tempPath, buffer);
        }
    }

    console.log(`[Process] Downloaded file to ${tempPath}`);
    return tempPath;
}

/**
 * Extract text from a file based on its mime type
 */
async function extractText(filePath: string, mimeType: string): Promise<string> {
    const buffer = await readFile(filePath);

    if (mimeType === "application/pdf") {
        const pdf = await loadPdfParse();
        const data = await pdf(buffer);
        return data.text;
    }

    if (
        mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        mimeType === "application/msword"
    ) {
        const mammothLib = await loadMammoth();
        const result = await mammothLib.extractRawText({ buffer });
        return result.value;
    }

    if (mimeType === "text/plain" || mimeType === "text/markdown") {
        return buffer.toString("utf-8");
    }

    throw new Error(`Unsupported file type: ${mimeType}`);
}

/**
 * Split text into chunks with overlap
 */
function splitIntoChunks(
    text: string,
    chunkSize: number = 500,
    overlap: number = 100
): string[] {
    const chunks: string[] = [];

    // Clean up text
    const cleanedText = text
        .replace(/\s+/g, " ")
        .trim();

    if (cleanedText.length <= chunkSize) {
        return [cleanedText];
    }

    let start = 0;
    while (start < cleanedText.length) {
        let end = start + chunkSize;

        // Try to break at sentence boundary
        if (end < cleanedText.length) {
            const lastPeriod = cleanedText.lastIndexOf(".", end);
            const lastNewline = cleanedText.lastIndexOf("\n", end);
            const breakPoint = Math.max(lastPeriod, lastNewline);

            if (breakPoint > start + chunkSize / 2) {
                end = breakPoint + 1;
            }
        }

        const chunk = cleanedText.slice(start, end).trim();
        if (chunk.length > 0) {
            chunks.push(chunk);
        }

        start = end - overlap;
        if (start >= cleanedText.length) break;
    }

    return chunks;
}

/**
 * Process a single document: extract text, chunk, embed, store
 */
export async function processDocument(documentId: string): Promise<{
    success: boolean;
    chunkCount?: number;
    error?: string;
}> {
    await connectDB();

    const doc = await DocumentModel.findById(documentId);
    if (!doc) {
        return { success: false, error: "Document not found" };
    }

    try {
        // Update status to processing
        await DocumentModel.findByIdAndUpdate(documentId, { status: "processing" as any });

        // 1. Download file from storage (handles local, S3, Aliyun)
        console.log(`[Process] Downloading file from storage...`);
        const filePath = await downloadFromStorage(doc.s3_key, doc.filename);
        const isCloudFile = !doc.s3_key.startsWith("/") && doc.s3_key !== filePath;

        // 2. Extract text
        console.log(`[Process] Extracting text from ${doc.original_name}`);
        const text = await extractText(filePath, doc.mime_type);

        if (!text || text.trim().length === 0) {
            throw new Error("No text content extracted from document");
        }

        // 3. Split into chunks
        console.log(`[Process] Splitting into chunks...`);
        const chunks = splitIntoChunks(text, 500, 100);
        console.log(`[Process] Created ${chunks.length} chunks`);

        // 4. Generate embeddings (batch)
        console.log(`[Process] Generating embeddings...`);

        // Process in batches of 20 to avoid API limits
        const BATCH_SIZE = 20;
        const allEmbeddings: number[][] = [];

        for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
            const batchChunks = chunks.slice(i, i + BATCH_SIZE);
            const batchEmbeddings = await generateEmbeddings(batchChunks);
            allEmbeddings.push(...batchEmbeddings);
        }

        // 5. Initialize vector DB and store chunks
        console.log(`[Process] Storing in vector database...`);
        await initVectorDb();

        // Delete existing chunks for this document (for reprocessing)
        await deleteByDocumentId(documentId);

        // Prepare chunks with embeddings
        const stageIds = Array.isArray((doc as any).stage_ids)
            ? (doc as any).stage_ids.filter((s: any) => typeof s === "string" && s.trim().length > 0)
            : [];

        const chunksWithEmbeddings = chunks.map((content, index) => {
            const metadata: Record<string, any> = {
                original_name: doc.original_name,
                chunk_index: index,
                total_chunks: chunks.length,
            };

            if (stageIds.length > 0) {
                metadata.stage_ids = stageIds;
            }

            return {
                content,
                embedding: allEmbeddings[index],
                metadata,
            };
        });

        await insertChunks(documentId, chunksWithEmbeddings);

        // 6. Cleanup temp file if downloaded from cloud
        if (isCloudFile) {
            try {
                await unlink(filePath);
                console.log(`[Process] Cleaned up temp file`);
            } catch (e) {
                // Ignore cleanup errors
            }
        }

        // 7. Update document status
        await DocumentModel.findByIdAndUpdate(documentId, {
            status: "processed",
            chunk_count: chunks.length,
        });

        console.log(`[Process] Successfully processed ${doc.original_name}`);

        return { success: true, chunkCount: chunks.length };
    } catch (error: any) {
        console.error(`[Process] Error processing document:`, error);

        await DocumentModel.findByIdAndUpdate(documentId, {
            status: "error",
        });

        return { success: false, error: error.message };
    }
}

/**
 * Process all pending documents
 */
export async function processPendingDocuments(): Promise<{
    processed: number;
    failed: number;
}> {
    await connectDB();

    const pendingDocs = await DocumentModel.find({ status: "pending" });
    let processed = 0;
    let failed = 0;

    for (const doc of pendingDocs) {
        const result = await processDocument(doc._id.toString());
        if (result.success) {
            processed++;
        } else {
            failed++;
        }
    }

    return { processed, failed };
}

import { readFile, writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import SystemConfig from "@/models/SystemConfig";
import { generateEmbeddings, EmbeddingError } from "@/lib/embedding";
import { insertChunks, initVectorDb, deleteByDocumentId, getChunkCount } from "@/lib/vectorDb";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import OSS from "ali-oss";

// 处理配置
export interface ProcessingConfig {
    chunkSize?: number;      // 默认 500
    chunkOverlap?: number;   // 默认 100
    maxRetries?: number;     // 默认 3
    batchSize?: number;      // embedding 批处理大小，默认 20
}

const DEFAULT_CONFIG: Required<ProcessingConfig> = {
    chunkSize: 500,
    chunkOverlap: 100,
    maxRetries: 3,
    batchSize: 20,
};

// 并发控制：同时处理的文档数
const processingDocuments = new Set<string>();
const MAX_CONCURRENT_PROCESSING = 3;

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
 * 智能分块策略
 * 优先按段落分割，然后在需要时按句子或字符分割
 */
function splitIntoChunks(
    text: string,
    chunkSize: number = 500,
    overlap: number = 100
): string[] {
    const chunks: string[] = [];
    
    // 1. 预处理：标准化空白字符，但保留段落结构
    const normalizedText = text
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/[ \t]+/g, " ")  // 合并连续空格，但保留换行
        .trim();

    if (normalizedText.length === 0) {
        return [];
    }

    if (normalizedText.length <= chunkSize) {
        return [normalizedText.replace(/\n+/g, " ").trim()];
    }

    // 2. 按段落分割（连续两个换行符）
    const paragraphs = normalizedText
        .split(/\n{2,}/)
        .map(p => p.replace(/\n/g, " ").trim())
        .filter(p => p.length > 0);

    // 3. 合并短段落，分割长段落
    let currentChunk = "";
    
    for (const paragraph of paragraphs) {
        // 如果段落本身就超过 chunkSize，需要进一步分割
        if (paragraph.length > chunkSize) {
            // 先保存当前累积的 chunk
            if (currentChunk.length > 0) {
                chunks.push(currentChunk.trim());
                // 保留 overlap 部分
                currentChunk = getOverlapText(currentChunk, overlap);
            }
            
            // 分割长段落
            const subChunks = splitLongParagraph(paragraph, chunkSize, overlap);
            chunks.push(...subChunks.slice(0, -1));
            
            // 最后一个子块作为下一轮的起点
            currentChunk = subChunks[subChunks.length - 1] || "";
        } else {
            // 尝试添加到当前 chunk
            const separator = currentChunk.length > 0 ? " " : "";
            const potentialChunk = currentChunk + separator + paragraph;
            
            if (potentialChunk.length <= chunkSize) {
                currentChunk = potentialChunk;
            } else {
                // 保存当前 chunk，开始新的
                if (currentChunk.length > 0) {
                    chunks.push(currentChunk.trim());
                }
                // 新 chunk 从 overlap + 当前段落开始
                const overlapText = getOverlapText(currentChunk, overlap);
                currentChunk = overlapText ? overlapText + " " + paragraph : paragraph;
            }
        }
    }

    // 保存最后一个 chunk
    if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
    }

    return chunks.filter(c => c.length > 0);
}

/**
 * 分割长段落（按句子边界）
 */
function splitLongParagraph(
    paragraph: string,
    chunkSize: number,
    overlap: number
): string[] {
    const chunks: string[] = [];
    
    // 按句子分割（支持中英文句号、问号、感叹号）
    const sentences = paragraph.split(/(?<=[。！？.!?])\s*/).filter(s => s.trim().length > 0);
    
    let currentChunk = "";
    
    for (const sentence of sentences) {
        const separator = currentChunk.length > 0 ? " " : "";
        const potentialChunk = currentChunk + separator + sentence;
        
        if (potentialChunk.length <= chunkSize) {
            currentChunk = potentialChunk;
        } else {
            // 如果单个句子就超过 chunkSize，强制按字符分割
            if (currentChunk.length === 0 && sentence.length > chunkSize) {
                const charChunks = splitByCharacters(sentence, chunkSize, overlap);
                chunks.push(...charChunks);
                continue;
            }
            
            if (currentChunk.length > 0) {
                chunks.push(currentChunk.trim());
            }
            currentChunk = getOverlapText(currentChunk, overlap);
            currentChunk = currentChunk ? currentChunk + " " + sentence : sentence;
        }
    }
    
    if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
    }
    
    return chunks;
}

/**
 * 按字符分割（最后手段）
 */
function splitByCharacters(
    text: string,
    chunkSize: number,
    overlap: number
): string[] {
    const chunks: string[] = [];
    let start = 0;
    
    while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        chunks.push(text.slice(start, end).trim());
        start = end - overlap;
        if (start >= text.length - overlap) break;
    }
    
    return chunks.filter(c => c.length > 0);
}

/**
 * 获取用于 overlap 的文本尾部
 */
function getOverlapText(text: string, overlapSize: number): string {
    if (text.length <= overlapSize) {
        return text;
    }
    return text.slice(-overlapSize).trim();
}

/**
 * Process a single document: extract text, chunk, embed, store
 * 支持重试机制和并发控制
 */
export async function processDocument(
    documentId: string,
    config?: ProcessingConfig
): Promise<{
    success: boolean;
    chunkCount?: number;
    error?: string;
    attempts?: number;
}> {
    await connectDB();

    const doc = await DocumentModel.findById(documentId);
    if (!doc) {
        return { success: false, error: "Document not found" };
    }

    // 并发控制检查
    if (processingDocuments.has(documentId)) {
        return { success: false, error: "Document is already being processed" };
    }
    
    if (processingDocuments.size >= MAX_CONCURRENT_PROCESSING) {
        return { success: false, error: `Too many documents processing (max: ${MAX_CONCURRENT_PROCESSING}). Please wait.` };
    }

    // 合并配置
    const cfg: Required<ProcessingConfig> = {
        ...DEFAULT_CONFIG,
        ...config,
        // 文档级别配置优先
        chunkSize: (doc as any).chunk_size || config?.chunkSize || DEFAULT_CONFIG.chunkSize,
        chunkOverlap: (doc as any).chunk_overlap || config?.chunkOverlap || DEFAULT_CONFIG.chunkOverlap,
    };

    const currentAttempts = ((doc as any).processing_attempts || 0) + 1;
    let filePath: string | null = null;
    let isCloudFile = false;

    try {
        // 标记开始处理
        processingDocuments.add(documentId);
        
        // Update status to processing
        await DocumentModel.findByIdAndUpdate(documentId, { 
            status: "processing" as any,
            processing_attempts: currentAttempts,
            error_message: null,  // 清除之前的错误
        });

        // 1. Download file from storage (handles local, S3, Aliyun)
        console.log(`[Process] Downloading file from storage... (attempt ${currentAttempts})`);
        filePath = await downloadFromStorage(doc.s3_key, doc.filename);
        isCloudFile = !doc.s3_key.startsWith("/") && doc.s3_key !== filePath;

        // 2. Extract text
        console.log(`[Process] Extracting text from ${doc.original_name}`);
        const text = await extractText(filePath, doc.mime_type);

        if (!text || text.trim().length === 0) {
            throw new Error("No text content extracted from document");
        }

        // 3. Split into chunks (使用配置的参数)
        console.log(`[Process] Splitting into chunks (size: ${cfg.chunkSize}, overlap: ${cfg.chunkOverlap})...`);
        const chunks = splitIntoChunks(text, cfg.chunkSize, cfg.chunkOverlap);
        console.log(`[Process] Created ${chunks.length} chunks`);

        if (chunks.length === 0) {
            throw new Error("No valid chunks created from document content");
        }

        // 4. Generate embeddings (batch with retry)
        console.log(`[Process] Generating embeddings...`);
        const allEmbeddings = await generateEmbeddingsWithRetry(chunks, cfg);

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

        // 6. Verify insertion
        const actualChunkCount = await getChunkCount(documentId);
        if (actualChunkCount !== chunks.length) {
            console.warn(`[Process] Chunk count mismatch: expected ${chunks.length}, got ${actualChunkCount}`);
        }

        // 7. Update document status
        await DocumentModel.findByIdAndUpdate(documentId, {
            status: "processed",
            chunk_count: actualChunkCount,
            last_processed_at: new Date(),
            error_message: null,
        });

        console.log(`[Process] Successfully processed ${doc.original_name} (${actualChunkCount} chunks)`);

        return { success: true, chunkCount: actualChunkCount, attempts: currentAttempts };
    } catch (error: any) {
        console.error(`[Process] Error processing document (attempt ${currentAttempts}):`, error);

        const errorMessage = error instanceof EmbeddingError 
            ? `Embedding error: ${error.message}`
            : error.message || "Unknown error";

        await DocumentModel.findByIdAndUpdate(documentId, {
            status: "error",
            error_message: errorMessage,
            last_processed_at: new Date(),
        });

        return { success: false, error: errorMessage, attempts: currentAttempts };
    } finally {
        // 清理并发标记
        processingDocuments.delete(documentId);
        
        // Cleanup temp file if downloaded from cloud
        if (isCloudFile && filePath) {
            try {
                await unlink(filePath);
                console.log(`[Process] Cleaned up temp file`);
            } catch (e) {
                // Ignore cleanup errors
            }
        }
    }
}

/**
 * 带重试的 embedding 生成
 * 使用更长的指数退避等待时间来处理网络不稳定
 */
async function generateEmbeddingsWithRetry(
    chunks: string[],
    config: Required<ProcessingConfig>
): Promise<number[][]> {
    const allEmbeddings: number[][] = [];
    const { batchSize, maxRetries } = config;

    for (let i = 0; i < chunks.length; i += batchSize) {
        const batchChunks = chunks.slice(i, i + batchSize);
        let batchEmbeddings: number[][] | null = null;
        let lastError: Error | null = null;
        const batchNum = Math.floor(i / batchSize) + 1;

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/17efb887-18fc-4865-bc2f-4d26d39f8f0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'processDocument.ts:generateEmbeddingsWithRetry',message:'Starting batch embedding',data:{batchNum,batchSize:batchChunks.length,totalChunks:chunks.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
        // #endregion

        // 重试逻辑
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                batchEmbeddings = await generateEmbeddings(batchChunks, { strictMode: true });
                break;  // 成功，跳出重试循环
            } catch (err: any) {
                lastError = err;
                const isNetworkError = err.message?.includes('ECONNRESET') || 
                                       err.message?.includes('fetch failed') ||
                                       err.message?.includes('Network error') ||
                                       err.message?.includes('timeout');
                
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/17efb887-18fc-4865-bc2f-4d26d39f8f0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'processDocument.ts:generateEmbeddingsWithRetry',message:'Batch failed',data:{batchNum,attempt,maxRetries,errorMessage:err.message,isNetworkError},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
                // #endregion
                
                console.warn(`[Process] Embedding batch ${batchNum} failed (attempt ${attempt}/${maxRetries}):`, err.message);
                
                if (attempt < maxRetries) {
                    // 更长的指数退避等待：3s, 9s, 27s（对于网络错误额外增加等待时间）
                    const baseWait = isNetworkError ? 5000 : 3000;
                    const waitMs = Math.min(baseWait * Math.pow(2, attempt - 1), 30000);
                    console.log(`[Process] Retrying in ${waitMs}ms... (network issue: ${isNetworkError})`);
                    await new Promise(resolve => setTimeout(resolve, waitMs));
                }
            }
        }

        if (!batchEmbeddings) {
            throw new EmbeddingError(
                `Failed to generate embeddings for batch ${batchNum} after ${maxRetries} attempts`,
                lastError || undefined
            );
        }

        allEmbeddings.push(...batchEmbeddings);
        
        // 进度日志
        const progress = Math.min(100, Math.round(((i + batchSize) / chunks.length) * 100));
        console.log(`[Process] Embedding progress: ${progress}%`);
        
        // 批次之间短暂等待，避免请求过于密集
        if (i + batchSize < chunks.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    return allEmbeddings;
}

/**
 * Process all pending documents
 */
export async function processPendingDocuments(config?: ProcessingConfig): Promise<{
    processed: number;
    failed: number;
    details: Array<{ id: string; name: string; success: boolean; error?: string }>;
}> {
    await connectDB();

    const pendingDocs = await DocumentModel.find({ status: "pending" });
    let processed = 0;
    let failed = 0;
    const details: Array<{ id: string; name: string; success: boolean; error?: string }> = [];

    for (const doc of pendingDocs) {
        const docId = doc._id.toString();
        const result = await processDocument(docId, config);
        
        if (result.success) {
            processed++;
            details.push({ id: docId, name: doc.original_name, success: true });
        } else {
            failed++;
            details.push({ id: docId, name: doc.original_name, success: false, error: result.error });
        }
    }

    return { processed, failed, details };
}

/**
 * 重试处理失败的文档
 */
export async function retryFailedDocuments(
    maxAttempts: number = 5,
    config?: ProcessingConfig
): Promise<{
    retried: number;
    succeeded: number;
    stillFailed: number;
}> {
    await connectDB();

    // 查找失败但未超过最大重试次数的文档
    const failedDocs = await DocumentModel.find({
        status: "error",
        processing_attempts: { $lt: maxAttempts },
    });

    let retried = 0;
    let succeeded = 0;
    let stillFailed = 0;

    for (const doc of failedDocs) {
        retried++;
        const result = await processDocument(doc._id.toString(), config);
        
        if (result.success) {
            succeeded++;
        } else {
            stillFailed++;
        }
    }

    return { retried, succeeded, stillFailed };
}

import { Pool } from "pg";

const POSTGRES_URL = process.env.POSTGRES_URL || "postgresql://username:password@localhost:5432/postgres";

let pool: Pool | null = null;

/**
 * Get PostgreSQL connection pool
 */
export function getPool(): Pool {
    if (!pool) {
        pool = new Pool({
            connectionString: POSTGRES_URL,
        });
    }
    return pool;
}

/**
 * Initialize vector database schema
 */
export async function initVectorDb(): Promise<void> {
    const client = await getPool().connect();
    try {
        // Enable pgvector extension
        await client.query("CREATE EXTENSION IF NOT EXISTS vector");

        // Create document_chunks table
        await client.query(`
            CREATE TABLE IF NOT EXISTS document_chunks (
                id SERIAL PRIMARY KEY,
                document_id VARCHAR(24) NOT NULL,
                chunk_index INTEGER NOT NULL,
                content TEXT NOT NULL,
                embedding vector(1536),
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(document_id, chunk_index)
            )
        `);

        // Create vector similarity search index (IVFFlat)
        // Only create if not exists
        const indexExists = await client.query(`
            SELECT 1 FROM pg_indexes 
            WHERE indexname = 'document_chunks_embedding_idx'
        `);

        if (indexExists.rows.length === 0) {
            // Need some data first for IVFFlat, so we'll use HNSW which works on empty tables
            await client.query(`
                CREATE INDEX document_chunks_embedding_idx 
                ON document_chunks 
                USING hnsw (embedding vector_cosine_ops)
            `);
        }

        console.log("[VectorDB] Schema initialized successfully");
    } finally {
        client.release();
    }
}

/**
 * Insert chunks with embeddings
 */
export async function insertChunks(
    documentId: string,
    chunks: Array<{
        content: string;
        embedding: number[];
        metadata?: Record<string, any>;
    }>
): Promise<void> {
    const client = await getPool().connect();
    try {
        await client.query("BEGIN");

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const embeddingStr = `[${chunk.embedding.join(",")}]`;

            await client.query(
                `INSERT INTO document_chunks (document_id, chunk_index, content, embedding, metadata)
                 VALUES ($1, $2, $3, $4::vector, $5)
                 ON CONFLICT (document_id, chunk_index) 
                 DO UPDATE SET content = $3, embedding = $4::vector, metadata = $5`,
                [
                    documentId,
                    i,
                    chunk.content,
                    embeddingStr,
                    JSON.stringify(chunk.metadata || {}),
                ]
            );
        }

        await client.query("COMMIT");
        console.log(`[VectorDB] Inserted ${chunks.length} chunks for document ${documentId}`);
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Search for similar chunks using vector similarity
 */
export async function searchSimilar(
    queryEmbedding: number[],
    topK: number = 5,
    options?: {
        documentIds?: string[];
        stageId?: string;
    }
): Promise<
    Array<{
        id: number;
        document_id: string;
        chunk_index: number;
        content: string;
        metadata: Record<string, any>;
        score: number;
    }>
> {
    const client = await getPool().connect();
    try {
        const embeddingStr = `[${queryEmbedding.join(",")}]`;

        let query = `
            SELECT 
                id,
                document_id,
                chunk_index,
                content,
                metadata,
                1 - (embedding <=> $1::vector) as score
            FROM document_chunks
        `;

        const params: any[] = [embeddingStr];
        const where: string[] = [];
        let paramIndex = 2;

        if (options?.documentIds && options.documentIds.length > 0) {
            where.push(`document_id = ANY($${paramIndex})`);
            params.push(options.documentIds);
            paramIndex++;
        }

        if (options?.stageId) {
            // If no stage_ids set (global) OR array contains stageId
            where.push(`((metadata -> 'stage_ids') IS NULL OR jsonb_array_length(COALESCE(metadata -> 'stage_ids', '[]'::jsonb)) = 0 OR (metadata -> 'stage_ids') ? $${paramIndex})`);
            params.push(options.stageId);
            paramIndex++;
        }

        if (where.length > 0) {
            query += " WHERE " + where.join(" AND ");
        }

        query += ` ORDER BY embedding <=> $1::vector LIMIT ${topK}`;

        const result = await client.query(query, params);

        return result.rows.map((row) => ({
            id: row.id,
            document_id: row.document_id,
            chunk_index: row.chunk_index,
            content: row.content,
            metadata: row.metadata,
            score: parseFloat(row.score),
        }));
    } finally {
        client.release();
    }
}

/**
 * Delete all chunks for a document
 */
export async function deleteByDocumentId(documentId: string): Promise<number> {
    const client = await getPool().connect();
    try {
        const result = await client.query(
            "DELETE FROM document_chunks WHERE document_id = $1",
            [documentId]
        );
        console.log(`[VectorDB] Deleted ${result.rowCount} chunks for document ${documentId}`);
        return result.rowCount || 0;
    } finally {
        client.release();
    }
}

/**
 * Get chunk count for a document
 */
export async function getChunkCount(documentId: string): Promise<number> {
    const client = await getPool().connect();
    try {
        const result = await client.query(
            "SELECT COUNT(*) as count FROM document_chunks WHERE document_id = $1",
            [documentId]
        );
        return parseInt(result.rows[0].count, 10);
    } finally {
        client.release();
    }
}

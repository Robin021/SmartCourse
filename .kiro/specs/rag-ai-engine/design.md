# Design Document: RAG + AI Generation Engine

## Overview

本设计文档描述了智课绘教育AI产品的核心智能引擎的技术架构和实现方案。该引擎采用RAG（检索增强生成）技术，结合大语言模型，为十阶段课程设计流程提供智能化支持。

### 核心目标

1. **高质量生成**：通过RAG技术提供准确的上下文，确保AI生成内容的专业性和相关性
2. **可扩展性**：支持多种LLM提供商和嵌入模型，便于切换和优化
3. **高性能**：通过缓存和优化确保响应时间在30秒以内
4. **数据安全**：实现学校间数据隔离，保护敏感信息
5. **易维护性**：模块化设计，便于调试和升级

## Architecture

### 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Stage UI │  │ Chat UI  │  │ Export   │  │ Dashboard│   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
└───────┼─────────────┼─────────────┼─────────────┼──────────┘
        │             │             │             │
        └─────────────┴─────────────┴─────────────┘
                      │
        ┌─────────────▼─────────────────────────────────────┐
        │           API Gateway (Next.js API Routes)        │
        └─────────────┬─────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────────────────────────────┐
        │                                                     │
┌───────▼────────┐  ┌──────────────┐  ┌──────────────────┐ │
│ RAG Service    │  │ Generation   │  │ Collaboration    │ │
│                │  │ Service      │  │ Service          │ │
│ - Embedding    │  │ - Prompt     │  │ - Version Mgmt   │ │
│ - Vector Search│  │ - LLM Call   │  │ - Real-time Sync │ │
│ - Caching      │  │ - Validation │  │ - Conflict Res   │ │
└───────┬────────┘  └──────┬───────┘  └──────────────────┘ │
        │                  │                                 │
        └──────────────────┴─────────────────────────────────┘
                           │
        ┌──────────────────┴──────────────────────────────┐
        │                                                  │
┌───────▼────────┐  ┌──────────────┐  ┌────────────────┐ │
│ MongoDB        │  │ PostgreSQL   │  │ Redis Cache    │ │
│ - Projects     │  │ + pgvector   │  │ - Embeddings   │ │
│ - Prompts      │  │ - Vectors    │  │ - Search       │ │
│ - Versions     │  │ - Metadata   │  │ - Sessions     │ │
└────────────────┘  └──────────────┘  └────────────────┘ │
                                                           │
        ┌──────────────────────────────────────────────────┘
        │
┌───────▼────────┐  ┌──────────────┐
│ LLM Providers  │  │ Storage      │
│ - 阿里千问     │  │ - S3/OSS     │
│ - OpenAI       │  │ - MinIO      │
└────────────────┘  └──────────────┘
```

### 技术栈

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: MongoDB (文档存储), PostgreSQL + pgvector (向量存储)
- **Cache**: Redis (可选，用于性能优化)
- **LLM**: 阿里千问3 (主要), OpenAI GPT-4 (备用)
- **Embedding**: OpenAI text-embedding-3-small 或 阿里通义千问嵌入模型
- **Storage**: AWS S3 / 阿里云OSS / MinIO


## Components and Interfaces

### 1. RAG Service

负责文档处理、向量化和语义检索。

#### 核心类和接口

```typescript
// lib/rag/embedding.ts
interface EmbeddingService {
  generateEmbedding(text: string): Promise<number[]>;
  generateBatchEmbeddings(texts: string[]): Promise<number[][]>;
  getModelInfo(): { provider: string; model: string; dimension: number };
}

// lib/rag/vectorStore.ts
interface VectorStore {
  upsertVectors(documents: VectorDocument[]): Promise<void>;
  search(query: number[], options: SearchOptions): Promise<SearchResult[]>;
  deleteByDocumentId(documentId: string): Promise<void>;
  deleteBySchoolId(schoolId: string): Promise<void>;
}

interface VectorDocument {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    documentId: string;
    schoolId?: string;
    isPublic: boolean;
    source: string;
    chunkIndex: number;
    totalChunks: number;
    stage?: string; // Q1-Q10
  };
}

interface SearchOptions {
  topK: number;
  schoolId?: string;
  includePublic: boolean;
  stage?: string;
  minSimilarity?: number;
}

interface SearchResult {
  content: string;
  similarity: number;
  metadata: VectorDocument['metadata'];
}

// lib/rag/documentProcessor.ts
interface DocumentProcessor {
  processDocument(file: File, metadata: DocumentMetadata): Promise<ProcessResult>;
  chunkText(text: string, options: ChunkOptions): string[];
}

interface ChunkOptions {
  maxChunkSize: number; // 默认 500 tokens
  overlap: number; // 默认 50 tokens
  preserveParagraphs: boolean;
}
```

#### 文档处理流程

1. **文本提取**: 使用 `mammoth` (Word), `pdf-parse` (PDF) 提取文本
2. **文本分块**: 按段落和token数量智能分块，保持语义完整性
3. **向量生成**: 调用嵌入模型API生成向量
4. **存储**: 将向量和元数据存入PostgreSQL + pgvector
5. **索引**: 创建HNSW索引加速检索


### 2. Generation Service

负责Prompt构建、LLM调用和内容生成。

#### 核心类和接口

```typescript
// lib/generation/promptBuilder.ts
interface PromptBuilder {
  buildPrompt(context: PromptContext): Promise<string>;
  interpolateTemplate(template: string, variables: Record<string, any>): string;
}

interface PromptContext {
  stage: string; // Q1-Q10
  userInput: Record<string, any>;
  previousStages: Record<string, any>; // 前序阶段成果
  ragResults: SearchResult[]; // RAG检索结果
  conversationHistory: Message[]; // 对话历史
  schoolInfo: SchoolInfo;
}

// lib/generation/llmClient.ts
interface LLMClient {
  generate(prompt: string, options: GenerationOptions): Promise<GenerationResult>;
  streamGenerate(prompt: string, options: GenerationOptions): AsyncIterator<string>;
}

interface GenerationOptions {
  temperature: number; // 默认 0.7
  maxTokens: number; // 默认 2000
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
}

interface GenerationResult {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: 'stop' | 'length' | 'content_filter';
}

// lib/generation/validator.ts
interface ContentValidator {
  validate(content: string, stage: string): ValidationResult;
  checkCompliance(content: string): ComplianceResult;
}

interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  suggestions: string[];
}

interface ValidationIssue {
  type: 'missing_element' | 'format_error' | 'compliance_issue';
  severity: 'error' | 'warning';
  message: string;
  location?: string;
}
```

#### Prompt模板结构

每个阶段的Prompt模板遵循统一结构：

```markdown
# 角色定义
你是一位{role}，专长于{expertise}。

# 背景信息
## 学校信息
{schoolInfo}

## 前序阶段成果
{previousStages}

## 参考资料
{ragResults}

# 任务
{task}

# 要求
1. {requirement1}
2. {requirement2}
...

# 输出格式
{outputFormat}
```


### 3. Collaboration Service

负责版本管理、实时协作和冲突解决。

#### 核心类和接口

```typescript
// lib/collaboration/versionManager.ts
interface VersionManager {
  createVersion(projectId: string, stage: string, content: any, author: string): Promise<Version>;
  getVersionHistory(projectId: string, stage: string): Promise<Version[]>;
  rollbackToVersion(projectId: string, stage: string, versionId: string): Promise<void>;
  compareVersions(versionId1: string, versionId2: string): Promise<VersionDiff>;
}

interface Version {
  id: string;
  projectId: string;
  stage: string;
  content: any;
  author: string;
  createdAt: Date;
  changeNote?: string;
  isAIGenerated: boolean;
}

// lib/collaboration/realtimeSync.ts
interface RealtimeSync {
  broadcastUpdate(projectId: string, update: Update): void;
  subscribeToUpdates(projectId: string, callback: (update: Update) => void): () => void;
  getOnlineUsers(projectId: string): User[];
}

interface Update {
  type: 'content_change' | 'annotation' | 'vote' | 'user_join' | 'user_leave';
  userId: string;
  timestamp: Date;
  data: any;
}

// lib/collaboration/annotationManager.ts
interface AnnotationManager {
  addAnnotation(projectId: string, annotation: Annotation): Promise<void>;
  getAnnotations(projectId: string, stage: string): Promise<Annotation[]>;
  resolveAnnotation(annotationId: string): Promise<void>;
}

interface Annotation {
  id: string;
  projectId: string;
  stage: string;
  content: string;
  author: User;
  position: { start: number; end: number };
  replies: AnnotationReply[];
  resolved: boolean;
  createdAt: Date;
}
```


## Data Models

### MongoDB Collections

#### 1. projects
```typescript
{
  _id: ObjectId,
  tenant_id: string,
  school_id: string,
  name: string,
  config_version: string,
  current_stage: string, // Q1-Q10
  overall_progress: number, // 0-100
  stages: {
    Q1: {
      status: 'not_started' | 'in_progress' | 'completed',
      input: any,
      output: any,
      current_version_id: string,
      completed_at?: Date
    },
    // ... Q2-Q10
  },
  collaborators: [{ user_id: string, role: string }],
  audit_log: [{
    action: string,
    user_id: string,
    timestamp: Date,
    details: any
  }],
  created_at: Date,
  updated_at: Date
}
```

#### 2. stage_versions
```typescript
{
  _id: ObjectId,
  project_id: ObjectId,
  stage: string, // Q1-Q10
  version: number,
  content: any,
  author: {
    user_id: string,
    name: string
  },
  change_note: string,
  is_ai_generated: boolean,
  generation_metadata?: {
    prompt_template_id: string,
    rag_results: any[],
    llm_usage: any
  },
  created_at: Date
}
```

#### 3. annotations
```typescript
{
  _id: ObjectId,
  project_id: ObjectId,
  stage: string,
  content: string,
  author: { user_id: string, name: string },
  position: { start: number, end: number },
  replies: [{
    author: { user_id: string, name: string },
    content: string,
    created_at: Date
  }],
  resolved: boolean,
  created_at: Date,
  updated_at: Date
}
```

#### 4. votes
```typescript
{
  _id: ObjectId,
  project_id: ObjectId,
  stage: string,
  question: string,
  options: [{
    id: string,
    text: string,
    votes: [{ user_id: string, timestamp: Date }]
  }],
  status: 'open' | 'closed',
  created_at: Date,
  closed_at?: Date
}
```

### PostgreSQL Tables

#### 1. document_vectors
```sql
CREATE TABLE document_vectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id VARCHAR(255) NOT NULL,
  school_id VARCHAR(255),
  is_public BOOLEAN DEFAULT false,
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI embedding dimension
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ON document_vectors USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON document_vectors (school_id);
CREATE INDEX ON document_vectors (document_id);
CREATE INDEX ON document_vectors (is_public);
```

#### 2. embedding_cache
```sql
CREATE TABLE embedding_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text_hash VARCHAR(64) UNIQUE NOT NULL,
  embedding vector(1536),
  model_version VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

CREATE INDEX ON embedding_cache (text_hash);
CREATE INDEX ON embedding_cache (expires_at);
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Document Processing Round Trip
*For any* uploaded document, if the system successfully processes it into chunks and generates embeddings, then retrieving those chunks by document ID should return all original chunks with their content intact.
**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: Vector Storage Consistency
*For any* vector and metadata stored in the database, querying by the document ID should return the exact same vector and metadata.
**Validates: Requirements 1.3**

### Property 3: Document Deletion Cascade
*For any* document, if it is deleted from the system, then all associated vectors in the vector database should also be deleted, and subsequent searches should not return any chunks from that document.
**Validates: Requirements 1.5**

### Property 4: Search Result Ordering
*For any* semantic search query, the returned results should be ordered by similarity score in descending order, with the first result having the highest similarity.
**Validates: Requirements 2.2, 2.3**

### Property 5: Search Result Completeness
*For any* search result, it should contain all required fields: content, similarity score, source, and metadata. No field should be null or undefined.
**Validates: Requirements 2.4**

### Property 6: School Data Isolation
*For any* school ID, when searching with private scope, the results should only include documents where the school_id matches or is_public is true. Documents from other schools should never appear.
**Validates: Requirements 2.5, 9.4**

### Property 7: Public Knowledge Base Access
*For any* search with public scope enabled, all documents marked as is_public=true should be searchable regardless of school_id.
**Validates: Requirements 2.6**

### Property 8: Template Variable Interpolation
*For any* prompt template with variables, after interpolation, the resulting prompt should not contain any unresolved placeholders (e.g., {{variable_name}}).
**Validates: Requirements 3.3**

### Property 9: Template Structure Preservation
*For any* prompt template containing role, background, task, and requirements sections, the generated prompt should maintain all these sections in the correct order.
**Validates: Requirements 3.4**

### Property 10: Version Creation on Modification
*For any* prompt template modification, a new version should be created, and the previous version should remain accessible in the version history.
**Validates: Requirements 3.5, 12.1, 12.2**

### Property 11: A/B Test Weight Distribution
*For any* A/B test configuration with specified weights, over a large number of selections (n > 1000), the distribution of selected versions should approximate the configured weight ratios within a 5% margin.
**Validates: Requirements 3.6**

### Property 12: LLM Retry Mechanism
*For any* LLM API call that fails, the system should retry up to 3 times with exponentially increasing intervals before returning an error.
**Validates: Requirements 4.5**

### Property 13: Content Validation Keywords
*For any* generated educational content, if it passes validation, it should contain at least one of the required educational policy keywords (e.g., "五育并举", "立德树人").
**Validates: Requirements 5.1**

### Property 14: Structured Data Serialization Round Trip
*For any* structured data (like SWOT tables), serializing to JSON and then deserializing should produce an equivalent data structure.
**Validates: Requirements 5.4**

### Property 15: Stage Completion Status Update
*For any* stage, when a user completes it, the stage status should be updated to "completed" and the completion timestamp should be recorded.
**Validates: Requirements 11.1**

### Property 16: Previous Stage Context Inclusion
*For any* stage Qn (where n > 1), when building the prompt, the context should include outputs from all completed stages Q1 through Q(n-1).
**Validates: Requirements 11.2, 11.3**

### Property 17: Version Rollback Consistency
*For any* version in the history, if a user rolls back to that version, the current content should exactly match the content of that version.
**Validates: Requirements 12.4**

### Property 18: SWOT Score Calculation
*For any* SWOT analysis data with all 20 dimensions filled (10 internal, 10 external), the system should calculate quantitative scores for strengths, weaknesses, opportunities, and threats, with each score being a number between 0 and 100.
**Validates: Requirements 13.1**

### Property 19: Export Content Completeness
*For any* full-process export request, the exported document should include content from all completed stages (Q1-Q10), and no completed stage should be missing.
**Validates: Requirements 15.3**

### Property 20: Embedding Cache Hit
*For any* text that has been embedded before (same text hash), requesting the embedding again should return the cached result without calling the embedding API.
**Validates: Requirements 7.1**


## Error Handling

### Error Categories

1. **User Input Errors** (4xx)
   - Invalid file format
   - Missing required fields
   - Unauthorized access

2. **System Errors** (5xx)
   - Database connection failure
   - LLM API timeout
   - Vector store unavailable

3. **Business Logic Errors**
   - Content validation failure
   - Insufficient context for generation
   - Stage dependency not met

### Error Response Format

```typescript
interface ErrorResponse {
  code: string; // e.g., "INVALID_FILE_FORMAT"
  message: string; // User-friendly message
  details?: any; // Technical details for debugging
  suggestions?: string[]; // Actionable suggestions
  timestamp: Date;
  requestId: string;
}
```

### Retry Strategy

```typescript
interface RetryConfig {
  maxAttempts: 3;
  initialDelay: 1000; // ms
  maxDelay: 10000; // ms
  backoffMultiplier: 2;
  retryableErrors: [
    'ETIMEDOUT',
    'ECONNRESET',
    'RATE_LIMIT_EXCEEDED',
    'SERVICE_UNAVAILABLE'
  ];
}
```

## Testing Strategy

### Unit Testing

使用 Jest 进行单元测试，覆盖：

1. **Utility Functions**
   - Text chunking logic
   - Template interpolation
   - Validation rules

2. **Service Methods**
   - Embedding generation (mocked)
   - Vector search (mocked)
   - Prompt building

3. **Data Transformations**
   - JSON serialization/deserialization
   - Markdown formatting
   - Content validation

### Property-Based Testing

使用 **fast-check** 库进行属性测试，每个属性运行至少 100 次迭代。

#### 测试配置

```typescript
import fc from 'fast-check';

const testConfig = {
  numRuns: 100,
  timeout: 5000,
  verbose: true
};
```

#### 关键属性测试

1. **Property 1: Document Processing Round Trip**
```typescript
// Feature: rag-ai-engine, Property 1: Document Processing Round Trip
fc.assert(
  fc.property(
    fc.record({
      content: fc.string({ minLength: 100, maxLength: 5000 }),
      metadata: fc.record({
        documentId: fc.uuid(),
        schoolId: fc.option(fc.uuid()),
        isPublic: fc.boolean()
      })
    }),
    async (doc) => {
      const chunks = await documentProcessor.chunkText(doc.content);
      const stored = await vectorStore.upsertVectors(chunks);
      const retrieved = await vectorStore.getByDocumentId(doc.metadata.documentId);
      
      expect(retrieved.length).toBe(chunks.length);
      expect(retrieved.map(r => r.content).join('')).toBe(doc.content);
    }
  ),
  testConfig
);
```

2. **Property 6: School Data Isolation**
```typescript
// Feature: rag-ai-engine, Property 6: School Data Isolation
fc.assert(
  fc.property(
    fc.record({
      schoolId: fc.uuid(),
      query: fc.string({ minLength: 10 }),
      otherSchoolDocs: fc.array(fc.record({
        schoolId: fc.uuid(),
        content: fc.string()
      }), { minLength: 5 })
    }),
    async (testData) => {
      // Setup: Insert documents from other schools
      await Promise.all(
        testData.otherSchoolDocs.map(doc => 
          vectorStore.upsertVectors([{
            ...doc,
            isPublic: false
          }])
        )
      );
      
      // Test: Search with private scope
      const results = await ragService.search(testData.query, {
        schoolId: testData.schoolId,
        includePublic: false
      });
      
      // Verify: No results from other schools
      const otherSchoolIds = testData.otherSchoolDocs.map(d => d.schoolId);
      results.forEach(result => {
        expect(otherSchoolIds).not.toContain(result.metadata.schoolId);
      });
    }
  ),
  testConfig
);
```

3. **Property 14: Structured Data Serialization Round Trip**
```typescript
// Feature: rag-ai-engine, Property 14: Structured Data Serialization Round Trip
fc.assert(
  fc.property(
    fc.record({
      strengths: fc.array(fc.string(), { minLength: 10, maxLength: 10 }),
      weaknesses: fc.array(fc.string(), { minLength: 10, maxLength: 10 }),
      opportunities: fc.array(fc.string(), { minLength: 10, maxLength: 10 }),
      threats: fc.array(fc.string(), { minLength: 10, maxLength: 10 })
    }),
    (swotData) => {
      const serialized = JSON.stringify(swotData);
      const deserialized = JSON.parse(serialized);
      
      expect(deserialized).toEqual(swotData);
    }
  ),
  testConfig
);
```

### Integration Testing

测试完整的端到端流程：

1. **RAG Pipeline Test**
   - Upload document → Process → Search → Verify results

2. **Generation Pipeline Test**
   - User input → RAG retrieval → Prompt building → LLM call → Validation → Storage

3. **Collaboration Test**
   - Multiple users → Concurrent edits → Conflict resolution → Version history

### Performance Testing

使用 k6 或 Artillery 进行负载测试：

```javascript
// k6 load test script
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up
    { duration: '5m', target: 50 }, // Stay at 50 users
    { duration: '2m', target: 0 },  // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<30000'], // 95% of requests under 30s
  },
};

export default function () {
  const payload = JSON.stringify({
    stage: 'Q2',
    userInput: { /* ... */ }
  });
  
  const res = http.post('http://localhost:3000/api/generate', payload, {
    headers: { 'Content-Type': 'application/json' },
  });
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 30s': (r) => r.timings.duration < 30000,
  });
  
  sleep(1);
}
```


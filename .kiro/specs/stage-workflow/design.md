# Design Document: 十阶段课程设计工作流

## Overview

本设计文档描述十阶段课程设计工作流的技术实现方案。该工作流基于已实现的RAG和Prompt管理基础设施，实现从Q1学校情境分析到Q10课程评价的完整业务流程。

### 设计目标

1. **业务完整性**：完整实现十阶段课程设计流程
2. **数据连贯性**：确保阶段间数据流转顺畅
3. **用户体验**：提供直观的进度追踪和导航
4. **内容质量**：通过验证和诊断确保生成内容的专业性
5. **协作支持**：支持多人协作和版本管理

## Architecture

### 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Stage Input  │  │ Progress Bar │  │ Version      │     │
│  │ Forms        │  │ & Navigation │  │ History      │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
└─────────┼──────────────────┼──────────────────┼────────────┘
          │                  │                  │
          └──────────────────┴──────────────────┘
                             │
          ┌──────────────────▼──────────────────┐
          │      API Routes (Next.js)           │
          │  /api/project/:id/stage/:stage      │
          │  /api/generate                      │
          │  /api/project/:id/export            │
          └──────────────────┬──────────────────┘
                             │
          ┌──────────────────┴──────────────────┐
          │                                      │
┌─────────▼────────┐  ┌──────────────────────┐ │
│ Generation       │  │ Stage                │ │
│ Service          │  │ Service              │ │
│                  │  │                      │ │
│ - Prompt Build   │  │ - Data Flow         │ │
│ - LLM Call       │  │ - Validation        │ │
│ - Validation     │  │ - Diagnostic        │ │
└─────────┬────────┘  └──────────┬───────────┘ │
          │                      │              │
          └──────────────────────┘              │
                     │                          │
          ┌──────────▼──────────────────────────┘
          │
┌─────────▼────────┐  ┌──────────────┐  ┌──────────────┐
│ MongoDB          │  │ PostgreSQL   │  │ Existing     │
│ - Projects       │  │ + pgvector   │  │ Services     │
│ - Versions       │  │ (Vectors)    │  │ - RAG        │
│ - Conversations  │  │              │  │ - Embedding  │
└──────────────────┘  └──────────────┘  └──────────────┘
```

### 技术栈（基于现有）

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB (已有), PostgreSQL + pgvector (已有)
- **LLM**: 通过SystemConfig配置的提供商（阿里千问/OpenAI等）
- **Existing Libraries**: 
  - `lib/embedding.ts` - 嵌入生成
  - `lib/vectorDb.ts` - 向量检索
  - `lib/getPrompt.ts` - Prompt管理
  - `lib/processDocument.ts` - 文档处理


## Components and Interfaces

### 1. Generation Service

```typescript
// lib/generation/generationService.ts
interface GenerationService {
  generate(request: GenerationRequest): Promise<GenerationResult>;
}

interface GenerationRequest {
  projectId: string;
  stage: string; // Q1-Q10
  userInput: Record<string, any>;
  conversationHistory?: Message[];
}

interface GenerationResult {
  content: any;
  diagnosticScore?: DiagnosticScore;
  ragResults: SearchResult[];
  usage: TokenUsage;
}

interface DiagnosticScore {
  overall: number; // 0-100
  dimensions?: Record<string, number>;
  suggestions: string[];
}
```

### 2. Stage Service

```typescript
// lib/stage/stageService.ts
interface StageService {
  getStageData(projectId: string, stage: string): Promise<StageData>;
  saveStageInput(projectId: string, stage: string, input: any): Promise<void>;
  saveStageOutput(projectId: string, stage: string, output: any): Promise<void>;
  completeStage(projectId: string, stage: string): Promise<void>;
  getPreviousStagesContext(projectId: string, currentStage: string): Promise<any>;
}

interface StageData {
  status: 'not_started' | 'in_progress' | 'completed';
  input?: any;
  output?: any;
  versions: Version[];
  completedAt?: Date;
}
```

### 3. LLM Client

```typescript
// lib/llm/llmClient.ts
interface LLMClient {
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

interface ChatResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
}
```

## Data Models

### Enhanced Project Model

```typescript
// models/Project.ts (扩展)
interface IProject {
  // ... existing fields
  stages: {
    [key: string]: { // Q1-Q10
      status: 'not_started' | 'in_progress' | 'completed';
      input: any;
      output: any;
      current_version_id?: string;
      completed_at?: Date;
      diagnostic_score?: {
        overall: number;
        dimensions?: Record<string, number>;
      };
    };
  };
  overall_progress: number; // 0-100
  conversation_sessions: {
    [stage: string]: {
      messages: Array<{
        role: 'user' | 'assistant';
        content: string;
        timestamp: Date;
      }>;
    };
  };
}
```

### Stage Version Model

```typescript
// models/StageVersion.ts (新建)
interface IStageVersion {
  project_id: ObjectId;
  stage: string; // Q1-Q10
  version: number;
  content: any;
  author: {
    user_id: string;
    name: string;
  };
  change_note?: string;
  is_ai_generated: boolean;
  generation_metadata?: {
    prompt_used: string;
    rag_results: any[];
    token_usage: any;
  };
  created_at: Date;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do.*

### Property 1: Stage Input Persistence
*For any* stage and user input, if the input is saved, then retrieving the stage data should return the exact same input.
**Validates: Requirements 1.2, 2.2, 3.1**

### Property 2: Stage Completion Status
*For any* stage, when marked as completed, the status should be "completed" and a completion timestamp should be recorded.
**Validates: Requirements 1.5, 11.4**

### Property 3: Previous Stages Context Inclusion
*For any* stage Qn (where n > 1), the generation context should include outputs from all completed stages Q1 through Q(n-1).
**Validates: Requirements 2.4, 3.5, 6.2**

### Property 4: Progress Calculation
*For any* project, the overall progress percentage should equal (number of completed stages / 10) * 100.
**Validates: Requirements 11.4**

### Property 5: Version Creation on Generation
*For any* AI generation, a new version should be created with is_ai_generated=true and generation metadata.
**Validates: Requirements 15.1**

### Property 6: SWOT Score Range
*For any* Q1 SWOT analysis, each dimension score (strengths, weaknesses, opportunities, threats) should be between 0 and 100.
**Validates: Requirements 1.4**

### Property 7: Five Virtues Coverage
*For any* Q4 育人目标, the diagnostic should calculate coverage for all five virtues (德智体美劳), with each percentage between 0 and 100.
**Validates: Requirements 4.6**

### Property 8: Prompt Variable Interpolation
*For any* generation request, the final prompt should not contain any unresolved template variables ({{variable}}).
**Validates: Requirements 12.3**

### Property 9: Content Validation Keywords
*For any* generated content that passes validation, it should contain at least one required educational keyword ("五育并举" or "立德树人").
**Validates: Requirements 13.1**

### Property 10: Export Content Completeness
*For any* full-process export, the document should include content from all completed stages, and no completed stage should be missing.
**Validates: Requirements 16.5**

## Error Handling

### Error Categories

1. **Validation Errors**: 输入不完整、格式错误
2. **Generation Errors**: LLM调用失败、超时
3. **Data Errors**: 数据库操作失败
4. **Business Logic Errors**: 阶段依赖未满足

### Retry Strategy

- LLM调用失败：重试3次，间隔1s, 2s, 4s
- 数据库操作失败：重试2次，间隔500ms
- RAG检索失败：降级到无RAG模式

## Testing Strategy

### Unit Testing

使用Jest测试：
- Stage Service方法
- Generation Service逻辑
- Validation函数
- Diagnostic计算

### Property-Based Testing

使用fast-check，每个属性100次迭代：
- Property 1-10如上所述

### Integration Testing

- 完整的Q1-Q10流程测试
- RAG + Generation集成测试
- 版本管理测试

### E2E Testing

使用Playwright：
- 用户完成Q1阶段流程
- 阶段间导航
- 导出功能

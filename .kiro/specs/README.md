# SmartCourse Specifications

本目录包含智课绘教育AI产品的所有功能规格说明。

## 已创建的Specs

### 1. rag-ai-engine (RAG + AI生成引擎)

**状态**: 设计完成，待实施

**描述**: 核心AI基础设施，包括文档向量化、语义检索、Prompt管理、LLM调用、内容验证等。

**文件**:
- `requirements.md` - 18个核心需求
- `design.md` - 技术架构和20个正确性属性
- `tasks.md` - 24个实施任务

**关键功能**:
- 文档处理和向量化
- 语义检索（pgvector）
- Prompt模板系统
- LLM集成（阿里千问/OpenAI）
- 内容验证和诊断
- 版本管理
- 实时协作
- 文档导出

### 2. stage-workflow (十阶段课程设计工作流)

**状态**: 设计完成，待实施

**描述**: 基于RAG基础设施的业务流程实现，包含Q1-Q10十个阶段的完整课程设计工作流。

**文件**:
- `requirements.md` - 16个业务需求
- `design.md` - 业务架构和10个正确性属性
- `tasks.md` - 27个实施任务

**关键功能**:
- Q1: 学校课程情境（SWOT分析）
- Q2: 教育哲学陈述
- Q3: 办学理念阐释
- Q4: 育人目标设定
- Q5: 课程模式命名
- Q6: 课程理念陈述
- Q7: 课程目标细化
- Q8: 课程结构设计
- Q9: 课程实施方案
- Q10: 课程评价体系
- 阶段导航和进度管理
- 多轮对话优化
- 版本管理
- 文档导出

## 已实现的基础设施

根据代码库分析，以下功能已经实现：

### 数据模型
- ✅ User (用户认证和权限)
- ✅ Project (项目基础结构)
- ✅ Document (文档管理)
- ✅ PromptTemplate (Prompt模板)
- ✅ PromptVersion (Prompt版本)
- ✅ StageConfig (阶段配置)
- ✅ SystemConfig (系统配置：LLM和存储)

### 核心服务
- ✅ `lib/embedding.ts` - 嵌入向量生成（支持阿里通义和OpenAI）
- ✅ `lib/vectorDb.ts` - 向量数据库操作（PostgreSQL + pgvector）
- ✅ `lib/getPrompt.ts` - Prompt获取和A/B测试
- ✅ `lib/processDocument.ts` - 文档处理和向量化
- ✅ `lib/db.ts` - MongoDB连接

### API端点
- ✅ 认证API (`/api/auth/login`, `/api/auth/logout`)
- ✅ 管理后台API (`/api/admin/*`)
- ✅ 知识库管理API (`/api/admin/kb/*`)
- ✅ Prompt管理API (`/api/admin/prompts`)
- ✅ 项目API (`/api/projects`, `/api/project/[id]`)

## 实施建议

### Phase 1: 完善RAG基础设施 (rag-ai-engine)
优先级：高
预计时间：2-3周

关键任务：
1. 实现LLM客户端（任务5）
2. 完善内容验证（任务6）
3. 实现完整RAG生成流程（任务7）
4. 添加缓存和性能优化（任务17）

### Phase 2: 实现核心业务流程 (stage-workflow)
优先级：高
预计时间：4-6周

关键任务：
1. 实现基础服务（任务1-6）
2. 实现Q1-Q2作为模板（任务7-8）
3. 复制模板实现Q3-Q10（任务9-16）
4. 实现辅助功能（任务17-20）

### Phase 3: 集成测试和优化
优先级：中
预计时间：1-2周

关键任务：
1. 编写集成测试
2. 编写E2E测试
3. 性能优化
4. 文档编写

## 开发指南

### 如何开始执行任务

1. **选择一个spec**: 建议从 `stage-workflow` 开始，因为它依赖于已有的基础设施
2. **打开tasks.md**: 查看任务列表
3. **选择任务**: 从任务1开始，或选择你想实现的功能
4. **执行任务**: 按照任务描述实现功能
5. **运行测试**: 确保所有测试通过
6. **更新状态**: 将任务标记为完成

### 测试要求

- **单元测试**: 使用Jest，覆盖所有核心函数
- **属性测试**: 使用fast-check，每个属性100次迭代
- **集成测试**: 测试完整的端到端流程
- **E2E测试**: 使用Playwright测试用户交互

### 代码规范

- TypeScript严格模式
- ESLint规则遵循
- 代码注释清晰
- API文档完整

## 下一步

1. 安装依赖：`npm install fast-check docx pdfkit pptxgenjs`
2. 开始实施：从 `stage-workflow/tasks.md` 的任务1开始
3. 持续集成：每完成一个任务就运行测试
4. 定期review：确保代码质量和设计一致性

## 联系和支持

如有问题，请参考：
- 产品设计文档：`doc/` 目录
- 已有代码：`lib/`, `models/`, `app/api/` 目录
- Gemini设计文档：`~/.gemini/antigravity/brain/` 目录

# 项目任务记录

> 最后更新：2025-12-12（修复 Next.js 16 构建失败，GHCR 镜像可正常构建）

## 未完成任务

> 2025-12-11 复查 `doc/` 目录：以下未完成清单保持有效，仍需实现实时协作、课堂教学生成/导出、教师工具、学生成长平台、评估仪表板等功能。

### 1. E2E测试扩展 ⚠️
**来源**：`doc/MinerU_e2e_and_deploy__20250119110500.md`、`doc/MinerU_export_and_cache__20250119105100.md`

**状态**：部分完成

**已完成**：
- ✅ 基础导航测试（匿名用户重定向）
- ✅ 阶段导航和导出测试（`tests/e2e/stage-export.spec.ts`）

**待完成**：
- ⏳ 添加更多E2E测试流程，包括：
  - 完整的阶段导航流程测试（Q1-Q10所有阶段）
  - 多用户协作场景测试
  - 版本回滚功能测试
  - 完整的生成流程测试（包含RAG检索）
  - 错误处理和边界情况测试

**优先级**：中

---

### 2. 缓存持久化优化 💡
**来源**：`doc/MinerU_export_and_cache__20250119105100.md`

**状态**：待考虑

**当前实现**：
- 使用内存缓存（Map），TTL为2分钟
- 位置：`lib/generation/generationService.ts`

**待完成**：
- ⏳ 评估是否需要将缓存迁移到Redis
- ⏳ 如果生成负载增长，考虑实现Redis持久化缓存
- ⏳ 实现缓存预热机制
- ⏳ 添加缓存监控和统计

**优先级**：低（根据实际负载情况决定）

---

### 3. 产品设计文档中的功能实现检查 📋
**来源**：`doc/MinerU_智课绘教育 AI 产品设计文档 v3.0__20251204111415.md`

**状态**：已检查（2025-01-19）

**检查结果**：

#### 3.1 AI共创工作区
- ✅ **对话式交互功能** - 已实现
  - 位置：`components/chat/ChatWindow.tsx`、`app/api/chat/route.ts`
  - 功能：支持自然语言对话、流式响应、上下文传递
  - 状态：完整实现
- ✅ **版本管理功能** - 已实现
  - 位置：`components/version/VersionHistory.tsx`、`lib/version/versionManager.ts`
  - 功能：版本历史查看、版本回滚
  - 状态：已实现版本历史，需确认回溯对比功能是否完整
- ❌ **实时协作功能** - 未实现
  - 缺失功能：多人标注、投票决策、实时编辑提示
  - 状态：未找到相关实现代码

#### 3.2 课程设计生成和导出
- ✅ **多格式导出** - 已实现
  - 位置：`lib/export/exportService.ts`、`app/api/project/[id]/export/route.ts`
  - 支持格式：text, docx, pdf, pptx
  - 状态：完整实现
- ✅ **模板适配** - 已实现（2025-12-11）
  - 位置：`lib/export/templates/`、`components/export/ExportPanel.tsx`
  - 内置模板：教育局备案模板、校本科研模板、通用模板（共3类）
  - 功能：模板选择、数据校验、多格式渲染、缺失字段提示
  - API：`GET /api/templates`（列表）、`POST /api/templates/validate`（校验）

#### 3.3 课堂教学内容生成和导出
- ❌ **全部功能未实现**
  - 缺失功能：
    - 基于课程目标的教案生成
    - 课件生成（PPT/Keynote）
    - 探究任务单生成
    - 作业设计生成
    - 学段适配（低/中/高学段认知水平）
  - 状态：未找到相关实现代码

#### 3.4 教师辅助工具集
- ❌ **全部功能未实现**
  - 缺失功能：
    - 课程规划工具（跨学科教学序列生成）
    - 学情分析工具（学生能力雷达图）
    - 资源匹配工具（素材推荐）
    - 作业生成工具（分层作业、自动批改）
  - 状态：未找到相关实现代码

#### 3.5 学生成长平台
- ❌ **全部功能未实现**
  - 缺失功能：
    - 成长档案（电子成长手册）
    - 目标追踪（可视化展示差距）
    - 互动功能（学生上传成果、教师点评）
  - 状态：未找到相关实现代码

#### 3.6 课程评估与雷达分析仪表板
- ❌ **全部功能未实现**
  - 缺失功能：
    - 核心指标计算（五育覆盖度、目标达成率等）
    - 可视化呈现（雷达图、趋势图、热力图）
    - 预警功能（指标低于阈值自动提示）
  - 状态：未找到相关实现代码
  - 注意：Q4阶段有五育覆盖度计算，但无可视化仪表板

**优先级**：高（核心功能）

---

### 4. 用户交互逻辑实现检查 📋
**来源**：`doc/MinerU_用户交互逻辑设计1-10 修订__20251204111423.md`

**状态**：已检查（2025-01-19）

**检查结果**：

#### Q1-Q10各阶段交互实现情况

- ✅ **Q1：学校课程情境**
  - 实现：SWOT表格输入（内外各10维度）
  - 实现：诊断面板（量化评分、优势/威胁预警）
  - 位置：`lib/q1/q1FormConfig.ts`、`components/q1/Q1SWOTForm.tsx`、`components/q1/Q1DiagnosticPanel.tsx`
  - 状态：完整实现

- ✅ **Q2：教育哲学**
  - 实现：哲学理论选择（13种理论，多选）
  - 实现：时代精神/地域文化输入
  - 实现：哲学陈述生成
  - 位置：`lib/q2/q2FormConfig.ts`、`lib/q2/q2GenerationService.ts`
  - 状态：完整实现

- ✅ **Q3：办学理念**
  - 实现：价值观四问题回答
  - 实现：核心概念确认/自定义
  - 实现：理念阐释生成
  - 位置：`lib/q3/q3FormConfig.ts`、`lib/q3/q3GenerationService.ts`
  - 状态：完整实现

- ✅ **Q4：育人目标**
  - 实现：11个问题的分部分输入（4部分：根基与灵魂、现实与挑战、愿景与特色、表达与落地）
  - 实现：五育重点排序（多选）
  - 实现：风格选择（经典/现代/简洁/其他）
  - 位置：`lib/q4/q4FormConfig.ts`、`lib/q4/q4GenerationService.ts`
  - 状态：完整实现

- ✅ **Q5：课程模式（课程命名）**
  - 实现：课程体系命名
  - 位置：`lib/q5/q5FormConfig.ts`、`lib/q5/q5GenerationService.ts`
  - 状态：已实现（需确认是否支持来源选择：历史/在地文化/课程理念）

- ✅ **Q6：课程理念**
  - 实现：课程理念四关键问题
  - 位置：`lib/q6/q6FormConfig.ts`、`lib/q6/q6GenerationService.ts`
  - 状态：已实现

- ✅ **Q7：课程目标**
  - 实现：现状评估（优势/薄弱维度、特色载体）
  - 实现：分学段目标细化（低/中/高学段）
  - 位置：`lib/q7/q7FormConfig.ts`、`lib/q7/q7GenerationService.ts`
  - 状态：已实现

- ✅ **Q8：课程结构**
  - 实现：关键词确认、核心隐喻
  - 实现：结构框架选择（五育并举/核心素养/主题域/自创）
  - 实现：五育板块命名
  - 实现：模块输入（四层结构：国家基础/品牌/校本社团/地方研学）
  - 实现：映射矩阵（模块×目标支撑强度）
  - 位置：`lib/q8/q8FormConfig.ts`、`lib/q8/q8GenerationService.ts`
  - 状态：已实现（需确认映射矩阵的0-3分评分UI是否完整）

- ✅ **Q9：课程实施**
  - 实现：实施愿景输入
  - 实现：路径选择（项目/节庆/研学等）
  - 实现：映射表、时间表
  - 位置：`lib/q9/q9FormConfig.ts`、`lib/q9/q9GenerationService.ts`
  - 状态：已实现

- ✅ **Q10：课程评价**
  - 实现：评价体系选择（335成长体系/自定义）
  - 实现：五维评价设计（德智体美劳）
  - 实现：文档风格选择（理论/实践/宣传）
  - 位置：`lib/q10/q10FormConfig.ts`、`lib/q10/q10GenerationService.ts`
  - 状态：已实现

**总结**：
- ✅ Q1-Q10所有阶段的表单配置和生成服务都已实现
- ✅ 统一的阶段页面UI（`app/project/[id]/stage/[stageId]/page.tsx`）
- ✅ 统一的表单渲染器（`components/DynamicFormRenderer.tsx`）
- ⚠️ 部分细节功能需进一步验证（如Q8映射矩阵的交互、Q5的来源选择）

**优先级**：高（核心业务流程）

---

## 已完成任务

### ✅ 修复：Next.js 16 / Docker 构建阶段 `npm run build` 失败
- 修复时间：2025-12-12
- 问题：GH Actions / Docker 构建时 `next build` 在 TypeScript 阶段失败（route params 类型、隐式 any、第三方库类型不匹配等）
- 修复要点：
  - **Route Handler params**：按 Next 16 类型要求，将 `context.params` 统一为 `Promise<...>` 并规范化 await 用法
  - **严格 TS 报错清理**：补齐首页 projects 类型、修复编辑器/侧边栏的隐式 any 与可选链越界访问
  - **导出模块类型修复**：对齐 pdfkit/pptxgenjs 的类型签名（标题加粗、addText 参数、write 输出 buffer 等）
  - **表单配置 options 只读数组**：`as const` options 在 schema 使用处用展开拷贝，避免 readonly→mutable 的类型冲突
  - **Q1 SWOT 类型适配**：维度分数与诊断分数存储类型对齐

### ✅ 修复：GH Actions buildx 找不到 Dockerfile
- 修复时间：2025-12-12
- 问题：GitHub Actions 构建镜像时报错 `failed to read dockerfile: open Dockerfile: no such file or directory`
- 原因：`Dockerfile`（以及 `.dockerignore` 等）在本地存在但未加入 git，runner checkout 后缺文件
- 修复：
  - 将 `Dockerfile` / `Dockerfile.dev` / `.dockerignore` 等 Docker 相关文件纳入版本控制
  - `Dockerfile` 构建阶段显式设置 `NODE_ENV=production`，确保 Next.js 生成 `.next/standalone`

### ✅ GitHub Actions 发布 GHCR
- 实现时间：2025-12-11
- 功能：在 `main` 分支与 `v*` 标签构建并推送镜像到 `ghcr.io/<owner>/smartcourse`
- 实现内容：
  1. 新增 `publish-ghcr.yml` 工作流：checkout、GHCR 登录、镜像元数据、Buildx 构建与推送
  2. 使用 `GITHUB_TOKEN` 登录 GHCR，开启 `packages: write` 权限
  3. 启用 GitHub Actions 缓存（cache-from/cache-to）提升构建速度，标签包含分支/tag/sha/latest
  4. 并发保护：同一 ref 仅运行一个发布任务，自动将仓库 owner 转为小写生成镜像名
- 说明：默认使用仓库根目录 `Dockerfile` 构建，如需多架构可在工作流中添加 `platforms` 配置

### ✅ 导出模板系统
- 实现时间：2025-12-11
- 功能：为课程设计导出提供三套标准模板（备案/校本科研/通用），支持数据校验和多格式渲染
- 实现内容：
  1. **模板类型定义**（`lib/export/templates/types.ts`）：定义模板元数据、占位符、样式、章节等类型
  2. **模板注册表**（`lib/export/templates/templateRegistry.ts`）：内置三套模板配置
     - `record-default`：教育局备案模板（docx/pdf）
     - `school-research`：校本科研模板（docx/pdf/pptx）
     - `general`：通用导出模板（text/docx/pdf/pptx）
  3. **模板渲染器**（`lib/export/templates/templateRenderer.ts`）：根据模板配置渲染不同格式
  4. **导出服务扩展**（`lib/export/exportService.ts`）：支持 templateId 参数
  5. **模板列表 API**（`app/api/templates/route.ts`）：GET 获取模板列表
  6. **模板校验 API**（`app/api/templates/validate/route.ts`）：POST 校验项目数据
  7. **导出面板更新**（`components/export/ExportPanel.tsx`）：模板选择、格式联动、校验提示
- 特性：
  - 模板选择下拉，显示模板描述和适用场景
  - 自动校验项目数据完整性，缺失字段提示
  - 格式选项根据模板支持自动过滤
  - 备案模板包含封面、目录、分章结构
  - 校本科研模板按研究报告结构组织
  - 通用模板按 Q1-Q10 阶段顺序排列
- 位置：
  - `lib/export/templates/` - 模板系统核心
  - `app/api/templates/` - 模板 API
  - `components/export/ExportPanel.tsx` - 导出 UI
- 说明：
  - 不选模板时保持原有导出逻辑不变
  - 模板可扩展：只需在 templateRegistry.ts 添加新配置
  - 未来可支持用户自定义模板

---

### ✅ Docker 环境搭建
- 实现时间：2025-01-20
- 功能：提供完整的 Docker Compose 环境配置，包括 MongoDB、PostgreSQL (pgvector) 和 Next.js 应用
- 实现内容：
  1. **docker-compose.yml**：定义所有服务（MongoDB、PostgreSQL、Next.js 应用）
  2. **Dockerfile.dev**：开发环境 Docker 镜像配置（支持热重载）
  3. **Dockerfile**：生产环境 Docker 镜像配置（多阶段构建，standalone 输出）
  4. **env.example**：环境变量配置示例文件
  5. **DOCKER.md**：详细的 Docker 使用指南和文档
  6. **next.config.mjs**：更新配置支持 standalone 输出模式
- 特性：
  - 自动健康检查
  - 数据持久化（volumes）
  - 开发模式支持热重载
  - 生产模式优化构建
  - 网络隔离
- 位置：
  - `docker-compose.yml` - Docker Compose 配置
  - `Dockerfile.dev` - 开发环境 Dockerfile
  - `Dockerfile` - 生产环境 Dockerfile
  - `env.example` - 环境变量示例
  - `DOCKER.md` - 使用文档
  - `next.config.mjs` - Next.js 配置更新
- 说明：
  - 一键启动所有依赖服务（MongoDB、PostgreSQL）
  - 支持开发和生产两种模式
  - 包含详细的使用文档和故障排除指南
  - 默认密码为示例值，生产环境请务必修改

---

### ✅ 修复：侧边栏阶段完成状态不刷新
- 实现时间：2025-12-11
- 问题：在Q2标记完成后，左侧导航栏没有显示完成的标识
- 原因分析：
  1. `StageSidebar.tsx` 中的阶段状态是**硬编码**的静态数据，Q2被写死为 `IN_PROGRESS`
  2. 组件从不获取真实的阶段进度数据
  3. 即使后端已经更新了状态，侧边栏也不会感知到变化
- 修复：
  1. **改为动态获取数据**：组件挂载时从 `/api/project/${projectId}/progress` API 获取真实的阶段状态
  2. **添加锁定逻辑**：根据前一个阶段是否完成来决定当前阶段是否锁定
  3. **添加事件监听**：监听 `stage-completed` 自定义事件，完成标记后自动刷新
  4. **触发刷新事件**：在 `StagePage` 的 `handleMarkComplete` 成功后派发 `stage-completed` 事件
- 位置：
  - `components/StageSidebar.tsx` - 改为从API动态获取阶段状态
  - `app/project/[id]/stage/[stageId]/page.tsx` - 标记完成后派发事件通知侧边栏刷新
- 说明：
  - 现在标记完成后，侧边栏会立即刷新显示正确的完成状态（绿色勾号）
  - 进度条和完成数量也会同步更新
  - 后续阶段的锁定状态也会根据实际情况自动调整

---

### ✅ 知识库架构全面改进
- 实现时间：2025-12-11
- 问题背景：知识库设计存在多个健壮性问题，包括数据一致性、错误处理、分块策略等

**改进内容**：

#### 1. Document Model 增强
- 添加 `error_message` 字段：记录处理失败的具体原因
- 添加 `last_processed_at` 字段：跟踪最后处理时间
- 添加 `processing_attempts` 字段：记录处理尝试次数
- 添加 `chunk_size` / `chunk_overlap` 字段：支持文档级别的分块配置
- 位置：`models/Document.ts`

#### 2. Embedding 错误处理改进
- 引入 `EMBEDDING_STRICT_MODE` 配置：默认开启，失败时抛出错误而非返回零向量
- 添加 `EmbeddingError` 自定义错误类：更好的错误追踪
- 改进 DashScope/OpenAI 两种模式的错误信息
- 添加 embedding 数量校验：确保返回数量与输入一致
- 位置：`lib/embedding.ts`

#### 3. 智能分块策略
- 优先按段落分割，保持语义完整性
- 按句子边界分割长段落（支持中英文句号）
- 仅在必要时按字符强制分割
- 分块参数可配置（通过文档或全局设置）
- 位置：`lib/processDocument.ts`

#### 4. 处理可靠性增强
- 添加并发控制：最多同时处理 3 个文档
- 添加重试机制：指数退避，最多 3 次重试
- 添加处理进度日志
- 添加 chunk 插入后验证
- 位置：`lib/processDocument.ts`

#### 5. 数据一致性 API
- 健康检查 API：`GET /api/admin/kb/health`
  - 检查 MongoDB 与 pgvector 数据一致性
  - 检测孤儿数据
  - 统计各状态文档数量
- 修复操作 API：`POST /api/admin/kb/health`
  - 清理孤儿 chunks
  - 标记文档重新处理
- 位置：`app/api/admin/kb/health/route.ts`

#### 6. Stage_ids 更新 API
- 无需重新处理即可更新文档的阶段关联
- 同时更新 MongoDB 和 pgvector 中的数据
- 位置：`app/api/admin/kb/update-stages/route.ts`

#### 7. 重试 API
- 重试单个或所有失败的文档
- 支持配置最大重试次数
- 位置：`app/api/admin/kb/retry/route.ts`

#### 8. 删除流程改进
- 跟踪每个步骤的删除结果（存储、向量库、MongoDB）
- 支持强制删除孤儿 chunks
- 返回详细的删除报告
- 位置：`app/api/admin/kb/delete/route.ts`

#### 9. 管理界面更新
- 显示错误信息和处理次数
- 添加健康检查按钮和结果展示
- 添加重试失败按钮
- 可直接点击编辑文档的阶段关联
- 更新使用说明
- 位置：`app/admin/kb/page.tsx`

#### 10. 向量库新功能
- `updateChunkStageIds`：批量更新 chunks 的 stage_ids
- `checkDocumentHealth`：检查单个文档健康状态
- `findOrphanChunks`：查找孤儿 chunks
- `getVectorDbStats`：获取向量库统计信息
- 位置：`lib/vectorDb.ts`

**API 总览**：
| 端点                          | 方法 | 功能         |
| ----------------------------- | ---- | ------------ |
| `/api/admin/kb/health`        | GET  | 健康检查     |
| `/api/admin/kb/health`        | POST | 修复数据问题 |
| `/api/admin/kb/update-stages` | POST | 更新阶段关联 |
| `/api/admin/kb/retry`         | POST | 重试处理     |

---

### ✅ 修复：知识库RAG embedding维度不匹配
- 实现时间：2025-12-10
- 问题：Admin知识库处理文档时报错 `expected 1536 dimensions, not 1024`
- 原因分析：
  1. 数据库表 `document_chunks` 的 `embedding` 列定义为 `vector(1536)` - 固定1536维度
  2. DashScope 直连模式在请求参数中设置了 `dimension: 1536`，工作正常
  3. **OpenAI-compatible 模式没有指定 `dimensions` 参数**，导致返回模型默认维度（如1024）
  4. 维度不匹配导致插入数据库时失败
- 修复：
  1. **在 OpenAI-compatible 请求中添加 dimensions 参数**：设置 `dimensions: 1536` 与数据库一致
  2. 该参数支持 OpenAI text-embedding-3 系列和 DashScope compatible-mode
- 位置：
  - `lib/embedding.ts` - 在 `generateOpenAIEmbeddings` 函数的请求body中添加 `dimensions: 1536`
- 说明：
  - 现在无论使用 DashScope 直连模式还是 OpenAI-compatible 模式，都会生成1536维度的embedding
  - 如果需要使用其他维度，需要同时修改 `lib/vectorDb.ts` 中的表定义和 `lib/embedding.ts` 中的请求参数

---

### ✅ 修复：版本回滚后内容不自动刷新
- 实现时间：2025-12-10
- 问题：点击版本回滚后，编辑器内容没有自动刷新，仍然显示旧内容
- 原因分析：
  1. `VersionHistory` 组件在回滚成功后只刷新了版本列表
  2. 没有通知父组件（`StagePage`）去重新加载阶段数据
  3. 导致编辑器的 `docContent` 状态没有更新
- 修复：
  1. **添加回调prop**：给 `VersionHistory` 组件添加 `onRollback` 回调属性
  2. **抽取加载函数**：将 `StagePage` 中的数据加载逻辑抽取为 `loadStageData` 函数
  3. **回滚后刷新**：创建 `handleVersionRollback` 回调，回滚成功后调用 `loadStageData(false)` 刷新内容
  4. **状态提示**：刷新时显示"正在刷新内容..."，完成后显示"已回滚到指定版本"
- 位置：
  - `components/version/VersionHistory.tsx` - 添加 `onRollback` 回调prop
  - `app/project/[id]/stage/[stageId]/page.tsx` - 抽取加载函数并传递回调
- 说明：
  - 现在点击回滚后，编辑器内容会自动刷新为回滚版本的内容
  - 顶部状态栏会显示"已回滚到指定版本"的提示

---

### ✅ 修复：标记完成按钮报错（Next.js 15 params Promise 问题）
- 实现时间：2025-12-10
- 问题：点击"标记完成"按钮时报错 `Invalid stage: undefined. Must be one of: Q1, Q2, Q3...`
- 原因分析：
  1. Next.js 15 中动态路由的 `params` 参数从直接对象变为了 Promise
  2. `complete/route.ts` 没有 await params 就直接使用，导致 `params.stageId` 是 undefined
  3. 同时发现 `rag/search/route.ts` 虽然 await 了 params，但没有将结果赋值给变量，导致 stageId 变量未定义
- 修复：
  1. **修复 complete/route.ts**：将 `{ params }` 改为 `context`，并使用 `const params = await context.params` 获取实际参数
  2. **修复 rag/search/route.ts**：将 `await context.params` 改为 `const { stageId } = await context.params` 正确解构参数
  3. **类型声明**：使用联合类型 `{ id: string; stageId: string } | Promise<{ id: string; stageId: string }>` 兼容 Next.js 14/15
- 位置：
  - `app/api/project/[id]/stage/[stageId]/complete/route.ts` - 修复 params 异步获取
  - `app/api/project/[id]/stage/[stageId]/rag/search/route.ts` - 修复 stageId 变量未定义
- 说明：
  - 这是 Next.js 15 的 breaking change，params 必须先 await
  - 同目录下其他路由文件（route.ts, generate/route.ts, input/route.ts）已经正确处理
  - 建议检查项目中其他动态路由的 API 是否有类似问题

---

### ✅ 修复：AI生成陈述内容被截断
- 实现时间：2025-12-10
- 问题：用户反馈"AI生成陈述"功能生成的内容像是生成了一半就停止了
- 原因分析：
  1. `GenerationService` 和 `LLMClient` 中都硬编码了 `DEFAULT_MAX_TOKENS = 2000`
  2. 即使用户在管理后台配置了更大的 `max_output_tokens`，也会被硬编码值覆盖
  3. 2000 tokens 对于生成完整的课程陈述来说太少了
- 修复（第一次）：
  1. **移除 GenerationService 硬编码限制**：不再传递 `maxTokens` 参数
  2. **优化提示文字**：更新管理后台LLM配置页面的提示文字
- 修复（第二次 - 彻底解决）：
  1. **移除 LLMClient 的 DEFAULT_MAX_TOKENS**：不再有 2000 的 fallback 限制
  2. **让 API 自己决定**：如果没有配置 max_output_tokens，则不传 max_tokens 参数，让 LLM API 自己决定限制
  3. **只在明确配置时才限制**：只有当管理后台设置了 max_output_tokens 时才传递该参数
- 位置：
  - `lib/generation/generationService.ts` - 移除 `DEFAULT_MAX_TOKENS` 和硬编码的 `maxTokens` 参数
  - `lib/llm/llmClient.ts` - 移除 `DEFAULT_MAX_TOKENS`，改为可选参数，不传则让 API 自己决定
  - `app/admin/settings/llm/page.tsx` - 更新配置提示文字
- 说明：
  - 现在如果不配置 max_output_tokens，系统不会强制限制，让 LLM API 自己决定
  - 如果需要限制，可以在管理后台设置 max_output_tokens
  - 不同的 LLM API 有不同的默认限制（如 DeepSeek 默认 4096，GPT-4 可能更高）

---

### ✅ 修复：AI助手提示词与AI生成陈述分离
- 实现时间：2025-12-10
- 问题：AI助手（ChatWindow）和AI生成陈述使用相似的指令，导致用户在聊天时无论说什么，AI都会生成完整的报告内容
- 原因分析：
  1. `chat/route.ts` 中硬编码了 `stageGuidance`，当在Q1阶段时会强制添加完整的报告生成指令
  2. 这导致AI助手失去了"助手"的角色，变成了内容生成器
- 修复：
  1. **更新 `chat_system` prompt**：将AI助手的提示词改为对话式助手角色，明确其职责是回答问题、提供建议、协助修改，而非主动生成完整报告
  2. **移除硬编码指令**：删除 `chat/route.ts` 中的 `stageGuidance` 变量及其相关逻辑
  3. **保留必要功能**：保留选中文本修改功能（返回JSON格式的replacement），保留学校名称提示
  4. **提示词可管理**：`chat_system` prompt 已在数据库中，可通过 admin/settings/prompts 页面管理和调整
  5. **修复JSON响应显示**：`sanitizeAssistantMessage` 函数错误过滤了包含 "replacement" 的JSON响应，导致选中文本修改的结果不显示
  6. **添加选中文字预览**：在内容区域（编辑器上方）添加选中文字预览面板，用户可以清楚看到待修改的内容
- 位置：
  - `app/api/seed/route.ts` - 更新 `chat_system` prompt 内容
  - `app/api/chat/route.ts` - 移除硬编码的 `stageGuidance`，简化系统提示构建逻辑
  - `components/chat/ChatWindow.tsx` - 修复JSON响应的解析和显示
  - `app/project/[id]/stage/[stageId]/page.tsx` - 在编辑器上方添加选中文字预览面板
- 说明：
  - 现在AI助手会根据用户的问题进行针对性回答，而不是总是生成完整报告
  - 如果用户选中文本请求修改，会返回JSON格式的修改建议，并格式化显示为"修改建议"
  - 选中文字时，编辑器上方会显示黄色预览面板，清晰展示待修改的内容（超过200字会截断），并提示"打开 AI 助手输入修改要求"
  - AI助手中只显示简洁的"已选中 X 字，将只修改这段"提示
  - 可以通过admin后台调整AI助手的行为风格

---

### ✅ 多格式导出功能
- 实现时间：2025-01-19
- 支持格式：text, docx, pdf, pptx
- 位置：`lib/export/exportService.ts`、`app/api/project/[id]/export/route.ts`

### ✅ 阶段数据持久化
- 实现时间：2025-01-19
- 功能：输入保存、输出生成、完成标记
- 位置：`app/api/project/[id]/stage/[stageId]/`

### ✅ 生成结果缓存
- 实现时间：2025-01-19
- 实现方式：内存缓存，TTL 2分钟
- 位置：`lib/generation/generationService.ts`

### ✅ 基础E2E测试
- 实现时间：2025-01-19
- 测试内容：导航、导出
- 位置：`tests/e2e/`

### ✅ 修复：保存编辑后的文档内容
- 实现时间：2025-01-19
- 问题：AI编辑后替换内容，点击保存输入，刷新后内容丢失
- 修复：修改保存输入API，同时保存编辑后的文档内容到output
- 位置：`app/api/project/[id]/stage/[stageId]/input/route.ts`、`app/project/[id]/stage/[stageId]/page.tsx`
- 说明：现在点击"保存输入"会同时保存表单数据和编辑后的文档内容

### ✅ 修复：版本管理问题
- 实现时间：2025-01-19
- 问题：
  1. 编辑后保存不创建新版本，导致编辑内容无法作为版本保存
  2. 版本回滚时content结构不匹配，导致回滚后内容显示不正确
  3. 无法删除或清理历史版本
- 修复：
  1. **自动创建版本**：编辑后保存时，如果内容有变化，自动创建新版本（标记为"手动编辑保存"）
  2. **修复回滚逻辑**：正确处理版本content的不同结构（字符串/对象），确保回滚后内容正确显示
  3. **添加版本删除功能**：
     - 单个版本删除：每个版本旁边有删除按钮
     - 批量清理：可以清理旧版本，只保留最新的N个版本（5/10/20/50个可选）
- 位置：
  - `lib/version/versionManager.ts` - 修复回滚逻辑，添加删除和清理方法
  - `app/api/project/[id]/versions/[stage]/route.ts` - 添加删除和清理API
  - `components/version/VersionHistory.tsx` - 添加删除按钮和清理UI
  - `app/api/project/[id]/stage/[stageId]/input/route.ts` - 添加版本创建
- 说明：
  - 现在编辑后保存会自动创建版本，可以在版本历史中查看和回滚
  - 回滚功能现在能正确处理不同格式的版本内容
  - 可以删除单个版本或批量清理旧版本，保持版本历史整洁

### ✅ 新增：AI生成中断功能
- 实现时间：2025-01-19
- 功能：在AI生成内容的过程中可以中断生成
- 实现：
  1. **使用AbortController**：控制fetch请求的中断
  2. **生成按钮切换**：生成时显示"停止生成"按钮（红色），点击可中断
  3. **Chat助手中断**：ChatWindow中的对话也可以中断
  4. **状态清理**：中断后正确清理状态，保留已生成的部分内容
- 位置：
  - `app/project/[id]/stage/[stageId]/page.tsx` - 添加生成中断功能
  - `components/chat/ChatWindow.tsx` - 添加对话中断功能
  - `components/chat/MessageInput.tsx` - 添加停止按钮
- 说明：
  - 生成过程中点击"停止生成"按钮可以立即中断
  - 中断后会保留已生成的部分内容
  - 组件卸载时自动清理未完成的请求

### ✅ 增强：管理后台Prompt版本管理
- 实现时间：2025-01-19
- 功能：增强管理后台的Prompt版本管理功能
- 实现：
  1. **版本号显示优化**：在prompt卡片头部更明显地显示当前版本号（v1, v2等）
  2. **版本删除功能**：每个版本旁边添加删除按钮，可以删除单个版本
  3. **版本清理功能**：当版本数量超过10个时，显示"清理旧版本"按钮，可以批量清理旧版本
  4. **UI改进**：版本历史面板更清晰，支持删除和清理操作
- 位置：
  - `app/admin/settings/prompts/page.tsx` - 增强版本管理UI
  - `app/api/admin/prompts/route.ts` - 添加删除和清理API
- 说明：
  - Prompt版本管理现在与Stage版本管理功能一致
  - 可以删除单个版本或批量清理旧版本
  - 当前版本号在prompt卡片上更明显

---

## 任务分类统计

- 🔴 高优先级：2项（产品功能实现检查、用户交互逻辑检查）
- 🟡 中优先级：1项（E2E测试扩展）
- 🟢 低优先级：1项（缓存持久化优化）

---

## 备注

1. 本文档基于 `/doc` 目录下的设计文档分析生成
2. 任务状态会根据实际开发进度更新
3. 建议定期review本文档，确保任务跟踪的准确性



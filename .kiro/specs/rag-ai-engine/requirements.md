# Requirements Document: RAG + AI Generation Engine

## Introduction

本需求文档定义了智课绘教育AI产品的核心智能引擎，包括RAG（检索增强生成）系统和AI内容生成引擎。该引擎是整个十阶段课程设计流程的技术基础，负责从知识库检索相关信息并生成高质量的教育内容。

## Glossary

- **RAG (Retrieval-Augmented Generation)**: 检索增强生成，通过检索相关文档来增强AI生成质量的技术
- **Vector Database**: 向量数据库，用于存储和检索文档的向量表示
- **Embedding**: 嵌入向量，文本的数值化表示
- **LLM (Large Language Model)**: 大语言模型，如阿里千问、GPT等
- **Prompt Template**: 提示词模板，用于构造发送给LLM的指令
- **Knowledge Base**: 知识库，包含教育政策、理论、案例等文档的集合
- **Context Window**: 上下文窗口，LLM一次能处理的最大token数量
- **Semantic Search**: 语义搜索，基于语义相似度而非关键词匹配的搜索

## Requirements

### Requirement 1: 文档向量化与存储

**User Story:** 作为系统管理员，我希望上传的教育文档能够自动转换为向量并存储，以便后续进行语义搜索。

#### Acceptance Criteria

1. WHEN 管理员上传文档（PDF/Word/TXT）THEN 系统 SHALL 提取文本内容并分块处理
2. WHEN 文档分块完成 THEN 系统 SHALL 使用嵌入模型生成每个文本块的向量表示
3. WHEN 向量生成完成 THEN 系统 SHALL 将向量和元数据存储到向量数据库（pgvector）
4. WHEN 文档处理失败 THEN 系统 SHALL 记录错误日志并通知管理员
5. WHEN 文档被删除 THEN 系统 SHALL 同时删除对应的向量数据

### Requirement 2: 语义检索功能

**User Story:** 作为AI生成引擎，我需要根据用户输入检索相关的知识库内容，以便提供准确的上下文信息。

#### Acceptance Criteria

1. WHEN 接收到检索请求 THEN 系统 SHALL 将查询文本转换为向量
2. WHEN 查询向量生成完成 THEN 系统 SHALL 在向量数据库中执行相似度搜索
3. WHEN 执行相似度搜索 THEN 系统 SHALL 返回Top-K个最相关的文档片段（K可配置，默认5）
4. WHEN 返回检索结果 THEN 系统 SHALL 包含文档内容、来源、相似度分数和元数据
5. WHEN 检索范围指定为私有知识库 THEN 系统 SHALL 仅搜索该学校的文档
6. WHEN 检索范围指定为公共知识库 THEN 系统 SHALL 搜索所有公开的教育资源
7. WHEN 检索结果为空 THEN 系统 SHALL 返回空列表而非错误

### Requirement 3: Prompt 构建与管理

**User Story:** 作为课程设计专家，我希望系统能够根据不同阶段和场景使用合适的提示词模板，以确保AI生成内容的专业性和一致性。

#### Acceptance Criteria

1. WHEN 系统初始化 THEN 系统 SHALL 加载所有十阶段的默认提示词模板
2. WHEN 构建Prompt THEN 系统 SHALL 根据阶段标识（Q1-Q10）选择对应的模板
3. WHEN 选择模板后 THEN 系统 SHALL 将用户输入、前序阶段成果、RAG检索结果注入模板变量
4. WHEN 模板包含角色定义 THEN 系统 SHALL 保留角色、背景、任务、要求的结构
5. WHEN 管理员修改提示词模板 THEN 系统 SHALL 创建新版本并保留历史版本
6. WHEN 提示词启用A/B测试 THEN 系统 SHALL 按权重随机选择版本
7. WHEN Prompt超过LLM上下文限制 THEN 系统 SHALL 截断或压缩内容并记录警告

### Requirement 4: LLM 集成与调用

**User Story:** 作为系统，我需要调用配置的大语言模型生成教育内容，并处理各种异常情况。

#### Acceptance Criteria

1. WHEN 系统启动 THEN 系统 SHALL 从配置中读取LLM提供商（阿里千问/OpenAI等）和API密钥
2. WHEN 发起生成请求 THEN 系统 SHALL 使用构建好的Prompt调用LLM API
3. WHEN 调用LLM THEN 系统 SHALL 设置合适的参数（temperature=0.7, max_tokens=2000）
4. WHEN LLM返回结果 THEN 系统 SHALL 提取生成的文本内容
5. WHEN LLM调用失败（超时/限流/错误） THEN 系统 SHALL 重试最多3次，间隔递增
6. WHEN 重试仍失败 THEN 系统 SHALL 返回友好的错误信息给用户
7. WHEN 生成内容包含敏感词 THEN 系统 SHALL 拦截并要求重新生成

### Requirement 5: 内容验证与格式化

**User Story:** 作为教师用户，我希望AI生成的内容符合教育文档规范，并且经过合规性检查。

#### Acceptance Criteria

1. WHEN AI生成内容完成 THEN 系统 SHALL 检查是否包含"五育并举"等教育方针关键词
2. WHEN 内容缺少必要元素 THEN 系统 SHALL 标记为"需补充"并提示用户
3. WHEN 内容通过验证 THEN 系统 SHALL 按教育文档格式进行排版（标题层级、段落间距）
4. WHEN 生成的是结构化数据（如SWOT表格） THEN 系统 SHALL 转换为JSON格式存储
5. WHEN 生成的是文档（如《教育哲学陈述》） THEN 系统 SHALL 保存为Markdown格式
6. WHEN 内容包含特殊字符或格式 THEN 系统 SHALL 正确转义和处理
7. WHEN 验证失败 THEN 系统 SHALL 记录失败原因并允许用户手动修改

### Requirement 6: 多轮对话与上下文管理

**User Story:** 作为教师用户，我希望能够与AI进行多轮对话来迭代优化生成内容，系统应该记住之前的对话历史。

#### Acceptance Criteria

1. WHEN 用户开始新的阶段 THEN 系统 SHALL 创建新的对话会话
2. WHEN 用户发送消息 THEN 系统 SHALL 将消息添加到会话历史
3. WHEN 构建Prompt THEN 系统 SHALL 包含最近N轮对话历史（N可配置，默认5）
4. WHEN 对话历史过长 THEN 系统 SHALL 使用滑动窗口保留最相关的对话
5. WHEN 用户请求"迭代生成" THEN 系统 SHALL 基于当前内容和修改建议重新生成
6. WHEN 用户切换到其他阶段 THEN 系统 SHALL 保存当前会话状态
7. WHEN 用户返回之前的阶段 THEN 系统 SHALL 恢复该阶段的对话历史

### Requirement 7: 性能与缓存优化

**User Story:** 作为系统运维人员，我希望系统能够高效处理请求，减少重复计算和API调用成本。

#### Acceptance Criteria

1. WHEN 相同文本需要生成嵌入向量 THEN 系统 SHALL 使用缓存避免重复计算
2. WHEN 相同查询在短时间内重复 THEN 系统 SHALL 返回缓存的检索结果
3. WHEN 缓存命中 THEN 系统 SHALL 在响应中标记缓存状态
4. WHEN 缓存过期（默认1小时） THEN 系统 SHALL 重新执行检索或生成
5. WHEN 系统负载高 THEN 系统 SHALL 使用队列机制处理生成请求
6. WHEN 向量数据库查询慢 THEN 系统 SHALL 使用索引优化查询性能
7. WHEN 监控到性能问题 THEN 系统 SHALL 记录慢查询日志供分析

### Requirement 8: 监控与日志

**User Story:** 作为系统管理员，我需要监控RAG和AI生成的运行状态，以便及时发现和解决问题。

#### Acceptance Criteria

1. WHEN 执行RAG检索 THEN 系统 SHALL 记录查询文本、检索时间、结果数量
2. WHEN 调用LLM THEN 系统 SHALL 记录Prompt长度、生成时间、token消耗
3. WHEN 发生错误 THEN 系统 SHALL 记录完整的错误堆栈和上下文信息
4. WHEN 生成内容被拒绝 THEN 系统 SHALL 记录拒绝原因和内容摘要
5. WHEN 管理员查看日志 THEN 系统 SHALL 提供按时间、类型、用户筛选的功能
6. WHEN 检测到异常模式（如高失败率） THEN 系统 SHALL 发送告警通知
7. WHEN 日志文件过大 THEN 系统 SHALL 自动轮转和归档

### Requirement 9: 知识库分类与权限

**User Story:** 作为系统，我需要区分公共知识库和私有知识库，确保学校数据的隔离性。

#### Acceptance Criteria

1. WHEN 文档上传时指定为公共 THEN 系统 SHALL 将文档标记为所有学校可访问
2. WHEN 文档上传时指定为私有 THEN 系统 SHALL 将文档关联到特定学校ID
3. WHEN 执行RAG检索 THEN 系统 SHALL 根据学校ID过滤可访问的文档
4. WHEN 学校A的用户检索 THEN 系统 SHALL NOT 返回学校B的私有文档
5. WHEN 文档包含敏感信息 THEN 系统 SHALL 在元数据中标记敏感级别
6. WHEN 访问敏感文档 THEN 系统 SHALL 验证用户权限并记录访问日志
7. WHEN 学校删除账户 THEN 系统 SHALL 同时删除该学校的所有私有文档

### Requirement 10: 嵌入模型配置

**User Story:** 作为系统管理员，我希望能够配置和切换不同的嵌入模型，以平衡成本和效果。

#### Acceptance Criteria

1. WHEN 系统初始化 THEN 系统 SHALL 支持多种嵌入模型（OpenAI/阿里通义/本地模型）
2. WHEN 管理员选择嵌入模型 THEN 系统 SHALL 验证模型可用性并保存配置
3. WHEN 切换嵌入模型 THEN 系统 SHALL 提示需要重新处理现有文档
4. WHEN 使用不同模型的向量 THEN 系统 SHALL 在元数据中记录模型版本
5. WHEN 检索时 THEN 系统 SHALL 仅使用相同模型生成的向量进行比较
6. WHEN 模型API调用失败 THEN 系统 SHALL 回退到备用模型或本地模型
7. WHEN 评估模型效果 THEN 系统 SHALL 提供检索准确率的测试工具

### Requirement 11: 阶段间数据流转与依赖

**User Story:** 作为教师用户，我希望后续阶段能够自动引用前序阶段的成果，形成连贯的课程设计流程。

#### Acceptance Criteria

1. WHEN 用户完成某阶段（如Q2教育哲学） THEN 系统 SHALL 将该阶段的输出标记为"已完成"
2. WHEN 用户进入后续阶段（如Q3办学理念） THEN 系统 SHALL 自动加载前序阶段的成果作为背景
3. WHEN 构建Prompt THEN 系统 SHALL 包含所有相关前序阶段的关键信息
4. WHEN 前序阶段被修改 THEN 系统 SHALL 提示用户后续阶段可能需要更新
5. WHEN 阶段有依赖关系 THEN 系统 SHALL 验证前置阶段是否完成
6. WHEN 用户跳过某阶段 THEN 系统 SHALL 允许但标记为"待完善"
7. WHEN 导出最终方案 THEN 系统 SHALL 整合所有阶段的成果形成完整文档

### Requirement 12: 内容版本管理与回溯

**User Story:** 作为教师用户，我希望能够查看和恢复之前生成的内容版本，避免误操作导致内容丢失。

#### Acceptance Criteria

1. WHEN AI生成新内容 THEN 系统 SHALL 自动保存为新版本
2. WHEN 用户手动修改内容 THEN 系统 SHALL 创建修改版本并记录修改者
3. WHEN 用户查看版本历史 THEN 系统 SHALL 显示时间线和版本对比
4. WHEN 用户选择恢复某版本 THEN 系统 SHALL 将该版本设为当前版本
5. WHEN 版本数量超过限制（默认20个） THEN 系统 SHALL 保留关键版本并归档旧版本
6. WHEN 多人协作编辑 THEN 系统 SHALL 记录每个版本的贡献者
7. WHEN 导出文档 THEN 系统 SHALL 允许选择特定版本导出

### Requirement 13: 诊断与评分功能

**User Story:** 作为教师用户，我希望系统能够对生成的内容进行诊断评分，帮助我了解内容质量和改进方向。

#### Acceptance Criteria

1. WHEN Q1 SWOT分析完成 THEN 系统 SHALL 计算量化评分（优势/劣势/机会/威胁各维度）
2. WHEN Q2教育哲学生成 THEN 系统 SHALL 评估理论适配性评分（0-100分）
3. WHEN Q3办学理念生成 THEN 系统 SHALL 检查理念正向性并给出建议
4. WHEN Q6育人目标生成 THEN 系统 SHALL 诊断五育覆盖度（德智体美劳各占比）
5. WHEN Q7课程目标生成 THEN 系统 SHALL 分析目标达成差距
6. WHEN Q8课程结构生成 THEN 系统 SHALL 评估结构合理性评分
7. WHEN 评分低于阈值 THEN 系统 SHALL 提供具体的改进建议和参考案例

### Requirement 14: 协作批注与投票

**User Story:** 作为教研团队成员，我希望能够在生成的内容上添加批注和意见，并通过投票达成共识。

#### Acceptance Criteria

1. WHEN 用户选中文本 THEN 系统 SHALL 显示批注工具栏
2. WHEN 用户添加批注 THEN 系统 SHALL 保存批注内容、位置和作者信息
3. WHEN 其他用户查看文档 THEN 系统 SHALL 高亮显示有批注的文本
4. WHEN 用户点击批注 THEN 系统 SHALL 显示批注详情和回复列表
5. WHEN 需要团队决策（如Q5课程名称） THEN 系统 SHALL 提供投票功能
6. WHEN 投票结束 THEN 系统 SHALL 统计结果并自动应用多数选择
7. WHEN 用户离线编辑 THEN 系统 SHALL 在重新连接时同步批注和投票状态

### Requirement 15: 文档导出与模板

**User Story:** 作为教师用户，我希望能够将生成的课程方案导出为专业的Word/PDF文档，符合教育局备案要求。

#### Acceptance Criteria

1. WHEN 用户选择导出 THEN 系统 SHALL 提供格式选项（Word/PDF/PPT）
2. WHEN 选择Word格式 THEN 系统 SHALL 使用标准教育文档排版（标题、正文、表格样式）
3. WHEN 选择PDF格式 THEN 系统 SHALL 生成带目录和页码的PDF文件
4. WHEN 选择PPT格式 THEN 系统 SHALL 生成包含可视化结构图的演示文稿
5. WHEN 用户选择模板 THEN 系统 SHALL 提供教育局备案模板、校本科研模板等选项
6. WHEN 导出范围为全流程 THEN 系统 SHALL 打包所有十阶段成果
7. WHEN 导出完成 THEN 系统 SHALL 提供下载链接或发送至邮箱

### Requirement 16: 实时协作与冲突解决

**User Story:** 作为教研团队成员，我希望能够与同事实时协作编辑文档，系统能够处理编辑冲突。

#### Acceptance Criteria

1. WHEN 多个用户同时打开文档 THEN 系统 SHALL 显示在线用户列表
2. WHEN 用户A编辑某段落 THEN 系统 SHALL 向其他用户显示"用户A正在编辑"提示
3. WHEN 用户A保存修改 THEN 系统 SHALL 实时推送更新到其他用户
4. WHEN 用户A和用户B同时编辑同一段落 THEN 系统 SHALL 检测冲突并提示
5. WHEN 发生编辑冲突 THEN 系统 SHALL 提供并排对比和手动合并选项
6. WHEN 用户离线 THEN 系统 SHALL 在用户列表中标记为"离线"
7. WHEN 网络断开重连 THEN 系统 SHALL 自动同步离线期间的更改

### Requirement 17: 智能推荐与案例匹配

**User Story:** 作为教师用户，我希望系统能够根据我的输入推荐相关的教学案例和最佳实践。

#### Acceptance Criteria

1. WHEN 用户输入地域文化（如"运河文化"） THEN 系统 SHALL 从知识库检索相关教学案例
2. WHEN 用户选择教育哲学理论 THEN 系统 SHALL 推荐同类学校的成功案例
3. WHEN 用户设计课程结构 THEN 系统 SHALL 推荐五育课程的优秀模块
4. WHEN 推荐案例 THEN 系统 SHALL 显示案例来源、适用场景和相似度评分
5. WHEN 用户点击案例 THEN 系统 SHALL 显示案例详情和可借鉴要点
6. WHEN 用户采纳案例 THEN 系统 SHALL 将案例要素融入当前设计
7. WHEN 无相关案例 THEN 系统 SHALL 推荐通用的教育理论和方法论

### Requirement 18: 进度追踪与提醒

**User Story:** 作为校长，我希望能够查看课程设计的整体进度，并在关键节点收到提醒。

#### Acceptance Criteria

1. WHEN 用户登录 THEN 系统 SHALL 显示当前项目的整体进度（百分比）
2. WHEN 某阶段完成 THEN 系统 SHALL 更新进度条并标记该阶段为"已完成"
3. WHEN 项目停滞超过7天 THEN 系统 SHALL 发送提醒邮件给项目负责人
4. WHEN 关键阶段（如Q6育人目标）完成 THEN 系统 SHALL 通知相关团队成员
5. WHEN 查看进度详情 THEN 系统 SHALL 显示每个阶段的完成时间和参与人员
6. WHEN 设置截止日期 THEN 系统 SHALL 在临近截止时发送预警
7. WHEN 项目完成 THEN 系统 SHALL 生成项目总结报告

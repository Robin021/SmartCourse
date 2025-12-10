# Implementation Plan: RAG + AI Generation Engine

## Overview

本实施计划将RAG + AI生成引擎的开发分解为可执行的任务。任务按照依赖关系排序，确保每个任务都可以基于前序任务的成果进行开发。

## Task List

- [ ] 1. 设置向量数据库和嵌入服务基础设施
  - 配置PostgreSQL + pgvector扩展
  - 创建document_vectors和embedding_cache表
  - 实现数据库连接和迁移脚本
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 2. 实现文档处理和向量化核心功能
  - 创建DocumentProcessor类处理PDF/Word/TXT文件
  - 实现智能文本分块算法（保持段落完整性）
  - 集成嵌入模型API（OpenAI或阿里通义）
  - 实现向量存储和检索接口
  - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [ ]* 2.1 编写文档处理的属性测试
  - **Property 1: Document Processing Round Trip**
  - **Validates: Requirements 1.1, 1.2, 1.3**

- [ ]* 2.2 编写向量存储一致性的属性测试
  - **Property 2: Vector Storage Consistency**
  - **Validates: Requirements 1.3**

- [ ]* 2.3 编写文档删除级联的属性测试
  - **Property 3: Document Deletion Cascade**
  - **Validates: Requirements 1.5**

- [ ] 3. 实现语义检索功能
  - 创建VectorStore类封装pgvector操作
  - 实现相似度搜索（余弦相似度）
  - 添加HNSW索引优化查询性能
  - 实现Top-K结果返回和排序
  - 支持学校ID过滤和公共/私有范围
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [ ]* 3.1 编写搜索结果排序的属性测试
  - **Property 4: Search Result Ordering**
  - **Validates: Requirements 2.2, 2.3**

- [ ]* 3.2 编写搜索结果完整性的属性测试
  - **Property 5: Search Result Completeness**
  - **Validates: Requirements 2.4**

- [ ]* 3.3 编写学校数据隔离的属性测试
  - **Property 6: School Data Isolation**
  - **Validates: Requirements 2.5, 9.4**

- [ ]* 3.4 编写公共知识库访问的属性测试
  - **Property 7: Public Knowledge Base Access**
  - **Validates: Requirements 2.6**

- [ ] 4. 实现Prompt模板系统
  - 创建PromptTemplate数据模型（已存在，需增强）
  - 实现PromptBuilder类
  - 开发模板变量插值功能
  - 创建Q1-Q10十阶段的默认模板
  - 实现模板版本管理
  - 添加A/B测试支持
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ]* 4.1 编写模板变量插值的属性测试
  - **Property 8: Template Variable Interpolation**
  - **Validates: Requirements 3.3**

- [ ]* 4.2 编写模板结构保留的属性测试
  - **Property 9: Template Structure Preservation**
  - **Validates: Requirements 3.4**

- [ ]* 4.3 编写版本创建的属性测试
  - **Property 10: Version Creation on Modification**
  - **Validates: Requirements 3.5, 12.1, 12.2**

- [ ]* 4.4 编写A/B测试权重分布的属性测试
  - **Property 11: A/B Test Weight Distribution**
  - **Validates: Requirements 3.6**

- [ ] 5. 集成LLM服务
  - 创建LLMClient抽象接口
  - 实现阿里千问3客户端
  - 实现OpenAI客户端（备用）
  - 添加重试机制和错误处理
  - 实现流式生成支持
  - 添加token使用量统计
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ]* 5.1 编写LLM重试机制的属性测试
  - **Property 12: LLM Retry Mechanism**
  - **Validates: Requirements 4.5**

- [ ] 6. 实现内容验证和格式化
  - 创建ContentValidator类
  - 实现教育方针关键词检查
  - 添加内容结构验证
  - 实现敏感词过滤
  - 开发Markdown格式化工具
  - 实现JSON序列化/反序列化
  - _Requirements: 4.7, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [ ]* 6.1 编写内容验证关键词的属性测试
  - **Property 13: Content Validation Keywords**
  - **Validates: Requirements 5.1**

- [ ]* 6.2 编写结构化数据序列化的属性测试
  - **Property 14: Structured Data Serialization Round Trip**
  - **Validates: Requirements 5.4**

- [ ] 7. 实现完整的RAG生成流程
  - 创建GenerationService整合所有组件
  - 实现端到端生成流程：输入 → RAG检索 → Prompt构建 → LLM调用 → 验证 → 存储
  - 添加生成日志和监控
  - 实现生成结果缓存
  - _Requirements: 所有核心需求的整合_

- [ ] 8. 实现阶段数据流转
  - 修改Project模型支持阶段状态管理
  - 实现阶段完成状态更新
  - 开发前序阶段数据加载逻辑
  - 实现阶段依赖检查
  - 添加阶段修改影响提示
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

- [ ]* 8.1 编写阶段完成状态的属性测试
  - **Property 15: Stage Completion Status Update**
  - **Validates: Requirements 11.1**

- [ ]* 8.2 编写前序阶段上下文的属性测试
  - **Property 16: Previous Stage Context Inclusion**
  - **Validates: Requirements 11.2, 11.3**

- [ ] 9. 实现版本管理系统
  - 创建stage_versions集合
  - 实现VersionManager类
  - 开发版本创建和保存逻辑
  - 实现版本历史查询
  - 添加版本对比功能
  - 实现版本回滚
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

- [ ]* 9.1 编写版本回滚一致性的属性测试
  - **Property 17: Version Rollback Consistency**
  - **Validates: Requirements 12.4**

- [ ] 10. 实现诊断和评分功能
  - 创建DiagnosticService类
  - 实现SWOT量化评分算法
  - 开发五育覆盖度计算
  - 实现理论适配性评分
  - 添加结构合理性评估
  - 生成改进建议
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_

- [ ]* 10.1 编写SWOT评分计算的属性测试
  - **Property 18: SWOT Score Calculation**
  - **Validates: Requirements 13.1**

- [ ] 11. 实现协作批注功能
  - 创建annotations集合
  - 实现AnnotationManager类
  - 开发批注添加和查询API
  - 实现批注回复功能
  - 添加批注解决状态管理
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.7_

- [ ] 12. 实现投票功能
  - 创建votes集合
  - 实现VoteManager类
  - 开发投票创建和管理API
  - 实现投票统计和结果应用
  - _Requirements: 14.5, 14.6_

- [ ] 13. 实现文档导出功能
  - 创建ExportService类
  - 集成docx库生成Word文档
  - 集成pdfkit生成PDF
  - 实现PPT生成（使用pptxgenjs）
  - 开发教育文档模板
  - 实现全流程打包导出
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7_

- [ ]* 13.1 编写导出内容完整性的属性测试
  - **Property 19: Export Content Completeness**
  - **Validates: Requirements 15.3**

- [ ] 14. 实现实时协作基础设施
  - 集成WebSocket或Server-Sent Events
  - 创建RealtimeSync类
  - 实现在线用户追踪
  - 开发实时更新广播
  - 添加编辑锁机制
  - 实现冲突检测和解决
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7_

- [ ] 15. 实现智能推荐功能
  - 创建RecommendationService类
  - 实现基于RAG的案例推荐
  - 开发相似学校匹配算法
  - 添加推荐结果排序和过滤
  - 实现案例详情展示
  - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7_

- [ ] 16. 实现进度追踪和提醒
  - 创建ProgressTracker类
  - 实现进度计算逻辑
  - 开发邮件提醒服务
  - 添加截止日期管理
  - 实现项目总结报告生成
  - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7_

- [ ] 17. 实现缓存和性能优化
  - 集成Redis缓存
  - 实现嵌入向量缓存
  - 添加检索结果缓存
  - 实现生成结果缓存
  - 优化数据库查询（索引）
  - 添加请求队列机制
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [ ]* 17.1 编写嵌入缓存命中的属性测试
  - **Property 20: Embedding Cache Hit**
  - **Validates: Requirements 7.1**

- [ ] 18. 实现监控和日志系统
  - 创建Logger类
  - 实现结构化日志记录
  - 添加性能指标收集
  - 开发日志查询和筛选API
  - 实现异常告警机制
  - 添加日志轮转和归档
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

- [ ] 19. 创建API端点
  - POST /api/rag/upload - 上传文档
  - POST /api/rag/search - 语义检索
  - POST /api/generate - AI生成内容
  - GET /api/project/:id/stage/:stage - 获取阶段数据
  - POST /api/project/:id/stage/:stage - 保存阶段数据
  - GET /api/project/:id/versions - 获取版本历史
  - POST /api/project/:id/rollback - 版本回滚
  - POST /api/project/:id/annotations - 添加批注
  - POST /api/project/:id/export - 导出文档
  - _Requirements: 所有功能的API接口_

- [ ] 20. 开发前端UI组件
  - 创建StageInputForm组件（动态表单）
  - 开发ChatInterface组件（对话界面）
  - 实现VersionHistory组件（版本对比）
  - 创建AnnotationPanel组件（批注面板）
  - 开发DiagnosticDashboard组件（诊断仪表板）
  - 实现ExportDialog组件（导出对话框）
  - _Requirements: 前端交互需求_

- [ ] 21. 集成测试和端到端测试
  - 编写RAG pipeline集成测试
  - 编写生成pipeline集成测试
  - 编写协作功能集成测试
  - 使用Playwright编写E2E测试
  - _Requirements: 所有功能的集成验证_

- [ ] 22. 性能测试和优化
  - 使用k6进行负载测试
  - 分析性能瓶颈
  - 优化慢查询
  - 调整缓存策略
  - 验证响应时间目标（<30秒）
  - _Requirements: 7.x 性能需求_

- [ ] 23. 文档和部署准备
  - 编写API文档
  - 创建部署指南
  - 准备环境变量配置模板
  - 编写数据库迁移脚本
  - 创建Docker配置
  - _Requirements: 运维和维护需求_

- [ ] 24. Checkpoint - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户

## Notes

- 标记为 `*` 的任务为可选的测试任务，可根据项目进度决定是否实施
- 每个任务完成后应更新状态并进行代码审查
- 建议按顺序执行任务，因为后续任务依赖前序任务的成果
- 属性测试使用fast-check库，每个属性至少运行100次迭代

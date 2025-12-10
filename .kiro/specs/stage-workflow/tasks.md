# Implementation Plan: 十阶段课程设计工作流

## Overview

本实施计划将十阶段课程设计工作流分解为可执行的任务。任务基于已有的RAG和Prompt基础设施，专注于业务逻辑实现。

## Task List

- [x] 1. 创建LLM客户端服务
  - 实现LLMClient类封装LLM API调用
  - 支持从SystemConfig读取活跃的chat类型提供商
  - 实现重试机制（3次，间隔1s/2s/4s）
  - 添加token使用量统计
  - 支持流式响应（可选）
  - _Requirements: 12.1, 12.2, 12.4, 12.5, 12.6, 12.7_

- [x] 2. 实现Generation Service核心逻辑
  - 创建GenerationService类
  - 实现generate方法整合RAG + Prompt + LLM
  - 从vectorDb.ts调用searchSimilar进行RAG检索
  - 从getPrompt.ts获取阶段Prompt模板
  - 构建完整Prompt（用户输入+前序阶段+RAG结果+学校信息）
  - 调用LLMClient生成内容
  - 记录生成元数据（prompt, rag_results, token_usage）
  - _Requirements: 12.x, 所有阶段的生成需求_

- [x] 2.1 编写Prompt变量插值的属性测试
  - **Property 8: Prompt Variable Interpolation**
  - **Validates: Requirements 12.3**

- [x] 3. 实现内容验证服务
  - 创建ContentValidator类
  - 实现教育方针关键词检查（"五育并举"、"立德树人"）
  - 添加敏感词过滤
  - 实现内容结构验证
  - 返回验证结果和改进建议
  - _Requirements: 13.1, 13.2, 13.3, 13.5, 13.6_

- [x] 3.1 编写内容验证关键词的属性测试
  - **Property 9: Content Validation Keywords**
  - **Validates: Requirements 13.1**

- [x] 4. 实现Stage Service数据管理
  - 创建StageService类
  - 实现getStageData获取阶段数据
  - 实现saveStageInput保存用户输入
  - 实现saveStageOutput保存AI生成输出
  - 实现completeStage标记阶段完成
  - 实现getPreviousStagesContext获取前序阶段上下文
  - 实现updateProgress计算整体进度
  - _Requirements: 11.x, 所有阶段的数据管理_

- [x] 4.1 编写阶段输入持久化的属性测试
  - **Property 1: Stage Input Persistence**
  - **Validates: Requirements 1.2, 2.2, 3.1**

- [x] 4.2 编写阶段完成状态的属性测试
  - **Property 2: Stage Completion Status**
  - **Validates: Requirements 1.5, 11.4**

- [x] 4.3 编写前序阶段上下文的属性测试
  - **Property 3: Previous Stages Context Inclusion**
  - **Validates: Requirements 2.4, 3.5, 6.2**

- [x] 4.4 编写进度计算的属性测试
  - **Property 4: Progress Calculation**
  - **Validates: Requirements 11.4**

- [x] 5. 扩展Project模型
  - 修改models/Project.ts添加stages详细结构
  - 添加conversation_sessions字段
  - 添加overall_progress字段
  - 创建数据库迁移脚本（如需要）
  - _Requirements: 所有阶段的数据存储_

- [x] 6. 创建StageVersion模型
  - 创建models/StageVersion.ts
  - 定义版本数据结构
  - 添加索引（project_id + stage + version）
  - _Requirements: 15.1, 15.2, 15.3, 15.4_

- [x] 6.1 编写版本创建的属性测试
  - **Property 5: Version Creation on Generation**
  - **Validates: Requirements 15.1**

- [x] 7. 实现Q1阶段：学校课程情境
  - 创建Q1输入表单组件（SWOT 20项）
  - 实现Q1 Prompt模板（如不存在）
  - 实现SWOT量化评分算法
  - 集成RAG检索区域教育资源
  - 实现生成《学校课程资源分析》
  - 添加Q1特定的验证逻辑
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 7.1 编写SWOT评分范围的属性测试
  - **Property 6: SWOT Score Range**
  - **Validates: Requirements 1.4**

- [x] 8. 实现Q2阶段：教育哲学
  - 创建Q2输入表单（13种理论多选+开放输入）
  - 实现Q2 Prompt模板
  - 集成RAG检索哲学理论库、地域文化数据
  - 实现理论适配性评分
  - 生成核心关键词和《教育哲学陈述报告》
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [x] 9. 实现Q3阶段：办学理念
  - 创建Q3输入表单（4个价值观问题）
  - 实现Q3 Prompt模板
  - 实现核心概念生成和用户修改功能
  - 生成《办学理念详细阐释》
  - 实现理念正向性校验
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 10. 实现Q4阶段：育人目标
  - 创建Q4输入表单（11个问题分4部分）
  - 实现Q4 Prompt模板
  - 实现分步生成（精神基调→痛点→愿景→最终目标）
  - 实现五育覆盖度诊断算法
  - 生成《学校育人目标最终版本》
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [x] 10.1 编写五育覆盖度的属性测试
  - **Property 7: Five Virtues Coverage**
  - **Validates: Requirements 4.6**

- [x] 11. 实现Q5阶段：课程模式命名
  - 创建Q5输入表单（名称来源选择）
  - 实现Q5 Prompt模板
  - 实现名称适配性评分
  - 支持投票功能（如需要）
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 12. 实现Q6阶段：课程理念
  - 创建Q6输入表单（4个关键问题）
  - 实现Q6 Prompt模板
  - 集成RAG检索课程论文献
  - 实现价值取向一致性诊断
  - 生成《课程理念草案》
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 13. 实现Q7阶段：课程目标细化
  - 创建Q7输入表单（现状评估+特色载体）
  - 实现Q7 Prompt模板
  - 实现分学段目标生成
  - 实现目标达成差距分析
  - 生成《课程目标分学段细化表》
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [x] 14. 实现Q8阶段：课程结构设计
  - 创建Q8输入表单（关键词确认+框架选择+模块输入）
  - 实现Q8 Prompt模板
  - 实现核心关键词和隐喻提炼
  - 实现五育板块名称生成
  - 实现二级模块和映射矩阵
  - 实现结构合理性评分
  - 生成《校本课程结构方案初稿》
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

- [x] 15. 实现Q9阶段：课程实施方案
  - 创建Q9输入表单（实施愿景+路径选择+角色描述）
  - 实现Q9 Prompt模板
  - 集成RAG检索实施案例库
  - 实现路径可行性诊断
  - 生成实施方案和时间表
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8_

- [x] 16. 实现Q10阶段：课程评价体系
  - 创建Q10输入表单（评价体系选择+细化需求）
  - 实现Q10 Prompt模板
  - 实现335体系匹配性阐释
  - 实现五维评价设计
  - 实现评价科学性校验
  - 生成《学校课程评价体系方案》
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_

- [x] 17. 实现阶段导航和进度UI
  - 创建StageProgressBar组件（十阶段进度条）
  - 实现阶段状态显示（已完成/进行中/未开始）
  - 实现阶段跳转功能
  - 显示整体进度百分比
  - 添加依赖提示（不强制阻止）
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 18. 实现多轮对话功能
  - 扩展Project模型添加conversation_sessions
  - 实现对话历史保存和加载
  - 实现"迭代生成"功能
  - 实现对话历史滑动窗口（保留最近5轮）
  - 实现阶段切换时的会话保存/恢复
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_

- [x] 19. 实现版本管理功能
  - 创建VersionManager类
  - 实现版本自动创建（AI生成+手动修改）
  - 实现版本历史查询API
  - 创建VersionHistory UI组件
  - 实现版本对比功能
  - 实现版本回滚
  - 实现版本归档（超过20个）
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7_

- [x] 20. 实现导出功能
  - 创建ExportService类
  - 集成docx库生成Word文档
  - 实现教育文档模板
  - 实现PDF生成（使用puppeteer或pdfkit）
  - 实现PPT生成（使用pptxgenjs）
  - 实现全流程和单阶段导出
  - 创建导出API端点
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7_

- [x] 20.1 编写导出内容完整性的属性测试
  - **Property 10: Export Content Completeness**
  - **Validates: Requirements 16.5**

- [x] 21. 创建API端点
  - POST /api/project/:id/stage/:stage/input - 保存阶段输入
  - POST /api/project/:id/stage/:stage/generate - 触发AI生成
  - GET /api/project/:id/stage/:stage - 获取阶段数据
  - POST /api/project/:id/stage/:stage/complete - 标记阶段完成
  - GET /api/project/:id/versions/:stage - 获取阶段版本历史
  - POST /api/project/:id/versions/:stage/rollback - 版本回滚
  - POST /api/project/:id/export - 导出文档
  - GET /api/project/:id/progress - 获取项目进度
  - _Requirements: 所有功能的API接口_

- [x] 22. 创建前端页面和组件
  - 创建/project/[id]/stage/[stage]页面
  - 创建DynamicStageForm组件（根据阶段渲染不同表单）
  - 创建GenerationPanel组件（显示生成结果）
  - 创建ChatInterface组件（多轮对话）
  - 创建DiagnosticPanel组件（显示评分和建议）
  - 优化StageProgressBar组件
  - _Requirements: 前端交互需求_

- [x] 23. 集成测试
  - 编写Q1-Q10完整流程测试
  - 编写RAG + Generation集成测试
  - 编写版本管理集成测试
  - 编写导出功能集成测试
  - _Requirements: 所有功能的集成验证_

- [x] 24. E2E测试
  - 使用Playwright编写用户完成Q1流程测试
  - 编写阶段导航测试
  - 编写多轮对话测试
  - 编写导出功能测试
  - _Requirements: 用户体验验证_

- [x] 25. 性能优化
  - 实现生成结果缓存
  - 优化RAG检索性能
  - 添加请求队列（防止并发过载）
  - 优化数据库查询
  - _Requirements: 性能需求_

- [x] 26. 文档和部署
  - 编写API文档
  - 创建十阶段使用指南
  - 准备Prompt模板初始数据
  - 编写部署脚本
  - _Requirements: 运维需求_

- [x] 27. Checkpoint - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户

## Notes

- 所有测试任务都是必需的，确保代码质量
- 建议先实现任务1-6（基础服务），再实现任务7-16（十阶段），最后实现任务17-20（辅助功能）
- Q1-Q10的实现可以并行进行，但建议先完成Q1-Q2作为模板
- 每个阶段完成后应进行单元测试和集成测试
- 属性测试使用fast-check库，每个属性至少运行100次迭代

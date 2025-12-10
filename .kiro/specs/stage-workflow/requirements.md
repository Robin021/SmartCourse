# Requirements Document: 十阶段课程设计工作流

## Introduction

本需求文档定义智课绘教育AI产品的十阶段课程设计工作流（Q1-Q10）。该工作流是产品的核心业务流程，基于已实现的RAG和AI基础设施，实现从学校情境分析到课程评价的完整课程设计流程。

**已实现的基础设施：**
- ✅ 文档上传和向量化（Document, embedding.ts, vectorDb.ts）
- ✅ 语义检索功能（vectorDb.ts searchSimilar）
- ✅ Prompt模板管理（PromptTemplate, PromptVersion, getPrompt.ts）
- ✅ 用户认证和权限（User model, auth API）
- ✅ 项目基础数据模型（Project model）
- ✅ 存储配置（SystemConfig, S3/OSS/MinIO）

**需要实现的功能：**
- ❌ 十阶段的具体输入表单和数据结构
- ❌ RAG检索与Prompt构建的集成
- ❌ LLM调用和内容生成
- ❌ 阶段间数据流转
- ❌ 内容验证和诊断评分
- ❌ 版本管理和协作功能
- ❌ 导出功能

## Glossary

- **Stage (阶段)**: 课程设计流程的一个步骤，从Q1到Q10
- **Stage Input (阶段输入)**: 用户在某阶段填写的表单数据
- **Stage Output (阶段输出)**: AI基于输入和RAG检索生成的内容
- **Stage Status (阶段状态)**: not_started, in_progress, completed
- **Context (上下文)**: 包含前序阶段成果、RAG检索结果、学校信息的数据集合
- **Generation Request (生成请求)**: 触发AI内容生成的请求
- **Diagnostic Score (诊断评分)**: 对生成内容的量化评估

## Requirements

### Requirement 1: Q1 学校课程情境分析

**User Story:** 作为校长，我希望通过填写SWOT分析表格，让AI帮我生成学校课程资源分析报告。

#### Acceptance Criteria

1. WHEN 用户进入Q1阶段 THEN 系统 SHALL 显示SWOT表格输入界面（内部10项+外部10项）
2. WHEN 用户填写SWOT数据 THEN 系统 SHALL 实时保存到Project.stages.Q1.input
3. WHEN 用户点击"生成分析" THEN 系统 SHALL 使用Q1 Prompt模板调用AI生成《学校课程资源分析》
4. WHEN AI生成完成 THEN 系统 SHALL 计算SWOT量化评分（优势/劣势/机会/威胁各0-100分）
5. WHEN 生成内容保存 THEN 系统 SHALL 更新阶段状态为completed并记录完成时间
6. WHEN 用户修改输入 THEN 系统 SHALL 提示"内容已变更，建议重新生成"
7. WHEN RAG检索 THEN 系统 SHALL 搜索区域教育资源数据和政策要求

### Requirement 2: Q2 教育哲学陈述

**User Story:** 作为校长，我希望选择教育哲学理论并结合学校特色，生成个性化的教育哲学陈述。

#### Acceptance Criteria

1. WHEN 用户进入Q2阶段 THEN 系统 SHALL 显示13种教育哲学理论的多选列表
2. WHEN 用户选择理论后 THEN 系统 SHALL 显示时代精神、地域文化、校情信息的输入框
3. WHEN 用户填写完成 THEN 系统 SHALL 调用RAG检索哲学理论库、地域文化数据库、政策文件
4. WHEN 构建Prompt THEN 系统 SHALL 包含Q1的SWOT分析结果作为背景
5. WHEN AI生成 THEN 系统 SHALL 输出核心关键词、在地化哲学主张、《教育哲学陈述报告》
6. WHEN 生成完成 THEN 系统 SHALL 计算理论适配性评分（0-100分）
7. WHEN 用户可以 THEN 系统 SHALL 支持在线修订哲学主张

### Requirement 3: Q3 办学理念阐释

**User Story:** 作为校长，我希望基于教育哲学，提炼出简洁有力的办学理念核心概念。

#### Acceptance Criteria

1. WHEN 用户进入Q3阶段 THEN 系统 SHALL 显示4个价值观核心问题的输入框
2. WHEN 用户回答问题 THEN 系统 SHALL 基于Q2教育哲学生成价值观总结
3. WHEN AI建议核心概念 THEN 系统 SHALL 允许用户确认或自行修改（短语/句子均可）
4. WHEN 用户确认概念 THEN 系统 SHALL 生成《办学理念详细阐释》
5. WHEN 构建Prompt THEN 系统 SHALL 整合Q2哲学理论、地域文化、学校哲学成果
6. WHEN 生成内容 THEN 系统 SHALL 检查理念正向性（符合教育方针）
7. WHEN 多人协作 THEN 系统 SHALL 支持阐释内容的协作编辑

### Requirement 4: Q4 育人目标设定

**User Story:** 作为校长，我希望基于学校实际情况，制定清晰的育人目标。

#### Acceptance Criteria

1. WHEN 用户进入Q4阶段 THEN 系统 SHALL 显示11个问题分4部分（根基与灵魂、现实与挑战、愿景与特色、表达与落地）
2. WHEN 用户回答第一部分 THEN 系统 SHALL 生成核心精神基调总结
3. WHEN 用户回答第二部分 THEN 系统 SHALL 识别育人目标的痛点和支撑点
4. WHEN 用户回答第三部分 THEN 系统 SHALL 生成愿景与特色目标草案
5. WHEN 用户选择表述风格 THEN 系统 SHALL 润色生成《学校育人目标最终版本》
6. WHEN 生成完成 THEN 系统 SHALL 诊断五育覆盖度（德智体美劳各占比）
7. WHEN 五育覆盖不均 THEN 系统 SHALL 提供平衡建议

### Requirement 5: Q5 课程模式命名

**User Story:** 作为校长，我希望为学校课程体系起一个有文化内涵的名称。

#### Acceptance Criteria

1. WHEN 用户进入Q5阶段 THEN 系统 SHALL 显示名称来源选项（历史/在地文化/课程理念等）
2. WHEN 用户选择来源 THEN 系统 SHALL 基于Q2-Q4成果生成名称建议
3. WHEN AI建议名称 THEN 系统 SHALL 允许用户直接输入自定义名称
4. WHEN 生成名称 THEN 系统 SHALL 计算名称适配性评分
5. WHEN 多人协作 THEN 系统 SHALL 支持名称投票确认
6. WHEN 名称确定 THEN 系统 SHALL 保存为课程体系命名方案

### Requirement 6: Q6 课程理念陈述

**User Story:** 作为教研主任，我希望明确课程的价值取向和组织原则。

#### Acceptance Criteria

1. WHEN 用户进入Q6阶段 THEN 系统 SHALL 显示4个关键问题（课程样态、学生发展、价值一致性、目标一致性）
2. WHEN 用户回答问题 THEN 系统 SHALL 整合Q2哲学、Q3理念、Q4目标生成《课程理念草案》
3. WHEN 构建Prompt THEN 系统 SHALL 检索课程论文献和政策要求
4. WHEN 生成内容 THEN 系统 SHALL 诊断价值取向一致性
5. WHEN 用户可以 THEN 系统 SHALL 支持草案批注修改

### Requirement 7: Q7 课程目标细化

**User Story:** 作为教研主任，我希望将育人目标细化为分学段的可操作课程目标。

#### Acceptance Criteria

1. WHEN 用户进入Q7阶段 THEN 系统 SHALL 显示现状评估和特色载体输入框
2. WHEN 用户输入现状 THEN 系统 SHALL 生成课程目标设计基线
3. WHEN 用户选择维度 THEN 系统 SHALL 针对每个维度定义低/中/高学段的层次与重点
4. WHEN AI生成 THEN 系统 SHALL 输出《课程目标分学段细化表》
5. WHEN 构建Prompt THEN 系统 SHALL 检索学段课标和同类校目标案例
6. WHEN 生成完成 THEN 系统 SHALL 分析目标达成差距
7. WHEN 用户可以 THEN 系统 SHALL 支持学段目标调整批注

### Requirement 8: Q8 课程结构设计

**User Story:** 作为教研主任，我希望设计完整的课程结构，包括五育课程群和二级模块。

#### Acceptance Criteria

1. WHEN 用户进入Q8阶段 THEN 系统 SHALL 从Q1-Q7提炼核心关键词和隐喻
2. WHEN 用户确认关键词 THEN 系统 SHALL 推荐顶层逻辑框架（五育并举/核心素养/主题域/自创）
3. WHEN 用户选择五育并举 THEN 系统 SHALL 生成五育一级板块名称（结合隐喻）
4. WHEN 用户确认板块名 THEN 系统 SHALL 为每个课程群生成二级模块（国家基础/品牌/校本社团/地方研学）
5. WHEN 用户输入模块 THEN 系统 SHALL 建立模块×目标×三阶段映射矩阵
6. WHEN 用户调整支撑强度 THEN 系统 SHALL 更新映射矩阵（0-3分代表教学活动比例）
7. WHEN 用户选择文档风格 THEN 系统 SHALL 生成《校本课程结构方案初稿》
8. WHEN 生成完成 THEN 系统 SHALL 评估结构合理性评分

### Requirement 9: Q9 课程实施方案

**User Story:** 作为教研主任，我希望将课程结构转化为可执行的实施方案。

#### Acceptance Criteria

1. WHEN 用户进入Q9阶段 THEN 系统 SHALL 自动导入Q1-Q8数据
2. WHEN 用户描述实施愿景 THEN 系统 SHALL 生成《实施愿景与导向》
3. WHEN 用户选择实施路径 THEN 系统 SHALL 生成《学校课程实施路径初稿》
4. WHEN 用户描述教师角色和学习方式 THEN 系统 SHALL 生成《学校课程实施方案(草案)》
5. WHEN 用户选择模块 THEN 系统 SHALL 建立二级模块与实施路径的映射
6. WHEN 用户确认学段 THEN 系统 SHALL 生成《学段课程实施时间表》和《活动样例库》
7. WHEN 构建Prompt THEN 系统 SHALL 检索实施方式案例库和场地资源数据
8. WHEN 生成完成 THEN 系统 SHALL 诊断路径可行性

### Requirement 10: Q10 课程评价体系

**User Story:** 作为教研主任，我希望建立科学的课程评价体系。

#### Acceptance Criteria

1. WHEN 用户进入Q10阶段 THEN 系统 SHALL 自动导入Q1-Q9数据
2. WHEN 用户选择评价体系 THEN 系统 SHALL 推荐"335成长体系"并阐释匹配性
3. WHEN 用户确认体系 THEN 系统 SHALL 生成五维（德智体美劳）评价设计
4. WHEN 用户要求细化 THEN 系统 SHALL 设计激励机制（如贴纸-奖章-称号）
5. WHEN 用户选择文档风格 THEN 系统 SHALL 生成《学校课程评价体系方案》
6. WHEN 生成内容 THEN 系统 SHALL 包含评价理念、335模型、三全原则、项目化评价要素
7. WHEN 用户需要 THEN 系统 SHALL 提供视觉导图建议
8. WHEN 生成完成 THEN 系统 SHALL 校验评价科学性

### Requirement 11: 阶段导航和进度管理

**User Story:** 作为教师用户，我希望清楚地看到当前进度，并能在阶段间自由跳转。

#### Acceptance Criteria

1. WHEN 用户打开项目 THEN 系统 SHALL 显示十阶段进度条（已完成/进行中/未开始）
2. WHEN 用户点击某阶段 THEN 系统 SHALL 跳转到该阶段的输入界面
3. WHEN 阶段有依赖关系 THEN 系统 SHALL 提示但不强制阻止跳转
4. WHEN 用户完成某阶段 THEN 系统 SHALL 更新整体进度百分比
5. WHEN 用户查看项目列表 THEN 系统 SHALL 显示每个项目的进度
6. WHEN 项目停滞超过7天 THEN 系统 SHALL 发送提醒邮件

### Requirement 12: LLM生成服务

**User Story:** 作为系统，我需要调用配置的LLM生成教育内容。

#### Acceptance Criteria

1. WHEN 接收生成请求 THEN 系统 SHALL 从SystemConfig读取活跃的chat类型LLM配置
2. WHEN 构建Prompt THEN 系统 SHALL 使用getPrompt获取对应阶段的模板
3. WHEN 插值变量 THEN 系统 SHALL 包含用户输入、前序阶段成果、RAG检索结果、学校信息
4. WHEN 调用LLM THEN 系统 SHALL 设置temperature=0.7, max_tokens=2000
5. WHEN LLM返回 THEN 系统 SHALL 提取生成内容并记录token使用量
6. WHEN 调用失败 THEN 系统 SHALL 重试最多3次，间隔递增（1s, 2s, 4s）
7. WHEN 重试仍失败 THEN 系统 SHALL 返回友好错误信息

### Requirement 13: 内容验证和格式化

**User Story:** 作为系统，我需要验证AI生成的内容符合教育规范。

#### Acceptance Criteria

1. WHEN AI生成内容 THEN 系统 SHALL 检查是否包含"五育并举"或"立德树人"等关键词
2. WHEN 内容缺少关键词 THEN 系统 SHALL 标记为"需补充"并提示用户
3. WHEN 内容通过验证 THEN 系统 SHALL 按Markdown格式保存
4. WHEN 生成结构化数据 THEN 系统 SHALL 转换为JSON格式
5. WHEN 内容包含敏感词 THEN 系统 SHALL 拦截并要求重新生成
6. WHEN 验证失败 THEN 系统 SHALL 记录失败原因并允许用户手动修改

### Requirement 14: 多轮对话和迭代优化

**User Story:** 作为教师用户，我希望能够与AI对话来优化生成的内容。

#### Acceptance Criteria

1. WHEN 用户开始某阶段 THEN 系统 SHALL 创建新的对话会话
2. WHEN 用户发送修改建议 THEN 系统 SHALL 将建议添加到会话历史
3. WHEN 构建Prompt THEN 系统 SHALL 包含最近5轮对话历史
4. WHEN 用户点击"迭代生成" THEN 系统 SHALL 基于当前内容和建议重新生成
5. WHEN 对话历史过长 THEN 系统 SHALL 使用滑动窗口保留最相关的对话
6. WHEN 用户切换阶段 THEN 系统 SHALL 保存当前会话状态
7. WHEN 用户返回之前阶段 THEN 系统 SHALL 恢复该阶段的对话历史

### Requirement 15: 版本管理

**User Story:** 作为教师用户，我希望能够查看和恢复之前的内容版本。

#### Acceptance Criteria

1. WHEN AI生成新内容 THEN 系统 SHALL 自动创建新版本记录
2. WHEN 用户手动修改 THEN 系统 SHALL 创建修改版本并记录修改者
3. WHEN 用户查看版本历史 THEN 系统 SHALL 显示时间线列表
4. WHEN 用户选择两个版本 THEN 系统 SHALL 显示差异对比
5. WHEN 用户选择恢复 THEN 系统 SHALL 将选定版本设为当前版本
6. WHEN 版本超过20个 THEN 系统 SHALL 保留关键版本并归档旧版本
7. WHEN 多人协作 THEN 系统 SHALL 记录每个版本的贡献者

### Requirement 16: 导出功能

**User Story:** 作为教师用户，我希望将课程方案导出为专业文档。

#### Acceptance Criteria

1. WHEN 用户点击导出 THEN 系统 SHALL 显示格式选项（Word/PDF/PPT）
2. WHEN 选择Word THEN 系统 SHALL 使用教育文档模板生成Word文件
3. WHEN 选择PDF THEN 系统 SHALL 生成带目录和页码的PDF
4. WHEN 选择PPT THEN 系统 SHALL 生成包含结构图的演示文稿
5. WHEN 选择导出范围 THEN 系统 SHALL 支持全流程或单阶段导出
6. WHEN 导出完成 THEN 系统 SHALL 提供下载链接
7. WHEN 用户选择模板 THEN 系统 SHALL 提供教育局备案模板等选项

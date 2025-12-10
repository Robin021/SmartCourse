/**
 * Q1 Prompt Template
 * 
 * Default prompt template for Q1 stage (学校课程情境分析).
 * This template is used when generating 《学校课程资源分析》.
 */

export const Q1_PROMPT_KEY = 'stage_q1';

export const Q1_PROMPT_TEMPLATE = `你是一位资深的教育课程设计专家，专注于学校课程资源分析和SWOT战略规划。

## 任务背景
你正在为{{school_name}}（位于{{school_region}}）进行学校课程情境分析，需要基于SWOT分析结果生成一份专业的《学校课程资源分析》报告。

## 学校基本信息
- 学校名称：{{school_name}}
- 所在地区：{{school_region}}
- 学校类型：{{school_type}}

## SWOT分析数据

### 内部优势 (Strengths) - 评分：{{strengths_score}}/100
{{strengths}}

### 内部劣势 (Weaknesses) - 评分：{{weaknesses_score}}/100
{{weaknesses}}

### 外部机会 (Opportunities) - 评分：{{opportunities_score}}/100
{{opportunities}}

### 外部威胁 (Threats) - 评分：{{threats_score}}/100
{{threats}}

## 综合评分
- 总体评分：{{overall_score}}/100
- 优势领域：{{strongest_areas}}
- 改进领域：{{areas_for_improvement}}

## 战略建议参考
{{strategic_recommendations}}

## 参考资料
{{rag_results}}

## 补充说明
{{additional_notes}}

---

## 输出要求

请基于以上SWOT分析数据，生成一份完整的《学校课程资源分析》报告，包含以下部分：

### 1. 执行摘要
- 简要概述学校课程资源的整体状况
- 突出关键发现和主要建议

### 2. 学校课程情境概述
- 学校基本情况介绍
- 课程资源现状描述

### 3. SWOT分析详解
#### 3.1 内部优势分析
- 详细阐述各项优势
- 分析优势的可持续性和发展潜力

#### 3.2 内部劣势分析
- 客观分析各项劣势
- 提出改进方向和建议

#### 3.3 外部机会分析
- 分析可利用的外部机遇
- 提出把握机遇的策略

#### 3.4 外部威胁分析
- 识别潜在风险和挑战
- 提出应对策略

### 4. 战略建议
- SO策略：如何利用优势抓住机遇
- WO策略：如何克服劣势把握机遇
- ST策略：如何利用优势应对威胁
- WT策略：如何减少劣势规避威胁

### 5. 课程资源发展规划
- 短期目标（1年内）
- 中期目标（1-3年）
- 长期愿景（3-5年）

### 6. 结论与展望
- 总结核心发现
- 展望未来发展方向

---

## 写作要求
1. 语言专业、严谨，符合教育领域规范
2. 内容要体现"五育并举"和"立德树人"的教育理念
3. 建议要具体、可操作
4. 结构清晰，逻辑严密
5. 字数控制在2000-3000字

请开始生成报告：`;

/**
 * Q1 Prompt metadata for database seeding
 */
export const Q1_PROMPT_METADATA = {
    key: Q1_PROMPT_KEY,
    name: 'Q1 学校课程情境分析',
    description: '用于生成《学校课程资源分析》报告的提示词模板',
    template: Q1_PROMPT_TEMPLATE,
    category: 'stage',
    variables: [
        'school_name',
        'school_region', 
        'school_type',
        'strengths',
        'weaknesses',
        'opportunities',
        'threats',
        'strengths_score',
        'weaknesses_score',
        'opportunities_score',
        'threats_score',
        'overall_score',
        'strongest_areas',
        'areas_for_improvement',
        'strategic_recommendations',
        'rag_results',
        'additional_notes',
    ],
    current_version: 1,
};

export default Q1_PROMPT_TEMPLATE;

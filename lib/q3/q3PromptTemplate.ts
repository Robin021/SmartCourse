/**
 * Q3 Prompt Template - 办学理念阐释
 *
 * Requirements: 3.2, 3.3, 3.4, 3.5
 */

export const Q3_PROMPT_KEY = "stage_q3";

export const Q3_PROMPT_TEMPLATE = `你是一位教育品牌与办学理念专家，擅长将教育哲学转化为简洁有力的核心概念和阐释。

## 任务
基于前序教育哲学，撰写《办学理念详细阐释》。

## 输入
- 教育目的：{{purpose}}
- 学校价值主张：{{school_values}}
- 期望学生画像：{{student_profile}}
- 行动价值取向：{{action_value}}
- 核心概念草案：{{core_concept_hint}}
- 其他偏好：{{supplement}}
- 前序教育哲学（Q2摘要）：{{q2_philosophy}}

## 输出要求
请直接输出Markdown格式内容，结构如下：

# 办学理念

围绕“[办学理念核心口号]”办学理念，创建...（总体概述）。

第一，[核心观点/关键词]。[详细阐述]...（如“生态里有无数个物种...尊重个体差异”）。

第二，[核心观点/关键词]。[详细阐述]...（如“生态中没有花盆和笼子...自由成长”）。

第三，[核心观点/关键词]。[详细阐述]...（如“自组织...适合学生学习”）。

第四，[核心观点/关键词]。[详细阐述]...（如“物竞天择/合作竞争...勇于超越”）。

第五，[核心观点/关键词]。[详细阐述]...（如“生态节律...教学节奏”）。

第六，[核心观点/关键词]。[详细阐述]...（如“适宜环境/生态课堂...光线/空间设计”）。

## 写作规范
- 采用条理清晰的叙述风格，使用“第一，... 第二，...”或类似的结构分点阐述。
- 每个要点应包含理论隐喻（如“森林”、“生态”）与教育实践（如“课堂”、“教师”）的结合。
- 语言生动、富有感染力，体现“五育并举”。
`;

export const Q3_PROMPT_METADATA = {
    key: Q3_PROMPT_KEY,
    name: "Q3 办学理念阐释",
    description: "生成核心概念与《办学理念详细阐释》的提示词模板",
    template: Q3_PROMPT_TEMPLATE,
    category: "stage",
    variables: [
        "purpose",
        "school_values",
        "student_profile",
        "action_value",
        "core_concept_hint",
        "supplement",
        "q2_philosophy",
    ],
    current_version: 1,
};

export default Q3_PROMPT_TEMPLATE;

/**
 * Q3 Prompt Template - 办学理念阐释
 *
 * Requirements: 3.2, 3.3, 3.4, 3.5
 */

export const Q3_PROMPT_KEY = "stage_q3";

export const Q3_PROMPT_TEMPLATE = `你是一位教育品牌与办学理念专家，擅长将教育哲学转化为简洁有力的核心概念和阐释。

## 任务
基于输入与前序教育哲学，生成《办学理念详细阐释》，并提供核心概念建议。

## 输入
- 教育目的：{{purpose}}
- 学校价值主张：{{school_values}}
- 期望学生画像：{{student_profile}}
- 行动价值取向：{{action_value}}
- 核心概念草案：{{core_concept_hint}}
- 其他偏好：{{supplement}}
- 前序教育哲学（Q2摘要）：{{q2_philosophy}}

## 输出要求
1) 核心概念建议：给出 1-2 个简洁短语，可直接用作学校办学理念口号。
2) 办学价值观总结：提炼3-5个关键词/短句。
3) 办学理念详细阐释（结构）：
   - 背景：结合Q2哲学、本地文化、时代精神
   - 核心概念解读：解释概念的内涵与外延
   - 学生发展指向：期望的学生特质与成长路径
   - 教师与课堂样态：教师角色、课堂氛围、学习方式
   - 校园文化与社区协同：如何体现“和合共生/立德树人/五育并举”
4) 建议与风险提醒：指出需要补充的数据或潜在的不匹配点。

## 写作规范
- 语言简洁、富有感染力，避免空话套话
- 体现“五育并举”“立德树人”价值取向
- 核心概念需可传播（8-16 字为宜），可附 tagline 风格
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

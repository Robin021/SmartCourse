/**
 * Q4 Prompt Template - 育人目标
 *
 * Requirements: 4.2, 4.3, 4.4, 4.5, 4.7
 */

export const Q4_PROMPT_KEY = "stage_q4";

export const Q4_PROMPT_TEMPLATE = `你是一位育人目标与课程目标设计专家，擅长将学校实际与未来愿景转化为可落地的育人目标。

## 输入
- 办学历史/传统：{{history_keywords}}
- 校训/办学理念：{{motto}}
- 学生比喻：{{student_metaphor}}
- 学生构成/优缺点：{{student_background}} | {{student_strengths_weaknesses}}
- 教师优势：{{teacher_strengths}}
- 校园硬件：{{campus_hardware}}
- 未来学生特质：{{future_traits}}
- 五育重点排序：{{five_virtues_priority}}
- 社区资源：{{community_resources}}
- 表述风格：{{expression_style}}
- 落地偏好：{{landing_preferences}}
- 前序成果：Q2哲学={{q2_philosophy}}；Q3概念={{q3_concept}}

## 任务
生成《学校育人目标最终版本》，并结合五育诊断给出平衡建议。

## 输出要求
1) 核心精神基调（1-2句）——结合历史/校训/比喻
2) 痛点与支撑点分析 —— 基于学生/教师/硬件
3) 愿景与特色目标草案 —— 结合未来特质/社区资源
4) 五育覆盖度要点 —— 按“德智体美劳”说明各维度重点
5) 育人目标最终版本 —— 4-6 条可传播的目标语句
6) 风格与落地建议 —— 呼应表述风格，给出实施提示（课程/活动/评价）
7) 诊断提醒 —— 补充数据或平衡建议（尤其低覆盖维度）

## 写作规范
- 语言简洁有力，避免空话套话
- 体现“五育并举”“立德树人”，强调可操作与场景化
- 如有未填信息，可给出建议性的补充需求
`;

export const Q4_PROMPT_METADATA = {
    key: Q4_PROMPT_KEY,
    name: "Q4 育人目标",
    description: "生成《学校育人目标最终版本》与五育覆盖诊断的提示词模板",
    template: Q4_PROMPT_TEMPLATE,
    category: "stage",
    variables: [
        "history_keywords",
        "motto",
        "student_metaphor",
        "student_background",
        "student_strengths_weaknesses",
        "teacher_strengths",
        "campus_hardware",
        "future_traits",
        "five_virtues_priority",
        "community_resources",
        "expression_style",
        "landing_preferences",
        "q2_philosophy",
        "q3_concept",
    ],
    current_version: 1,
};

export default Q4_PROMPT_TEMPLATE;

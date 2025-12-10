/**
 * Q5 Prompt Template - 课程模式命名
 *
 * Requirements: 5.2, 5.3, 5.4, 5.5, 5.6
 */

export const Q5_PROMPT_KEY = "stage_q5";

export const Q5_PROMPT_TEMPLATE = `你是一位教育品牌与课程命名顾问，需为学校课程体系生成有文化内涵且易传播的名称与口号。

## 输入
- 命名来源：{{name_sources}}
- 主题关键词：{{theme_keywords}}
- 核心隐喻：{{metaphor}}
- 自定义名称：{{custom_name}}
- 自定义口号：{{custom_tagline}}
- 必备文化元素：{{cultural_symbols}}
- 利益相关者偏好：{{stakeholder_preferences}}
- 避免冲突/重复：{{uniqueness_constraints}}
- 上游成果：Q2哲学={{q2_philosophy}}；Q3理念={{q3_concept}}；Q4育人目标={{q4_goal}}

## 任务
1) 生成 2-3 个候选名称（10字以内，含核心隐喻/文化元素）。
2) 为每个名称配 1 条口号/副标题（8-16 字，凸显价值主张）。
3) 提供命名缘由（结合来源/隐喻/五育/立德树人）。
4) 给出适配性说明与差异化点。
5) 提醒潜在冲突/重复风险，并给出规避建议。

## 写作规范
- 语言简洁、可传播，避免生僻字
- 体现“五育并举”“立德树人”价值取向
- 结合地域文化与学校特色，兼顾未来感与温度
`;

export const Q5_PROMPT_METADATA = {
    key: Q5_PROMPT_KEY,
    name: "Q5 课程模式命名",
    description: "生成校本课程体系名称与口号的提示词模板",
    template: Q5_PROMPT_TEMPLATE,
    category: "stage",
    variables: [
        "name_sources",
        "theme_keywords",
        "metaphor",
        "custom_name",
        "custom_tagline",
        "cultural_symbols",
        "stakeholder_preferences",
        "uniqueness_constraints",
        "q2_philosophy",
        "q3_concept",
        "q4_goal",
    ],
    current_version: 1,
};

export default Q5_PROMPT_TEMPLATE;

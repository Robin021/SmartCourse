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
撰写《学校育人目标》，包含核心陈述与五育并举的详细对照表。

## 输出要求
请直接输出Markdown格式内容，结构如下：

# 育人目标：[核心目标口号]

[背景段落]：引用政策背景（如“及五育并举”），结合学校具体的办学理念，说明育人目标的出发点。

# （一）以[核心文化/理念]为根，以五育并举为基的育人目标

[核心陈述]：
[学校名称]以“[核心目标列表]”（如“品德高尚、博学善思...”）为学生成长目标。
*关键融合*：请明确指出Q2中确定的核心隐喻（如“向阳花”）的不同部位如何对应五育。例如：“德育是根，智育是茎，美育是花...”。

[详细对照表]：
请输出一个Markdown表格，严格按照以下列格式：
| 维度/五育 | 核心目标 | 定义与标准 | [核心文化]体现 | 实施途径 |
| :--- | :--- | :--- | :--- | :--- |
| 德育 (Roots/根) | ... | 行为习惯、道德品质... | 如何体现文化情感... | 课程/活动... |
| 智育 (Trunk/茎) | ... | 学业水平、思维能力... | 如何体现文化认知... | ... |
| 体育 (Stems/枝) | ... | 身心健康... | ... | ... |
| 美育 (Flowers/花) | ... | 审美情趣... | ... | ... |
| 劳育 (Fruits/果) | ... | 劳动技能... | ... | ... |

*注：括号内的部位（如Roots/根）应根据Q2确定的实际隐喻进行调整。*

## 写作规范
- **隐喻一致性**：表格中的五育必须与核心隐喻的部位一一对应，形成有机的生命体结构。
- **具体充实**：确保每个维度的描述具体、可操作。
- **文化自信**：强调本土特色与学校文化的深度融合。
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

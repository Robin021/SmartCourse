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
[学校名称]以“[核心目标列表]”（如“品德高尚、博学善思...”）为学生成长目标。这些目标涵盖了德、智、体、美、劳五方面...（简述学校特色与文化自信的融入）。

[详细对照表]：
创建一个Markdown表格，列标题为核心目标的各个维度（如“品德高尚”、“博学善思”等，对应五育）。
- **第一行**：定义与标准。描述每个维度对行为习惯、学业、身心、艺术、劳动等方面的具体要求。
- **第二行**：[核心文化]体现。描述在每个维度中如何融入学校的核心文化自信（如“文化情感”、“文化认知”、“文化交流”等）。
- **第三行**：五育对应与课程/活动。说明每个维度对应的五育领域（德育、智育等）及主要的实施途径（课程、活动等）。
- **表格底部**（可选合并行）：总结核心理念（如“文化自信”）。

## 写作规范
- 语言简洁有力，表格内容要具体充实。
- 确保核心目标与五育严密对应。
- 强调文化自信与本土特色的融入。
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

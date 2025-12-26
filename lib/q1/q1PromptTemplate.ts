/**
 * Q1 Prompt Template
 * 
 * Default prompt template for Q1 stage (学校现况与背景分析).
 * This template is used when generating 《学校现况与背景分析》.
 */

export const Q1_PROMPT_KEY = 'stage_q1';

export const Q1_PROMPT_TEMPLATE = `你是一名专业教育规划专家，擅长将学校的文化隐喻（如“向阳花”、“森林”等）与严谨的办学分析相结合。
你的任务是撰写《学校课程顶层设计方案》的第一部分：学校现况与背景分析。

【写作风格要求】
1. **叙事性开篇**：允许并鼓励使用富有感召力的语言作为开篇，引用学校的文化隐喻（如有），建立情感连接，体现“本真教育”或类似的教育哲学。不要写成枯燥的行政公文，要像讲述一个关于成长的故事。
2. **专业与温情并重**：在数据分析部分保持客观严谨，但在背景与文化描述部分要富有张力。
3. **结构清晰**：使用Markdown的一级标题 (#) 和二级标题 (##) 组织内容。

【学校资料（结构化输入）】
- 学校名称：{{school_name}}
- 所在地区：{{school_region}}
- 学校类型：{{school_type}}
- 内部优势 (Strengths)：{{strengths}}
- 内部劣势 (Weaknesses)：{{weaknesses}}
- 外部机会 (Opportunities)：{{opportunities}}
- 外部威胁 (Threats)：{{threats}}
- 综合评分：{{overall_score}}/100
- 优势领域：{{strongest_areas}}
- 改进领域：{{areas_for_improvement}}
- 战略建议参考：{{strategic_recommendations}}
- 补充说明：{{additional_notes}}
- 其他输入（如有）：{{user_input}}

【参考资料（如有）】
{{rag_results}}

【文件结构与内容要求】

# 学校现况与背景分析

## 一、 学校发展愿景（序言）
*请在此处撰写一段富有感染力的序言。结合学校的名称、地域文化或核心隐喻（例如“向阳花”），阐述学校的教育理想与时代使命。可以参考“教育像农业，而不是工业”这样的哲思。*

## 二、 学校基本现况
（1）班级与学生数
*请根据输入的学校类型，整理成清晰的表格或段落描述。*

（2）师资队伍
*描述教职工的整体情况，突出师资的优势或特点。*

## 三、 背景分析 (SWOT)
*请基于提供的SWOT数据，进行深入的分析。不要仅仅列出条目，要分析这些因素如何影响学校的发展方向。*

**SWOT 分析表**
| 面向 | 优势 (Strengths) | 弱点 (Weaknesses) | 机会 (Opportunities) | 威胁 (Threats) |
| :--- | :--- | :--- | :--- | :--- |
| 师资现状 | ... | ... | ... | ... |
| 学生学习 | ... | ... | ... | ... |
| 家长需求 | ... | ... | ... | ... |
| 学校特色 | ... | ... | ... | ... |
| 社区环境 | ... | ... | ... | ... |

## 四、 关键发现与发展契机
*总结SWOT分析的核心结论，指出学校在当前背景下最大的发展契机是什么。*

【资料处理规则】
- 若资料不完整，可使用符合教育常识的通用描述进行补充，但不得虚构地名和具体人名。
- 保持整体文风的统一性，将数据分析融入到学校发展的宏大叙事中。`;

/**
 * Q1 Prompt metadata for database seeding
 */
export const Q1_PROMPT_METADATA = {
    key: Q1_PROMPT_KEY,
    name: "Q1 学校现况与背景分析",
    description: "用于生成《学校现况与背景分析》文件的提示词模板",
    template: Q1_PROMPT_TEMPLATE,
    category: "stage",
    variables: [
        "school_name",
        "school_region",
        "school_type",
        "strengths",
        "weaknesses",
        "opportunities",
        "threats",
        "overall_score",
        "strongest_areas",
        "areas_for_improvement",
        "strategic_recommendations",
        "additional_notes",
        "user_input",
        "rag_results",
    ],
    current_version: 1,
};

export default Q1_PROMPT_TEMPLATE;

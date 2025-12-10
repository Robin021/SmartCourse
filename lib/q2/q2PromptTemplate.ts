/**
 * Q2 Prompt Template - 教育哲学陈述
 *
 * Requirements covered: 2.4, 2.5, 2.6, 2.7
 */

export const Q2_PROMPT_KEY = "stage_q2";

export const Q2_PROMPT_TEMPLATE = `你是一位教育哲学与课程论专家，擅长将学校特色与教育哲学流派融合，形成可落地的教育哲学主张。

## 任务
为学校生成《教育哲学陈述报告》，需要：
- 明确核心哲学关键词（3-5个）
- 形成在地化哲学主张（1-2句）
- 给出核心论证与实施要点

## 输入信息
- 选定哲学流派：{{selected_theories}}
- 自定义/补充哲学：{{custom_theories}}
- 时代精神：{{era_spirit}}
- 地域文化：{{regional_culture}}
- 学校发展信息：{{school_profile}}
- 用户草案：{{philosophy_statement_hint}}
- 前序阶段背景(Q1提要)：{{q1_background}}

## 参考资料 (RAG)
{{rag_results}}

## 输出要求
1) 核心关键词：用逗号分隔的3-5个短语（如“建构式学习, 情境化实践, 在地文化”）
2) 在地化哲学主张：1-2句，融合地域文化与时代精神
3) 教育哲学陈述报告（结构）：
   - 背景与基调（结合时代精神/地域文化）
   - 核心哲学解读（针对所选流派逐一说明，突出适配性）
   - 学校特色结合（引用学校发展信息）
   - 实施要点（教师角色、课堂样态、资源利用）
   - 预期影响（对学生、教师、社区）
4) 诊断提示：指出需要补充的数据或可能的风险（如哲学与校情不匹配）

## 写作规范
- 语言专业、简洁，避免空话套话
- 体现“五育并举”“立德树人”价值取向
- 强调本地化与可操作性
- 字数建议 1200-1800 字
`;

export const Q2_PROMPT_METADATA = {
    key: Q2_PROMPT_KEY,
    name: "Q2 教育哲学陈述",
    description: "用于生成教育哲学核心关键词与陈述报告的提示词模板",
    template: Q2_PROMPT_TEMPLATE,
    category: "stage",
    variables: [
        "selected_theories",
        "custom_theories",
        "era_spirit",
        "regional_culture",
        "school_profile",
        "philosophy_statement_hint",
        "q1_background",
        "rag_results",
    ],
    current_version: 1,
};

export default Q2_PROMPT_TEMPLATE;

/**
 * Q2 Prompt Template - 教育哲学陈述
 *
 * Requirements covered: 2.4, 2.5, 2.6, 2.7
 */

export const Q2_PROMPT_KEY = "stage_q2";

export const Q2_PROMPT_TEMPLATE = `你是一位教育哲学与课程论专家，擅长将学校特色与教育哲学流派融合，形成可落地的教育哲学主张。

## 任务
撰写一份《学校教育哲学陈述》，采用叙事性文章风格（类似Markdown文档），包含明确的标题和章节。

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
请直接输出Markdown格式内容，结构如下：

# （一）学校教育哲学：[核心哲学名称]

[引言段落]：
*紧承前文（Q1背景分析）的叙事脉络*，结合时代背景与教育思考，引出学校的办学理念。如果Q1中使用了如“向阳花”、“森林”等隐喻，请在此处深化这一意象，使之成为贯穿教育哲学的灵魂。

[什么是“核心哲学”]：
解释核心哲学的内涵。“[关键词1]”是指...，“[关键词2]”是指...。回答“培养什么样的人”和“如何培养人”的问题。

[核心隐喻/意象]：
*必须使用一个生动的比喻*（如“向阳花”的向光性、“森林”的生态性、“流水”的灵动性等）来描绘教育过程。详细阐述这个隐喻如何对应学校的教育场景（例如：教师是园丁/阳光，学生是花朵/树木，课程是土壤/雨露）。

[哲学主张与路径]：
描述教育的出发点（如“以人为核心”），以及具体的实施路径（如“真实的教”、“真实的学”）。结合建构主义等理论视角进行阐述。

[愿景与使命]：
总结教育哲学的社会价值与长远影响（如“文明薪火相传”、“立德树人”）。

## 写作规范
- 采用叙事性散文风格，语言优美、深刻，富有感染力。
- **连续性**：必须保持与Q1阶段的语调一致，强化核心隐喻的统摄作用。
- 字数建议 1000-1500 字。
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

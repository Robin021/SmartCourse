/**
 * Q8 Prompt Template - 课程结构设计
 */

export const Q8_PROMPT_KEY = "stage_q8";

export const Q8_PROMPT_TEMPLATE = `你是一位课程结构设计专家，需基于关键词、隐喻和顶层框架，生成《校本课程结构方案初稿》，并给出合理性评分与建议。

## 输入
- 核心关键词：{{core_keywords}}
- 核心隐喻：{{core_metaphor}}
- 顶层框架：{{framework}}
- 一级板块名称：{{board_names}}
- 二级模块：{{modules_plan}}
- 映射备注：{{mapping_notes}}
- 文档风格：{{doc_style}}
- 补充说明：{{additional_notes}}
- 上游成果：Q2哲学={{q2_philosophy}}；Q3理念={{q3_concept}}；Q4目标={{q4_goal}}；Q5命名={{q5_name}}；Q6课程理念={{q6_concept}}
- 参考资料：{{rag_results}}

## 任务
1) 生成课程结构方案，包含：
   - 核心价值摘要与隐喻解读
   - 顶层框架选择理由（若为五育并举，说明五育对应）
   - 一级板块（结合隐喻/文化意象），并列出二级模块（四层结构：国家/品牌/校本社团/地方研学，可缺省）
   - 模块×目标×三阶段映射要点（可用文字描述支撑强度）
   - 结构合理性点评与改进建议
2) 提供 3-5 个关键词/短句作为摘要。

## 写作规范
- 语言简洁，突出可传播的板块命名与模块描述
- 体现五育并举、立德树人、在地化
- 对缺失信息给出建议补充
`;

export const Q8_PROMPT_METADATA = {
    key: Q8_PROMPT_KEY,
    name: "Q8 课程结构设计",
    description: "生成《校本课程结构方案初稿》与结构合理性建议的提示词模板",
    template: Q8_PROMPT_TEMPLATE,
    category: "stage",
    variables: [
        "core_keywords",
        "core_metaphor",
        "framework",
        "board_names",
        "modules_plan",
        "mapping_notes",
        "doc_style",
        "additional_notes",
        "q2_philosophy",
        "q3_concept",
        "q4_goal",
        "q5_name",
        "q6_concept",
        "rag_results",
    ],
    current_version: 1,
};

export default Q8_PROMPT_TEMPLATE;

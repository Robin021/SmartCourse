/**
 * Q8 Prompt Template - 课程结构设计
 */

export const Q8_PROMPT_KEY = "stage_q8";

export const Q8_PROMPT_TEMPLATE = `你是一位课程结构设计专家，需基于关键词、隐喻和顶层框架，生成《课程结构方案》。

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
撰写《课程结构》，采用图文结合的叙述方式。

## 输出要求
请直接输出Markdown格式内容，结构如下：

# 课程结构

[隐喻与总体架构]：
根据[核心理论]（如多元智能），我们的“[Q5课程名称]”包括“[板块1]”、“[板块2]”...六大课程。如图所示，“[Q5课程名称]”是中心，围绕着它的是[板块描述]...（解释结构图含义）。

[配图占位符]：
请根据课程结构，生成一个 Mermaid 格式的架构图（如思维导图 \`mindmap\` 或 架构图 \`graph TD\`），直观展示课程的板块与模块关系。
**重要提示：所有节点标签必须使用英文双引号 (") 包裹，不允许使用中文引号。如有 Mindmap，必须严格使用缩进分层，每个节点独占一行。**
\`\`\`mermaid
mindmap
  root(("课程名称"))
    "板块1"
      "模块A"
      "模块B"
    "板块2"
      "模块C"
      "模块D"
\`\`\`
*(以上仅为示例，请根据实际内容生成)*
图1 [学校名称]“[Q5课程名称]”结构示意图


[整合说明]：
我校将现有的国家课程，整合为[N]大园地...包含国家课程、地方课程、校本课程...（解释三级课程整合）。

[各板块详细介绍]：
使用列表形式介绍每个板块：
- **[板块1名称]课程**：关注[核心领域]（如语言与交流），整合国家课程中的[学科列表]...
- **[板块2名称]课程**：关注[核心领域]，整合...
- ...（覆盖所有板块）

[科学整合总结]：
每一类课程都体现着三级课程的科学整合...（解释比例和原则）。这样的课程架构既兼顾...又通过拓展性...实现[学校愿景]。

[特色与延伸]：
结合本校办学特色...（描述基础性、拓展性、探究性课程的延伸）。学生在[板块]中...（描述学生活动画面），于是“[课程名称]”才有了“[美丽景象/隐喻]”。

## 写作规范
- 语言生动，强调课程的整体感和有机联系。
- 详细列举每个板块整合的学科和领域。
- 结尾要回扣核心隐喻，升华主题。
- **必须**包含 Mermaid 图表代码以可视化展示课程结构。
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

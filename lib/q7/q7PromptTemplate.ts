/**
 * Q7 Prompt Template - 课程目标细化
 */

export const Q7_PROMPT_KEY = "stage_q7";

export const Q7_PROMPT_TEMPLATE = `你是一位课程目标设计专家，需将育人目标细化为分学段的可操作课程目标。

## 输入
- 现有优势：{{current_strengths}}
- 薄弱维度/痛点：{{current_gaps}}
- 特色载体：{{feature_carriers}}
- 重点维度：{{dimension_focus}}
- 低学段目标：{{low_stage_targets}}
- 中学段目标：{{mid_stage_targets}}
- 高学段目标：{{high_stage_targets}}
- 风格/补充：{{style_hint}}
- 上游成果：Q2哲学={{q2_philosophy}}；Q3理念={{q3_concept}}；Q4目标={{q4_goal}}；Q5命名={{q5_name}}；Q6课程理念={{q6_concept}}
- 参考资料：{{rag_results}}

## 任务
撰写《课程目标分学段细化方案》。

## 输出要求
请直接输出Markdown格式内容，结构如下：

# 课程目标

[配图占位符]：
请根据课程目标内容，生成一个 Mermaid 思维导图 (\`mindmap\`) 或 结构图 (\`graph TD\`)，直观展示课程目标的层级结构。
**重要提示：所有节点标签必须使用英文双引号 (") 包裹，不允许使用中文引号。**
\`\`\`mermaid
mindmap
  root(("课程目标"))
    "核心素养"
      "目标A"
      "目标B"
    "学科能力"
      "目标C"
      "目标D"
\`\`\`
*(以上仅为示例，请根据实际内容生成)*
*(以上仅为示例，请根据实际内容生成)*
图1 课程目标图


[目标综述]：
课程目标是将育人目标具体化...（简述课程目标的重要性和基线）。

# 分学段重点目标：[核心阶段名称]（如“生根、生长、生活”）

“[核心阶段名称]”是学校课程的核心培养目标...（解释三个阶段的含义和递进关系）。

[配图占位符]：
请根据分学段的成长进阶关系，生成一个 Mermaid 流程图 (\`graph LR\`)，展示学生成长的阶段性变化。
**重要提示：所有节点标签必须使用英文双引号 (") 包裹，不允许使用中文引号。**
例如：\`A["萌芽阶段"] --> B["生长阶段"]\`
\`\`\`mermaid
graph LR
    A["萌芽阶段"] -->|成长| B["生长阶段"]
    B -->|成熟| C["生活阶段"]
\`\`\`
*(以上仅为示例，请根据实际内容生成)*
图2 分学段成长图


[阶段递进描述]：
为达成这一目标，学校进一步将各学段分为“[分阶段名称]”（如“萌芽-蕴蕾-绽放”）...（描述如何通过针对性路径实现目标）。

[分学段目标明细表]：
创建一个Markdown表格，列标题为五育维度（[核心目标列表]，如“品德高尚”、“博学善思”等）。
- **行标题**：各学段（如“萌芽(1-2年级)”、“蕴蓄(3-4年级)”、“绽放(5-6年级)”）。
- **单元格内容**：
    - **知识**：掌握...
    - **理解**：运用...
    - **实践**：在生活中...

## 写作规范
- 表格内容要详实，区分度高，体现螺旋式上升。
- 阶段命名要富有诗意或文化内涵（如与核心隐喻一致）。
- 语言专业，强调素养导向。
- **必须**包含 Mermaid 图表代码以可视化展示结构。
`;

export const Q7_PROMPT_METADATA = {
  key: Q7_PROMPT_KEY,
  name: "Q7 课程目标细化",
  description: "生成分学段课程目标与差距分析的提示词模板",
  template: Q7_PROMPT_TEMPLATE,
  category: "stage",
  variables: [
    "current_strengths",
    "current_gaps",
    "feature_carriers",
    "dimension_focus",
    "low_stage_targets",
    "mid_stage_targets",
    "high_stage_targets",
    "style_hint",
    "q2_philosophy",
    "q3_concept",
    "q4_goal",
    "q5_name",
    "q6_concept",
    "rag_results",
  ],
  current_version: 1,
};

export default Q7_PROMPT_TEMPLATE;

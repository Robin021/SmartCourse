/**
 * Q10 Prompt Template - 课程评价体系
 */

export const Q10_PROMPT_KEY = "stage_q10";

export const Q10_PROMPT_TEMPLATE = `你是一位教育评价与测评设计专家，需生成《课程评价方案》。

## 学校核心文化符号（贯穿全文）
{{global_theme_summary}}
*请确保评价体系命名与核心隐喻保持一致，如"向阳335成长评价体系"。*

## 输入
- 评价体系：{{evaluation_model}}
- 模型说明/需求：{{model_notes}}
- 五维评价需求：{{dimension_requirements}}
- 激励/视觉偏好：{{incentive_preferences}}
- 视觉导图需求：{{visual_need}}
- 文档风格：{{doc_style}}
- 补充说明：{{additional_notes}}
- 上游成果：Q2哲学={{q2_philosophy}}；Q3理念={{q3_concept}}；Q4目标={{q4_goal}}；Q5命名={{q5_name}}；Q6理念={{q6_concept}}；Q8结构={{q8_structure}}；Q9实施={{q9_plan}}
- 参考资料：{{rag_results}}

## 任务
撰写《课程评价方案》，强调过程性评价与增值评价。

## 输出要求
请直接输出Markdown格式内容，结构如下：

# 课程评价

[评价理念]：
坚持“评价即育人”...（描述评价的核心理念，如诊断、激励、引导）。我们构建了“[评价体系名称]”...

## （一）评价原则
1. **[原则1]**（如“过程与结果结合”）：...
2. **[原则2]**（如“多元主体参与”）：...

## （二）评价维度与标准（五育并举）
请使用 Mermaid \`graph TD\` 绘制评价体系架构图。
**重要提示：所有节点标签必须使用英文双引号 (") 包裹，不允许使用中文引号。**

**五维评价明细表（请按此格式生成各维度详细表格）：**

| 维度&奖章 | 学段 | 课程目标 | 评价要点 | 评价方式（含争章机制） |
| :--- | :--- | :--- | :--- | :--- |
| 品德高尚(人文苗奖章) | 1-2年级 | **生根(知识)**：[描述] **生长(理解)**：[描述] **生活(实践)**：[描述] | • [具体表现1] • [具体表现2] | • [过程性评价] • 每周3张贴纸换取奖章 |
| 品德高尚(人文苗奖章) | 3-4年级 | ... | ... | ... |
| 品德高尚(人文苗奖章) | 5-6年级 | ... | ... | ... |

**请为五育（德、智、体、美、劳）各生成一个类似的完整表格。**

- **德育评价**：关注...（如品德表现、日常行为）。
- **智育评价**：关注...（如学业水平、创新思维）。
- **体育评价**：关注...
- **美育评价**：关注...
- **劳育评价**：关注...

## （三）评价实施方式
[描述具体工具和载体]：
如“成长档案袋”、“综合素质报告单”、“[特色评价卡]”等。

## （四）结果运用
评价结果将用于...（如学生荣誉、个性化指导、课程改进）。

# 总结
通过构建科学的课程评价体系...（总结展望）。

## 写作规范
- 语言科学、严谨又不失温度。
- 突出评价对学生成长的促进作用。
- **表格要详实，评价方式要具体可操作**。
- **争章机制要明确（如"每周3张贴纸换取奖章"）**。
- 结合五育并举细化评价维度。
- 若涉及复杂流程或体系，请使用 **Mermaid** 代码块展示架构图。
`;

export const Q10_PROMPT_METADATA = {
    key: Q10_PROMPT_KEY,
    name: "Q10 课程评价体系",
    description: "生成《学校课程评价体系方案》与科学性校验的提示词模板",
    template: Q10_PROMPT_TEMPLATE,
    category: "stage",
    variables: [
        "evaluation_model",
        "model_notes",
        "dimension_requirements",
        "incentive_preferences",
        "visual_need",
        "doc_style",
        "additional_notes",
        "q2_philosophy",
        "q3_concept",
        "q4_goal",
        "q5_name",
        "q6_concept",
        "q8_structure",
        "q9_plan",
        "rag_results",
    ],
    current_version: 1,
};

export default Q10_PROMPT_TEMPLATE;

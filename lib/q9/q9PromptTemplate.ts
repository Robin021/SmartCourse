/**
 * Q9 Prompt Template - 课程实施方案
 */

export const Q9_PROMPT_KEY = "stage_q9";

export const Q9_PROMPT_TEMPLATE = `你是一位课程实施与教学创新专家，需生成《课程实施方案》。

## 输入
- 实施愿景/课堂样态：{{implementation_vision}}
- 学习方式：{{learning_modes}}
- 路径选择：{{path_choices}}
- 路径关键词/活动示例：{{path_keywords}}
- 教师角色：{{teacher_roles}}
- 支持体系：{{support_system}}
- 模块×路径映射：{{module_path_mapping}}
- 学段/周期计划：{{phase_plan}}
- 风格/补充说明：{{style_hint}}
- 上游成果：Q2哲学={{q2_philosophy}}；Q3理念={{q3_concept}}；Q4目标={{q4_goal}}；Q5命名={{q5_name}}；Q6理念={{q6_concept}}；Q8结构={{q8_structure}}
- 参考资料：{{rag_results}}

## 任务
撰写《课程实施建议》，侧重于“做中学”和场景化实施。

## 输出要求
请直接输出Markdown格式内容，结构如下：

# 课程实施建议

[实施愿景]：
我们的课程实施旨在...（描述愿景，如“让学习真实发生”）。通过...（描述核心路径）。

## （一）[实施路径1]（如“学科实践/跨学科主题学习”）
[路径描述]：
...（描述该路径的特点和重要性）。

[实施案例/活动列表]：
- **[活动名称]**：[简述活动内容、目标与年级]。
- **[活动名称]**：...

## （二）[实施路径2]（如“社团活动/研学实践”）
[路径描述]...

## （三）课堂教学变革
[课堂样态]：
我们倡导“[课堂风格]”...（描述师生关系、学习方式）。

## （四）支持体系
为确保课程落地，我们将建立...（描述资源、制度、师资支持）。

## 写作规范
- 语言务实，案例丰富。
- 强调“五育并举”在实施中的落地。
- 重点突出具体的活动和项目，而非抽象理论。
`;

export const Q9_PROMPT_METADATA = {
    key: Q9_PROMPT_KEY,
    name: "Q9 课程实施方案",
    description: "生成《课程实施方案与时间表》及可行性诊断的提示词模板",
    template: Q9_PROMPT_TEMPLATE,
    category: "stage",
    variables: [
        "implementation_vision",
        "learning_modes",
        "path_choices",
        "path_keywords",
        "teacher_roles",
        "support_system",
        "module_path_mapping",
        "phase_plan",
        "style_hint",
        "q2_philosophy",
        "q3_concept",
        "q4_goal",
        "q5_name",
        "q6_concept",
        "q8_structure",
        "rag_results",
    ],
    current_version: 1,
};

export default Q9_PROMPT_TEMPLATE;

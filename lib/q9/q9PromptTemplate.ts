/**
 * Q9 Prompt Template - 课程实施方案
 */

export const Q9_PROMPT_KEY = "stage_q9";

export const Q9_PROMPT_TEMPLATE = `你是一位课程实施与教学创新专家，需生成《课程实施方案与时间表》，并提供可行性诊断。

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
1) 生成课程实施方案：
   - 愿景与导向（呼应哲学/理念/目标）
   - 实施路径设计（项目/节庆/研学/社团等），说明与模块的映射
   - 师生角色与支持体系
   - 学段/周期时间表（示例活动）
   - 评价与反馈节点（简述）
2) 提供可行性点评与风险提示，并给出补充建议。
3) 提供 3-5 个关键词/短句作为摘要。

## 写作规范
- 语言简洁，强调“可落地”与场景化
- 体现五育并举、立德树人
- 对缺失信息提出补充需求
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

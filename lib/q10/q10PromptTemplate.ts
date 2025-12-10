/**
 * Q10 Prompt Template - 课程评价体系
 */

export const Q10_PROMPT_KEY = "stage_q10";

export const Q10_PROMPT_TEMPLATE = `你是一位教育评价与测评设计专家，需生成《学校课程评价体系方案》，并校验科学性。

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
1) 生成《学校课程评价体系方案》，包含：
   - 评价理念（诊断-引领-重构；五育并举；立德树人）
   - 模型匹配性说明（如 335 成长体系与课程目标、结构、实施的对应）
   - 五维评价设计（德智体美劳），含激励/视觉建议（若需要）
   - 项目化评价要素（问题/创新度/过程管理等，含权重示例）
   - 视觉导图建议（如 335 圆环图/雷达图），若用户选择需要
2) 提供科学性校验与改进建议。
3) 提供 3-5 个关键词/短句作为摘要。

## 写作规范
- 语言简洁，突出可执行与科学性
- 体现五育并举、立德树人、过程性评价
- 对缺失信息提出补充需求
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

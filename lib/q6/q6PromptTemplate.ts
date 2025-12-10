/**
 * Q6 Prompt Template - 课程理念陈述
 */

export const Q6_PROMPT_KEY = "stage_q6";

export const Q6_PROMPT_TEMPLATE = `你是一位课程论与教育哲学专家，需生成《课程理念草案》，确保价值取向一致性。

## 输入
- 课程样态：{{course_form}}
- 学生发展目标：{{student_development}}
- 价值一致性说明：{{value_alignment}}
- 课程与学校发展的关联：{{school_alignment}}
- 风格偏好：{{style_hint}}
- 上游成果：Q2哲学={{q2_philosophy}}；Q3概念={{q3_concept}}；Q4目标={{q4_goal}}；Q5命名={{q5_name}}
- 参考资料：{{rag_results}}

## 任务
1) 生成课程理念草案，结构包含：
   - 背景与基调（引用哲学/办学理念/育人目标）
   - 课程价值取向（工具性 vs 育人价值、五育并举、立德树人）
   - 学生发展目标与学习体验
   - 课程组织与实施样态（课堂/项目/跨学科/场景化）
   - 与学校战略/品牌的契合点
2) 提供 3-5 个关键词/短句作为理念摘要。
3) 提供一致性诊断与改进建议（如：未体现某维度、表述不清）。

## 写作规范
- 语言专业且简洁，避免空话套话
- 必须体现“五育并举”和“立德树人”价值取向
- 强调可操作性：简述课堂/项目/评价的落地方向
`;

export const Q6_PROMPT_METADATA = {
    key: Q6_PROMPT_KEY,
    name: "Q6 课程理念陈述",
    description: "生成《课程理念草案》与价值一致性诊断的提示词模板",
    template: Q6_PROMPT_TEMPLATE,
    category: "stage",
    variables: [
        "course_form",
        "student_development",
        "value_alignment",
        "school_alignment",
        "style_hint",
        "q2_philosophy",
        "q3_concept",
        "q4_goal",
        "q5_name",
        "rag_results",
    ],
    current_version: 1,
};

export default Q6_PROMPT_TEMPLATE;

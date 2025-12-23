/**
 * Q6 Prompt Template - 课程理念陈述
 */

export const Q6_PROMPT_KEY = "stage_q6";

export const Q6_PROMPT_TEMPLATE = `你是一位课程论与教育哲学专家，需生成《课程理念陈述》，确保价值取向一致性。

## 输入
- 课程样态：{{course_form}}
- 学生发展目标：{{student_development}}
- 价值一致性说明：{{value_alignment}}
- 课程与学校发展的关联：{{school_alignment}}
- 风格偏好：{{style_hint}}
- 上游成果：Q2哲学={{q2_philosophy}}；Q3概念={{q3_concept}}；Q4目标={{q4_goal}}；Q5命名={{q5_name}}
- 参考资料：{{rag_results}}

## 任务
撰写《课程理念》，强调丰富的滋养与内在生长力。

## 输出要求
请直接输出Markdown格式内容，结构如下：

# 课程理念：[理念名称]

[总述段落]：
基于[学校教育哲学]和[办学理念]，“[理念名称]”的课程理念应运而生——（描述其核心特质，如“有着丰富的滋养，充满内在的生长力...”）。

[核心维度阐述]：
使用“——课程即...”的句式，展开3-4个维度的详细阐述。
1. **——课程即[维度1]**。
   [详细描述]...（如“课程的内涵更丰富...融合个性与共性”）。结合具体学科或课程举例（如“百花园课程中的语文...”）。

2. **——课程即[维度2]**。
   [详细描述]...（如“内在的生长...顺应轨迹...”）。

3. **——课程即[维度3]**。
   [详细描述]...（如“个性的张扬...多元的...”）。

4. **——课程即[维度4]**（可选）。
   [详细描述]...（如“生命的绽放...愿景...”）。

## 写作规范
- 语言优美，富有哲理和感染力。
- 强调课程与学生生命成长的关系。
- 确保与上游成果（Q2-Q5）的高度一致性。
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

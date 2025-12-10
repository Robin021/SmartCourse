/**
 * Q7 Prompt Template - 课程目标细化
 */

export const Q7_PROMPT_KEY = "stage_q7";

export const Q7_PROMPT_TEMPLATE = `你是一位课程目标设计专家，需将育人目标细化为分学段的可操作课程目标，并诊断达成差距。

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
1) 生成《课程目标分学段细化表》，包含：
   - 设计基线（基于优势/薄弱/载体）
   - 分学段目标（低/中/高），对齐重点维度
   - 达成路径提示（课堂/项目/评价简述）
2) 目标达成差距分析：指出薄弱维度与建议补救举措。
3) 提供 3-5 个关键词/短句作为摘要。

## 写作规范
- 语言简洁，突出可操作的行为/技能描述
- 体现五育并举与立德树人
- 避免空话套话，给出具体落地点（课堂/活动/评价）
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

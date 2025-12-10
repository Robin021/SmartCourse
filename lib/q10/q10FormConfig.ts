/**
 * Q10 Stage Form Configuration - 课程评价体系
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8
 */

export type Q10FieldType = "text" | "textarea" | "select" | "multiselect";

export interface Q10FormField {
    key: string;
    type: Q10FieldType;
    label: string;
    placeholder?: string;
    required: boolean;
    options?: { value: string; label: string }[];
    helpText?: string;
}

export interface Q10FormSection {
    id: string;
    title: string;
    description?: string;
    fields: Q10FormField[];
}

export interface Q10FormSchema {
    stageId: "Q10";
    name: string;
    description: string;
    sections: Q10FormSection[];
}

export const Q10_FORM_SCHEMA: Q10FormSchema = {
    stageId: "Q10",
    name: "课程评价体系",
    description: "选择评价体系，生成《学校课程评价体系方案》，并提示科学性校验。",
    sections: [
        {
            id: "model",
            title: "评价体系选择",
            description: "选择评价模型与需求，默认为“335成长体系”。",
            fields: [
                {
                    key: "evaluation_model",
                    type: "select",
                    label: "评价体系",
                    required: true,
                    options: [
                        { value: "335", label: "335成长体系" },
                        { value: "custom", label: "自定义/其他模型" },
                    ],
                },
                {
                    key: "model_notes",
                    type: "textarea",
                    label: "模型说明/匹配需求",
                    required: true,
                    placeholder: "如：强调过程性评价，突出项目化评价要素",
                },
            ],
        },
        {
            id: "design",
            title: "五维评价设计与激励",
            fields: [
                {
                    key: "dimension_requirements",
                    type: "textarea",
                    label: "五维评价需求（德智体美劳）",
                    required: true,
                    placeholder: "例如：德育需包含贴纸-奖章-称号；智育关注探究能力",
                },
                {
                    key: "incentive_preferences",
                    type: "textarea",
                    label: "激励机制/风格偏好",
                    required: false,
                    placeholder: "如：视觉导图、徽章体系、项目化评价要素",
                },
                {
                    key: "visual_need",
                    type: "select",
                    label: "是否需要视觉导图建议",
                    required: true,
                    options: [
                        { value: "yes", label: "需要" },
                        { value: "no", label: "不需要" },
                    ],
                },
            ],
        },
        {
            id: "extras",
            title: "补充与风格",
            fields: [
                {
                    key: "doc_style",
                    type: "select",
                    label: "文档风格",
                    required: true,
                    options: [
                        { value: "theory", label: "理论型" },
                        { value: "practice", label: "实践型" },
                        { value: "promo", label: "宣传型" },
                    ],
                },
                {
                    key: "additional_notes",
                    type: "textarea",
                    label: "补充说明",
                    required: false,
                },
            ],
        },
    ],
};

export interface Q10FormData {
    evaluation_model: string;
    model_notes: string;
    dimension_requirements: string;
    incentive_preferences?: string;
    visual_need: string;
    doc_style: string;
    additional_notes?: string;
}

export function normalizeQ10FormData(formData: Record<string, any>): Q10FormData {
    return {
        evaluation_model: formData.evaluation_model || "",
        model_notes: formData.model_notes || "",
        dimension_requirements: formData.dimension_requirements || "",
        incentive_preferences: formData.incentive_preferences || "",
        visual_need: formData.visual_need || "",
        doc_style: formData.doc_style || "",
        additional_notes: formData.additional_notes || "",
    };
}

/**
 * 简易科学性校验评分。
 */
export function computeEvaluationScore(formData: Q10FormData, ragSupport: number): {
    score: number;
    suggestions: string[];
} {
    let score = 45;
    if (formData.evaluation_model) score += 8;
    if (formData.model_notes) score += 8;
    if (formData.dimension_requirements) score += 12;
    if (formData.incentive_preferences) score += 4;
    if (formData.visual_need === "yes") score += 4;
    if (formData.doc_style) score += 6;
    if (ragSupport > 0) score += Math.min(ragSupport * 3, 9);
    score = Math.max(0, Math.min(100, score));

    const suggestions: string[] = [];
    if (!formData.dimension_requirements.includes("德") || !formData.dimension_requirements.includes("智")) {
        suggestions.push("明确五维（德智体美劳）评价要点，确保全面性");
    }
    if (!formData.model_notes.includes("过程") && !formData.model_notes.includes("项目")) {
        suggestions.push("补充过程性/项目化评价要素，增强科学性");
    }

    return { score, suggestions };
}

export function buildQ10GenerationInput(formData: Q10FormData, previousStages?: Record<string, any>) {
    return {
        evaluation_model: formData.evaluation_model,
        model_notes: formData.model_notes,
        dimension_requirements: formData.dimension_requirements,
        incentive_preferences: formData.incentive_preferences || "",
        visual_need: formData.visual_need,
        doc_style: formData.doc_style,
        additional_notes: formData.additional_notes || "",
        q2_philosophy: previousStages?.Q2_output || previousStages?.Q2 || "",
        q3_concept: previousStages?.Q3_output?.core_concept || previousStages?.Q3?.core_concept || "",
        q4_goal: previousStages?.Q4_output || previousStages?.Q4 || "",
        q5_name: previousStages?.Q5_output?.name_suggestion || previousStages?.Q5?.name_suggestion || "",
        q6_concept: previousStages?.Q6_output || previousStages?.Q6 || "",
        q8_structure: previousStages?.Q8_output || previousStages?.Q8 || "",
        q9_plan: previousStages?.Q9_output || previousStages?.Q9 || "",
    };
}

export function extractQ10Keywords(content: string, formData: Q10FormData): string[] {
    const seed = [
        formData.evaluation_model,
        formData.dimension_requirements,
        formData.incentive_preferences || "",
        formData.doc_style,
    ]
        .join("、")
        .split(/[,，、\s]+/)
        .filter(Boolean);

    const words = (content || "")
        .split(/[^A-Za-z\u4e00-\u9fa5]+/)
        .filter((w) => w.length >= 2);

    const combined = [...seed, ...words];
    const unique: string[] = [];
    for (const w of combined) {
        if (unique.length >= 10) break;
        if (!unique.includes(w)) unique.push(w);
    }
    return unique.slice(0, 8);
}

export default Q10_FORM_SCHEMA;

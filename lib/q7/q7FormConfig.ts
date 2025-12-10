/**
 * Q7 Stage Form Configuration - 课程目标细化
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 */

export type Q7FieldType = "text" | "textarea" | "select" | "multiselect";

export interface Q7FormField {
    key: string;
    type: Q7FieldType;
    label: string;
    placeholder?: string;
    required: boolean;
    options?: { value: string; label: string }[];
    helpText?: string;
}

export interface Q7FormSection {
    id: string;
    title: string;
    description?: string;
    fields: Q7FormField[];
}

export interface Q7FormSchema {
    stageId: "Q7";
    name: string;
    description: string;
    sections: Q7FormSection[];
}

export const DIMENSION_OPTIONS = [
    { value: "德育", label: "德育" },
    { value: "智育", label: "智育" },
    { value: "体育", label: "体育" },
    { value: "美育", label: "美育" },
    { value: "劳育", label: "劳育" },
    { value: "科技素养", label: "科技素养" },
    { value: "创新能力", label: "创新能力" },
] as const;

export const Q7_FORM_SCHEMA: Q7FormSchema = {
    stageId: "Q7",
    name: "课程目标细化",
    description: "细化育人目标为可落地的分学段课程目标，诊断达成差距。",
    sections: [
        {
            id: "baseline",
            title: "现状评估与特色载体",
            description: "填写课程优势/薄弱与特色载体，形成设计基线。",
            fields: [
                { key: "current_strengths", type: "textarea", label: "现有课程优势", required: true },
                { key: "current_gaps", type: "textarea", label: "薄弱维度/痛点", required: true },
                { key: "feature_carriers", type: "textarea", label: "特色载体(1-3项)", required: true, placeholder: "如：STEAM、农耕课程、社团/场馆资源" },
            ],
        },
        {
            id: "dimensions",
            title: "目标维度与重点",
            description: "选择重点维度，输入学段目标草案。",
            fields: [
                {
                    key: "dimension_focus",
                    type: "multiselect",
                    label: "重点维度",
                    required: true,
                    options: DIMENSION_OPTIONS,
                    helpText: "可多选，优先级按顺序排列。",
                },
                {
                    key: "low_stage_targets",
                    type: "textarea",
                    label: "低学段目标（萌芽）",
                    required: true,
                    placeholder: "描述行为/技能指标，例如：能在指导下完成简单观察任务",
                },
                {
                    key: "mid_stage_targets",
                    type: "textarea",
                    label: "中学段目标（蕴蕾）",
                    required: true,
                    placeholder: "描述行为/技能指标，例如：能设计并完成小型项目",
                },
                {
                    key: "high_stage_targets",
                    type: "textarea",
                    label: "高学段目标（绽放）",
                    required: true,
                    placeholder: "描述行为/技能指标，例如：能独立提出问题并完成研究",
                },
            ],
        },
        {
            id: "extras",
            title: "补充说明",
            fields: [
                {
                    key: "style_hint",
                    type: "textarea",
                    label: "风格/补充说明",
                    required: false,
                    placeholder: "希望强调实践/创新/跨学科等",
                },
            ],
        },
    ],
};

export interface Q7FormData {
    current_strengths: string;
    current_gaps: string;
    feature_carriers: string;
    dimension_focus: string[];
    low_stage_targets: string;
    mid_stage_targets: string;
    high_stage_targets: string;
    style_hint?: string;
}

export function normalizeQ7FormData(formData: Record<string, any>): Q7FormData {
    const dimension_focus = Array.isArray(formData.dimension_focus)
        ? formData.dimension_focus
        : typeof formData.dimension_focus === "string" && formData.dimension_focus.length > 0
            ? formData.dimension_focus.split(",").map((v: string) => v.trim()).filter(Boolean)
            : [];

    return {
        current_strengths: formData.current_strengths || "",
        current_gaps: formData.current_gaps || "",
        feature_carriers: formData.feature_carriers || "",
        dimension_focus,
        low_stage_targets: formData.low_stage_targets || "",
        mid_stage_targets: formData.mid_stage_targets || "",
        high_stage_targets: formData.high_stage_targets || "",
        style_hint: formData.style_hint || "",
    };
}

/**
 * 简单差距分析：根据薄弱点与维度重点，给出达成分数及建议。
 */
export function computeGapAnalysis(formData: Q7FormData): {
    score: number;
    dimensions: Record<string, number>;
    suggestions: string[];
} {
    let score = 45;
    const dims: Record<string, number> = {};

    formData.dimension_focus.slice(0, 5).forEach((d, idx) => {
        dims[d] = 80 - idx * 5;
    });

    // If no focus provided, assume均衡
    if (formData.dimension_focus.length === 0) {
        ["德育", "智育", "体育", "美育", "劳育"].forEach((d) => (dims[d] = 70));
    }

    if (formData.current_gaps) score -= 5;
    if (formData.feature_carriers) score += 10;
    if (formData.low_stage_targets && formData.mid_stage_targets && formData.high_stage_targets) score += 10;

    score = Math.max(0, Math.min(100, score));

    const suggestions: string[] = [];
    Object.entries(dims).forEach(([k, v]) => {
        if (v < 70) suggestions.push(`加强 ${k} 维度的学段任务设计，补足薄弱点`);
    });
    if (!formData.low_stage_targets || !formData.mid_stage_targets || !formData.high_stage_targets) {
        suggestions.push("补全低/中/高学段目标描述，便于分层落地");
    }

    return { score, dimensions: dims, suggestions };
}

export function buildQ7GenerationInput(formData: Q7FormData, previousStages?: Record<string, any>) {
    return {
        current_strengths: formData.current_strengths,
        current_gaps: formData.current_gaps,
        feature_carriers: formData.feature_carriers,
        dimension_focus: formData.dimension_focus.join("、"),
        low_stage_targets: formData.low_stage_targets,
        mid_stage_targets: formData.mid_stage_targets,
        high_stage_targets: formData.high_stage_targets,
        style_hint: formData.style_hint || "",
        q2_philosophy: previousStages?.Q2_output || previousStages?.Q2 || "",
        q3_concept: previousStages?.Q3_output?.core_concept || previousStages?.Q3?.core_concept || "",
        q4_goal: previousStages?.Q4_output || previousStages?.Q4 || "",
        q5_name: previousStages?.Q5_output?.name_suggestion || previousStages?.Q5?.name_suggestion || "",
        q6_concept: previousStages?.Q6_output || previousStages?.Q6 || "",
    };
}

export function extractQ7Keywords(content: string, formData: Q7FormData): string[] {
    const seed = [
        formData.dimension_focus.join("、"),
        formData.feature_carriers,
        formData.low_stage_targets,
        formData.mid_stage_targets,
        formData.high_stage_targets,
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

export default Q7_FORM_SCHEMA;

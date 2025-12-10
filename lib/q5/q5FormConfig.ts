/**
 * Q5 Stage Form Configuration - 课程模式命名
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

export type Q5FieldType = "text" | "textarea" | "select" | "multiselect";

export interface Q5FormField {
    key: string;
    type: Q5FieldType;
    label: string;
    placeholder?: string;
    required: boolean;
    options?: { value: string; label: string }[];
    helpText?: string;
}

export interface Q5FormSection {
    id: string;
    title: string;
    description?: string;
    fields: Q5FormField[];
}

export interface Q5FormSchema {
    stageId: "Q5";
    name: string;
    description: string;
    sections: Q5FormSection[];
}

export const NAME_SOURCE_OPTIONS = [
    { value: "history", label: "历史/校史" },
    { value: "local_culture", label: "在地文化" },
    { value: "philosophy", label: "教育哲学(Q2)" },
    { value: "education_goal", label: "育人目标(Q4)" },
    { value: "brand", label: "品牌/愿景" },
    { value: "geography", label: "地理/场景" },
] as const;

export const Q5_FORM_SCHEMA: Q5FormSchema = {
    stageId: "Q5",
    name: "课程模式命名",
    description: "选择命名来源/元素，生成校本课程体系名称和口号，并评估适配性。",
    sections: [
        {
            id: "sources",
            title: "命名来源",
            description: "选择主要灵感来源，可多选。",
            fields: [
                {
                    key: "name_sources",
                    type: "multiselect",
                    label: "命名来源",
                    required: true,
                    options: NAME_SOURCE_OPTIONS,
                },
                {
                    key: "theme_keywords",
                    type: "textarea",
                    label: "主题/关键词",
                    required: true,
                    placeholder: "例如：向阳花、运河文化、数码创造力",
                },
                {
                    key: "metaphor",
                    type: "textarea",
                    label: "核心隐喻/意象",
                    required: false,
                    placeholder: "例如：航海、森林、星辰",
                },
            ],
        },
        {
            id: "proposal",
            title: "命名提案与约束",
            fields: [
                {
                    key: "custom_name",
                    type: "text",
                    label: "自定义名称（可留空，让AI生成）",
                    required: false,
                },
                {
                    key: "custom_tagline",
                    type: "text",
                    label: "自定义口号/副标题",
                    required: false,
                },
                {
                    key: "cultural_symbols",
                    type: "textarea",
                    label: "必须包含的文化符号/元素",
                    required: false,
                    placeholder: "如：向阳花、运河、红船",
                },
                {
                    key: "stakeholder_preferences",
                    type: "textarea",
                    label: "利益相关者偏好",
                    required: false,
                    placeholder: "校长希望突出‘责任’，家长希望突出‘幸福’",
                },
                {
                    key: "uniqueness_constraints",
                    type: "textarea",
                    label: "避免冲突/重复",
                    required: false,
                    placeholder: "避免与附近学校“星辰”课程重名",
                },
            ],
        },
    ],
};

export interface Q5FormData {
    name_sources: string[];
    theme_keywords: string;
    metaphor?: string;
    custom_name?: string;
    custom_tagline?: string;
    cultural_symbols?: string;
    stakeholder_preferences?: string;
    uniqueness_constraints?: string;
}

export function normalizeQ5FormData(formData: Record<string, any>): Q5FormData {
    const sources = Array.isArray(formData.name_sources)
        ? formData.name_sources
        : typeof formData.name_sources === "string" && formData.name_sources.length > 0
            ? formData.name_sources.split(",").map((s: string) => s.trim()).filter(Boolean)
            : [];

    return {
        name_sources: sources,
        theme_keywords: formData.theme_keywords || "",
        metaphor: formData.metaphor || "",
        custom_name: formData.custom_name || "",
        custom_tagline: formData.custom_tagline || "",
        cultural_symbols: formData.cultural_symbols || "",
        stakeholder_preferences: formData.stakeholder_preferences || "",
        uniqueness_constraints: formData.uniqueness_constraints || "",
    };
}

/**
 * Heuristic name suitability score (0-100)
 */
export function computeNameSuitability(formData: Q5FormData, ragSupport: number): {
    score: number;
    suggestions: string[];
} {
    let score = 40;
    if (formData.name_sources.length > 0) score += Math.min(formData.name_sources.length * 8, 24);
    if (formData.theme_keywords) score += 10;
    if (formData.metaphor) score += 6;
    if (formData.custom_name) score += 8;
    if (formData.custom_tagline) score += 4;
    if (formData.uniqueness_constraints) score += 4;
    if (ragSupport > 0) score += Math.min(ragSupport * 3, 12);

    const suggestions: string[] = [];
    if (!formData.metaphor) suggestions.push("补充核心隐喻/意象，便于命名具象化");
    if (!formData.custom_tagline) suggestions.push("添加口号/副标题，提升传播力");
    if (!formData.uniqueness_constraints) suggestions.push("注明需规避的相似名称，避免重名");

    score = Math.max(0, Math.min(100, score));
    return { score, suggestions };
}

export function buildQ5GenerationInput(formData: Q5FormData, previousStages?: Record<string, any>) {
    return {
        name_sources: formData.name_sources.join("、"),
        theme_keywords: formData.theme_keywords,
        metaphor: formData.metaphor || "",
        custom_name: formData.custom_name || "",
        custom_tagline: formData.custom_tagline || "",
        cultural_symbols: formData.cultural_symbols || "",
        stakeholder_preferences: formData.stakeholder_preferences || "",
        uniqueness_constraints: formData.uniqueness_constraints || "",
        q2_philosophy: previousStages?.Q2_output || previousStages?.Q2 || "",
        q3_concept: previousStages?.Q3_output?.core_concept || previousStages?.Q3?.core_concept || "",
        q4_goal: previousStages?.Q4_output || previousStages?.Q4 || "",
    };
}

export function extractQ5Keywords(content: string, formData: Q5FormData): string[] {
    const seed = [
        formData.custom_name || "",
        formData.custom_tagline || "",
        formData.theme_keywords,
        formData.metaphor || "",
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

export default Q5_FORM_SCHEMA;

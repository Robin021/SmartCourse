/**
 * Q2 Stage Form Configuration - 教育哲学
 *
 * Defines the UI schema and helper utilities for the Q2 stage.
 * Requirements covered: 2.1, 2.2, 2.3
 */

export type Q2FieldType = "text" | "textarea" | "select" | "multiselect";

export interface Q2FormField {
    key: string;
    type: Q2FieldType;
    label: string;
    placeholder?: string;
    required: boolean;
    options?: { value: string; label: string }[];
    helpText?: string;
}

export interface Q2FormSection {
    id: string;
    title: string;
    description?: string;
    fields: Q2FormField[];
}

export interface Q2FormSchema {
    stageId: "Q2";
    name: string;
    description: string;
    sections: Q2FormSection[];
}

export const EDUCATION_THEORIES: { value: string; label: string }[] = [
    { value: "confucianism", label: "儒家哲学" },
    { value: "perennialism", label: "永恒主义教育" },
    { value: "essentialism", label: "要素主义教育" },
    { value: "progressivism", label: "进步主义教育" },
    { value: "existentialism", label: "存在主义教育" },
    { value: "pragmatism", label: "实用主义教育" },
    { value: "structuralism", label: "结构主义教育" },
    { value: "cultural_pedagogy", label: "文化教育学" },
    { value: "postmodern", label: "后现代主义教育" },
    { value: "cognitivism", label: "认知主义教育" },
    { value: "constructivism", label: "建构主义教育" },
    { value: "humanism", label: "人本主义教育" },
    { value: "multiple_intelligence", label: "多元智能教育" },
];

export const Q2_FORM_SCHEMA: Q2FormSchema = {
    stageId: "Q2",
    name: "教育哲学",
    description: "选择教育哲学理论并结合学校特色，生成个性化的教育哲学陈述。",
    sections: [
        {
            id: "philosophy_choices",
            title: "核心教育哲学选择",
            description: "从13种教育哲学理论中选择最贴合学校的流派，可多选。",
            fields: [
                {
                    key: "selected_theories",
                    type: "multiselect",
                    label: "选择教育哲学流派",
                    required: true,
                    options: EDUCATION_THEORIES,
                    helpText: "可多选，至少选择1项；支持后续补充自定义。",
                },
                {
                    key: "custom_theories",
                    type: "text",
                    label: "自定义/补充哲学流派",
                    required: false,
                    placeholder: "如：生态教育、未来素养等",
                },
            ],
        },
        {
            id: "context",
            title: "时代精神与地域文化",
            description: "补充时代背景、地域文化、校情信息，便于AI做本地化适配。",
            fields: [
                {
                    key: "era_spirit",
                    type: "textarea",
                    label: "时代精神来源",
                    placeholder: "政策/热点/发展趋势，例如：跨学科融合、劳动教育、人工智能素养",
                    required: true,
                },
                {
                    key: "regional_culture",
                    type: "textarea",
                    label: "地域文化精髓",
                    placeholder: "山/水/革命文化等，在地文化关键词",
                    required: true,
                },
                {
                    key: "school_profile",
                    type: "textarea",
                    label: "学校自身发展信息",
                    placeholder: "校名、校训、办学理念、教师团队特长等",
                    required: true,
                },
            ],
        },
        {
            id: "expression",
            title: "表达与补充",
            fields: [
                {
                    key: "philosophy_statement_hint",
                    type: "textarea",
                    label: "哲学主张草案（可选）",
                    placeholder: "可以提供一句话主张或关键词，AI会在此基础上润色",
                    required: false,
                },
                {
                    key: "additional_notes",
                    type: "textarea",
                    label: "补充说明",
                    placeholder: "其他希望AI考虑的要点，如合作资源、特殊限制等",
                    required: false,
                },
            ],
        },
    ],
};

export interface Q2FormData {
    selected_theories: string[];
    custom_theories?: string;
    era_spirit: string;
    regional_culture: string;
    school_profile: string;
    philosophy_statement_hint?: string;
    additional_notes?: string;
}

/**
 * Normalize form data into a generation-friendly structure.
 */
export function normalizeQ2FormData(formData: Record<string, any>): Q2FormData {
    const selected_theories = Array.isArray(formData.selected_theories)
        ? formData.selected_theories
        : typeof formData.selected_theories === "string" && formData.selected_theories.length > 0
            ? formData.selected_theories.split(",").map((s: string) => s.trim()).filter(Boolean)
            : [];

    return {
        selected_theories,
        custom_theories: formData.custom_theories || "",
        era_spirit: formData.era_spirit || "",
        regional_culture: formData.regional_culture || "",
        school_profile: formData.school_profile || "",
        philosophy_statement_hint: formData.philosophy_statement_hint || "",
        additional_notes: formData.additional_notes || "",
    };
}

/**
 * Build a compact prompt-ready input object from form data.
 */
export function buildQ2GenerationInput(formData: Q2FormData, previousStages?: Record<string, any>) {
    const theoryList = formData.selected_theories.join("、");
    const previousContextSummary = previousStages?.Q1_output || previousStages?.Q1 || "";

    return {
        selected_theories: theoryList,
        custom_theories: formData.custom_theories || "",
        era_spirit: formData.era_spirit,
        regional_culture: formData.regional_culture,
        school_profile: formData.school_profile,
        philosophy_statement_hint: formData.philosophy_statement_hint || "",
        additional_notes: formData.additional_notes || "",
        q1_background: previousContextSummary,
    };
}

/**
 * Heuristic scoring for理论适配性 (0-100)
 * Combines coverage of required fields and RAG support presence.
 */
export function computeTheoryFitScore(
    formData: Q2FormData,
    ragResultsLength: number
): number {
    let score = 40;

    // Coverage of required fields
    if (formData.selected_theories.length > 0) {
        score += Math.min(formData.selected_theories.length * 6, 30);
    }
    if (formData.era_spirit) score += 8;
    if (formData.regional_culture) score += 8;
    if (formData.school_profile) score += 6;

    // Custom philosophy hint adds specificity
    if (formData.philosophy_statement_hint) score += 4;

    // RAG support
    if (ragResultsLength > 0) {
        score += Math.min(ragResultsLength * 3, 12);
    }

    return Math.max(0, Math.min(100, score));
}

/**
 * Extract a small set of keywords to surface在前端。
 */
export function extractQ2Keywords(content: string, formData: Q2FormData): string[] {
    const seedKeywords = [
        ...formData.selected_theories.map((t) => t.replace(/_/g, " ")),
        formData.custom_theories || "",
        formData.era_spirit || "",
        formData.regional_culture || "",
    ]
        .join("、")
        .split(/[,，、\s]+/)
        .filter(Boolean);

    const contentWords = (content || "")
        .split(/[^A-Za-z\u4e00-\u9fa5]+/)
        .filter((w) => w.length >= 2);

    const combined = [...seedKeywords, ...contentWords];
    const unique: string[] = [];
    for (const word of combined) {
        if (unique.length >= 12) break;
        if (!unique.includes(word)) {
            unique.push(word);
        }
    }
    return unique.slice(0, 8);
}

export default Q2_FORM_SCHEMA;

/**
 * Q8 Stage Form Configuration - 课程结构设计
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8
 */

export type Q8FieldType = "text" | "textarea" | "select" | "multiselect";

export interface Q8FormField {
    key: string;
    type: Q8FieldType;
    label: string;
    placeholder?: string;
    required: boolean;
    options?: { value: string; label: string }[];
    helpText?: string;
}

export interface Q8FormSection {
    id: string;
    title: string;
    description?: string;
    fields: Q8FormField[];
}

export interface Q8FormSchema {
    stageId: "Q8";
    name: string;
    description: string;
    sections: Q8FormSection[];
}

export const FRAMEWORK_OPTIONS = [
    { value: "five_virtues", label: "五育并举" },
    { value: "core_competency", label: "核心素养" },
    { value: "theme_domain", label: "主题域" },
    { value: "custom", label: "自创模型" },
] as const;

export const DOC_STYLE_OPTIONS = [
    { value: "theory", label: "理论型" },
    { value: "practice", label: "实践型" },
    { value: "promo", label: "宣传型" },
] as const;

export const Q8_FORM_SCHEMA: Q8FormSchema = {
    stageId: "Q8",
    name: "课程结构设计",
    description: "设计课程结构、板块与模块映射，生成方案初稿并评分。",
    sections: [
        {
            id: "keywords",
            title: "核心关键词与隐喻",
            description: "确认/提炼核心关键词与隐喻，作为结构命名基底。",
            fields: [
                { key: "core_keywords", type: "textarea", label: "核心关键词(3-5个)", required: true },
                { key: "core_metaphor", type: "text", label: "核心隐喻", required: false, placeholder: "如：向阳花/航海/森林" },
            ],
        },
        {
            id: "framework",
            title: "顶层逻辑框架",
            description: "选择顶层框架，结合隐喻命名板块。",
            fields: [
                {
                    key: "framework",
                    type: "select",
                    label: "框架选择",
                    required: true,
                    options: [...FRAMEWORK_OPTIONS],
                },
                {
                    key: "board_names",
                    type: "textarea",
                    label: "一级板块名称（五育/主题域等）",
                    required: true,
                    placeholder: "用换行分隔，示例：人文大地（德育）\n数智阳光（智育）",
                },
            ],
        },
        {
            id: "modules",
            title: "二级模块与映射",
            description: "为每个板块补充四层结构或模块，备注支撑强度。",
            fields: [
                {
                    key: "modules_plan",
                    type: "textarea",
                    label: "二级模块清单",
                    required: true,
                    placeholder: "示例：\n人文大地：国家=语文/道德；品牌=整本书阅读；地方=运河文化研学",
                },
                {
                    key: "mapping_notes",
                    type: "textarea",
                    label: "模块×目标映射备注",
                    required: false,
                    placeholder: "标注支撑强度0-3分或关键活动",
                },
            ],
        },
        {
            id: "style",
            title: "文档风格与补充",
            fields: [
                {
                    key: "doc_style",
                    type: "select",
                    label: "文档风格",
                    required: true,
                    options: [...DOC_STYLE_OPTIONS],
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

export interface Q8FormData {
    core_keywords: string;
    core_metaphor?: string;
    framework: string;
    board_names: string;
    modules_plan: string;
    mapping_notes?: string;
    doc_style: string;
    additional_notes?: string;
}

export function normalizeQ8FormData(formData: Record<string, any>): Q8FormData {
    return {
        core_keywords: formData.core_keywords || "",
        core_metaphor: formData.core_metaphor || "",
        framework: formData.framework || "",
        board_names: formData.board_names || "",
        modules_plan: formData.modules_plan || "",
        mapping_notes: formData.mapping_notes || "",
        doc_style: formData.doc_style || "",
        additional_notes: formData.additional_notes || "",
    };
}

/**
 * 粗略结构合理性评分。
 */
export function computeStructureScore(formData: Q8FormData, ragSupport: number): {
    score: number;
    suggestions: string[];
} {
    let score = 45;
    if (formData.core_keywords) score += 10;
    if (formData.core_metaphor) score += 6;
    if (formData.framework) score += 10;
    if (formData.board_names) score += 10;
    if (formData.modules_plan) score += 12;
    if (formData.mapping_notes) score += 4;
    if (ragSupport > 0) score += Math.min(ragSupport * 3, 9);
    score = Math.max(0, Math.min(100, score));

    const suggestions: string[] = [];
    if (!formData.core_metaphor) suggestions.push("补充核心隐喻，便于板块命名与叙事一致");
    if (!formData.mapping_notes) suggestions.push("标注模块×目标支撑强度，明确落地路径");
    if (!formData.board_names) suggestions.push("为顶层框架命名一级板块，增强可传播性");

    return { score, suggestions };
}

export function buildQ8GenerationInput(formData: Q8FormData, previousStages?: Record<string, any>) {
    return {
        core_keywords: formData.core_keywords,
        core_metaphor: formData.core_metaphor || "",
        framework: formData.framework,
        board_names: formData.board_names,
        modules_plan: formData.modules_plan,
        mapping_notes: formData.mapping_notes || "",
        doc_style: formData.doc_style,
        additional_notes: formData.additional_notes || "",
        q2_philosophy: previousStages?.Q2_output || previousStages?.Q2 || "",
        q3_concept: previousStages?.Q3_output?.core_concept || previousStages?.Q3?.core_concept || "",
        q4_goal: previousStages?.Q4_output || previousStages?.Q4 || "",
        q5_name: previousStages?.Q5_output?.name_suggestion || previousStages?.Q5?.name_suggestion || "",
        q6_concept: previousStages?.Q6_output || previousStages?.Q6 || "",
    };
}

export function extractQ8Keywords(content: string, formData: Q8FormData): string[] {
    const seed = [
        formData.core_keywords,
        formData.core_metaphor || "",
        formData.framework,
        formData.board_names,
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

export default Q8_FORM_SCHEMA;

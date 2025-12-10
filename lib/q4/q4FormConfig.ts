/**
 * Q4 Stage Form Configuration - 育人目标
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 */

export type Q4FieldType = "text" | "textarea" | "select" | "multiselect";

export interface Q4FormField {
    key: string;
    type: Q4FieldType;
    label: string;
    placeholder?: string;
    required: boolean;
    options?: { value: string; label: string }[];
    helpText?: string;
}

export interface Q4FormSection {
    id: string;
    title: string;
    description?: string;
    fields: Q4FormField[];
}

export interface Q4FormSchema {
    stageId: "Q4";
    name: string;
    description: string;
    sections: Q4FormSection[];
}

export const FIVE_VIRTUES = ["德育", "智育", "体育", "美育", "劳育"] as const;

export const Q4_FORM_SCHEMA: Q4FormSchema = {
    stageId: "Q4",
    name: "育人目标",
    description: "回答11个问题（4部分），生成《学校育人目标最终版本》并诊断五育覆盖度。",
    sections: [
        {
            id: "foundation",
            title: "根基与灵魂",
            description: "学校历史/传统/校训/学生比喻",
            fields: [
                { key: "history_keywords", type: "textarea", label: "办学历史/传统关键词 (2-3个)", required: true },
                { key: "motto", type: "text", label: "校训/办学理念", required: true },
                { key: "student_metaphor", type: "textarea", label: "学生比喻（如：像水一样适应）", required: true },
            ],
        },
        {
            id: "reality",
            title: "现实与挑战",
            description: "学生构成/优缺点、教师优势、硬件特点",
            fields: [
                { key: "student_background", type: "textarea", label: "学生构成/家庭背景", required: true },
                { key: "student_strengths_weaknesses", type: "textarea", label: "学生优缺点", required: true },
                { key: "teacher_strengths", type: "textarea", label: "教师优势", required: true },
                { key: "campus_hardware", type: "textarea", label: "校园硬件特点", required: true },
            ],
        },
        {
            id: "vision",
            title: "愿景与特色",
            description: "未来特质、五育重点排序、社区资源",
            fields: [
                { key: "future_traits", type: "textarea", label: "20年后学生核心特质（3-5个）", required: true },
                {
                    key: "five_virtues_priority",
                    type: "multiselect",
                    label: "五育重点排序/选择",
                    required: true,
                    options: FIVE_VIRTUES.map((v) => ({ value: v, label: v })),
                    helpText: "可多选并表示优先级（靠前视为优先）。",
                },
                { key: "community_resources", type: "textarea", label: "社区/资源优势", required: true },
            ],
        },
        {
            id: "expression",
            title: "表达与落地",
            description: "表述风格与落地偏好",
            fields: [
                {
                    key: "expression_style",
                    type: "select",
                    label: "表述风格",
                    required: true,
                    options: [
                        { value: "classic", label: "经典稳重" },
                        { value: "modern", label: "现代亲切" },
                        { value: "concise", label: "简洁有力" },
                        { value: "other", label: "其他" },
                    ],
                },
                {
                    key: "landing_preferences",
                    type: "textarea",
                    label: "落地偏好/补充说明",
                    required: false,
                    placeholder: "希望强调真实情境学习、项目化实践等",
                },
            ],
        },
    ],
};

export interface Q4FormData {
    history_keywords: string;
    motto: string;
    student_metaphor: string;
    student_background: string;
    student_strengths_weaknesses: string;
    teacher_strengths: string;
    campus_hardware: string;
    future_traits: string;
    five_virtues_priority: string[];
    community_resources: string;
    expression_style: string;
    landing_preferences?: string;
}

export function normalizeQ4FormData(formData: Record<string, any>): Q4FormData {
    const priorities = Array.isArray(formData.five_virtues_priority)
        ? formData.five_virtues_priority
        : typeof formData.five_virtues_priority === "string" && formData.five_virtues_priority.length > 0
            ? formData.five_virtues_priority.split(",").map((v: string) => v.trim()).filter(Boolean)
            : [];

    return {
        history_keywords: formData.history_keywords || "",
        motto: formData.motto || "",
        student_metaphor: formData.student_metaphor || "",
        student_background: formData.student_background || "",
        student_strengths_weaknesses: formData.student_strengths_weaknesses || "",
        teacher_strengths: formData.teacher_strengths || "",
        campus_hardware: formData.campus_hardware || "",
        future_traits: formData.future_traits || "",
        five_virtues_priority: priorities,
        community_resources: formData.community_resources || "",
        expression_style: formData.expression_style || "",
        landing_preferences: formData.landing_preferences || "",
    };
}

/**
 * Compute Five Virtues coverage and overall score.
 * Priority list gives descending weights 30/25/20/15/10, defaults to均分。
 */
export function computeFiveVirtuesCoverage(priorities: string[]): {
    overall: number;
    dimensions: Record<string, number>;
    suggestions: string[];
} {
    const weights = [30, 25, 20, 15, 10];
    const dims: Record<string, number> = {};

    if (priorities.length === 0) {
        FIVE_VIRTUES.forEach((v) => (dims[v] = 20));
    } else {
        priorities.slice(0, 5).forEach((v, idx) => {
            const name = v as string;
            dims[name] = weights[idx] || 10;
        });
        // fill missing virtues with minimal baseline
        FIVE_VIRTUES.forEach((v) => {
            if (dims[v] === undefined) dims[v] = 12;
        });
    }

    const values = Object.values(dims);
    const overall = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    const suggestions: string[] = [];
    Object.entries(dims).forEach(([k, v]) => {
        if (v < 15) suggestions.push(`提高${k}维度的落地举措，例如活动/课程/项目嵌入`);
    });

    return { overall, dimensions: dims, suggestions };
}

export function buildQ4GenerationInput(formData: Q4FormData, previousStages?: Record<string, any>) {
    return {
        history_keywords: formData.history_keywords,
        motto: formData.motto,
        student_metaphor: formData.student_metaphor,
        student_background: formData.student_background,
        student_strengths_weaknesses: formData.student_strengths_weaknesses,
        teacher_strengths: formData.teacher_strengths,
        campus_hardware: formData.campus_hardware,
        future_traits: formData.future_traits,
        five_virtues_priority: formData.five_virtues_priority.join("、"),
        community_resources: formData.community_resources,
        expression_style: formData.expression_style,
        landing_preferences: formData.landing_preferences || "",
        q2_philosophy: previousStages?.Q2_output || previousStages?.Q2 || "",
        q3_concept: previousStages?.Q3_output?.core_concept || previousStages?.Q3?.core_concept || "",
    };
}

export function extractQ4Keywords(content: string, formData: Q4FormData): string[] {
    const seed = [
        formData.history_keywords,
        formData.motto,
        formData.future_traits,
        formData.five_virtues_priority.join("、"),
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

export default Q4_FORM_SCHEMA;

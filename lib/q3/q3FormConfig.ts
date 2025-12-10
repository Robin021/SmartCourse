/**
 * Q3 Stage Form Configuration - 办学理念
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

export type Q3FieldType = "text" | "textarea";

export interface Q3FormField {
    key: string;
    type: Q3FieldType;
    label: string;
    placeholder?: string;
    required: boolean;
    helpText?: string;
}

export interface Q3FormSection {
    id: string;
    title: string;
    description?: string;
    fields: Q3FormField[];
}

export interface Q3FormSchema {
    stageId: "Q3";
    name: string;
    description: string;
    sections: Q3FormSection[];
}

export const Q3_FORM_SCHEMA: Q3FormSchema = {
    stageId: "Q3",
    name: "办学理念",
    description: "基于教育哲学，提炼简洁有力的核心概念并生成阐释。",
    sections: [
        {
            id: "value_questions",
            title: "四个价值观核心问题",
            description: "回答办学价值观四个核心问题，支撑核心概念提炼。",
            fields: [
                {
                    key: "purpose",
                    type: "textarea",
                    label: "教育目的/使命是什么？",
                    required: true,
                    placeholder: "示例：培养健全人格，兼具社会责任与创新精神。",
                },
                {
                    key: "school_values",
                    type: "textarea",
                    label: "学校价值主张是什么？",
                    required: true,
                    placeholder: "示例：和合共生，向美而行。",
                },
                {
                    key: "student_profile",
                    type: "textarea",
                    label: "希望培养怎样的学生？",
                    required: true,
                    placeholder: "示例：有适应力、有幸福感、乐探究的终身学习者。",
                },
                {
                    key: "action_value",
                    type: "textarea",
                    label: "行动背后的价值取向？",
                    required: true,
                    placeholder: "示例：尊重个体、协作共创、面向真实情境。",
                },
            ],
        },
        {
            id: "concept",
            title: "核心概念确认",
            description: "确认或输入办学理念核心概念（短语/句子均可）。",
            fields: [
                {
                    key: "core_concept",
                    type: "text",
                    label: "核心概念（可自定义或AI生成后修改）",
                    required: false,
                    placeholder: "示例：和合共生，向美而行",
                },
                {
                    key: "supplement",
                    type: "textarea",
                    label: "补充说明/风格偏好",
                    required: false,
                    placeholder: "希望语气简洁有力，突出幸福与责任",
                },
            ],
        },
    ],
};

export interface Q3FormData {
    purpose: string;
    school_values: string;
    student_profile: string;
    action_value: string;
    core_concept?: string;
    supplement?: string;
}

export function normalizeQ3FormData(formData: Record<string, any>): Q3FormData {
    return {
        purpose: formData.purpose || "",
        school_values: formData.school_values || "",
        student_profile: formData.student_profile || "",
        action_value: formData.action_value || "",
        core_concept: formData.core_concept || "",
        supplement: formData.supplement || "",
    };
}

export function buildQ3GenerationInput(formData: Q3FormData, previousStages?: Record<string, any>) {
    return {
        purpose: formData.purpose,
        school_values: formData.school_values,
        student_profile: formData.student_profile,
        action_value: formData.action_value,
        core_concept_hint: formData.core_concept || "",
        supplement: formData.supplement || "",
        q2_philosophy: previousStages?.Q2_output || previousStages?.Q2 || "",
    };
}

/**
 * 简单理念正向性校验：确保提到“五育”“立德树人”倾向；避免负向词。
 */
export function evaluatePositiveAlignment(content: string): {
    isPositive: boolean;
    suggestions: string[];
} {
    const lower = content.toLowerCase();
    const riskWords = ["暴力", "歧视", "惩罚", "服从至上"];
    const missingSignals = [];

    if (!lower.includes("五育") && !lower.includes("德智体美劳")) {
        missingSignals.push("补充“五育并举”相关表述");
    }
    if (!lower.includes("立德树人")) {
        missingSignals.push("补充“立德树人”价值取向");
    }

    const hasRisk = riskWords.some((w) => content.includes(w));
    const suggestions = [...missingSignals];
    if (hasRisk) suggestions.push("移除可能的负向或违背教育方针的表述");

    return {
        isPositive: !hasRisk && missingSignals.length === 0,
        suggestions,
    };
}

export function extractQ3Keywords(content: string, formData: Q3FormData): string[] {
    const seed = [
        formData.core_concept || "",
        formData.school_values,
        formData.student_profile,
        formData.action_value,
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

export default Q3_FORM_SCHEMA;

/**
 * Q6 Stage Form Configuration - 课程理念陈述
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

export type Q6FieldType = "text" | "textarea";

export interface Q6FormField {
    key: string;
    type: Q6FieldType;
    label: string;
    placeholder?: string;
    required: boolean;
    helpText?: string;
}

export interface Q6FormSection {
    id: string;
    title: string;
    description?: string;
    fields: Q6FormField[];
}

export interface Q6FormSchema {
    stageId: "Q6";
    name: string;
    description: string;
    sections: Q6FormSection[];
}

export const Q6_FORM_SCHEMA: Q6FormSchema = {
    stageId: "Q6",
    name: "课程理念",
    description: "回答四个关键问题，生成《课程理念草案》，诊断价值取向一致性。",
    sections: [
        {
            id: "core_questions",
            title: "课程理念四个关键问题",
            fields: [
                {
                    key: "course_form",
                    type: "textarea",
                    label: "课程样态/组织形态",
                    required: true,
                    placeholder: "例如：项目式融合课程、跨学科主题域、分层走班等",
                },
                {
                    key: "student_development",
                    type: "textarea",
                    label: "学生通过课程发展的目标",
                    required: true,
                    placeholder: "例如：适应力、创造力、幸福感、责任感",
                },
                {
                    key: "value_alignment",
                    type: "textarea",
                    label: "课程价值与教育价值的一致性",
                    required: true,
                    placeholder: "如何兼顾工具性与育人价值，呼应五育并举/立德树人",
                },
                {
                    key: "school_alignment",
                    type: "textarea",
                    label: "课程目标与学校发展的关联",
                    required: true,
                    placeholder: "支撑学校品牌/战略目标/特色办学",
                },
            ],
        },
        {
            id: "style",
            title: "补充与风格偏好",
            fields: [
                {
                    key: "style_hint",
                    type: "textarea",
                    label: "风格/语气偏好（选填）",
                    required: false,
                    placeholder: "希望简洁有力，突出实践导向",
                },
            ],
        },
    ],
};

export interface Q6FormData {
    course_form: string;
    student_development: string;
    value_alignment: string;
    school_alignment: string;
    style_hint?: string;
}

export function normalizeQ6FormData(formData: Record<string, any>): Q6FormData {
    return {
        course_form: formData.course_form || "",
        student_development: formData.student_development || "",
        value_alignment: formData.value_alignment || "",
        school_alignment: formData.school_alignment || "",
        style_hint: formData.style_hint || "",
    };
}

export function buildQ6GenerationInput(formData: Q6FormData, previousStages?: Record<string, any>) {
    return {
        course_form: formData.course_form,
        student_development: formData.student_development,
        value_alignment: formData.value_alignment,
        school_alignment: formData.school_alignment,
        style_hint: formData.style_hint || "",
        q2_philosophy: previousStages?.Q2_output || previousStages?.Q2 || "",
        q3_concept: previousStages?.Q3_output?.core_concept || previousStages?.Q3?.core_concept || "",
        q4_goal: previousStages?.Q4_output || previousStages?.Q4 || "",
        q5_name: previousStages?.Q5_output?.name_suggestion || previousStages?.Q5?.name_suggestion || "",
    };
}

/**
 * 简单的一致性/价值取向评分。
 */
export function computeValueConsistencyScore(formData: Q6FormData, ragSupport: number): {
    score: number;
    suggestions: string[];
} {
    let score = 40;
    if (formData.course_form) score += 10;
    if (formData.student_development) score += 10;
    if (formData.value_alignment) score += 10;
    if (formData.school_alignment) score += 10;
    if (formData.value_alignment.includes("五育") || formData.value_alignment.includes("德智体美劳")) score += 8;
    if (formData.value_alignment.includes("立德树人")) score += 6;
    if (ragSupport > 0) score += Math.min(ragSupport * 3, 12);

    score = Math.max(0, Math.min(100, score));

    const suggestions: string[] = [];
    if (!formData.value_alignment.includes("五育") && !formData.value_alignment.includes("德智体美劳")) {
        suggestions.push("补充五育并举的价值表述，体现全面发展");
    }
    if (!formData.value_alignment.includes("立德树人")) {
        suggestions.push("强调立德树人，表明课程的育人导向");
    }
    if (!formData.school_alignment) suggestions.push("说明课程如何支撑学校品牌/战略目标");

    return { score, suggestions };
}

export function extractQ6Keywords(content: string, formData: Q6FormData): string[] {
    const seed = [
        formData.course_form,
        formData.student_development,
        formData.value_alignment,
        formData.school_alignment,
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

export default Q6_FORM_SCHEMA;

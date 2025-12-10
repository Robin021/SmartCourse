/**
 * Q9 Stage Form Configuration - 课程实施方案
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8
 */

export type Q9FieldType = "text" | "textarea" | "select" | "multiselect";

export interface Q9FormField {
    key: string;
    type: Q9FieldType;
    label: string;
    placeholder?: string;
    required: boolean;
    options?: { value: string; label: string }[];
    helpText?: string;
}

export interface Q9FormSection {
    id: string;
    title: string;
    description?: string;
    fields: Q9FormField[];
}

export interface Q9FormSchema {
    stageId: "Q9";
    name: string;
    description: string;
    sections: Q9FormSection[];
}

export const PATH_OPTIONS = [
    { value: "venue", label: "场馆/研学" },
    { value: "project", label: "项目学习(PBL)" },
    { value: "festival", label: "节庆/仪式" },
    { value: "club", label: "社团/校本活动" },
    { value: "service", label: "服务学习" },
    { value: "research", label: "研究/探究" },
] as const;

export const Q9_FORM_SCHEMA: Q9FormSchema = {
    stageId: "Q9",
    name: "课程实施方案",
    description: "将课程结构转化为实施路径、角色与时间表，并诊断可行性。",
    sections: [
        {
            id: "vision",
            title: "实施愿景与课堂样态",
            fields: [
                {
                    key: "implementation_vision",
                    type: "textarea",
                    label: "实施愿景/课堂样态",
                    required: true,
                    placeholder: "如：每节课成为学生主动探究的舞台，课程与社区共生长",
                },
                {
                    key: "learning_modes",
                    type: "textarea",
                    label: "学生学习方式",
                    required: true,
                    placeholder: "做中学/小组协作/真实情境探究",
                },
            ],
        },
        {
            id: "paths",
            title: "优先实施路径",
            description: "选择或描述实施路径，匹配课程结构。",
            fields: [
                {
                    key: "path_choices",
                    type: "multiselect",
                    label: "路径选择",
                    required: true,
                    options: PATH_OPTIONS,
                },
                {
                    key: "path_keywords",
                    type: "textarea",
                    label: "路径关键词/活动示例",
                    required: true,
                    placeholder: "例如：真境探究、真雅仪式、节庆周、跨学科项目",
                },
            ],
        },
        {
            id: "roles",
            title: "师生角色与支持体系",
            fields: [
                {
                    key: "teacher_roles",
                    type: "textarea",
                    label: "教师角色",
                    required: true,
                    placeholder: "引导者/设计者/资源整合者",
                },
                {
                    key: "support_system",
                    type: "textarea",
                    label: "教研/资源支持体系",
                    required: true,
                    placeholder: "教研组协作、资源库、校外合作等",
                },
            ],
        },
        {
            id: "mapping",
            title: "模块与路径映射",
            description: "将Q8模块映射到路径，备注关键活动。",
            fields: [
                {
                    key: "module_path_mapping",
                    type: "textarea",
                    label: "二级模块与实施路径映射",
                    required: true,
                    placeholder: "示例：\n汉中博物课程 -> 真境探究+研学；\n数智阳光 -> PBL+社团",
                },
                {
                    key: "phase_plan",
                    type: "textarea",
                    label: "学段/周期计划",
                    required: true,
                    placeholder: "低/中/高学段或学期/月度的重点活动/节奏",
                },
            ],
        },
        {
            id: "style",
            title: "补充与风格",
            fields: [
                {
                    key: "style_hint",
                    type: "textarea",
                    label: "风格/补充说明",
                    required: false,
                    placeholder: "希望突出真实情境、跨学科、评价方式等",
                },
            ],
        },
    ],
};

export interface Q9FormData {
    implementation_vision: string;
    learning_modes: string;
    path_choices: string[];
    path_keywords: string;
    teacher_roles: string;
    support_system: string;
    module_path_mapping: string;
    phase_plan: string;
    style_hint?: string;
}

export function normalizeQ9FormData(formData: Record<string, any>): Q9FormData {
    const path_choices = Array.isArray(formData.path_choices)
        ? formData.path_choices
        : typeof formData.path_choices === "string" && formData.path_choices.length > 0
            ? formData.path_choices.split(",").map((v: string) => v.trim()).filter(Boolean)
            : [];

    return {
        implementation_vision: formData.implementation_vision || "",
        learning_modes: formData.learning_modes || "",
        path_choices,
        path_keywords: formData.path_keywords || "",
        teacher_roles: formData.teacher_roles || "",
        support_system: formData.support_system || "",
        module_path_mapping: formData.module_path_mapping || "",
        phase_plan: formData.phase_plan || "",
        style_hint: formData.style_hint || "",
    };
}

/**
 * 简易可行性评分。
 */
export function computeFeasibilityScore(formData: Q9FormData, ragSupport: number): {
    score: number;
    suggestions: string[];
} {
    let score = 45;
    if (formData.implementation_vision) score += 8;
    if (formData.path_choices.length > 0) score += Math.min(formData.path_choices.length * 4, 16);
    if (formData.module_path_mapping) score += 12;
    if (formData.phase_plan) score += 10;
    if (formData.teacher_roles && formData.support_system) score += 8;
    if (ragSupport > 0) score += Math.min(ragSupport * 3, 9);
    score = Math.max(0, Math.min(100, score));

    const suggestions: string[] = [];
    if (!formData.phase_plan) suggestions.push("补充学段/周期计划，明确节奏与节点");
    if (!formData.module_path_mapping) suggestions.push("将Q8二级模块映射到具体实施路径");
    if (!formData.support_system) suggestions.push("补充教研/资源支持体系，确保落地");

    return { score, suggestions };
}

export function buildQ9GenerationInput(formData: Q9FormData, previousStages?: Record<string, any>) {
    return {
        implementation_vision: formData.implementation_vision,
        learning_modes: formData.learning_modes,
        path_choices: formData.path_choices.join("、"),
        path_keywords: formData.path_keywords,
        teacher_roles: formData.teacher_roles,
        support_system: formData.support_system,
        module_path_mapping: formData.module_path_mapping,
        phase_plan: formData.phase_plan,
        style_hint: formData.style_hint || "",
        q2_philosophy: previousStages?.Q2_output || previousStages?.Q2 || "",
        q3_concept: previousStages?.Q3_output?.core_concept || previousStages?.Q3?.core_concept || "",
        q4_goal: previousStages?.Q4_output || previousStages?.Q4 || "",
        q5_name: previousStages?.Q5_output?.name_suggestion || previousStages?.Q5?.name_suggestion || "",
        q6_concept: previousStages?.Q6_output || previousStages?.Q6 || "",
        q8_structure: previousStages?.Q8_output || previousStages?.Q8 || "",
    };
}

export function extractQ9Keywords(content: string, formData: Q9FormData): string[] {
    const seed = [
        formData.path_choices.join("、"),
        formData.path_keywords,
        formData.module_path_mapping,
        formData.phase_plan,
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

export default Q9_FORM_SCHEMA;

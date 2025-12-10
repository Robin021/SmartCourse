/**
 * Q1 Stage Form Configuration
 * 
 * Defines the UI schema for Q1 SWOT analysis form.
 * Based on Requirements 1.1 - SWOT表格输入界面（内部10项+外部10项）
 */

export interface Q1FormField {
    key: string;
    type: 'text' | 'textarea' | 'number' | 'select';
    label: string;
    placeholder?: string;
    required: boolean;
    min?: number;
    max?: number;
    options?: { value: string; label: string }[];
}

export interface Q1FormSection {
    id: string;
    title: string;
    description?: string;
    category: 'internal' | 'external';
    type: 'strength' | 'weakness' | 'opportunity' | 'threat';
    fields: Q1FormField[];
}

export interface Q1FormSchema {
    stageId: string;
    name: string;
    description: string;
    sections: Q1FormSection[];
}

/**
 * Generate SWOT item fields for a section
 */
function generateSWOTItemFields(prefix: string, count: number): Q1FormField[] {
    const fields: Q1FormField[] = [];

    for (let i = 1; i <= count; i++) {
        fields.push({
            key: `${prefix}_${i}_description`,
            type: "textarea",
            label: `第${i}项描述`,
            placeholder: "请描述具体内容...",
            required: true,
        });
    }

    return fields;
}

/**
 * Q1 Form Schema - SWOT Analysis
 * 
 * Structure:
 * - Internal Analysis (10 items)
 *   - Strengths (5 items)
 *   - Weaknesses (5 items)
 * - External Analysis (10 items)
 *   - Opportunities (5 items)
 *   - Threats (5 items)
 */
export const Q1_FORM_SCHEMA: Q1FormSchema = {
    stageId: 'Q1',
    name: '学校课程情境分析',
    description: '通过SWOT分析，全面评估学校课程资源的优势、劣势、机会和威胁。',
    sections: [
        // School Basic Info
        {
            id: 'school_info',
            title: '学校基本信息',
            description: '请填写学校的基本信息',
            category: 'internal',
            type: 'strength',
            fields: [
                {
                    key: 'school_name',
                    type: 'text',
                    label: '学校名称',
                    placeholder: '请输入学校全称',
                    required: true,
                },
                {
                    key: 'school_region',
                    type: 'text',
                    label: '所在地区',
                    placeholder: '省/市/区',
                    required: true,
                },
                {
                    key: 'school_type',
                    type: 'select',
                    label: '学校类型',
                    required: true,
                    options: [
                        { value: 'primary', label: '小学' },
                        { value: 'middle', label: '初中' },
                        { value: 'high', label: '高中' },
                        { value: 'nine_year', label: '九年一贯制' },
                        { value: 'twelve_year', label: '十二年一贯制' },
                    ],
                },
            ],
        },
        // Internal - Strengths
        {
            id: 'strengths',
            title: '内部优势 (Strengths)',
            description: '学校在课程资源方面的内部优势，如师资力量、教学设施、特色课程等',
            category: 'internal',
            type: 'strength',
            fields: generateSWOTItemFields('strength', 5),
        },
        // Internal - Weaknesses
        {
            id: 'weaknesses',
            title: '内部劣势 (Weaknesses)',
            description: '学校在课程资源方面的内部不足，如资源短缺、能力欠缺等',
            category: 'internal',
            type: 'weakness',
            fields: generateSWOTItemFields('weakness', 5),
        },
        // External - Opportunities
        {
            id: 'opportunities',
            title: '外部机会 (Opportunities)',
            description: '学校可以利用的外部机遇，如政策支持、社区资源、合作机会等',
            category: 'external',
            type: 'opportunity',
            fields: generateSWOTItemFields('opportunity', 5),
        },
        // External - Threats
        {
            id: 'threats',
            title: '外部威胁 (Threats)',
            description: '学校面临的外部挑战，如竞争压力、政策变化、资源限制等',
            category: 'external',
            type: 'threat',
            fields: generateSWOTItemFields('threat', 5),
        },
        // Additional Notes
        {
            id: 'additional',
            title: '补充说明',
            description: '其他需要补充的信息',
            category: 'internal',
            type: 'strength',
            fields: [
                {
                    key: 'additional_notes',
                    type: 'textarea',
                    label: '补充说明',
                    placeholder: '请输入其他需要说明的内容（选填）',
                    required: false,
                },
            ],
        },
    ],
};

/**
 * Convert form data to SWOT input structure
 */
export function formDataToSWOTInput(formData: Record<string, any>): {
    internal: {
        strengths: Array<{ id: string; category: 'internal'; type: 'strength'; description: string; score: number }>;
        weaknesses: Array<{ id: string; category: 'internal'; type: 'weakness'; description: string; score: number }>;
    };
    external: {
        opportunities: Array<{ id: string; category: 'external'; type: 'opportunity'; description: string; score: number }>;
        threats: Array<{ id: string; category: 'external'; type: 'threat'; description: string; score: number }>;
    };
    schoolName?: string;
    region?: string;
    additionalNotes?: string;
} {
    const extractItems = <T extends "strength" | "weakness" | "opportunity" | "threat">(
        prefix: string,
        count: number,
        category: "internal" | "external",
        type: T
    ) => {
        const items: Array<{ id: string; category: typeof category; type: T; description: string; score: number }> = [];

        for (let i = 1; i <= count; i++) {
            const description = formData[`${prefix}_${i}_description`];

            if (description) {
                items.push({
                    id: `${prefix}_${i}`,
                    category,
                    type,
                    description,
                    score: autoScoreFromText(description, type),
                });
            }
        }

        return items;
    };

    return {
        internal: {
            strengths: extractItems('strength', 5, 'internal', 'strength'),
            weaknesses: extractItems('weakness', 5, 'internal', 'weakness'),
        },
        external: {
            opportunities: extractItems('opportunity', 5, 'external', 'opportunity'),
            threats: extractItems('threat', 5, 'external', 'threat'),
        },
        schoolName: formData.school_name,
        region: formData.school_region,
        additionalNotes: formData.additional_notes,
    };
}

/**
 * Get default form data for Q1
 */
export function getDefaultQ1FormData(): Record<string, any> {
    const data: Record<string, any> = {
        school_name: '',
        school_region: '',
        school_type: '',
        additional_notes: '',
    };

    // Initialize SWOT items
    const prefixes = ['strength', 'weakness', 'opportunity', 'threat'];
    for (const prefix of prefixes) {
        for (let i = 1; i <= 5; i++) {
            data[`${prefix}_${i}_description`] = '';
        }
    }

    return data;
}

/**
 * Lightweight heuristic auto-scoring so用户无需手填分值
 * - 基础分 3
 * - 长度越长略微加分，最多 +1
 */
function autoScoreFromText(
    description: string,
    type: "strength" | "weakness" | "opportunity" | "threat"
): number {
    if (!description) return 3;

    const text = description.trim();
    const lengthBoost = Math.min(1, Math.floor(text.length / 80)); // 更长的描述权重更高

    const keywordBoost = (() => {
        const positive = ["优势", "突出", "优秀", "领先", "充足", "丰富", "成熟", "完善"];
        const negative = ["缺乏", "不足", "短板", "困难", "滞后", "薄弱", "风险", "威胁", "压力", "竞争"];
        const has = (kw: string) => text.includes(kw);

        switch (type) {
            case "strength":
                return positive.some(has) ? 1 : 0;
            case "opportunity":
                return positive.some(has) ? 1 : 0;
            case "weakness":
                return negative.some(has) ? 1 : 0;
            case "threat":
                return negative.some(has) ? 1 : 0;
            default:
                return 0;
        }
    })();

    const base = 3 + lengthBoost + keywordBoost;
    return Math.max(1, Math.min(5, base));
}

export default Q1_FORM_SCHEMA;

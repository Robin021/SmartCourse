import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import Project from "@/models/Project";
import { initializeStages } from "@/models/Project";
import StageConfig from "@/models/StageConfig";
import PromptTemplate from "@/models/PromptTemplate";
import PromptVersion from "@/models/PromptVersion";
import bcrypt from "bcryptjs";
import { Q1_PROMPT_METADATA } from "@/lib/q1";
import { Q2_PROMPT_METADATA } from "@/lib/q2";
import { Q3_PROMPT_METADATA } from "@/lib/q3";
import { Q4_PROMPT_METADATA } from "@/lib/q4";
import { Q5_PROMPT_METADATA } from "@/lib/q5";
import { Q6_PROMPT_METADATA } from "@/lib/q6";
import { Q7_PROMPT_METADATA } from "@/lib/q7";
import { Q8_PROMPT_METADATA } from "@/lib/q8";
import { Q9_PROMPT_METADATA } from "@/lib/q9";
import { Q10_PROMPT_METADATA } from "@/lib/q10";

// Define Stages Data externally for reusability in Create and Update
const STAGES_DATA = [
    {
        stage_id: "Q1",
        name: "School Background",
        description: "Basic info about the school.",
        ui_schema: {
            sections: [
                {
                    title: "Basic Info",
                    fields: [
                        {
                            key: "school_name",
                            type: "text",
                            label: "School Name",
                            required: true,
                        },
                        {
                            key: "history",
                            type: "textarea",
                            label: "History",
                            required: true,
                        },
                    ],
                },
            ],
        },
    },
    {
        stage_id: "Q2",
        name: "教育哲学",
        description: "选择教育哲学理论并结合学校特色，生成个性化的教育哲学陈述。",
        ui_schema: {
            sections: [
                {
                    title: "核心教育哲学选择",
                    fields: [
                        {
                            key: "selected_theories",
                            type: "multiselect",
                            label: "选择教育哲学流派",
                            required: true,
                            options: [
                                "儒家哲学",
                                "永恒主义教育",
                                "要素主义教育",
                                "进步主义教育",
                                "存在主义教育",
                                "实用主义教育",
                                "结构主义教育",
                                "文化教育学",
                                "后现代主义教育",
                                "认知主义教育",
                                "建构主义教育",
                                "人本主义教育",
                                "多元智能教育",
                            ],
                        },
                        {
                            key: "custom_theories",
                            type: "text",
                            label: "自定义/补充哲学流派",
                            required: false,
                        },
                    ],
                },
                {
                    title: "时代精神与地域文化",
                    fields: [
                        {
                            key: "era_spirit",
                            type: "textarea",
                            label: "时代精神来源",
                            required: true,
                        },
                        {
                            key: "regional_culture",
                            type: "textarea",
                            label: "地域文化精髓",
                            required: true,
                        },
                        {
                            key: "school_profile",
                            type: "textarea",
                            label: "学校自身发展信息",
                            required: true,
                        },
                    ],
                },
                {
                    title: "表达与补充",
                    fields: [
                        {
                            key: "philosophy_statement_hint",
                            type: "textarea",
                            label: "哲学主张草案（可选）",
                            required: false,
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
        },
    },
    {
        stage_id: "Q3",
        name: "办学理念",
        description: "基于教育哲学提炼核心概念，生成《办学理念详细阐释》。",
        ui_schema: {
            sections: [
                {
                    title: "四个价值观问题",
                    fields: [
                        { key: "purpose", type: "textarea", label: "教育目的/使命", required: true },
                        { key: "school_values", type: "textarea", label: "学校价值主张", required: true },
                        { key: "student_profile", type: "textarea", label: "期望学生画像", required: true },
                        { key: "action_value", type: "textarea", label: "行动价值取向", required: true },
                    ],
                },
                {
                    title: "核心概念确认",
                    fields: [
                        { key: "core_concept", type: "text", label: "核心概念（可自定义）", required: false },
                        { key: "supplement", type: "textarea", label: "补充/风格偏好", required: false },
                    ],
                },
            ],
        },
    },
    {
        stage_id: "Q4",
        name: "育人目标",
        description: "回答11个问题，生成《学校育人目标最终版本》，并诊断五育覆盖度。",
        ui_schema: {
            sections: [
                {
                    title: "根基与灵魂",
                    fields: [
                        { key: "history_keywords", type: "textarea", label: "办学历史/传统关键词", required: true },
                        { key: "motto", type: "text", label: "校训/办学理念", required: true },
                        { key: "student_metaphor", type: "textarea", label: "学生比喻", required: true },
                    ],
                },
                {
                    title: "现实与挑战",
                    fields: [
                        { key: "student_background", type: "textarea", label: "学生构成/家庭背景", required: true },
                        { key: "student_strengths_weaknesses", type: "textarea", label: "学生优缺点", required: true },
                        { key: "teacher_strengths", type: "textarea", label: "教师优势", required: true },
                        { key: "campus_hardware", type: "textarea", label: "校园硬件特点", required: true },
                    ],
                },
                {
                    title: "愿景与特色",
                    fields: [
                        { key: "future_traits", type: "textarea", label: "未来学生特质", required: true },
                        { key: "five_virtues_priority", type: "multiselect", label: "五育重点排序", required: true, options: ["德育", "智育", "体育", "美育", "劳育"] },
                        { key: "community_resources", type: "textarea", label: "社区/资源优势", required: true },
                    ],
                },
                {
                    title: "表达与落地",
                    fields: [
                        {
                            key: "expression_style",
                            type: "select",
                            label: "表述风格",
                            required: true,
                            options: ["经典稳重", "现代亲切", "简洁有力", "其他"],
                        },
                        { key: "landing_preferences", type: "textarea", label: "落地偏好/补充说明", required: false },
                    ],
                },
            ],
        },
    },
    {
        stage_id: "Q5",
        name: "课程模式命名",
        description: "为校本课程体系生成名称与口号，评估适配性。",
        ui_schema: {
            sections: [
                {
                    title: "命名来源",
                    fields: [
                        { key: "name_sources", type: "multiselect", label: "命名来源", required: true, options: ["历史/校史", "在地文化", "教育哲学(Q2)", "育人目标(Q4)", "品牌/愿景", "地理/场景"] },
                        { key: "theme_keywords", type: "textarea", label: "主题/关键词", required: true },
                        { key: "metaphor", type: "textarea", label: "核心隐喻/意象", required: false },
                    ],
                },
                {
                    title: "命名提案与约束",
                    fields: [
                        { key: "custom_name", type: "text", label: "自定义名称", required: false },
                        { key: "custom_tagline", type: "text", label: "自定义口号/副标题", required: false },
                        { key: "cultural_symbols", type: "textarea", label: "必须包含的文化符号/元素", required: false },
                        { key: "stakeholder_preferences", type: "textarea", label: "利益相关者偏好", required: false },
                        { key: "uniqueness_constraints", type: "textarea", label: "避免冲突/重复", required: false },
                    ],
                },
            ],
        },
    },
    {
        stage_id: "Q6",
        name: "课程理念",
        description: "生成《课程理念草案》，诊断价值一致性。",
        ui_schema: {
            sections: [
                {
                    title: "课程理念四个关键问题",
                    fields: [
                        { key: "course_form", type: "textarea", label: "课程样态/组织形态", required: true },
                        { key: "student_development", type: "textarea", label: "学生发展目标", required: true },
                        { key: "value_alignment", type: "textarea", label: "课程价值与教育价值一致性", required: true },
                        { key: "school_alignment", type: "textarea", label: "课程与学校发展关联", required: true },
                    ],
                },
                {
                    title: "补充与风格偏好",
                    fields: [
                        { key: "style_hint", type: "textarea", label: "风格/语气偏好", required: false },
                    ],
                },
            ],
        },
    },
    {
        stage_id: "Q7",
        name: "课程目标细化",
        description: "分学段细化课程目标，分析达成差距。",
        ui_schema: {
            sections: [
                {
                    title: "现状评估与特色载体",
                    fields: [
                        { key: "current_strengths", type: "textarea", label: "现有课程优势", required: true },
                        { key: "current_gaps", type: "textarea", label: "薄弱维度/痛点", required: true },
                        { key: "feature_carriers", type: "textarea", label: "特色载体", required: true },
                    ],
                },
                {
                    title: "目标维度与重点",
                    fields: [
                        { key: "dimension_focus", type: "multiselect", label: "重点维度", required: true, options: ["德育", "智育", "体育", "美育", "劳育", "科技素养", "创新能力"] },
                        { key: "low_stage_targets", type: "textarea", label: "低学段目标", required: true },
                        { key: "mid_stage_targets", type: "textarea", label: "中学段目标", required: true },
                        { key: "high_stage_targets", type: "textarea", label: "高学段目标", required: true },
                    ],
                },
                {
                    title: "补充说明",
                    fields: [
                        { key: "style_hint", type: "textarea", label: "风格/补充说明", required: false },
                    ],
                },
            ],
        },
    },
    {
        stage_id: "Q8",
        name: "课程结构设计",
        description: "设计课程结构与板块/模块映射，生成方案初稿。",
        ui_schema: {
            sections: [
                {
                    title: "核心关键词与隐喻",
                    fields: [
                        { key: "core_keywords", type: "textarea", label: "核心关键词", required: true },
                        { key: "core_metaphor", type: "text", label: "核心隐喻", required: false },
                    ],
                },
                {
                    title: "顶层逻辑框架",
                    fields: [
                        { key: "framework", type: "select", label: "框架选择", required: true, options: ["五育并举", "核心素养", "主题域", "自创模型"] },
                        { key: "board_names", type: "textarea", label: "一级板块名称", required: true },
                    ],
                },
                {
                    title: "二级模块与映射",
                    fields: [
                        { key: "modules_plan", type: "textarea", label: "二级模块清单", required: true },
                        { key: "mapping_notes", type: "textarea", label: "模块×目标映射备注", required: false },
                    ],
                },
                {
                    title: "文档风格与补充",
                    fields: [
                        { key: "doc_style", type: "select", label: "文档风格", required: true, options: ["理论型", "实践型", "宣传型"] },
                        { key: "additional_notes", type: "textarea", label: "补充说明", required: false },
                    ],
                },
            ],
        },
    },
    {
        stage_id: "Q9",
        name: "课程实施",
        description: "将课程结构转化为实施路径与时间表，并诊断可行性。",
        ui_schema: {
            sections: [
                {
                    title: "实施愿景与课堂样态",
                    fields: [
                        { key: "implementation_vision", type: "textarea", label: "实施愿景/课堂样态", required: true },
                        { key: "learning_modes", type: "textarea", label: "学生学习方式", required: true },
                    ],
                },
                {
                    title: "优先实施路径",
                    fields: [
                        { key: "path_choices", type: "multiselect", label: "路径选择", required: true, options: ["场馆/研学", "项目学习(PBL)", "节庆/仪式", "社团/校本活动", "服务学习", "研究/探究"] },
                        { key: "path_keywords", type: "textarea", label: "路径关键词/活动示例", required: true },
                    ],
                },
                {
                    title: "师生角色与支持体系",
                    fields: [
                        { key: "teacher_roles", type: "textarea", label: "教师角色", required: true },
                        { key: "support_system", type: "textarea", label: "教研/资源支持体系", required: true },
                    ],
                },
                {
                    title: "模块与路径映射",
                    fields: [
                        { key: "module_path_mapping", type: "textarea", label: "二级模块与实施路径映射", required: true },
                        { key: "phase_plan", type: "textarea", label: "学段/周期计划", required: true },
                    ],
                },
                {
                    title: "补充与风格",
                    fields: [
                        { key: "style_hint", type: "textarea", label: "风格/补充说明", required: false },
                    ],
                },
            ],
        },
    },
    {
        stage_id: "Q10",
        name: "课程评价",
        description: "选择评价体系并生成《学校课程评价体系方案》。",
        ui_schema: {
            sections: [
                {
                    title: "评价体系选择",
                    fields: [
                        { key: "evaluation_model", type: "select", label: "评价体系", required: true, options: ["335", "custom"] },
                        { key: "model_notes", type: "textarea", label: "模型说明/匹配需求", required: true },
                    ],
                },
                {
                    title: "五维评价设计与激励",
                    fields: [
                        { key: "dimension_requirements", type: "textarea", label: "五维评价需求", required: true },
                        { key: "incentive_preferences", type: "textarea", label: "激励机制/视觉偏好", required: false },
                        { key: "visual_need", type: "select", label: "是否需要视觉导图建议", required: true, options: ["yes", "no"] },
                    ],
                },
                {
                    title: "补充与风格",
                    fields: [
                        { key: "doc_style", type: "select", label: "文档风格", required: true, options: ["理论型", "实践型", "宣传型"] },
                        { key: "additional_notes", type: "textarea", label: "补充说明", required: false },
                    ],
                },
            ],
        },
    },
];

// Default system prompts to seed
const DEFAULT_PROMPTS = [
    {
        name: "AI 助手 (Chat Assistant)",
        key: "chat_system",
        template: `你是一位专业的学校课程设计AI助手，正在帮助用户完善他们当前的学校课程规划方案。

## 当前工作上下文
- 阶段：{{stage_name}}
- 任务：{{stage_description}}

## 已有信息参考
{{form_data}}

## 你的核心职责
1. **主动建言**：观察用户当前的输入内容，根据阶段任务目标，主动提供具体的优化建议或补充思路。
2. **答疑解惑**：专业、准确地回答用户关于本阶段课程设计的任何疑问。
3. **内容润色**：当用户请求时，帮助润色、扩写或精简特定的文本内容，使其更符合教育专业表述。
4. **引导思考**：通过提问引导用户深入思考学校特色与课程的结合点。

## 回复准则
- 保持专业、亲切、鼓励性的语气。
- 回答要紧扣当前阶段任务，避免跑题。
- 多引用用户已有的数据（如学校背景、哲学理念等），使回答具有很强的针对性。
- 使用Markdown格式清晰组织回复内容。`,
        description: "AI助手聊天系统提示词 - 用于阶段页面右侧的对话式助手",
        is_system: true,
    },
    {
        name: "Stage Content Generator",
        key: "stage_generation",
        template: `You are an expert educational content writer. Generate high-quality content for a school development plan.

STAGE: {{stage_name}}
DESCRIPTION: {{stage_description}}

EXISTING DATA:
{{form_data}}

CONTEXT DOCUMENTS:
{{rag_context}}

INSTRUCTIONS:
1. Analyze the existing data and context documents
2. Generate comprehensive, well-structured content
3. Use professional educational terminology
4. Include specific, actionable recommendations
5. Format with clear headings and bullet points`,
        description: "Prompt for generating stage content drafts",
        is_system: true,
    },
    {
        name: "RAG Context Formatter",
        key: "rag_context",
        template: `The following documents are relevant to the current task:

{{documents}}

Use these as reference material to inform your response. Cite specific documents when appropriate.`,
        description: "Template for formatting RAG retrieval results",
        is_system: true,
    },
    {
        name: Q1_PROMPT_METADATA.name,
        key: Q1_PROMPT_METADATA.key,
        template: Q1_PROMPT_METADATA.template,
        description: Q1_PROMPT_METADATA.description,
        is_system: true,
    },
    {
        name: Q2_PROMPT_METADATA.name,
        key: Q2_PROMPT_METADATA.key,
        template: Q2_PROMPT_METADATA.template,
        description: Q2_PROMPT_METADATA.description,
        is_system: true,
    },
    {
        name: Q3_PROMPT_METADATA.name,
        key: Q3_PROMPT_METADATA.key,
        template: Q3_PROMPT_METADATA.template,
        description: Q3_PROMPT_METADATA.description,
        is_system: true,
    },
    {
        name: Q4_PROMPT_METADATA.name,
        key: Q4_PROMPT_METADATA.key,
        template: Q4_PROMPT_METADATA.template,
        description: Q4_PROMPT_METADATA.description,
        is_system: true,
    },
    {
        name: Q5_PROMPT_METADATA.name,
        key: Q5_PROMPT_METADATA.key,
        template: Q5_PROMPT_METADATA.template,
        description: Q5_PROMPT_METADATA.description,
        is_system: true,
    },
    {
        name: Q6_PROMPT_METADATA.name,
        key: Q6_PROMPT_METADATA.key,
        template: Q6_PROMPT_METADATA.template,
        description: Q6_PROMPT_METADATA.description,
        is_system: true,
    },
    {
        name: Q7_PROMPT_METADATA.name,
        key: Q7_PROMPT_METADATA.key,
        template: Q7_PROMPT_METADATA.template,
        description: Q7_PROMPT_METADATA.description,
        is_system: true,
    },
    {
        name: Q8_PROMPT_METADATA.name,
        key: Q8_PROMPT_METADATA.key,
        template: Q8_PROMPT_METADATA.template,
        description: Q8_PROMPT_METADATA.description,
        is_system: true,
    },
    {
        name: Q9_PROMPT_METADATA.name,
        key: Q9_PROMPT_METADATA.key,
        template: Q9_PROMPT_METADATA.template,
        description: Q9_PROMPT_METADATA.description,
        is_system: true,
    },
    {
        name: Q10_PROMPT_METADATA.name,
        key: Q10_PROMPT_METADATA.key,
        template: Q10_PROMPT_METADATA.template,
        description: Q10_PROMPT_METADATA.description,
        is_system: true,
    },
];

export async function GET() {
    try {
        await connectDB();

        const demoPassword = "password";
        const demoPasswordHash = await bcrypt.hash(demoPassword, 10);

        // 1. Create Demo User
        const email = "teacher@demo.com";
        const existingUser = await User.findOne({ email });

        if (!existingUser) {
            await User.create({
                email,
                password_hash: demoPasswordHash,
                full_name: "Demo Teacher",
                role: "TEACHER",
                tenant_id: "bureau_01",
                school_id: "school_01",
            });
        } else {
            const matches = await bcrypt.compare(
                demoPassword,
                existingUser.password_hash
            );
            if (!matches) {
                await User.updateOne(
                    { _id: existingUser._id },
                    { $set: { password_hash: demoPasswordHash } }
                );
            }
        }

        // 1.1 Create Demo Admin
        const adminEmail = "admin@demo.com";
        const existingAdmin = await User.findOne({ email: adminEmail });

        if (!existingAdmin) {
            await User.create({
                email: adminEmail,
                password_hash: demoPasswordHash,
                full_name: "System Admin",
                role: "SYSTEM_ADMIN",
                tenant_id: "bureau_01",
                school_id: "school_01",
            });
        } else {
            const matches = await bcrypt.compare(
                demoPassword,
                existingAdmin.password_hash
            );
            if (!matches) {
                await User.updateOne(
                    { _id: existingAdmin._id },
                    { $set: { password_hash: demoPasswordHash } }
                );
            }
        }

        // 2. Create or Update Stage Config
        const version = "1.0.0";
        let config = await StageConfig.findOne({ version });

        if (!config) {
            await StageConfig.create({
                version,
                status: "ACTIVE",
                created_by: "system",
                global_settings: {
                    rag_exclude_keywords: ["confidential"],
                    default_llm_model: "gpt-4",
                },
                stages: STAGES_DATA,
            });
            console.log("Created StageConfig.");
        } else {
            // UPDATE: Sync stages to ensure Q1-Q10 are all present
            config.stages = STAGES_DATA;
            await config.save();
            console.log("Updated StageConfig stages.");
        }

        // 3. Create Demo Project
        const projectName = "Demo School Plan 2025";
        const existingProject = await Project.findOne({ name: projectName });

        if (!existingProject) {
            const stages = initializeStages();
            stages.Q1 = {
                ...stages.Q1,
                status: "in_progress",
                input: { school_name: "Demo High School" },
            };

            await Project.create({
                tenant_id: "bureau_01",
                school_id: "school_01",
                name: projectName,
                config_version: version,
                current_stage: "Q1",
                stages,
            });
        }

        // 4. Create Default System Prompts
        for (const promptData of DEFAULT_PROMPTS) {
            const existingPrompt = await PromptTemplate.findOne({ key: promptData.key });

            if (!existingPrompt) {
                // ... (existing creation logic) ...
                // Extract variables from template
                const variableMatches = promptData.template.match(/\{\{(\w+)\}\}/g) || [];
                const variables = variableMatches.map((v: string) => v.replace(/\{\{|\}\}/g, ""));

                // Create prompt template
                const prompt = await PromptTemplate.create({
                    name: promptData.name,
                    key: promptData.key,
                    template: promptData.template,
                    variables,
                    description: promptData.description,
                    is_system: true,
                    current_version: 1,
                    ab_testing: { enabled: false, versions: [] },
                });

                // Create initial version snapshot
                await PromptVersion.create({
                    prompt_id: prompt._id,
                    version: 1,
                    template: promptData.template,
                    variables,
                    created_by: "system",
                    change_note: "Initial version",
                });

                console.log(`Created system prompt: ${promptData.key}`);
            } else {
                // UPDATE EXISTING PROMPT
                // If the template content has changed, update the DB record
                if (existingPrompt.template !== promptData.template) {
                    // Extract new variables
                    const variableMatches = promptData.template.match(/\{\{(\w+)\}\}/g) || [];
                    const variables = variableMatches.map((v: string) => v.replace(/\{\{|\}\}/g, ""));

                    const newVersion = existingPrompt.current_version + 1;

                    // Update the main template doc
                    existingPrompt.template = promptData.template;
                    existingPrompt.variables = variables;
                    existingPrompt.current_version = newVersion;
                    await existingPrompt.save();

                    // Create a new version snapshot
                    await PromptVersion.create({
                        prompt_id: existingPrompt._id,
                        version: newVersion,
                        template: promptData.template,
                        variables,
                        created_by: "system",
                        change_note: "Updated via seed script (Auto-sync)",
                    });

                    console.log(`Updated system prompt: ${promptData.key} to version ${newVersion}`);
                }
            }
        }

        console.log("Database seeded successfully!");
        return NextResponse.json({ success: true, message: "Database seeded" });
    } catch (error: any) {
        console.error("SEEDING ERROR:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

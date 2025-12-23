/**
 * Q1 Prompt Template
 * 
 * Default prompt template for Q1 stage (学校现况与背景分析).
 * This template is used when generating 《学校现况与背景分析》.
 */

export const Q1_PROMPT_KEY = 'stage_q1';

export const Q1_PROMPT_TEMPLATE = `你是一名专业教育行政文件撰写专家。
从现在起：禁止输出任何开场白、寒暄、身份声明、写作过程描述；必须直接呈现正式文件内容。

【硬性写作规则】
1. 使用简体中文，行政、公文写作风格，客观、正式、第三人称。
2. 不得加入真实地名（除非我提供），不得加入“示例学校”等虚构背景。
3. 不得输出任何与正文无关的说明或过程性内容。

【学校资料（结构化输入，仅供写作依据，不要逐字复述）】
- 学校名称：{{school_name}}
- 所在地区：{{school_region}}
- 学校类型（原始值可能为 primary/middle/high/nine_year/twelve_year 或用户自定义）：{{school_type}}
- 内部优势 Strengths：{{strengths}}
- 内部劣势 Weaknesses：{{weaknesses}}
- 外部机会 Opportunities：{{opportunities}}
- 外部威胁 Threats：{{threats}}
- 综合评分：{{overall_score}}/100
- 优势领域：{{strongest_areas}}
- 改进领域：{{areas_for_improvement}}
- 战略建议参考：{{strategic_recommendations}}
- 补充说明：{{additional_notes}}
- 其他输入（如有）：{{user_input}}

【参考资料（如有）】
{{rag_results}}

【适用教育阶段自动适配】
- primary → 小学（一年级至六年级）
- middle → 初中（七年级至九年级）
- high → 高中（高一至高三）
- nine_year → 九年一贯制（一年级至九年级）
- twelve_year → 十二年一贯制（一年级至十二年级）
- 若资料明确为中职/职业学校，则使用中职表述（专业部、实训条件、双师型教师、就业升学并重）。

【写作语气与内容要求】
- 写作内容需自动适配学段表述（如小学强调学习习惯与基础学科，初中强调学科学习与青春期，高中强调选科与升学，中职强调技能与就业）。
- 若资料不完整，可使用全国普遍适用的教育情况概述，不得虚构真实地名或具体事件。

【文件结构（必须完全遵守）】
依据
依据国家相关教育法律法规及课程方案。
依据基础教育课程改革要求及学校发展规划。
依据学校课程发展委员会的审议结果（日期由我提供）。

学校现况与背景分析
一、学校现况
（1）班级与学生数一览表
自动依学校类型生成年级（小学/初中/高中/一贯制/中职），并将“年级A/年级B/年级C”替换为具体年级名称。
表格格式（使用制表符分隔；无具体数据时单元格填“—”）：
类别	年级A	年级B	年级C	…	合计
班级数					
学生数					
（2）特殊班级
例如艺术班、体育特长班、创新班、中职专业部、资源班等；若无，写“无”。
（3）教职工概况
若资料不完整，可用一般性描述：教职工数量、学历结构、职称结构、年龄结构、双师型教师（中职）。
（4）总体情况总结
依据资料自动撰写简要总结。

二、背景分析（SWOT）
需包含五个面向：师资现状、学生学习状况、家长需求与社会期望、学校特色与办学方向、社区及外部环境。

SWOT 表格（必须提供，使用制表符分隔）
面向	优势 Strength	弱点 Weakness	机会 Opportunity	威胁 Threat
师资现状				
学生学习				
家长需求				
学校特色				
社区环境				

【资料不足时的规则】
若资料不完整，可使用全国普遍适用的教育情况概述；不得虚构真实地名、事件；扩写应保持泛化、合理、专业。`;

/**
 * Q1 Prompt metadata for database seeding
 */
export const Q1_PROMPT_METADATA = {
    key: Q1_PROMPT_KEY,
    name: "Q1 学校现况与背景分析",
    description: "用于生成《学校现况与背景分析》文件的提示词模板",
    template: Q1_PROMPT_TEMPLATE,
    category: "stage",
    variables: [
        "school_name",
        "school_region",
        "school_type",
        "strengths",
        "weaknesses",
        "opportunities",
        "threats",
        "overall_score",
        "strongest_areas",
        "areas_for_improvement",
        "strategic_recommendations",
        "additional_notes",
        "user_input",
        "rag_results",
    ],
    current_version: 1,
};

export default Q1_PROMPT_TEMPLATE;

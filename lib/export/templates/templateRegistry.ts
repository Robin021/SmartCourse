/**
 * 模板注册表 - 管理所有可用的导出模板
 */

import type { TemplateMetadata, TemplateType, ExportFormat } from './types';

/**
 * 备案模板 - 用于教育局备案提交
 */
const recordTemplate: TemplateMetadata = {
  id: 'record-default',
  name: '教育局备案模板',
  type: 'record',
  supportedFormats: ['docx', 'pdf'],
  description: '符合教育局备案要求的标准格式，包含完整的课程体系文档结构',
  usageScenario: '向教育主管部门提交课程备案材料时使用',
  version: '1.0.0',
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
  style: {
    primaryColor: '#1a365d',
    secondaryColor: '#2c5282',
    titleFontSize: 22,
    bodyFontSize: 12,
    headerText: '学校课程备案材料',
    footerText: '— 课程设计系统生成 —',
    showPageNumbers: true,
    showTableOfContents: true,
  },
  placeholders: [
    { key: 'school_name', label: '学校名称', source: 'project.name', required: true, example: '某某实验小学' },
    { key: 'submission_date', label: '提交日期', source: 'meta.date', required: true, example: '2025年1月' },
    { key: 'principal_name', label: '校长姓名', source: 'project.principal', required: false, example: '张三' },
    { key: 'contact_phone', label: '联系电话', source: 'project.contact', required: false, example: '010-12345678' },
  ],
  sections: [
    {
      id: 'cover',
      title: '封面',
      stageIds: [],
      required: true,
      description: '备案材料封面页',
    },
    {
      id: 'overview',
      title: '一、学校基本情况',
      stageIds: ['Q1'],
      required: true,
      description: '学校课程情境与资源分析',
      subsections: [
        { id: 'swot', title: '1.1 SWOT分析', source: 'stages.Q1.output', required: true },
        { id: 'resources', title: '1.2 课程资源', source: 'stages.Q1.output.resources', required: false },
      ],
    },
    {
      id: 'philosophy',
      title: '二、教育哲学与办学理念',
      stageIds: ['Q2', 'Q3'],
      required: true,
      description: '教育哲学陈述与办学理念阐释',
      subsections: [
        { id: 'edu_philosophy', title: '2.1 教育哲学', source: 'stages.Q2.output', required: true },
        { id: 'school_philosophy', title: '2.2 办学理念', source: 'stages.Q3.output', required: true },
      ],
    },
    {
      id: 'goals',
      title: '三、育人目标与课程目标',
      stageIds: ['Q4', 'Q6', 'Q7'],
      required: true,
      description: '育人目标体系与分学段课程目标',
      subsections: [
        { id: 'nurture_goals', title: '3.1 育人目标', source: 'stages.Q4.output', required: true },
        { id: 'course_concept', title: '3.2 课程理念', source: 'stages.Q6.output', required: true },
        { id: 'course_goals', title: '3.3 课程目标', source: 'stages.Q7.output', required: true },
      ],
    },
    {
      id: 'structure',
      title: '四、课程结构与实施方案',
      stageIds: ['Q5', 'Q8', 'Q9'],
      required: true,
      description: '课程体系结构与实施路径',
      subsections: [
        { id: 'naming', title: '4.1 课程体系命名', source: 'stages.Q5.output', required: true },
        { id: 'structure', title: '4.2 课程结构', source: 'stages.Q8.output', required: true },
        { id: 'implementation', title: '4.3 实施方案', source: 'stages.Q9.output', required: true },
      ],
    },
    {
      id: 'evaluation',
      title: '五、课程评价体系',
      stageIds: ['Q10'],
      required: true,
      description: '课程评价设计与实施',
      subsections: [
        { id: 'eval_design', title: '5.1 评价设计', source: 'stages.Q10.output', required: true },
      ],
    },
    {
      id: 'appendix',
      title: '附录',
      stageIds: [],
      required: false,
      description: '补充材料',
    },
  ],
};

/**
 * 校本科研模板 - 用于校内课程研究和教研活动
 */
const schoolResearchTemplate: TemplateMetadata = {
  id: 'school-research',
  name: '校本科研模板',
  type: 'school',
  supportedFormats: ['docx', 'pdf', 'pptx'],
  description: '适用于校内课程研究、教研活动和教师培训的文档格式',
  usageScenario: '校本课程开发、教研组研讨、教师培训材料',
  version: '1.0.0',
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
  style: {
    primaryColor: '#2d3748',
    secondaryColor: '#4a5568',
    titleFontSize: 20,
    bodyFontSize: 11,
    headerText: '校本课程研究报告',
    showPageNumbers: true,
    showTableOfContents: true,
  },
  placeholders: [
    { key: 'school_name', label: '学校名称', source: 'project.name', required: true, example: '某某实验小学' },
    { key: 'research_team', label: '研究团队', source: 'project.team', required: false, example: '课程研发中心' },
    { key: 'research_period', label: '研究周期', source: 'project.period', required: false, example: '2024-2025学年' },
  ],
  sections: [
    {
      id: 'abstract',
      title: '摘要',
      stageIds: [],
      required: true,
      description: '研究概述与核心发现',
    },
    {
      id: 'background',
      title: '第一章 研究背景与现状分析',
      stageIds: ['Q1'],
      required: true,
      description: '学校课程现状与发展需求',
      subsections: [
        { id: 'context', title: '1.1 学校课程情境', source: 'stages.Q1.output', required: true },
        { id: 'swot', title: '1.2 SWOT分析', source: 'stages.Q1.output.swot', required: true },
      ],
    },
    {
      id: 'theoretical',
      title: '第二章 理论基础',
      stageIds: ['Q2', 'Q3', 'Q6'],
      required: true,
      description: '教育哲学与课程理念',
      subsections: [
        { id: 'philosophy', title: '2.1 教育哲学基础', source: 'stages.Q2.output', required: true },
        { id: 'concept', title: '2.2 办学理念', source: 'stages.Q3.output', required: true },
        { id: 'course_idea', title: '2.3 课程理念', source: 'stages.Q6.output', required: true },
      ],
    },
    {
      id: 'goals',
      title: '第三章 目标体系设计',
      stageIds: ['Q4', 'Q7'],
      required: true,
      description: '育人目标与课程目标',
      subsections: [
        { id: 'nurture', title: '3.1 育人目标', source: 'stages.Q4.output', required: true },
        { id: 'course', title: '3.2 课程目标', source: 'stages.Q7.output', required: true },
      ],
    },
    {
      id: 'design',
      title: '第四章 课程体系设计',
      stageIds: ['Q5', 'Q8'],
      required: true,
      description: '课程命名与结构设计',
      subsections: [
        { id: 'naming', title: '4.1 课程命名', source: 'stages.Q5.output', required: true },
        { id: 'structure', title: '4.2 课程结构', source: 'stages.Q8.output', required: true },
      ],
    },
    {
      id: 'implementation',
      title: '第五章 实施与评价',
      stageIds: ['Q9', 'Q10'],
      required: true,
      description: '实施路径与评价体系',
      subsections: [
        { id: 'impl', title: '5.1 实施方案', source: 'stages.Q9.output', required: true },
        { id: 'eval', title: '5.2 评价体系', source: 'stages.Q10.output', required: true },
      ],
    },
    {
      id: 'conclusion',
      title: '第六章 结论与展望',
      stageIds: [],
      required: false,
      description: '研究总结与后续计划',
    },
  ],
};

/**
 * 通用模板 - 灵活的通用导出格式
 */
const generalTemplate: TemplateMetadata = {
  id: 'general',
  name: '通用导出模板',
  type: 'general',
  supportedFormats: ['text', 'docx', 'pdf', 'pptx'],
  description: '灵活的通用导出格式，按阶段顺序组织内容',
  usageScenario: '日常导出、内部分享、快速预览',
  version: '1.0.0',
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
  style: {
    primaryColor: '#1e40af',
    secondaryColor: '#3b82f6',
    titleFontSize: 18,
    bodyFontSize: 11,
    showPageNumbers: true,
    showTableOfContents: false,
  },
  placeholders: [
    { key: 'project_name', label: '项目名称', source: 'project.name', required: true, example: '学校课程设计' },
  ],
  sections: [
    { id: 'q1', title: 'Q1 学校课程情境', stageIds: ['Q1'], required: false },
    { id: 'q2', title: 'Q2 教育哲学', stageIds: ['Q2'], required: false },
    { id: 'q3', title: 'Q3 办学理念', stageIds: ['Q3'], required: false },
    { id: 'q4', title: 'Q4 育人目标', stageIds: ['Q4'], required: false },
    { id: 'q5', title: 'Q5 课程命名', stageIds: ['Q5'], required: false },
    { id: 'q6', title: 'Q6 课程理念', stageIds: ['Q6'], required: false },
    { id: 'q7', title: 'Q7 课程目标', stageIds: ['Q7'], required: false },
    { id: 'q8', title: 'Q8 课程结构', stageIds: ['Q8'], required: false },
    { id: 'q9', title: 'Q9 课程实施', stageIds: ['Q9'], required: false },
    { id: 'q10', title: 'Q10 课程评价', stageIds: ['Q10'], required: false },
  ],
};

/**
 * 所有可用模板
 */
const templates: TemplateMetadata[] = [
  recordTemplate,
  schoolResearchTemplate,
  generalTemplate,
];

/**
 * 获取所有模板列表
 */
export function getAllTemplates(): TemplateMetadata[] {
  return templates;
}

/**
 * 根据ID获取模板
 */
export function getTemplateById(id: string): TemplateMetadata | undefined {
  return templates.find((t) => t.id === id);
}

/**
 * 根据类型筛选模板
 */
export function getTemplatesByType(type: TemplateType): TemplateMetadata[] {
  return templates.filter((t) => t.type === type);
}

/**
 * 根据格式筛选支持的模板
 */
export function getTemplatesByFormat(format: ExportFormat): TemplateMetadata[] {
  return templates.filter((t) => t.supportedFormats.includes(format));
}

/**
 * 获取默认模板（通用模板）
 */
export function getDefaultTemplate(): TemplateMetadata {
  return generalTemplate;
}

export { recordTemplate, schoolResearchTemplate, generalTemplate };



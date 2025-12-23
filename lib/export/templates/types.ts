/**
 * 导出模板系统类型定义
 * 支持：备案模板(record)、校本科研模板(school)、通用模板(general)
 */

export type TemplateType = 'record' | 'school' | 'general';
export type ExportFormat = 'text' | 'docx' | 'pdf' | 'pptx';

/**
 * 模板占位符定义
 */
export interface TemplatePlaceholder {
  /** 占位符标识（如 {{school_name}}） */
  key: string;
  /** 显示名称 */
  label: string;
  /** 数据来源字段路径（如 project.name, stages.Q1.output.swot） */
  source: string;
  /** 是否必填 */
  required: boolean;
  /** 示例值 */
  example?: string;
  /** 默认值（缺失时使用） */
  defaultValue?: string;
}

/**
 * 模板样式配置
 */
export interface TemplateStyle {
  /** 主色调 */
  primaryColor: string;
  /** 次要色调 */
  secondaryColor: string;
  /** 标题字体大小 */
  titleFontSize: number;
  /** 正文字体大小 */
  bodyFontSize: number;
  /** 页眉文字（可选） */
  headerText?: string;
  /** 页脚文字（可选） */
  footerText?: string;
  /** 是否显示页码 */
  showPageNumbers?: boolean;
  /** 是否显示目录 */
  showTableOfContents?: boolean;
}

/**
 * 模板章节配置
 */
export interface TemplateSection {
  /** 章节ID */
  id: string;
  /** 章节标题 */
  title: string;
  /** 关联的阶段ID列表（如 ['Q1', 'Q2']） */
  stageIds: string[];
  /** 是否必须包含（缺失数据时是否跳过） */
  required: boolean;
  /** 章节描述（导出时显示） */
  description?: string;
  /** 子章节 */
  subsections?: TemplateSubsection[];
}

export interface TemplateSubsection {
  id: string;
  title: string;
  /** 数据来源路径 */
  source: string;
  required: boolean;
}

/**
 * 模板元数据定义
 */
export interface TemplateMetadata {
  /** 模板唯一ID */
  id: string;
  /** 模板名称 */
  name: string;
  /** 模板类型 */
  type: TemplateType;
  /** 支持的导出格式 */
  supportedFormats: ExportFormat[];
  /** 模板描述 */
  description: string;
  /** 适用场景说明 */
  usageScenario: string;
  /** 预览图URL（可选） */
  previewUrl?: string;
  /** 模板版本 */
  version: string;
  /** 占位符列表 */
  placeholders: TemplatePlaceholder[];
  /** 样式配置 */
  style: TemplateStyle;
  /** 章节配置 */
  sections: TemplateSection[];
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/**
 * 模板校验结果
 */
export interface TemplateValidationResult {
  /** 是否校验通过 */
  valid: boolean;
  /** 缺失的必填字段 */
  missingFields: Array<{
    key: string;
    label: string;
    stageId?: string;
    stageName?: string;
  }>;
  /** 警告信息（非必填但建议填写） */
  warnings: string[];
}

/**
 * 模板渲染选项
 */
export interface TemplateRenderOptions {
  /** 项目ID */
  projectId: string;
  /** 模板ID */
  templateId: string;
  /** 导出格式 */
  format: ExportFormat;
  /** 自定义章节选择（可选，不传则使用模板默认） */
  selectedSections?: string[];
  /** 自定义样式覆盖（可选） */
  styleOverrides?: Partial<TemplateStyle>;
}

/**
 * 模板渲染结果
 */
export interface TemplateRenderResult {
  /** 文件名 */
  filename: string;
  /** MIME类型 */
  contentType: string;
  /** 文件内容 */
  body: Buffer | string;
  /** 使用的模板信息 */
  template: {
    id: string;
    name: string;
    type: TemplateType;
  };
  /** 校验结果 */
  validation: TemplateValidationResult;
}





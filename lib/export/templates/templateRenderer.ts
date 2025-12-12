/**
 * 模板渲染器 - 根据模板配置渲染导出文档
 */

import type {
  TemplateMetadata,
  TemplateRenderOptions,
  TemplateRenderResult,
  TemplateValidationResult,
  TemplateSection,
  ExportFormat,
} from './types';
import { getTemplateById, getDefaultTemplate } from './templateRegistry';
import { Document, HeadingLevel, Packer, Paragraph, TextRun, TableOfContents, Header, Footer, PageNumber, AlignmentType } from 'docx';
import PDFDocument from 'pdfkit';
import PptxGenJS from 'pptxgenjs';

/**
 * 从项目数据中提取指定路径的值
 */
function getValueByPath(obj: any, path: string): any {
  if (!path || !obj) return undefined;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  return current;
}

/**
 * 提取阶段内容
 */
function extractStageContent(stageData: any): string {
  if (!stageData) return '';
  const output = stageData.output;
  if (!output) return '';
  
  if (typeof output === 'string') return output;
  return output.report || output.content || JSON.stringify(output, null, 2);
}

/**
 * 校验项目数据是否满足模板要求
 */
export function validateTemplateData(
  template: TemplateMetadata,
  project: any
): TemplateValidationResult {
  const missingFields: TemplateValidationResult['missingFields'] = [];
  const warnings: string[] = [];

  // 校验占位符
  for (const placeholder of template.placeholders) {
    const value = getValueByPath(project, placeholder.source);
    if (placeholder.required && !value) {
      missingFields.push({
        key: placeholder.key,
        label: placeholder.label,
      });
    } else if (!placeholder.required && !value) {
      warnings.push(`建议填写"${placeholder.label}"以获得更完整的导出`);
    }
  }

  // 校验必填章节
  for (const section of template.sections) {
    if (!section.required) continue;
    
    for (const stageId of section.stageIds) {
      const stageData = project.stages?.[stageId];
      const content = extractStageContent(stageData);
      
      if (!content) {
        missingFields.push({
          key: `stage_${stageId}`,
          label: `${stageId} 阶段内容`,
          stageId,
          stageName: section.title,
        });
      }
    }

    // 校验子章节
    if (section.subsections) {
      for (const sub of section.subsections) {
        if (!sub.required) continue;
        const value = getValueByPath(project, sub.source);
        if (!value) {
          // 从source提取stageId
          const match = sub.source.match(/stages\.(\w+)/);
          const stageId = match ? match[1] : undefined;
          missingFields.push({
            key: sub.id,
            label: sub.title,
            stageId,
            stageName: section.title,
          });
        }
      }
    }
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
    warnings,
  };
}

/**
 * 根据模板生成章节内容
 */
function buildTemplateSections(
  template: TemplateMetadata,
  project: any,
  selectedSections?: string[]
): Array<{ section: TemplateSection; content: string; subsectionContents?: Array<{ title: string; content: string }> }> {
  const sections = selectedSections
    ? template.sections.filter((s) => selectedSections.includes(s.id))
    : template.sections;

  return sections.map((section) => {
    // 获取关联阶段的内容
    let content = '';
    for (const stageId of section.stageIds) {
      const stageData = project.stages?.[stageId];
      const stageContent = extractStageContent(stageData);
      if (stageContent) {
        content += stageContent + '\n\n';
      }
    }

    // 处理子章节
    let subsectionContents: Array<{ title: string; content: string }> | undefined;
    if (section.subsections) {
      subsectionContents = section.subsections.map((sub) => {
        const value = getValueByPath(project, sub.source);
        const subContent = typeof value === 'string' 
          ? value 
          : value?.report || value?.content || (value ? JSON.stringify(value, null, 2) : '');
        return {
          title: sub.title,
          content: subContent || '（暂无内容）',
        };
      });
    }

    return {
      section,
      content: content.trim() || '（暂无内容）',
      subsectionContents,
    };
  });
}

/**
 * 渲染 DOCX 格式
 */
async function renderDocxWithTemplate(
  template: TemplateMetadata,
  project: any,
  selectedSections?: string[]
): Promise<Buffer> {
  const sections = buildTemplateSections(template, project, selectedSections);
  const style = template.style;

  const children: Paragraph[] = [];

  // 封面标题
  children.push(
    new Paragraph({
      text: project.name || '课程设计',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      text: template.name,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // 目录（如果启用）
  if (style.showTableOfContents) {
    children.push(
      new Paragraph({
        text: '目录',
        heading: HeadingLevel.HEADING_1,
      }),
      new Paragraph({
        text: '（目录将在 Word 中自动生成，请右键点击此处选择"更新域"）',
        spacing: { after: 400 },
      })
    );
  }

  // 各章节内容
  for (const { section, content, subsectionContents } of sections) {
    // 章节标题
    children.push(
      new Paragraph({
        text: section.title,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400 },
      })
    );

    // 章节描述
    if (section.description) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: section.description,
              italics: true,
              color: '666666',
            }),
          ],
          spacing: { after: 200 },
        })
      );
    }

    // 子章节内容
    if (subsectionContents && subsectionContents.length > 0) {
      for (const sub of subsectionContents) {
        children.push(
          new Paragraph({
            text: sub.title,
            heading: HeadingLevel.HEADING_2,
          })
        );
        // 分行添加内容
        const lines = sub.content.split(/\n+/).filter(Boolean);
        for (const line of lines) {
          children.push(new Paragraph({ text: line }));
        }
      }
    } else if (content) {
      // 直接添加章节内容
      const lines = content.split(/\n+/).filter(Boolean);
      for (const line of lines) {
        children.push(new Paragraph({ text: line }));
      }
    }
  }

  // 构建文档
  const docSections: any[] = [
    {
      properties: {},
      children,
    },
  ];

  // 添加页眉页脚
  if (style.headerText || style.footerText || style.showPageNumbers) {
    docSections[0].headers = style.headerText
      ? {
          default: new Header({
            children: [
              new Paragraph({
                children: [new TextRun({ text: style.headerText, size: 18, color: '888888' })],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        }
      : undefined;

    docSections[0].footers = {
      default: new Footer({
        children: [
          new Paragraph({
            children: [
              ...(style.footerText
                ? [new TextRun({ text: style.footerText + '  ', size: 18, color: '888888' })]
                : []),
              ...(style.showPageNumbers
                ? [
                    new TextRun({ text: '第 ', size: 18, color: '888888' }),
                    new TextRun({
                      children: [PageNumber.CURRENT],
                      size: 18,
                      color: '888888',
                    }),
                    new TextRun({ text: ' 页', size: 18, color: '888888' }),
                  ]
                : []),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
      }),
    };
  }

  const doc = new Document({ sections: docSections });
  return Packer.toBuffer(doc);
}

/**
 * 渲染 PDF 格式
 */
async function renderPdfWithTemplate(
  template: TemplateMetadata,
  project: any,
  selectedSections?: string[]
): Promise<Buffer> {
  const sections = buildTemplateSections(template, project, selectedSections);
  const style = template.style;

  const doc = new PDFDocument({ margin: 50 });
  const buffers: Buffer[] = [];

  doc.on('data', (chunk) => buffers.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));

  // 封面
  doc.fontSize(style.titleFontSize + 6)
    .fillColor(style.primaryColor)
    .text(project.name || '课程设计', { align: 'center' });
  doc.moveDown();
  doc.fontSize(style.titleFontSize - 2)
    .fillColor(style.secondaryColor)
    .text(template.name, { align: 'center' });
  doc.moveDown(2);

  // 目录（简单版）
  if (style.showTableOfContents) {
    doc.fontSize(style.titleFontSize)
      .fillColor('#000')
      .text('目 录', { align: 'center' });
    doc.moveDown();
    sections.forEach(({ section }, index) => {
      doc.fontSize(style.bodyFontSize)
        .fillColor('#333')
        .text(`${index + 1}. ${section.title}`);
    });
    doc.addPage();
  }

  // 各章节
  sections.forEach(({ section, content, subsectionContents }, index) => {
    if (index > 0) doc.moveDown(1.5);

    // 章节标题
    doc.fontSize(style.titleFontSize)
      .fillColor(style.primaryColor)
      .text(section.title, { underline: true });

    // 章节描述
    if (section.description) {
      doc.moveDown(0.3);
      doc.fontSize(style.bodyFontSize - 1)
        .fillColor('#666')
        .text(section.description, { oblique: true });
    }
    doc.moveDown(0.5);

    // 子章节
    if (subsectionContents && subsectionContents.length > 0) {
      for (const sub of subsectionContents) {
        doc.fontSize(style.bodyFontSize + 1)
          .fillColor(style.secondaryColor)
          .text(sub.title);
        doc.moveDown(0.3);
        doc.fontSize(style.bodyFontSize)
          .fillColor('#111')
          .text(sub.content, { width: 500, lineGap: 3 });
        doc.moveDown(0.5);
      }
    } else {
      doc.fontSize(style.bodyFontSize)
        .fillColor('#111')
        .text(content, { width: 500, lineGap: 3 });
    }

    // 分隔线
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#e0e0e0');
  });

  // 页脚
  if (style.footerText) {
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(9)
        .fillColor('#888')
        .text(
          style.showPageNumbers ? `${style.footerText} - 第 ${i + 1} 页` : style.footerText,
          50,
          doc.page.height - 50,
          { align: 'center' }
        );
    }
  }

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);
  });
}

/**
 * 渲染 PPTX 格式
 */
async function renderPptxWithTemplate(
  template: TemplateMetadata,
  project: any,
  selectedSections?: string[]
): Promise<Buffer> {
  const sections = buildTemplateSections(template, project, selectedSections);
  const style = template.style;

  const pptx = new PptxGenJS();
  pptx.layout = '16x9';
  pptx.title = project.name || '课程设计';
  pptx.author = '课程设计系统';

  // 封面
  const cover = pptx.addSlide();
  cover.addText(project.name || '课程设计', {
    x: 0.5,
    y: 2,
    w: 9,
    h: 1,
    fontSize: 36,
    bold: true,
    color: style.primaryColor.replace('#', ''),
    align: 'center',
  });
  cover.addText(template.name, {
    x: 0.5,
    y: 3.2,
    w: 9,
    h: 0.6,
    fontSize: 20,
    color: style.secondaryColor.replace('#', ''),
    align: 'center',
  });

  // 目录页（如果启用）
  if (style.showTableOfContents) {
    const tocSlide = pptx.addSlide();
    tocSlide.addText('目 录', {
      x: 0.5,
      y: 0.5,
      fontSize: 28,
      bold: true,
      color: style.primaryColor.replace('#', ''),
    });
    const tocItems = sections.map(({ section }, i) => `${i + 1}. ${section.title}`);
    tocSlide.addText(tocItems.join("\n"), {
      x: 0.5,
      y: 1.2,
      w: 9,
      h: 5,
      fontSize: 18,
      color: '333333',
      bullet: false,
    });
  }

  // 各章节
  for (const { section, content, subsectionContents } of sections) {
    const slide = pptx.addSlide();

    // 标题
    slide.addText(section.title, {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.8,
      fontSize: 24,
      bold: true,
      color: style.primaryColor.replace('#', ''),
    });

    // 描述
    if (section.description) {
      slide.addText(section.description, {
        x: 0.5,
        y: 1.0,
        w: 9,
        h: 0.5,
        fontSize: 14,
        color: '666666',
        italic: true,
      });
    }

    // 内容
    const contentY = section.description ? 1.6 : 1.2;
    const displayContent = subsectionContents
      ? subsectionContents.map((sub) => `【${sub.title}】\n${sub.content.slice(0, 200)}${sub.content.length > 200 ? '...' : ''}`).join('\n\n')
      : content.slice(0, 600) + (content.length > 600 ? '...' : '');

    // 将长内容分块
    const chunks = displayContent.match(/[\s\S]{1,300}/g) || [displayContent];
    slide.addText(chunks[0], {
      x: 0.5,
      y: contentY,
      w: 9,
      h: 4.5,
      fontSize: 14,
      color: '363636',
      valign: 'top',
    });
  }

  const out = await (pptx.write({ outputType: "nodebuffer" } as any) as any);
  if (Buffer.isBuffer(out)) return out;
  if (out instanceof Uint8Array) return Buffer.from(out);
  if (out instanceof ArrayBuffer) return Buffer.from(new Uint8Array(out));
  return Buffer.from(out);
}

/**
 * 渲染纯文本格式
 */
function renderTextWithTemplate(
  template: TemplateMetadata,
  project: any,
  selectedSections?: string[]
): string {
  const sections = buildTemplateSections(template, project, selectedSections);

  let output = `# ${project.name || '课程设计'}\n`;
  output += `## ${template.name}\n\n`;
  output += `---\n\n`;

  for (const { section, content, subsectionContents } of sections) {
    output += `# ${section.title}\n`;
    if (section.description) {
      output += `> ${section.description}\n\n`;
    }

    if (subsectionContents && subsectionContents.length > 0) {
      for (const sub of subsectionContents) {
        output += `## ${sub.title}\n`;
        output += `${sub.content}\n\n`;
      }
    } else {
      output += `${content}\n\n`;
    }

    output += `---\n\n`;
  }

  return output;
}

/**
 * 主渲染函数
 */
export async function renderWithTemplate(
  options: TemplateRenderOptions,
  project: any
): Promise<TemplateRenderResult> {
  const template = getTemplateById(options.templateId) || getDefaultTemplate();

  // 校验格式支持
  if (!template.supportedFormats.includes(options.format)) {
    throw new Error(
      `模板"${template.name}"不支持 ${options.format} 格式，支持的格式：${template.supportedFormats.join(', ')}`
    );
  }

  // 校验数据
  const validation = validateTemplateData(template, project);

  // 渲染
  let body: Buffer | string;
  let contentType: string;
  let extension: string;

  switch (options.format) {
    case 'docx':
      body = await renderDocxWithTemplate(template, project, options.selectedSections);
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      extension = 'docx';
      break;
    case 'pdf':
      body = await renderPdfWithTemplate(template, project, options.selectedSections);
      contentType = 'application/pdf';
      extension = 'pdf';
      break;
    case 'pptx':
      body = await renderPptxWithTemplate(template, project, options.selectedSections);
      contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      extension = 'pptx';
      break;
    case 'text':
    default:
      body = renderTextWithTemplate(template, project, options.selectedSections);
      contentType = 'text/plain; charset=utf-8';
      extension = 'txt';
      break;
  }

  const baseName = (project.name || 'project').replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_');

  return {
    filename: `${baseName}-${template.id}.${extension}`,
    contentType,
    body,
    template: {
      id: template.id,
      name: template.name,
      type: template.type,
    },
    validation,
  };
}

export default renderWithTemplate;



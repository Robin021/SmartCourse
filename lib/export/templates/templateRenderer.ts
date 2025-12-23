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
import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, TableOfContents, Header, Footer, PageNumber, AlignmentType, WidthType } from 'docx';
import PptxGenJS from 'pptxgenjs';
import { addPageNumbers, createPdfDoc, getContentWidth, pdfToBuffer, writeTextBlocks } from '../pdfUtils';
import { parseMarkdownTable, stripInlineMarkdown } from '../markdownUtils';

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

function buildDocxTable(rows: string[][]): Table {
  const maxColumns = Math.max(...rows.map((row) => row.length));
  const normalized = rows.map((row) => row.concat(Array(Math.max(0, maxColumns - row.length)).fill('')));
  const headerRow = normalized[0] || [];
  const bodyRows = normalized.slice(1);

  const header = new TableRow({
    tableHeader: true,
    children: headerRow.map(
      (cell) =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: cell, bold: true })] })],
        })
    ),
  });

  const body = bodyRows.map(
    (row) =>
      new TableRow({
        children: row.map(
          (cell) =>
            new TableCell({
              children: [new Paragraph(cell || ' ')],
            })
        ),
      })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [header, ...body],
  });
}

function docxParagraphsFromMarkdown(content: string): Array<Paragraph | Table> {
  const lines = (content || '').split(/\r?\n/);
  const blocks: Array<Paragraph | Table> = [];
  let inCodeBlock = false;

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = rawLine.replace(/\t/g, '    ');
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (!trimmed) continue;

    if (inCodeBlock) {
      blocks.push(
        new Paragraph({
          children: [new TextRun({ text: line, font: 'Courier New', color: '374151' })],
        })
      );
      continue;
    }

    const table = parseMarkdownTable(lines, index);
    if (table) {
      blocks.push(buildDocxTable(table.rows));
      index = table.endIndex - 1;
      continue;
    }

    const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);
    if (bulletMatch) {
      blocks.push(
        new Paragraph({
          children: [new TextRun({ text: stripInlineMarkdown(bulletMatch[1]) })],
          bullet: { level: 0 },
        })
      );
      continue;
    }

    const numberedMatch = trimmed.match(/^\s*(\d+)[.)]\s+(.*)$/);
    if (numberedMatch) {
      blocks.push(new Paragraph(`${numberedMatch[1]}. ${stripInlineMarkdown(numberedMatch[2])}`));
      continue;
    }

    const quoteMatch = trimmed.match(/^>\s+(.*)$/);
    if (quoteMatch) {
      blocks.push(
        new Paragraph({
          children: [new TextRun({ text: stripInlineMarkdown(quoteMatch[1]), italics: true, color: '4B5563' })],
        })
      );
      continue;
    }

    if (trimmed.includes('|') && !/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(trimmed)) {
      const cells = trimmed
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((c) => stripInlineMarkdown(c));
      blocks.push(new Paragraph(cells.filter(Boolean).join('    ')));
      continue;
    }

    blocks.push(new Paragraph(stripInlineMarkdown(trimmed)));
  }

  return blocks.length ? blocks : [new Paragraph('（暂无内容）')];
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

  const children: Array<Paragraph | Table> = [];

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
        children.push(...docxParagraphsFromMarkdown(sub.content));
      }
    } else if (content) {
      children.push(...docxParagraphsFromMarkdown(content));
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
  const titleFontSize = style.titleFontSize || 18;
  const bodyFontSize = style.bodyFontSize || 11;
  const primaryColor = style.primaryColor || '#111827';
  const secondaryColor = style.secondaryColor || primaryColor;

  const { doc, bodyFont, headingFont } = createPdfDoc();
  const contentWidth = getContentWidth(doc);

  // 封面
  doc.font(headingFont)
    .fontSize(titleFontSize + 6)
    .fillColor(primaryColor)
    .text(project.name || '课程设计', { align: 'center', width: contentWidth });
  doc.moveDown(0.3);
  doc.font(bodyFont)
    .fontSize(Math.max(titleFontSize - 2, 10))
    .fillColor(secondaryColor)
    .text(template.name, { align: 'center', width: contentWidth });
  doc.moveDown(1.2);

  // 目录（简单版）
  if (style.showTableOfContents) {
    doc.font(headingFont)
      .fontSize(titleFontSize)
      .fillColor(primaryColor)
      .text('目 录', { align: 'left', width: contentWidth });
    doc.moveDown(0.4);
    doc.font(bodyFont)
      .fontSize(bodyFontSize)
      .fillColor('#111')
      .list(
        sections.map(({ section }, index) => `${index + 1}. ${section.title}`),
        { bulletIndent: 10, textIndent: 18, width: contentWidth }
      );
    doc.addPage();
  }

  // 各章节
  sections.forEach(({ section, content, subsectionContents }, index) => {
    if (index > 0) doc.moveDown(0.8);

    doc.font(headingFont)
      .fontSize(titleFontSize)
      .fillColor(primaryColor)
      .text(section.title, { width: contentWidth });

    if (section.description) {
      doc.moveDown(0.25);
      doc.font(bodyFont)
        .fontSize(Math.max(bodyFontSize - 1, 9))
        .fillColor('#4B5563')
        .text(section.description, { width: contentWidth, lineGap: 3, paragraphGap: 6 });
    }

    doc.moveDown(0.3);
    doc.font(bodyFont).fontSize(bodyFontSize).fillColor('#111');

    if (subsectionContents && subsectionContents.length > 0) {
      for (const sub of subsectionContents) {
        doc.font(headingFont)
          .fontSize(bodyFontSize + 1)
          .fillColor(secondaryColor)
          .text(sub.title, { width: contentWidth });
        doc.moveDown(0.15);
        doc.font(bodyFont).fillColor('#111');
        writeTextBlocks(doc, sub.content, {
          width: contentWidth,
          lineGap: 4,
          paragraphGap: 8,
          bodyFont,
          headingFont,
          textColor: '#111827',
          mutedColor: '#4B5563',
          headingColor: primaryColor,
          ruleColor: '#e0e0e0',
        });
        doc.moveDown(0.35);
      }
    } else {
      writeTextBlocks(doc, content, {
        width: contentWidth,
        lineGap: 4,
        paragraphGap: 10,
        bodyFont,
        headingFont,
        textColor: '#111827',
        mutedColor: '#4B5563',
        headingColor: primaryColor,
        ruleColor: '#e0e0e0',
      });
    }

    doc.moveDown(0.6);
    doc.moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .stroke('#e0e0e0');
  });

  addPageNumbers(doc, {
    label: style.footerText || template.name,
    showNumbers: style.showPageNumbers !== false,
    font: bodyFont,
    align: 'center',
  });

  doc.end();
  return pdfToBuffer(doc);
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

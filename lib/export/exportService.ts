import Project from "@/models/Project";
import StageConfig from "@/models/StageConfig";
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import PDFDocument from "pdfkit";
import PptxGenJS from "pptxgenjs";
import { renderWithTemplate, getTemplateById, validateTemplateData } from "./templates";
import type { ExportFormat as TemplateExportFormat, TemplateValidationResult } from "./templates/types";

type ExportFormat = "text" | "docx" | "pdf" | "pptx";

interface ExportOptions {
    projectId: string;
    stages?: string[]; // default all
    format?: ExportFormat;
    /** 模板ID（可选，不传则使用原有逻辑） */
    templateId?: string;
    /** 自定义章节选择（仅模板模式有效） */
    selectedSections?: string[];
}

export interface StageExportSection {
    stageId: string;
    name: string;
    description?: string;
    content: string;
    status?: string;
    keywords?: string[];
    score?: number;
    tableRows?: Array<{ key: string; value: string }>;
}

function sanitizeFilename(name: string): string {
    return name.replace(/[\\/:*?"<>|]+/g, "_").replace(/\s+/g, "_");
}

function extractStageContent(stageData: any): {
    content: string;
    keywords?: string[];
    score?: number;
    tableRows?: Array<{ key: string; value: string }>;
} {
    if (!stageData) {
        return { content: "（无生成内容）" };
    }

    const output = stageData.output;
    const content =
        typeof output === "string"
            ? output
            : output?.report ||
            output?.content ||
            (output ? JSON.stringify(output, null, 2) : "（无生成内容）");

    const keywords =
        output?.keywords ||
        output?.core_keywords ||
        output?.coreConcept ||
        output?.key_terms ||
        undefined;

    const score =
        output?.theory_fit_score ??
        output?.coverage?.overall ??
        output?.suitability?.score ??
        output?.consistency?.score ??
        output?.gapAnalysis?.score ??
        output?.structureScore?.score ??
        output?.feasibility?.score ??
        output?.evaluationScore?.score ??
        stageData.diagnostic_score?.overall;

    return {
        content,
        keywords: Array.isArray(keywords) ? keywords : undefined,
        score,
        tableRows: output?.table_rows,
    };
}

export function buildExportSections(params: {
    project: any;
    stageDefs: any[];
    stages?: string[];
}): StageExportSection[] {
    const { project, stageDefs, stages } = params;
    const selectedStages =
        stages && stages.length > 0
            ? stageDefs.filter((s: any) => stages.includes(s.stage_id))
            : stageDefs;

    return selectedStages.map((stage: any) => {
        const stageData = project.stages?.[stage.stage_id];
        const extracted = extractStageContent(stageData);
        const tableRows =
            extracted.tableRows && extracted.tableRows.length > 0
                ? extracted.tableRows
                : buildStageTableRows(stage.stage_id, stageData?.output);
        return {
            stageId: stage.stage_id,
            name: stage.name || stage.stage_id,
            description: stage.description,
            status: stageData?.status,
            content: extracted.content || "（无生成内容）",
            keywords: extracted.keywords,
            score: extracted.score,
            tableRows,
        };
    });
}

function buildStageTableRows(stageId: string, output: any): Array<{ key: string; value: string }> {
    if (!output) return [];
    const rows: Array<{ key: string; value: string }> = [];

    const add = (key: string, value: any) => {
        if (value === undefined || value === null) return;
        rows.push({ key, value: typeof value === "string" ? value : JSON.stringify(value) });
    };

    switch (stageId) {
        case "Q2":
            add("理论适配度", output.theory_fit_score ?? output.theoryFitScore);
            add("关键词", output.keywords?.join?.(", "));
            add("已选理论", output.selected_theories?.join?.(", "));
            add("地域文化", output.regional_culture);
            break;
        case "Q3":
            add("核心概念", output.coreConcept || output.core_concept);
            add("关键词", output.keywords?.join?.(", "));
            break;
        case "Q4":
            add("五育覆盖度", output.coverage?.overall);
            if (output.coverage?.dimensions) {
                add(
                    "维度分布",
                    Object.entries(output.coverage.dimensions)
                        .map(([k, v]) => `${k}:${v}`)
                        .join("; ")
                );
            }
            break;
        case "Q5":
            add("推荐名称", output.nameSuggestion || output.name);
            add("口号", output.tagline);
            add("适配度", output.suitability?.score);
            break;
        case "Q6":
            add("一致性", output.consistency?.score);
            add("关键词", output.keywords?.join?.(", "));
            break;
        case "Q7":
            add("达成度", output.gapAnalysis?.score);
            break;
        case "Q8":
            add("结构评分", output.structureScore?.score);
            break;
        case "Q9":
            add("可行性", output.feasibility?.score);
            break;
        case "Q10":
            add("评价科学性", output.evaluationScore?.score);
            break;
        default:
            break;
    }

    return rows;
}

/**
 * Build text content from project + stage definitions (pure formatter)
 */
export function formatExportContent(params: {
    project: any;
    stageDefs: any[];
    stages?: string[];
}): string {
    const { project, stageDefs, stages } = params;
    const sections = buildExportSections({ project, stageDefs, stages });

    let content = `# ${project.name} 课程设计导出\n\n`;
    content += `版本: ${project.config_version}\n\n`;

    sections.forEach((section) => {
        content += `## ${section.stageId} ${section.name}\n`;
        if (section.description) {
            content += `说明: ${section.description}\n`;
        }
        if (section.status) {
            content += `状态: ${section.status}\n`;
        }
        if (section.score !== undefined) {
            content += `评分: ${section.score}\n`;
        }
        if (section.keywords?.length) {
            content += `关键词: ${section.keywords.join(", ")}\n`;
        }
        content += `${section.content}\n\n`;
    });

    return content;
}

async function renderDocxBundle(projectName: string, sections: StageExportSection[]): Promise<Buffer> {
    const doc = new Document({
        sections: [
            {
                children: [
                    new Paragraph({
                        text: `${projectName} 课程设计导出`,
                        heading: HeadingLevel.HEADING_1,
                    }),
                    ...sections.flatMap((section) => {
                        const paragraphs: Paragraph[] = [
                            new Paragraph({
                                text: `${section.stageId} ${section.name}`,
                                heading: HeadingLevel.HEADING_2,
                            }),
                        ];

                        if (section.description) {
                            paragraphs.push(
                                new Paragraph({
                                    children: [new TextRun({ text: section.description, italics: true, color: "6b7280" })],
                                })
                            );
                        }

                        if (section.status) {
                            paragraphs.push(
                                new Paragraph({
                                    children: [
                                        new TextRun({ text: "状态: ", bold: true }),
                                        new TextRun({ text: section.status }),
                                    ],
                                })
                            );
                        }
                        if (section.score !== undefined) {
                            paragraphs.push(
                                new Paragraph({
                                    children: [
                                        new TextRun({ text: "评分: ", bold: true }),
                                        new TextRun({ text: `${section.score}` }),
                                    ],
                                })
                            );
                        }
                        if (section.keywords?.length) {
                            section.keywords.forEach((kw) => {
                                paragraphs.push(
                                    new Paragraph({
                                        children: [new TextRun({ text: kw })],
                                        bullet: { level: 0 },
                                    })
                                );
                            });
                        }

                        const lines = section.content.split(/\n+/).filter(Boolean);
                        if (lines.length === 0) {
                            paragraphs.push(new Paragraph("（无生成内容）"));
                        } else {
                            lines.forEach((line) => {
                                paragraphs.push(new Paragraph(line));
                            });
                        }

                        if (section.tableRows?.length) {
                            paragraphs.push(new Paragraph({ text: "关键信息表", heading: HeadingLevel.HEADING_3 }));
                            section.tableRows.forEach((row) => {
                                paragraphs.push(
                                    new Paragraph({
                                        children: [
                                            new TextRun({ text: `${row.key}: `, bold: true }),
                                            new TextRun({ text: row.value || "—" }),
                                        ],
                                    })
                                );
                            });
                        }

                        return paragraphs;
                    }),
                ],
            },
        ],
    });

    return Packer.toBuffer(doc);
}

function pdfToBuffer(doc: InstanceType<typeof PDFDocument>): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const buffers: Buffer[] = [];
        doc.on("data", (data) => buffers.push(Buffer.isBuffer(data) ? data : Buffer.from(data)));
        doc.on("end", () => resolve(Buffer.concat(buffers)));
        doc.on("error", reject);
    });
}

async function renderPdfBundle(projectName: string, sections: StageExportSection[]): Promise<Buffer> {
    const doc = new PDFDocument({ margin: 50 });

    doc.fontSize(20).text(`${projectName} 课程设计导出`, { underline: true });
    doc.moveDown();

    sections.forEach((section) => {
        doc.font("Helvetica-Bold").fontSize(14).text(`${section.stageId} ${section.name}`);
        doc.font("Helvetica");
        if (section.description) doc.fontSize(10).fillColor("#6b7280").text(section.description);
        if (section.status) doc.fontSize(10).fillColor("#666").text(`状态: ${section.status}`);
        if (section.score !== undefined) doc.fontSize(10).fillColor("#666").text(`评分: ${section.score}`);
        if (section.keywords?.length) {
            doc.fontSize(10).fillColor("#666").text("关键词:");
            section.keywords.forEach((kw) => doc.text(`• ${kw}`, { indent: 10 }));
        }
        doc.moveDown(0.5);
        doc.fontSize(11).fillColor("#111").text(section.content || "（无生成内容）", {
            width: 500,
            lineGap: 4,
        });
        if (section.tableRows?.length) {
            doc.moveDown(0.5);
            doc.fontSize(11).fillColor("#111").text("关键信息表:");
            section.tableRows.forEach((row) => {
                doc.text(`${row.key}: ${row.value || "—"}`, { indent: 10 });
            });
        }
        doc.moveDown();
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke("#e5e7eb");
        doc.moveDown(0.5);
    });

    doc.end();
    return pdfToBuffer(doc);
}

function chunkTextForSlide(text: string, chunkSize = 120): string[] {
    if (!text) return ["（无生成内容）"];
    const clean = text.replace(/\s+/g, " ").trim();
    const chunks: string[] = [];
    for (let i = 0; i < clean.length; i += chunkSize) {
        chunks.push(clean.slice(i, i + chunkSize));
    }
    return chunks;
}

async function renderPptBundle(projectName: string, sections: StageExportSection[]): Promise<Buffer> {
    const pptx = new PptxGenJS();
    pptx.layout = "16x9";

    const cover = pptx.addSlide();
    cover.addText(projectName, { x: 0.5, y: 1.5, fontSize: 30, bold: true });
    cover.addText("课程设计导出", { x: 0.5, y: 2.5, fontSize: 18, color: "666666" });

    sections.forEach((section) => {
        const slide = pptx.addSlide();
        slide.addText(`${section.stageId} ${section.name}`, {
            x: 0.5,
            y: 0.5,
            fontSize: 24,
            bold: true,
        });
        if (section.description) {
            slide.addText(section.description, {
                x: 0.5,
                y: 1.0,
                w: 9,
                fontSize: 14,
                color: "666666",
            });
        }

        const bulletLines = chunkTextForSlide(section.content).join("\n");
        slide.addText(bulletLines, {
            x: 0.5,
            y: section.description ? 1.4 : 1.2,
            w: 9,
            h: 4.5,
            fontSize: 14,
            color: "363636",
            bullet: true,
        });

        const metaLines: string[] = [];
        if (section.score !== undefined) metaLines.push(`评分: ${section.score}`);
        if (section.keywords?.length) metaLines.push(`关键词: ${section.keywords.join(", ")}`);
        if (metaLines.length > 0) {
            slide.addText(metaLines.join(" | "), {
                x: 0.5,
                y: 6.0,
                w: 9,
                h: 0.8,
                fontSize: 12,
                color: "555555",
            });
        }

        if (section.tableRows?.length) {
            slide.addText("关键信息:", {
                x: 0.5,
                y: 5.5,
                fontSize: 13,
                bold: true,
            });
            slide.addText(
                section.tableRows.map((row) => `${row.key}: ${row.value || "—"}`).join("\n"),
                {
                    x: 0.5,
                    y: 5.8,
                    w: 9,
                    fontSize: 12,
                    color: "444444",
                    bullet: true,
                }
            );
        }
    });

    const out = await (pptx.write({ outputType: "nodebuffer" } as any) as any);
    if (Buffer.isBuffer(out)) return out;
    if (out instanceof Uint8Array) return Buffer.from(out);
    if (out instanceof ArrayBuffer) return Buffer.from(new Uint8Array(out));
    return Buffer.from(out);
}

export async function buildExportBundle(options: ExportOptions): Promise<{
    filename: string;
    contentType: string;
    body: Buffer | string;
    sections: StageExportSection[];
    /** 模板信息（仅模板模式） */
    template?: { id: string; name: string; type: string };
    /** 校验结果（仅模板模式） */
    validation?: TemplateValidationResult;
}> {
    const { projectId, stages, format = "text", templateId, selectedSections } = options;
    const { default: connectDB } = await import("@/lib/db");
    await connectDB();

    const project = await Project.findById(projectId).lean();
    if (!project) {
        throw new Error("Project not found");
    }

    const config = await StageConfig.findOne({ version: project.config_version }).lean();
    const stageDefs = config?.stages || [];

    // 如果指定了模板，使用模板渲染
    if (templateId) {
        const template = getTemplateById(templateId);
        if (!template) {
            throw new Error(`模板不存在: ${templateId}`);
        }

        const result = await renderWithTemplate(
            {
                projectId,
                templateId,
                format: format as TemplateExportFormat,
                selectedSections,
            },
            project
        );

        // 同时构建 sections 以保持返回结构一致
        const sections = buildExportSections({ project, stageDefs, stages });

        return {
            filename: result.filename,
            contentType: result.contentType,
            body: result.body,
            sections,
            template: result.template,
            validation: result.validation,
        };
    }

    // 原有逻辑（无模板）
    const sections = buildExportSections({
        project,
        stageDefs,
        stages,
    });

    const baseName = sanitizeFilename(project.name || "project");

    if (format === "docx") {
        const buffer = await renderDocxBundle(project.name, sections);
        return {
            filename: `${baseName}-export.docx`,
            contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            body: buffer,
            sections,
        };
    }

    if (format === "pdf") {
        const buffer = await renderPdfBundle(project.name, sections);
        return {
            filename: `${baseName}-export.pdf`,
            contentType: "application/pdf",
            body: buffer,
            sections,
        };
    }

    if (format === "pptx") {
        const buffer = await renderPptBundle(project.name, sections);
        return {
            filename: `${baseName}-export.pptx`,
            contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            body: buffer,
            sections,
        };
    }

    // default to text
    const content = formatExportContent({
        project,
        stageDefs,
        stages,
    });

    return {
        filename: `${baseName}-export.txt`,
        contentType: "text/plain; charset=utf-8",
        body: content,
        sections,
    };
}

export default buildExportBundle;

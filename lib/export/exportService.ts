import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, ImageRun } from "docx";
import connectDB from "@/lib/db";
import Project from "@/models/Project";
import StageConfig from "@/models/StageConfig";
import { StageExportSection } from "@/types/project";
import { stripInlineMarkdown, parseMarkdownTable } from "./markdownUtils";
import { renderPdfBundle } from "./pdfUtils";
import { renderPptBundle } from "./pptUtils";
import { renderMermaidToBuffer } from "./mermaidUtils";

const EXPORT_GROUPS = [
    {
        title: "第一部分：课程顶层设计与理念文件 (Q1-Q4)",
        stages: ["Q1", "Q2", "Q3", "Q4"]
    },
    {
        title: "第二部分：育人目标与课程结构文件 (Q5-Q8)",
        stages: ["Q5", "Q6", "Q7", "Q8"]
    },
    {
        title: "第三部分：课程实施与评价文件 (Q9-Q10)",
        stages: ["Q9", "Q10"]
    }
];

interface ExportOptions {
    projectId: string;
    stages?: string[];
    format: "text" | "docx" | "pdf" | "pptx";
    templateId?: string;
    selectedSections?: string[];
    excludeCitations?: boolean;  // Option to remove citations/references from content
}

/**
 * Remove citations/references sections from content.
 * Removes both inline citations like [1], [2][3] and reference list sections.
 */
function stripCitations(content: string): string {
    if (!content) return content;

    // Remove inline citations like [1], [2][3], etc.
    let cleaned = content.replace(/\[\d+\](?:\[\d+\])*/g, '');

    // Remove reference list section at the end
    // Common patterns for citation/reference sections in Chinese and English
    const refPatterns = [
        /\n*#{1,3}\s*(参考文献|引用来源|参考资料|文献引用|参考资料列表|References|Citations|Bibliography|Sources)[\s\S]*$/i,
        /\n*(参考文献|引用来源|参考资料|文献引用|参考资料列表|References|Citations|Bibliography|Sources)\s*[:：]?[\s\S]*$/i,
    ];

    for (const pattern of refPatterns) {
        cleaned = cleaned.replace(pattern, '');
    }

    // Clean up extra whitespace
    cleaned = cleaned.trim();

    return cleaned;
}

export async function buildExportBundle(options: ExportOptions): Promise<{ filename: string; contentType: string; body: Buffer | string; sections: StageExportSection[] }> {
    await connectDB();
    const { projectId, stages, format } = options;

    const project = await Project.findById(projectId).lean();
    if (!project) {
        throw new Error("Project not found");
    }

    // Determine which stages to export
    // If specific stages requested, use them. Otherwise export all completed stages (up to Q10)
    let stageIdsToExport = stages;
    if (!stageIdsToExport || stageIdsToExport.length === 0) {
        // Default to Q1-Q10 if they exist in project
        const potentialStages = ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "Q7", "Q8", "Q9", "Q10"];
        stageIdsToExport = potentialStages.filter(sid => project.stages?.[sid]);
    }

    // Build sections data
    const sections: StageExportSection[] = [];
    // Fetch project's stage config once
    const projectConfig = await StageConfig.findOne({ version: project.config_version }).lean();
    const configStages = (projectConfig as any)?.stages || [];

    for (const stageId of stageIdsToExport!) {
        const stageData = project.stages?.[stageId];
        if (!stageData) continue;

        // Find stage config from the stages array
        const stageConfig = configStages.find((s: any) => s.stage_id === stageId);

        // Prepare table rows (keywords, or specific fields)
        const tableRows: { key: string; value: string }[] = [];
        if (stageData.data) {
            // Simple flatten of data for now, or use specific logic per stage
            Object.entries(stageData.data).forEach(([k, v]) => {
                if (typeof v === 'string' && v.length < 100) { // arbitrary limit for key info
                    tableRows.push({ key: k, value: v });
                } else if (Array.isArray(v)) {
                    tableRows.push({ key: k, value: v.join(", ") });
                }
            });
        }

        // Resolve content from output
        let content = "";
        if (stageData.output) {
            if (typeof stageData.output === "string") {
                content = stageData.output;
            } else {
                content = stageData.output.content || stageData.output.report || "";
            }
        }

        // Strip citations if requested
        if (options.excludeCitations && content) {
            content = stripCitations(content);
        }

        sections.push({
            stageId,
            name: stageConfig?.name || "",  // Use empty string to prevent "Q1 Q1" duplicate
            description: stageConfig?.description,
            status: stageData.status,
            content: content,
            keywords: stageData.keywords,
            score: stageData.score,
            tableRows
        });
    }

    const body = await renderBundleInternal(project.name || "Project", sections, format);

    let ext = "txt";
    let contentType = "text/plain";
    if (format === "docx") {
        ext = "docx";
        contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    } else if (format === "pdf") {
        ext = "pdf";
        contentType = "application/pdf";
    } else if (format === "pptx") {
        ext = "pptx";
        contentType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    }

    return {
        filename: `${project.name || "export"}.${ext}`,
        contentType,
        body,
        sections
    };
}

async function renderBundleInternal(
    projectName: string,
    sections: StageExportSection[],
    format: "text" | "docx" | "pdf" | "pptx"
): Promise<Buffer | string> {
    if (format === "text") {
        return sections
            .map((s) => {
                let text = `## ${s.stageId} ${s.name}\n\n`;
                if (s.description) text += `*${s.description}*\n\n`;
                if (s.status) text += `**状态**: ${s.status}\n`;
                if (s.score !== undefined) text += `**评分**: ${s.score}\n`;
                if (s.keywords?.length) text += `**关键词**: ${s.keywords.join(", ")}\n`;
                text += "\n" + (s.content || "（无生成内容）") + "\n";
                if (s.tableRows?.length) {
                    text += "\n### 关键信息表\n";
                    s.tableRows.forEach(row => {
                        text += `- ${row.key}: ${row.value || "—"}\n`;
                    });
                }
                return text;
            })
            .join("\n---\n\n");
    }

    if (format === "docx") {
        return renderDocxBundle(projectName, sections);
    }

    if (format === "pdf") {
        return renderPdfBundle(projectName, sections);
    }

    if (format === "pptx") {
        return renderPptBundle(projectName, sections);
    }

    throw new Error(`Unsupported format: ${format}`);
}


function buildDocxTable(rows: string[][]): Table {
    // Determine max columns
    let maxCols = 0;
    rows.forEach(r => maxCols = Math.max(maxCols, r.length));

    const tableRows = rows.map((row) => {
        const cells = row.map((cellText) => {
            return new TableCell({
                children: [new Paragraph(stripInlineMarkdown(cellText))],
            });
        });
        // Fill missing cells
        while (cells.length < maxCols) {
            cells.push(new TableCell({ children: [new Paragraph("")] }));
        }
        return new TableRow({
            children: cells,
        });
    });

    return new Table({
        rows: tableRows,
        width: {
            size: 100,
            type: "pct",
        },
    });
}

async function docxParagraphsFromMarkdown(content: string): Promise<Array<Paragraph | Table>> {
    const lines = (content || "").split(/\r?\n/);
    const blocks: Array<Paragraph | Table> = [];
    let inCodeBlock = false;
    let codeBlockLang = "";
    let codeBuffer: string[] = [];

    for (let index = 0; index < lines.length; index += 1) {
        const rawLine = lines[index];
        const line = rawLine.replace(/\t/g, "    ");
        const trimmed = line.trim();

        // Start of code block
        if (trimmed.startsWith("```")) {
            if (!inCodeBlock) {
                inCodeBlock = true;
                codeBlockLang = trimmed.replace("```", "").trim().toLowerCase();
                codeBuffer = [];
            } else {
                // End of code block
                inCodeBlock = false;

                // Process the buffered code
                const firstLine = codeBuffer[0]?.trim() || "";
                // DETECT MERMAID: either explicit lang or content heuristics
                const isMermaid = codeBlockLang === "mermaid" ||
                    (codeBlockLang === "" && (
                        firstLine.startsWith("graph ") ||
                        firstLine.startsWith("sequenceDiagram") ||
                        firstLine.startsWith("pie ") ||
                        firstLine.startsWith("flowchart ")
                    ));

                if (isMermaid) {
                    const mermaidCode = codeBuffer.join("\n");
                    try {
                        const imgBuffer = await renderMermaidToBuffer(mermaidCode);
                        if (imgBuffer) {
                            blocks.push(new Paragraph({
                                children: [
                                    new ImageRun({
                                        data: imgBuffer,
                                        transformation: {
                                            width: 500,
                                            height: 300,
                                        },
                                        type: "png"
                                    })
                                ]
                            }));
                        } else {
                            blocks.push(new Paragraph({
                                children: [new TextRun({ text: "[Mermaid Diagram Rendering Failed]", color: "red" })]
                            }));
                            // Fallback: show code
                            codeBuffer.forEach(l => {
                                blocks.push(new Paragraph({ children: [new TextRun({ text: l, font: "Courier New", color: "374151" })] }));
                            });
                        }
                    } catch (e) {
                        blocks.push(new Paragraph({
                            children: [new TextRun({ text: "[Mermaid Error]", color: "red" })]
                        }));
                    }
                } else {
                    // Normal code block
                    codeBuffer.forEach(l => {
                        blocks.push(
                            new Paragraph({
                                children: [new TextRun({ text: l, font: "Courier New", color: "374151" })],
                            })
                        );
                    });
                }
                codeBuffer = [];
                codeBlockLang = "";
            }
            continue;
        }

        if (inCodeBlock) {
            codeBuffer.push(line);
            continue;
        }

        if (!trimmed) continue;

        const table = parseMarkdownTable(lines, index);
        if (table) {
            blocks.push(buildDocxTable(table.rows));
            index = table.endIndex - 1;
            continue;
        }

        const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
        if (headingMatch) {
            const level = headingMatch[1].length;
            const headingText = stripInlineMarkdown(headingMatch[2]);
            const headingLevel =
                level <= 1
                    ? HeadingLevel.HEADING_3
                    : level === 2
                        ? HeadingLevel.HEADING_4
                        : level === 3
                            ? HeadingLevel.HEADING_5
                            : HeadingLevel.HEADING_6;
            blocks.push(new Paragraph({ text: headingText, heading: headingLevel }));
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
                    children: [new TextRun({ text: stripInlineMarkdown(quoteMatch[1]), italics: true, color: "4B5563" })],
                })
            );
            continue;
        }

        if (trimmed.includes("|") && !/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(trimmed)) {
            const cells = trimmed
                .replace(/^\|/, "")
                .replace(/\|$/, "")
                .split("|")
                .map((c) => stripInlineMarkdown(c));
            blocks.push(new Paragraph(cells.filter(Boolean).join("    ")));
            continue;
        }

        blocks.push(new Paragraph(stripInlineMarkdown(trimmed)));
    }

    return blocks.length ? blocks : [new Paragraph("（无生成内容）")];
}

async function renderDocxBundle(projectName: string, sections: StageExportSection[]): Promise<Buffer> {
    const getSection = (id: string) => sections.find(s => s.stageId === id || s.stageId.startsWith(id + " "));

    const children: Array<Paragraph | Table> = [
        new Paragraph({
            text: `${projectName} 课程设计导出`,
            heading: HeadingLevel.HEADING_1,
        }),
    ];

    for (const group of EXPORT_GROUPS) {
        // Group Title
        const groupStages = group.stages.map(sid => getSection(sid)).filter(Boolean);

        // Always show group title if requested, or only if stages exist? 
        // User requested strict structure, so let's show title even if empty? 
        // Better: show title if at least one stage exists or just show it anyway as placeholder.
        children.push(new Paragraph({
            text: group.title,
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
        }));

        for (const stageId of group.stages) {
            const section = getSection(stageId);
            if (!section) continue;

            children.push(new Paragraph({
                text: `${section.stageId} ${section.name}`,
                heading: HeadingLevel.HEADING_2,
            }));

            if (section.description) {
                children.push(new Paragraph({
                    children: [new TextRun({ text: section.description, italics: true, color: "6b7280" })],
                }));
            }

            if (section.status) {
                children.push(new Paragraph({
                    children: [
                        new TextRun({ text: "状态: ", bold: true }),
                        new TextRun({ text: section.status }),
                    ]
                }));
            }
            if (section.score !== undefined) {
                children.push(new Paragraph({
                    children: [
                        new TextRun({ text: "评分: ", bold: true }),
                        new TextRun({ text: `${section.score}` }),
                    ]
                }));
            }

            // Render content
            const contentParagraphs = await docxParagraphsFromMarkdown(section.content);
            children.push(...contentParagraphs);

            // Render Key Info Table
            if (section.tableRows?.length) {
                children.push(new Paragraph({ text: "关键信息表", heading: HeadingLevel.HEADING_3 }));
                section.tableRows.forEach((row) => {
                    children.push(
                        new Paragraph({
                            children: [
                                new TextRun({ text: `${row.key}: `, bold: true }),
                                new TextRun({ text: row.value || "—" }),
                            ],
                        })
                    );
                });
            }
        }
    }

    const doc = new Document({
        sections: [
            {
                children: children,
            },
        ],
    });

    return Packer.toBuffer(doc);
}

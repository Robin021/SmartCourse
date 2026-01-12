import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, ImageRun, AlignmentType, Header, Footer, PageNumber, NumberFormat, TableOfContents } from "docx";
import connectDB from "@/lib/db";
import Project from "@/models/Project";
import StageConfig from "@/models/StageConfig";
import { StageExportSection } from "@/types/project";
import { stripInlineMarkdown, parseMarkdownTable } from "./markdownUtils";
import { renderPdfBundle } from "./pdfUtils";
import { renderPptBundle } from "./pptUtils";
import { renderMermaidToBuffer, getPngDimensions } from "./mermaidUtils";
import { fetchImageBuffer, getImageDimensions } from "./imageUtils";

const EXPORT_GROUPS = [
    {
        title: "一、学校课程建设背景",
        stages: ["Q1"]
    },
    {
        title: "二、学校课程哲学与理念",
        stages: ["Q2", "Q3"]
    },
    {
        title: "三、学校课程育人目标",
        stages: ["Q4", "Q7"]
    },
    {
        title: "四、学校课程结构体系",
        stages: ["Q5", "Q6", "Q8"]
    },
    {
        title: "五、学校课程实施",
        stages: ["Q9"]
    },
    {
        title: "六、学校课程评价",
        stages: ["Q10"]
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
        if (stageData.input) {
            // Simple flatten of data for now, or use specific logic per stage
            Object.entries(stageData.input).forEach(([k, v]) => {
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
            keywords: stageData.output?.keywords,
            score: stageData.diagnostic_score?.overall,
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
                            const { width: naturalWidth, height: naturalHeight } = getPngDimensions(imgBuffer);
                            const MAX_WIDTH = 600;

                            let targetWidth = naturalWidth;
                            let targetHeight = naturalHeight;

                            if (naturalWidth > MAX_WIDTH) {
                                targetWidth = MAX_WIDTH;
                                targetHeight = Math.round((naturalHeight / naturalWidth) * MAX_WIDTH);
                            }

                            blocks.push(new Paragraph({
                                children: [
                                    new ImageRun({
                                        data: imgBuffer,
                                        transformation: {
                                            width: targetWidth,
                                            height: targetHeight,
                                        },
                                        type: "png"
                                    })
                                ]
                            }));
                        } else {
                            blocks.push(new Paragraph({
                                children: [new TextRun({ text: "[Mermaid Diagram Rendering Failed]", color: "990000" })]
                            }));
                            // Fallback: show code
                            codeBuffer.forEach(l => {
                                blocks.push(new Paragraph({ children: [new TextRun({ text: l, font: "Courier New", color: "374151" })] }));
                            });
                        }
                    } catch (e) {
                        blocks.push(new Paragraph({
                            children: [new TextRun({ text: "[Mermaid Error]", color: "990000" })]
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

        // Support for standard Markdown Images: ![Alt](url)
        const imageMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)/);
        if (imageMatch) {
            const altText = imageMatch[1];
            const imageUrl = imageMatch[2];

            try {
                const imgBuffer = await fetchImageBuffer(imageUrl);
                if (imgBuffer) {
                    const { width: naturalWidth, height: naturalHeight } = getImageDimensions(imgBuffer);
                    const MAX_WIDTH = 550;

                    let targetWidth = naturalWidth;
                    let targetHeight = naturalHeight;

                    if (naturalWidth > MAX_WIDTH) {
                        targetWidth = MAX_WIDTH;
                        targetHeight = Math.round((naturalHeight / naturalWidth) * MAX_WIDTH);
                    }

                    blocks.push(new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                            new ImageRun({
                                data: imgBuffer,
                                transformation: {
                                    width: targetWidth,
                                    height: targetHeight,
                                },
                                type: "png" // Fallback to png, most buffers work well with this in docx
                            })
                        ],
                        spacing: { before: 200, after: 100 }
                    }));

                    if (altText) {
                        blocks.push(new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new TextRun({ text: altText, size: 18, color: "666666", italics: true })],
                            spacing: { after: 200 }
                        }));
                    }
                } else {
                    blocks.push(new Paragraph({
                        children: [new TextRun({ text: `[图片拉取失败: ${altText || imageUrl}]`, color: "990000" })]
                    }));
                }
            } catch (e) {
                blocks.push(new Paragraph({
                    children: [new TextRun({ text: `[图片嵌入错误: ${altText || imageUrl}]`, color: "990000" })]
                }));
            }
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

    // 1. Cover Page - Professional School Report Style
    const currentDate = new Date().toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const coverChildren: Array<Paragraph | Table> = [
        // Top spacing
        new Paragraph({ text: "", spacing: { before: 1200 } }),

        // Decorative top bar
        new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
                new TextRun({ text: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", color: "2980b9", size: 28 })
            ],
            spacing: { after: 800 }
        }),

        // School name placeholder (extracted from Q1 if available, or generic)
        new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
                new TextRun({
                    text: projectName,
                    size: 72,
                    bold: true,
                    color: "1a5276",
                    font: "Microsoft YaHei"
                })
            ],
            spacing: { after: 400 }
        }),

        // Main title
        new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
                new TextRun({
                    text: "课程顶层设计方案",
                    size: 56,
                    bold: true,
                    color: "2c3e50",
                    font: "Microsoft YaHei"
                })
            ],
            spacing: { after: 200 }
        }),

        // Subtitle
        new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
                new TextRun({
                    text: "Curriculum Top-Level Design",
                    size: 28,
                    color: "7f8c8d",
                    italics: true,
                    font: "Arial"
                })
            ],
            spacing: { after: 600 }
        }),

        // Decorative bottom bar
        new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
                new TextRun({ text: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", color: "2980b9", size: 28 })
            ],
            spacing: { after: 1600 }
        }),

        // Date section
        new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
                new TextRun({ text: "编制日期", size: 22, color: "95a5a6" })
            ],
            spacing: { after: 100 }
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
                new TextRun({ text: currentDate, size: 28, color: "34495e", bold: true })
            ],
            spacing: { after: 400 }
        }),

        // Footer note
        new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
                new TextRun({ text: "本报告由 SmartCourse 智能课程设计系统辅助生成", size: 18, color: "bdc3c7" })
            ],
            spacing: { before: 800 }
        })
    ];

    // 2. Table of Contents
    // Build a manual TOC as preview, plus Word's auto-TOC for print
    const tocEntries: Paragraph[] = [];
    let tocIndex = 1;

    for (const group of EXPORT_GROUPS) {
        const groupStages = group.stages.map(sid => getSection(sid)).filter(Boolean);
        if (groupStages.length === 0) continue;

        // Add group title as TOC entry
        tocEntries.push(new Paragraph({
            children: [
                new TextRun({ text: `${tocIndex}. ${group.title}`, size: 24, bold: true, color: "2c3e50" }),
                new TextRun({ text: "  ......  ", size: 24, color: "bdc3c7" }),
                new TextRun({ text: `页码待定`, size: 20, color: "95a5a6" })
            ],
            spacing: { before: 200, after: 100 }
        }));

        // Add stage entries as sub-items
        for (const stageId of group.stages) {
            const section = getSection(stageId);
            if (!section) continue;
            tocEntries.push(new Paragraph({
                children: [
                    new TextRun({ text: `    ${section.stageId} ${section.name}`, size: 22, color: "7f8c8d" })
                ],
                spacing: { after: 80 }
            }));
        }
        tocIndex++;
    }

    const tocChildren: Array<Paragraph | Table | TableOfContents> = [
        new Paragraph({
            text: "目  录",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 200 },
            pageBreakBefore: true
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
                new TextRun({ text: "CONTENTS", size: 24, color: "95a5a6", italics: true })
            ],
            spacing: { after: 600 }
        }),
        // Manual TOC preview
        ...tocEntries,
        // Hint for Word users
        new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
                new TextRun({
                    text: "（提示：在 Microsoft Word 中按 Ctrl+A 全选后按 F9 可更新页码）",
                    size: 18,
                    color: "bdc3c7",
                    italics: true
                })
            ],
            spacing: { before: 400, after: 200 }
        }),
        // Word's auto-update TOC field (hidden by default, becomes visible after F9)
        new TableOfContents("目录", {
            hyperlink: true,
            headingStyleRange: "1-3",
        }),
    ];

    // 3. Main Content
    const contentChildren: Array<Paragraph | Table> = [];

    for (const group of EXPORT_GROUPS) {
        const groupStages = group.stages.map(sid => getSection(sid)).filter(Boolean);
        if (groupStages.length === 0) continue;

        contentChildren.push(new Paragraph({
            text: group.title,
            heading: HeadingLevel.HEADING_1,
            pageBreakBefore: true,
            spacing: { before: 400, after: 400 },
            alignment: AlignmentType.CENTER,
        }));

        for (const stageId of group.stages) {
            const section = getSection(stageId);
            if (!section) continue;

            contentChildren.push(new Paragraph({
                text: `${section.stageId} ${section.name}`,
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 300, after: 200 }
            }));

            if (section.description) {
                contentChildren.push(new Paragraph({
                    children: [new TextRun({ text: section.description, italics: true, color: "666666" })],
                    spacing: { after: 150 }
                }));
            }

            // Stats and Score (Optional styling)
            if (section.status || section.score !== undefined) {
                contentChildren.push(new Paragraph({
                    children: [
                        ...(section.status ? [new TextRun({ text: "状态: ", bold: true, size: 20 }), new TextRun({ text: `${section.status}    `, size: 20 })] : []),
                        ...(section.score !== undefined ? [new TextRun({ text: "评分: ", bold: true, size: 20 }), new TextRun({ text: `${section.score}`, size: 20, color: section.score > 80 ? "27ae60" : "c0392b" })] : []),
                    ],
                    spacing: { after: 200 }
                }));
            }

            const contentParagraphs = await docxParagraphsFromMarkdown(section.content);
            contentChildren.push(...contentParagraphs);
        }
    }

    const doc = new Document({
        styles: {
            default: {
                heading1: {
                    run: { size: 48, bold: true, color: "2980b9", font: "Microsoft YaHei" },
                    paragraph: { spacing: { before: 400, after: 400 } }
                },
                heading2: {
                    run: { size: 36, bold: true, color: "34495e", font: "Microsoft YaHei" },
                    paragraph: { spacing: { before: 300, after: 200 } }
                }
            }
        },
        sections: [
            {
                properties: {
                    page: {
                        pageNumbers: {
                            start: 1,
                            formatType: NumberFormat.DECIMAL
                        }
                    }
                },
                headers: {
                    default: new Header({
                        children: [
                            new Paragraph({
                                children: [new TextRun({ text: `${projectName} - 课程设计方案`, color: "95a5a6", size: 18 })],
                                alignment: AlignmentType.RIGHT
                            })
                        ]
                    })
                },
                footers: {
                    default: new Footer({
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [
                                    new TextRun({
                                        children: ["第 ", PageNumber.CURRENT, " 页 / 共 ", PageNumber.TOTAL_PAGES, " 页"],
                                        size: 18,
                                        color: "95a5a6"
                                    }),
                                ],
                            }),
                        ],
                    }),
                },
                children: [
                    ...coverChildren,
                    ...tocChildren,
                    ...contentChildren
                ],
            },
        ],
    });

    return Packer.toBuffer(doc);
}

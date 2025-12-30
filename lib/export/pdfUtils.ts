import fs from "fs";
import PDFDocument from "pdfkit";
import { stripInlineMarkdown } from "./markdownUtils";
import { renderMermaidToBuffer, getPngDimensions } from "./mermaidUtils";
import { StageExportSection } from "@/types/project";

type FontCandidate = { path: string; family?: string };

const BODY_FONT_CANDIDATES: FontCandidate[] = [
    { path: "/usr/share/fonts/noto/NotoSansCJK-Regular.ttc", family: "NotoSansCJKsc-Regular" },
    { path: "/usr/share/fonts/noto/NotoSerifCJK-Regular.ttc", family: "NotoSerifCJKsc-Regular" },
    { path: "/System/Library/Fonts/PingFang.ttc", family: "PingFangSC-Regular" },
    { path: "/System/Library/Fonts/Hiragino Sans GB W3.otf" },
    { path: "/Library/Fonts/Arial Unicode.ttf" },
];

const HEADING_FONT_CANDIDATES: FontCandidate[] = [
    { path: "/usr/share/fonts/noto/NotoSansCJK-Bold.ttc", family: "NotoSansCJKsc-Bold" },
    { path: "/usr/share/fonts/noto/NotoSerifCJK-Bold.ttc", family: "NotoSerifCJKsc-Bold" },
    { path: "/System/Library/Fonts/PingFang.ttc", family: "PingFangSC-Semibold" },
    { path: "/System/Library/Fonts/Hiragino Sans GB W6.otf" },
];

export function createPdfDoc(options: PDFKit.PDFDocumentOptions = {}) {
    const docOptions: PDFKit.PDFDocumentOptions = {
        size: "A4",
        margin: 56,
        bufferPages: true,
        ...options,
    };

    if (docOptions.font === undefined) {
        docOptions.font = "";
    }

    const doc = new PDFDocument(docOptions);

    let bodyFont: string | undefined;
    let headingFont: string | undefined;
    let fontPath: string | undefined;

    for (const candidate of BODY_FONT_CANDIDATES) {
        if (!fs.existsSync(candidate.path)) continue;
        try {
            doc.registerFont("Body", candidate.path, candidate.family);
            doc.font("Body");
            bodyFont = "Body";
            fontPath = candidate.path;
            break;
        } catch {
            continue;
        }
    }

    if (!bodyFont) {
        throw new Error(
            "PDF 字体缺失：请在运行环境安装中文字体（Alpine 推荐 `apk add --no-cache font-noto-cjk`），或提供可用的 .ttf/.otf 字体文件路径。"
        );
    }

    for (const candidate of HEADING_FONT_CANDIDATES) {
        if (!fs.existsSync(candidate.path)) continue;
        try {
            doc.registerFont("Heading", candidate.path, candidate.family);
            doc.font("Heading");
            headingFont = "Heading";
            break;
        } catch {
            continue;
        }
    }

    if (!headingFont) {
        headingFont = bodyFont;
    }

    doc.font(bodyFont);
    return { doc, fontPath, bodyFont, headingFont };
}

export function pdfToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const buffers: Buffer[] = [];
        doc.on("data", (data) => buffers.push(Buffer.isBuffer(data) ? data : Buffer.from(data)));
        doc.on("end", () => resolve(Buffer.concat(buffers)));
        doc.on("error", reject);
    });
}

export function getContentWidth(doc: PDFKit.PDFDocument): number {
    return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

const BULLET_REGEX = /^[-*•]\s+(.*)$/;
const NUMBERED_REGEX = /^\s*(\d+)[.)]\s+(.*)$/;
const HEADING_REGEX = /^(#{1,6})\s+(.*)$/;
const HR_REGEX = /^(-{3,}|_{3,}|\*{3,})\s*$/;
const BLOCKQUOTE_REGEX = /^>\s+(.*)$/;
const TABLE_SEPARATOR_REGEX = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/;

export async function writeTextBlocks(
    doc: PDFKit.PDFDocument,
    rawText: string,
    options: {
        width?: number;
        lineGap?: number;
        paragraphGap?: number;
        bulletIndent?: number;
        bodyFont?: string;
        headingFont?: string;
        textColor?: string;
        mutedColor?: string;
        headingColor?: string;
        ruleColor?: string;
    } = {}
) {
    const width = options.width ?? getContentWidth(doc);
    const lineGap = options.lineGap ?? 4;
    const paragraphGap = options.paragraphGap ?? 8;
    const bulletIndent = options.bulletIndent ?? 12;
    const text = typeof rawText === "string" ? rawText : "";
    const baseFontSize = (doc as any)._fontSize ?? 11;
    const bodyFont = options.bodyFont;
    const headingFont = options.headingFont ?? bodyFont;
    const textColor = options.textColor ?? "#111827";
    const mutedColor = options.mutedColor ?? "#4B5563";
    const headingColor = options.headingColor ?? "#111827";
    const ruleColor = options.ruleColor ?? "#E5E7EB";

    if (!text.trim()) {
        doc.text("（无生成内容）", { width, lineGap, paragraphGap });
        return;
    }

    const lines = text.split(/\r?\n/);
    const bullets: string[] = [];
    const numbered: Array<{ n: string; text: string }> = [];
    const codeLines: string[] = [];
    let inCodeBlock = false;
    let codeBlockLang = "";

    const flushBullets = () => {
        if (bullets.length === 0) return;
        if (bodyFont) doc.font(bodyFont);
        doc.fontSize(baseFontSize).fillColor(textColor);
        doc.list(bullets, {
            bulletIndent,
            textIndent: bulletIndent + 6,
            width,
            lineGap,
        });
        doc.moveDown(0.2);
        bullets.length = 0;
    };

    const flushNumbered = () => {
        if (numbered.length === 0) return;
        if (bodyFont) doc.font(bodyFont);
        doc.fontSize(baseFontSize).fillColor(textColor);
        numbered.forEach((item) => {
            doc.text(`${item.n}. ${item.text}`, {
                width,
                lineGap,
                paragraphGap,
                indent: bulletIndent,
            });
        });
        doc.moveDown(0.2);
        numbered.length = 0;
    };

    const flushCode = async () => {
        if (codeLines.length === 0) return;

        // Check if mermaid
        const firstLine = codeLines[0]?.trim() || "";
        const isMermaid = codeBlockLang === "mermaid" ||
            (codeBlockLang === "" && (
                firstLine.startsWith("graph ") ||
                firstLine.startsWith("sequenceDiagram") ||
                firstLine.startsWith("pie ") ||
                firstLine.startsWith("flowchart ")
            ));

        if (isMermaid) {
            const mermaidCode = codeLines.join("\n");
            try {
                const buffer = await renderMermaidToBuffer(mermaidCode);
                if (buffer) {
                    const { width: finalWidth, height: finalHeight } = getPngDimensions(buffer);
                    // Standard PDF page width (A4) minus margins is roughly 480-500pt
                    // If image is wider than content width, scale it down to fit width
                    // If image is smaller, center it at natural size (adjusted for density if needed, 
                    // but usually PDFKit handles pixel-to-point mapping 1:1, so high-res image at 1:1 point might be HUGE)
                    // We generated at scale 3. So 1 CSS pixel = 3 actual pixels.
                    // We want to display it at roughly CSS pixel size (1/3 of distinct pixels).

                    let displayWidth = finalWidth / 3; // Approx natural size in points

                    // Cap at page width
                    if (displayWidth > width) {
                        displayWidth = width;
                    }

                    // If it's too small, maybe keep it? or let it be.

                    doc.image(buffer, { width: displayWidth, align: 'center' });
                    doc.moveDown(0.5);
                } else {
                    doc.fillColor("red").text("[Mermaid Generation Failed]", { width, align: 'center', oblique: true });
                    // Fallback to text
                    if (bodyFont) doc.font(bodyFont);
                    doc.fontSize(9).fillColor(mutedColor).text(mermaidCode, { width });
                }
            } catch (e) {
                console.error("PDF Mermaid Error:", e);
                if (bodyFont) doc.font(bodyFont);
                doc.fontSize(9).fillColor(mutedColor).text(mermaidCode, { width });
            }
        } else {
            if (bodyFont) doc.font(bodyFont);
            doc.fontSize(Math.max(baseFontSize - 1, 9))
                .fillColor(mutedColor)
                .text(codeLines.join("\n"), {
                    width,
                    lineGap,
                    paragraphGap,
                    indent: bulletIndent,
                });
            doc.moveDown(0.2);
        }

        codeLines.length = 0;
        codeBlockLang = "";
    };

    const flushLists = async () => {
        await flushCode();
        flushNumbered();
        flushBullets();
    };

    for (const line of lines) {
        const normalizedLine = line.replace(/\t/g, "    ");
        const trimmed = normalizedLine.trim();

        if (trimmed.startsWith("```")) {
            await flushLists();
            if (!inCodeBlock) {
                inCodeBlock = true;
                codeBlockLang = trimmed.replace("```", "").trim().toLowerCase();
            } else {
                await flushCode(); // Should flush existing code buffer
                inCodeBlock = false;
            }
            continue;
        }

        if (inCodeBlock) {
            codeLines.push(normalizedLine.trimEnd());
            continue;
        }

        if (!trimmed) {
            await flushLists();
            doc.moveDown(0.2);
            continue;
        }

        if (HR_REGEX.test(trimmed)) {
            await flushLists();
            doc.moveTo(doc.page.margins.left, doc.y)
                .lineTo(doc.page.width - doc.page.margins.right, doc.y)
                .stroke(ruleColor);
            doc.moveDown(0.4);
            continue;
        }

        const headingMatch = trimmed.match(HEADING_REGEX);
        if (headingMatch) {
            await flushLists();
            const level = headingMatch[1].length;
            const headingText = stripInlineMarkdown(headingMatch[2]);
            const headingSize = Math.max(baseFontSize + (level <= 2 ? 3 : 1), baseFontSize + 1);
            if (headingFont) doc.font(headingFont);
            doc.fontSize(headingSize).fillColor(headingColor).text(headingText, { width });
            if (bodyFont) doc.font(bodyFont);
            doc.fontSize(baseFontSize).fillColor(textColor);
            doc.moveDown(0.2);
            continue;
        }

        const quoteMatch = trimmed.match(BLOCKQUOTE_REGEX);
        if (quoteMatch) {
            await flushLists();
            if (bodyFont) doc.font(bodyFont);
            doc.fontSize(baseFontSize)
                .fillColor(mutedColor)
                .text(stripInlineMarkdown(quoteMatch[1]), {
                    width,
                    lineGap,
                    paragraphGap,
                    indent: bulletIndent,
                });
            if (bodyFont) doc.font(bodyFont);
            doc.fontSize(baseFontSize).fillColor(textColor);
            continue;
        }

        if (TABLE_SEPARATOR_REGEX.test(trimmed)) {
            continue;
        }
        if (trimmed.includes("|")) {
            await flushLists();
            const cells = trimmed
                .replace(/^\|/, "")
                .replace(/\|$/, "")
                .split("|")
                .map((c) => stripInlineMarkdown(c));
            doc.text(cells.filter(Boolean).join("    "), { width, lineGap, paragraphGap });
            continue;
        }

        const numberedMatch = trimmed.match(NUMBERED_REGEX);
        if (numberedMatch) {
            flushBullets();
            await flushCode();
            numbered.push({ n: numberedMatch[1], text: stripInlineMarkdown(numberedMatch[2]) });
            continue;
        }

        const bulletMatch = trimmed.match(BULLET_REGEX);
        if (bulletMatch) {
            flushNumbered();
            await flushCode();
            bullets.push(stripInlineMarkdown(bulletMatch[1]));
            continue;
        }

        await flushLists();
        doc.text(stripInlineMarkdown(trimmed), {
            width,
            lineGap,
            paragraphGap,
        });
    }

    await flushLists();
}

export function addPageNumbers(
    doc: PDFKit.PDFDocument,
    options: { label?: string; showNumbers?: boolean; font?: string; color?: string; fontSize?: number; align?: "left" | "center" | "right" } = {}
) {
    const range = doc.bufferedPageRange();
    if (!range.count) return;

    const width = getContentWidth(doc);
    const {
        label,
        showNumbers = true,
        fontSize = 9,
        color = "#6B7280",
        align = "right",
        font,
    } = options;

    for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        if (font) doc.font(font);

        const parts: string[] = [];
        if (label) parts.push(label);
        if (showNumbers) parts.push(`第 ${i - range.start + 1}/${range.count} 页`);
        if (parts.length === 0) continue;

        doc.fontSize(fontSize)
            .fillColor(color)
            .text(parts.join("  ·  "), doc.page.margins.left, doc.page.height - doc.page.margins.bottom + 6, {
                width,
                align,
            });
    }
}

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

export async function renderPdfBundle(projectName: string, sections: StageExportSection[]): Promise<Buffer> {
    const { doc, bodyFont, headingFont } = createPdfDoc();

    // Title Page
    doc.fontSize(24).font(headingFont).text(projectName, { align: "center" });
    doc.moveDown();
    doc.fontSize(16).fillColor("#6B7280").text("课程设计导出报告", { align: "center" });
    doc.addPage();

    const getSection = (id: string) => sections.find(s => s.stageId === id || s.stageId.startsWith(id + " "));

    for (const group of EXPORT_GROUPS) {
        // Group Title Page or Header
        doc.addPage();
        doc.fontSize(20).font(headingFont).fillColor("#111827").text(group.title, { align: "center" });
        doc.moveDown(2);

        for (const stageId of group.stages) {
            const section = getSection(stageId);
            if (!section) continue;

            doc.fontSize(16).font(headingFont).fillColor("#374151").text(`${section.stageId} ${section.name}`);
            doc.moveDown(0.5);

            if (section.description) {
                doc.fontSize(10).font(bodyFont).fillColor("#6B7280").text(section.description, { oblique: true });
                doc.moveDown();
            }

            // Content
            await writeTextBlocks(doc, section.content || "（无生成内容）", {
                width: getContentWidth(doc),
                bodyFont,
                headingFont
            });
            doc.moveDown(2);

        }
    }

    doc.end();
    return pdfToBuffer(doc);
}

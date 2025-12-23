import PptxGenJS from "pptxgenjs";
import { StageExportSection } from "@/types/project";
import { stripInlineMarkdown } from "./markdownUtils";

export async function renderPptBundle(projectName: string, sections: StageExportSection[]): Promise<Buffer> {
    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_16x9";

    // 1. Cover Slide
    const cover = pptx.addSlide();
    cover.background = { color: "F3F4F6" };
    cover.addText(`${projectName}`, {
        x: 0.5,
        y: "40%",
        w: "90%",
        h: 1,
        fontSize: 36,
        bold: true,
        align: "center",
        color: "111827",
    });
    cover.addText("课程设计方案汇报", {
        x: 0.5,
        y: "55%",
        w: "90%",
        h: 0.5,
        fontSize: 24,
        align: "center",
        color: "4B5563",
    });

    // 2. Content Slides
    sections.forEach((section) => {
        // Title Slide for the Section
        const slide = pptx.addSlide();
        slide.addText(`${section.stageId} ${section.name}`, {
            x: 0.5,
            y: 0.5,
            w: "90%",
            h: 0.5,
            fontSize: 24,
            bold: true,
            color: "111827",
        });

        if (section.description) {
            slide.addText(section.description, {
                x: 0.5,
                y: 1.2,
                w: "90%",
                h: 0.5,
                fontSize: 14,
                color: "6B7280",
                italic: true,
            });
        }

        // Content breakdown (simplified for PPT - usually bullet points are best)
        // We'll take the first few lines of content or simplify key info
        const contentText = stripInlineMarkdown(section.content || "");
        const lines = contentText.split("\n").filter(l => l.trim()).slice(0, 8); // Max 8 lines

        if (lines.length > 0) {
            slide.addText(lines.join("\n"), {
                x: 0.5,
                y: 2.0,
                w: "90%",
                h: 3.5,
                fontSize: 12,
                color: "374151",
                lineSpacing: 18,
            });
        }

    });

    // We need to return a Buffer. usage with nodebuffer
    // pptxgenjs write method returns Promise<string | ArrayBuffer | Blob | Buffer> depending on outputType
    const out = await pptx.write({ outputType: "nodebuffer" });
    return out as Buffer;
}

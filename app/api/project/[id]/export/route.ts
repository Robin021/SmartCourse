import { NextResponse } from "next/server";
import { buildExportBundle } from "@/lib/export/exportService";

type ExportFormat = "text" | "docx" | "pdf" | "pptx";

function toResponse(bundle: {
    filename: string;
    contentType: string;
    body: Buffer | string;
}) {
    const body = typeof bundle.body === "string" ? bundle.body : new Uint8Array(bundle.body);
    return new NextResponse(body, {
        status: 200,
        headers: {
            "Content-Type": bundle.contentType,
            "Content-Disposition": `attachment; filename="${encodeURIComponent(bundle.filename)}"`,
        },
    });
}

export async function GET(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params;
        const { searchParams } = new URL(req.url);
        const stagesParam = searchParams.get("stages");
        const format = (searchParams.get("format") as ExportFormat) || "text";
        const stages = stagesParam ? stagesParam.split(",").map((s) => s.trim()) : undefined;
        const templateId = searchParams.get("templateId") || undefined;
        const sectionsParam = searchParams.get("sections");
        const selectedSections = sectionsParam ? sectionsParam.split(",").map((s) => s.trim()) : undefined;

        const bundle = await buildExportBundle({
            projectId: params.id,
            stages,
            format,
            templateId,
            selectedSections,
        });

        return toResponse(bundle);
    } catch (error: any) {
        console.error("[Export] error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to export" },
            { status: 500 }
        );
    }
}

export async function POST(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params;
        const body = await req.json();
        const { stages, format = "text", templateId, selectedSections } = body || {};

        const bundle = await buildExportBundle({
            projectId: params.id,
            stages,
            format,
            templateId,
            selectedSections,
        });

        return toResponse(bundle);
    } catch (error: any) {
        console.error("[Export POST] error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to export" },
            { status: 500 }
        );
    }
}

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { versionManager } from "@/lib/version";
import StageVersion, { isValidStage } from "@/models/StageVersion";

export async function GET(
    req: Request,
    context: { params: { id: string; stage: string } | Promise<{ id: string; stage: string }> }
) {
    try {
        const { id, stage } = await context.params;
        if (!isValidStage(stage)) {
            return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
        }
        await connectDB();
        const versions = await versionManager.listVersions(id, stage);
        return NextResponse.json({ success: true, versions });
    } catch (error: any) {
        console.error("[Version GET] error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch versions" },
            { status: 500 }
        );
    }
}

export async function POST(
    req: Request,
    context: { params: { id: string; stage: string } | Promise<{ id: string; stage: string }> }
) {
    try {
        const { id, stage } = await context.params;
        if (!isValidStage(stage)) {
            return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
        }
        const { action, version } = await req.json();

        if (action === "rollback") {
            if (!version) {
                return NextResponse.json({ error: "version required" }, { status: 400 });
            }
            const target = await versionManager.rollback(id, stage, Number(version));
            return NextResponse.json({ success: true, version: target });
        }

        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    } catch (error: any) {
        console.error("[Version POST] error:", error);
        return NextResponse.json(
            { error: error.message || "Version action failed" },
            { status: 500 }
        );
    }
}

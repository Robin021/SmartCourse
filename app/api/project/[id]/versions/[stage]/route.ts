import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { versionManager } from "@/lib/version";
import StageVersion, { isValidStage } from "@/models/StageVersion";

export async function GET(
    req: Request,
    context: { params: Promise<{ id: string; stage: string }> }
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
    context: { params: Promise<{ id: string; stage: string }> }
) {
    try {
        const { id, stage } = await context.params;
        if (!isValidStage(stage)) {
            return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
        }
        const { action, version, versions, keepCount } = await req.json();

        if (action === "rollback") {
            if (!version) {
                return NextResponse.json({ error: "version required" }, { status: 400 });
            }
            const target = await versionManager.rollback(id, stage, Number(version));
            return NextResponse.json({ success: true, version: target });
        }

        if (action === "delete") {
            if (!version) {
                return NextResponse.json({ error: "version required" }, { status: 400 });
            }
            await versionManager.deleteVersion(id, stage, Number(version));
            return NextResponse.json({ success: true, message: `Version ${version} deleted` });
        }

        if (action === "deleteMultiple") {
            if (!Array.isArray(versions) || versions.length === 0) {
                return NextResponse.json({ error: "versions array required" }, { status: 400 });
            }
            const deletedCount = await versionManager.deleteVersions(id, stage, versions.map((v: any) => Number(v)));
            return NextResponse.json({ success: true, deletedCount, message: `Deleted ${deletedCount} version(s)` });
        }

        if (action === "cleanup") {
            const keep = keepCount ? Number(keepCount) : 10;
            const deletedCount = await versionManager.cleanupOldVersions(id, stage, keep);
            return NextResponse.json({ success: true, deletedCount, message: `Cleaned up ${deletedCount} old version(s), kept latest ${keep}` });
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

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { stageService } from "@/lib/stage";

export async function POST(
    req: Request,
    context: { params: Promise<{ id: string; stageId: string }> }
) {
    try {
        await connectDB();
        // Next.js 15: params is a Promise, need to await it
        const params = await context.params;
        await stageService.completeStage(params.id, params.stageId as any);
        const progress = await stageService.updateProgress(params.id);
        return NextResponse.json({ success: true, progress });
    } catch (error: any) {
        console.error("[Stage Complete POST] error:", error);
        const message = error?.message || "Failed to complete stage";
        const status = message.includes("Invalid stage") ? 400 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}

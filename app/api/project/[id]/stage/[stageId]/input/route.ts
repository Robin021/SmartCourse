import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { stageService } from "@/lib/stage";

export async function POST(
    req: Request,
    context: { params: { id: string; stageId: string } | Promise<{ id: string; stageId: string }> }
) {
    try {
        const { input } = await req.json();
        await connectDB();
        const params = await context.params;
        await stageService.saveStageInput(params.id, params.stageId as any, input || {});
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[Stage Input POST] error:", error);
        const message = error?.message || "Failed to save stage input";
        const status = message.includes("Invalid stage") ? 400 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}

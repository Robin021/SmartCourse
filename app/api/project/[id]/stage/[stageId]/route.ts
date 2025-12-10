import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { stageService } from "@/lib/stage";

export async function GET(
    req: Request,
    context: { params: { id: string; stageId: string } | Promise<{ id: string; stageId: string }> }
) {
    try {
        await connectDB();
        const params = await context.params;
        const stage = await stageService.getStageData(params.id, params.stageId as any);
        return NextResponse.json({ success: true, stage });
    } catch (error: any) {
        console.error("[Stage GET] error:", error);
        const message = error?.message || "Failed to fetch stage data";
        const status = message.includes("Invalid stage") ? 400 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}

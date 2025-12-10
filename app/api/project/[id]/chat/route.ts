import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Project from "@/models/Project";

function getKey(stageId?: string) {
    return stageId ? `stage:${stageId}` : "default";
}

export async function GET(
    req: Request,
    context: { params: { id: string } | Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const stage = searchParams.get("stage") || undefined;
        const params = await context.params;
        const project = await Project.findById(params.id).lean();
        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        const key = getKey(stage);
        const session = (project.conversation_sessions as any)?.[key];
        const messages = session?.messages || [];

        return NextResponse.json({ success: true, messages });
    } catch (error: any) {
        console.error("[Project Chat] GET error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch conversation" },
            { status: 500 }
        );
    }
}

export async function POST(
    req: Request,
    context: { params: { id: string } | Promise<{ id: string }> }
) {
    try {
        const params = await context.params;
        const { messages, stageId } = await req.json();
        await connectDB();
        const project = await Project.findById(params.id);

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        const key = getKey(stageId);
        const trimmed = (messages || []).slice(-10);
        const sessions = project.conversation_sessions || {};
        (sessions as any)[key] = { messages: trimmed, updated_at: new Date() };
        project.conversation_sessions = sessions as any;
        project.markModified("conversation_sessions");
        await project.save();

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[Project Chat] POST error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to save conversation" },
            { status: 500 }
        );
    }
}

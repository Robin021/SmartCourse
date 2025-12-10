import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Project from "@/models/Project";
import StageConfig from "@/models/StageConfig";
import { stageService } from "@/lib/stage";

export async function GET(
    req: Request,
    context: { params: { id: string } | Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const params = await context.params;
        const { id } = params;

        const project = await Project.findById(id).lean();
        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        // Get config to align stage order
        const config = await StageConfig.findOne({ version: project.config_version }).lean();
        const configStages = config?.stages || [];

        const normalizeStatus = (status?: string) => {
            if (!status) return "NOT_STARTED";
            const upper = status.toUpperCase();
            if (upper === "COMPLETED") return "COMPLETED";
            if (upper === "IN_PROGRESS") return "IN_PROGRESS";
            return "NOT_STARTED";
        };

        const mergedStages = configStages.map((stageDef: any) => {
            const projectStage = project.stages?.[stageDef.stage_id] || {};
            return {
                stage_id: stageDef.stage_id,
                name: stageDef.name,
                status: normalizeStatus(projectStage.status),
            };
        });

        const overall =
            typeof project.overall_progress === "number"
                ? project.overall_progress
                : stageService.calculateProgress(project.stages || {});

        return NextResponse.json({
            success: true,
            progress: overall,
            stages: mergedStages,
        });
    } catch (error: any) {
        console.error("[Progress] error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch progress" },
            { status: 500 }
        );
    }
}

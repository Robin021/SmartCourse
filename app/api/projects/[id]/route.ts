import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Project from "@/models/Project";
import StageConfig from "@/models/StageConfig";

export async function GET(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const params = await context.params;
        const { id } = params;

        const project = await Project.findById(id).lean();

        if (!project) {
            return NextResponse.json(
                { error: "Project not found" },
                { status: 404 }
            );
        }

        // Fetch the config version used by the project
        const config = await StageConfig.findOne({
            version: project.config_version,
        }).lean();

        if (!config) {
            return NextResponse.json(
                { error: "Configuration not found" },
                { status: 404 }
            );
        }

        const normalizeStatus = (status?: string) => {
            if (!status) return "NOT_STARTED";
            const upper = status.toUpperCase();
            if (upper === "COMPLETED") return "COMPLETED";
            if (upper === "IN_PROGRESS") return "IN_PROGRESS";
            return "NOT_STARTED";
        };

        // Merge stage definitions with project status
        const stages = config.stages.map((stageDef: any) => {
            const projectStage = project.stages[stageDef.stage_id] || {};
            return {
                ...stageDef,
                status: normalizeStatus(projectStage.status),
                last_updated: (projectStage as any).updatedAt ?? (projectStage as any).updated_at,
            };
        });

        return NextResponse.json({
            success: true,
            project: {
                ...project,
                stages, // Replaced with merged stages
            },
        });
    } catch (error: any) {
        console.error("Get project error:", error);
        return NextResponse.json(
            { error: "Failed to fetch project" },
            { status: 500 }
        );
    }
}

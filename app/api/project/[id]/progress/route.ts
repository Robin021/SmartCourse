import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Project from "@/models/Project";
import StageConfig from "@/models/StageConfig";
import { stageService } from "@/lib/stage";

// Default stage definitions when StageConfig is not available
const DEFAULT_STAGES = [
    { stage_id: "Q1", name: "学校课程情境" },
    { stage_id: "Q2", name: "教育哲学" },
    { stage_id: "Q3", name: "办学理念" },
    { stage_id: "Q4", name: "育人目标" },
    { stage_id: "Q5", name: "课程命名" },
    { stage_id: "Q6", name: "课程理念" },
    { stage_id: "Q7", name: "目标细化" },
    { stage_id: "Q8", name: "结构设计" },
    { stage_id: "Q9", name: "实施方案" },
    { stage_id: "Q10", name: "评价体系" },
];

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
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        // Get config to align stage order, ALWAYS use DEFAULT_STAGES as base to ensure all 10 stages
        // StageConfig may have incomplete data, so we merge it with defaults
        const config = await StageConfig.findOne({ version: project.config_version }).lean();
        const dbStages = config?.stages || [];
        
        // Create a map of database stage configs for quick lookup
        const dbStageMap = new Map(dbStages.map((s: any) => [s.stage_id, s]));
        
        // Always use DEFAULT_STAGES as base, merge with db config if available
        const configStages = DEFAULT_STAGES.map(defaultStage => {
            const dbStage = dbStageMap.get(defaultStage.stage_id);
            return dbStage ? { ...defaultStage, ...dbStage } : defaultStage;
        });

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

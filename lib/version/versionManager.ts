import connectDB from "@/lib/db";
import StageVersion, {
    createVersion,
    getVersion,
    getVersionHistory,
    StageId,
    type CreateVersionInput,
} from "@/models/StageVersion";
import Project from "@/models/Project";
import { stageService } from "@/lib/stage";

/**
 * VersionManager
 * - List versions
 * - Rollback to a specific version
 * - Helper to create versions (wraps model helper)
 */
export class VersionManager {
    async listVersions(projectId: string, stage: StageId, limit = 20) {
        await connectDB();
        return getVersionHistory(projectId, stage, limit);
    }

    async create(input: CreateVersionInput) {
        await connectDB();
        return createVersion(input);
    }

    async rollback(projectId: string, stage: StageId, version: number) {
        await connectDB();
        const target = await getVersion(projectId, stage, version);
        if (!target) {
            throw new Error(`Version ${version} not found for ${stage}`);
        }

        const project = await Project.findById(projectId);
        if (!project) {
            throw new Error("Project not found");
        }

        if (!project.stages) project.stages = {} as any;
        if (!project.stages[stage]) project.stages[stage] = { status: "in_progress" };

        project.stages[stage].output = target.content;
        project.stages[stage].status = "completed";
        project.stages[stage].current_version_id = `${version}`;
        project.markModified("stages");
        await project.save();

        // Recalculate overall progress
        await stageService.updateProgress(projectId);

        return target;
    }
}

export const versionManager = new VersionManager();

export default versionManager;

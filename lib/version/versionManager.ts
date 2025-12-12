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

        // Handle version content structure
        // Version content can be:
        // 1. String: direct text content
        // 2. Object: { text: string, keywords: [], ... }
        // We need to convert it to the output format expected by the frontend
        const versionContent = target.content;
        let restoredOutput: any;

        if (typeof versionContent === 'string') {
            // Simple string content
            restoredOutput = {
                report: versionContent,
                content: versionContent,
            };
        } else if (versionContent && typeof versionContent === 'object') {
            // Object structure - preserve all fields and ensure report/content are set
            restoredOutput = {
                ...versionContent,
                // Extract text if it exists, otherwise use the whole object
                report: versionContent.text || versionContent.report || versionContent.content || JSON.stringify(versionContent),
                content: versionContent.text || versionContent.content || versionContent.report || JSON.stringify(versionContent),
            };
        } else {
            // Fallback
            restoredOutput = {
                report: String(versionContent || ''),
                content: String(versionContent || ''),
            };
        }

        project.stages[stage].output = restoredOutput;
        project.stages[stage].status = "completed";
        project.stages[stage].current_version_id = `${version}`;
        project.markModified("stages");
        await project.save();

        // Recalculate overall progress
        await stageService.updateProgress(projectId);

        return target;
    }

    /**
     * Delete a specific version
     */
    async deleteVersion(projectId: string, stage: StageId, version: number): Promise<void> {
        await connectDB();
        const result = await StageVersion.deleteOne({
            project_id: projectId,
            stage,
            version,
        });
        if (result.deletedCount === 0) {
            throw new Error(`Version ${version} not found for ${stage}`);
        }
    }

    /**
     * Delete multiple versions
     */
    async deleteVersions(projectId: string, stage: StageId, versions: number[]): Promise<number> {
        await connectDB();
        const result = await StageVersion.deleteMany({
            project_id: projectId,
            stage,
            version: { $in: versions },
        });
        return result.deletedCount || 0;
    }

    /**
     * Clean up old versions, keeping only the latest N versions
     */
    async cleanupOldVersions(projectId: string, stage: StageId, keepCount: number = 10): Promise<number> {
        await connectDB();
        
        // Get all versions sorted by version number (descending)
        const allVersions = await getVersionHistory(projectId, stage, 1000); // Get a large number
        
        if (allVersions.length <= keepCount) {
            return 0; // No cleanup needed
        }

        // Sort by version number descending
        const sorted = allVersions.sort((a, b) => b.version - a.version);
        
        // Keep the latest N versions
        const toKeep = sorted.slice(0, keepCount);
        const toDelete = sorted.slice(keepCount);
        
        if (toDelete.length === 0) {
            return 0;
        }

        const versionsToDelete = toDelete.map(v => v.version);
        const result = await StageVersion.deleteMany({
            project_id: projectId,
            stage,
            version: { $in: versionsToDelete },
        });
        
        return result.deletedCount || 0;
    }
}

export const versionManager = new VersionManager();

export default versionManager;

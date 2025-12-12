/**
 * Stage Service - Data management for the 10-stage curriculum design workflow
 * 
 * Handles stage data persistence, progress tracking, and context management.
 */

import Project, { IProject } from "@/models/Project";

// Valid stage identifiers
export const VALID_STAGES = ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "Q7", "Q8", "Q9", "Q10"] as const;
export type StageId = typeof VALID_STAGES[number];

export type StageStatus = "not_started" | "in_progress" | "completed";

export interface StageData {
    status: StageStatus;
    input?: Record<string, any>;
    output?: Record<string, any>;
    current_version_id?: string;
    completed_at?: Date;
    diagnostic_score?: {
        overall: number;
        dimensions?: Record<string, number>;
    };
}

export interface PreviousStageContext {
    stage: StageId;
    output: Record<string, any>;
    completed_at?: Date;
}

/**
 * StageService class for managing stage data in projects
 */
export class StageService {
    /**
     * Normalize stage id to canonical uppercase and validate.
     */
    private normalizeStage(stage: string): StageId {
        const normalized = (stage || "").toUpperCase();
        if (!VALID_STAGES.includes(normalized as StageId)) {
            throw new Error(`Invalid stage: ${stage}. Must be one of: ${VALID_STAGES.join(", ")}`);
        }
        return normalized as StageId;
    }

    /**
     * Get stage data for a specific project and stage
     */
    async getStageData(projectId: string, stage: StageId): Promise<StageData> {
        const normalizedStage = this.normalizeStage(stage);
        
        const project = await Project.findById(projectId);
        if (!project) {
            throw new Error(`Project not found: ${projectId}`);
        }

        const stageData = project.stages?.[normalizedStage];
        
        return {
            status: stageData?.status || "not_started",
            input: stageData?.input,
            output: stageData?.output,
            current_version_id: stageData?.current_version_id,
            completed_at: stageData?.completed_at,
            diagnostic_score: stageData?.diagnostic_score,
        };
    }


    /**
     * Save user input for a specific stage
     * Updates status to "in_progress" if currently "not_started"
     */
    async saveStageInput(
        projectId: string,
        stage: StageId,
        input: Record<string, any>
    ): Promise<void> {
        const normalizedStage = this.normalizeStage(stage);

        const project = await Project.findById(projectId);
        if (!project) {
            throw new Error(`Project not found: ${projectId}`);
        }

        // Initialize stages object if needed
        if (!project.stages) {
            project.stages = {};
        }

        // Initialize stage data if needed
        if (!project.stages[normalizedStage]) {
            project.stages[normalizedStage] = { status: "not_started" };
        }

        // Update input
        project.stages[normalizedStage].input = input;

        // Update status to in_progress if not_started
        const currentStatus = (project.stages[normalizedStage].status || "").toString().toLowerCase();
        if (currentStatus === "not_started" || currentStatus === "not started") {
            project.stages[normalizedStage].status = "in_progress";
        }

        // Mark stages as modified for Mongoose
        project.markModified("stages");
        await project.save();
    }

    /**
     * Save AI-generated output for a specific stage
     */
    async saveStageOutput(
        projectId: string,
        stage: StageId,
        output: Record<string, any>,
        diagnosticScore?: { overall: number; dimensions?: Record<string, number> }
    ): Promise<void> {
        const normalizedStage = this.normalizeStage(stage);

        const project = await Project.findById(projectId);
        if (!project) {
            throw new Error(`Project not found: ${projectId}`);
        }

        if (!project.stages) {
            project.stages = {};
        }

        if (!project.stages[normalizedStage]) {
            project.stages[normalizedStage] = { status: "in_progress" };
        }

        project.stages[normalizedStage].output = output;
        
        if (diagnosticScore) {
            project.stages[normalizedStage].diagnostic_score = diagnosticScore;
        }

        project.markModified("stages");
        await project.save();
    }

    /**
     * Mark a stage as completed
     * Records completion timestamp
     */
    async completeStage(projectId: string, stage: StageId): Promise<void> {
        const normalizedStage = this.normalizeStage(stage);

        const project = await Project.findById(projectId);
        if (!project) {
            throw new Error(`Project not found: ${projectId}`);
        }

        if (!project.stages) {
            project.stages = {};
        }

        if (!project.stages[normalizedStage]) {
            project.stages[normalizedStage] = { status: "not_started" };
        }

        project.stages[normalizedStage].status = "completed";
        project.stages[normalizedStage].completed_at = new Date();

        // Update overall progress
        project.overall_progress = this.calculateProgress(project.stages);

        project.markModified("stages");
        await project.save();
    }


    /**
     * Get context from all completed previous stages
     * For stage Qn, returns outputs from Q1 through Q(n-1) that are completed
     */
    async getPreviousStagesContext(
        projectId: string,
        currentStage: StageId
    ): Promise<PreviousStageContext[]> {
        const normalizedStage = this.normalizeStage(currentStage);

        const project = await Project.findById(projectId);
        if (!project) {
            throw new Error(`Project not found: ${projectId}`);
        }

        const currentIndex = VALID_STAGES.indexOf(normalizedStage);
        const previousStages = VALID_STAGES.slice(0, currentIndex);
        const context: PreviousStageContext[] = [];

        for (const stage of previousStages) {
            const stageData = project.stages?.[stage];
            if (stageData?.status === "completed" && stageData.output) {
                context.push({
                    stage,
                    output: stageData.output,
                    completed_at: stageData.completed_at,
                });
            }
        }

        return context;
    }

    /**
     * Update overall progress based on completed stages
     * Progress = (completed stages / 10) * 100
     */
    async updateProgress(projectId: string): Promise<number> {
        const project = await Project.findById(projectId);
        if (!project) {
            throw new Error(`Project not found: ${projectId}`);
        }

        const progress = this.calculateProgress(project.stages || {});
        project.overall_progress = progress;
        await project.save();

        return progress;
    }

    /**
     * Calculate progress percentage from stages data
     * Pure function for testability
     */
    calculateProgress(stages: Record<string, any>): number {
        let completedCount = 0;
        
        for (const stage of VALID_STAGES) {
            if (stages[stage]?.status === "completed") {
                completedCount++;
            }
        }

        return (completedCount / VALID_STAGES.length) * 100;
    }

}

// Export singleton instance
export const stageService = new StageService();

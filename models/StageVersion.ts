import mongoose, { Schema, Document, Model, Types } from "mongoose";

/**
 * StageVersion Model
 * 
 * Tracks version history for each stage's content in a project.
 * Supports both AI-generated and manually edited versions.
 * 
 * Requirements: 15.1, 15.2, 15.3, 15.4
 */

// Valid stage identifiers (Q1-Q10)
export const VALID_STAGES = [
    "Q1", "Q2", "Q3", "Q4", "Q5",
    "Q6", "Q7", "Q8", "Q9", "Q10"
] as const;

export type StageId = typeof VALID_STAGES[number];

// Author information for version tracking
export interface IVersionAuthor {
    user_id: string;
    name: string;
}

// Token usage tracking for AI generations
export interface ITokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

// RAG search result reference
export interface IRagResultRef {
    document_id: string;
    chunk_id?: string;
    score: number;
    content_preview?: string;
}

// Metadata for AI-generated versions
export interface IGenerationMetadata {
    prompt_used: string;
    rag_results: IRagResultRef[];
    token_usage: ITokenUsage;
    model?: string;
    temperature?: number;
}

// Main StageVersion interface
export interface IStageVersion extends Document {
    project_id: Types.ObjectId;
    stage: StageId;
    version: number;
    content: any;
    author: IVersionAuthor;
    change_note?: string;
    is_ai_generated: boolean;
    generation_metadata?: IGenerationMetadata;
    created_at: Date;
}

// Input type for creating a new version
export interface CreateVersionInput {
    project_id: string | Types.ObjectId;
    stage: StageId;
    content: any;
    author: IVersionAuthor;
    change_note?: string;
    is_ai_generated: boolean;
    generation_metadata?: IGenerationMetadata;
}

// Sub-schemas
const VersionAuthorSchema = new Schema({
    user_id: { type: String, required: true },
    name: { type: String, required: true },
}, { _id: false });

const TokenUsageSchema = new Schema({
    promptTokens: { type: Number, required: true },
    completionTokens: { type: Number, required: true },
    totalTokens: { type: Number, required: true },
}, { _id: false });

const RagResultRefSchema = new Schema({
    document_id: { type: String, required: true },
    chunk_id: { type: String },
    score: { type: Number, required: true },
    content_preview: { type: String },
}, { _id: false });

const GenerationMetadataSchema = new Schema({
    prompt_used: { type: String, required: true },
    rag_results: { type: [RagResultRefSchema], default: [] },
    token_usage: { type: TokenUsageSchema, required: true },
    model: { type: String },
    temperature: { type: Number },
}, { _id: false });

// Main schema
const StageVersionSchema: Schema = new Schema(
    {
        project_id: { 
            type: Schema.Types.ObjectId, 
            ref: "Project",
            required: true,
            index: true,
        },
        stage: { 
            type: String, 
            enum: VALID_STAGES,
            required: true,
        },
        version: { 
            type: Number, 
            required: true,
            min: 1,
        },
        content: { 
            type: Schema.Types.Mixed, 
            required: true,
        },
        author: { 
            type: VersionAuthorSchema, 
            required: true,
        },
        change_note: { type: String },
        is_ai_generated: { 
            type: Boolean, 
            required: true,
            default: false,
        },
        generation_metadata: { 
            type: GenerationMetadataSchema,
        },
        created_at: { 
            type: Date, 
            default: Date.now,
            index: true,
        },
    },
    { 
        timestamps: false, // We use created_at manually
        collection: "stage_versions",
    }
);

// Compound index for efficient queries (project_id + stage + version)
StageVersionSchema.index(
    { project_id: 1, stage: 1, version: 1 }, 
    { unique: true }
);

// Index for querying versions by project and stage
StageVersionSchema.index({ project_id: 1, stage: 1, created_at: -1 });

/**
 * Validation helper - validates that AI-generated versions have generation_metadata
 * This is called in createVersion before saving
 */
export function validateVersionInput(input: CreateVersionInput): void {
    if (input.is_ai_generated && !input.generation_metadata) {
        throw new Error("AI-generated versions must include generation_metadata");
    }
}

const StageVersion: Model<IStageVersion> =
    mongoose.models.StageVersion ||
    mongoose.model<IStageVersion>("StageVersion", StageVersionSchema);

// Export both named and default for flexibility
export { StageVersion };
export default StageVersion;

/**
 * Helper functions for version management
 * These are exported separately to avoid complex static method typing
 */

/**
 * Get the next version number for a project/stage
 */
export async function getNextVersionNumber(
    projectId: string | Types.ObjectId,
    stage: StageId
): Promise<number> {
    const latestVersion = await StageVersion.findOne(
        { project_id: projectId, stage },
        { version: 1 },
        { sort: { version: -1 } }
    );
    return latestVersion ? latestVersion.version + 1 : 1;
}

/**
 * Create a new version with auto-incremented version number
 */
export async function createVersion(
    input: CreateVersionInput
): Promise<IStageVersion> {
    // Validate input before creating
    validateVersionInput(input);
    
    const nextVersion = await getNextVersionNumber(
        input.project_id,
        input.stage
    );
    
    const versionDoc = new StageVersion({
        ...input,
        version: nextVersion,
        created_at: new Date(),
    });
    
    const saved = await versionDoc.save();
    return saved as IStageVersion;
}

/**
 * Get version history for a project/stage
 */
export async function getVersionHistory(
    projectId: string | Types.ObjectId,
    stage: StageId,
    limit: number = 20
): Promise<IStageVersion[]> {
    return StageVersion.find(
        { project_id: projectId, stage },
        null,
        { sort: { version: -1 }, limit }
    );
}

/**
 * Get a specific version
 */
export async function getVersion(
    projectId: string | Types.ObjectId,
    stage: StageId,
    version: number
): Promise<IStageVersion | null> {
    return StageVersion.findOne({ project_id: projectId, stage, version });
}

/**
 * Validates if a stage identifier is valid
 */
export function isValidStage(stage: string): stage is StageId {
    return VALID_STAGES.includes(stage as StageId);
}

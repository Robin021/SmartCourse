import mongoose, { Schema, Document, Model, Types } from "mongoose";

// Stage status type
export type StageStatus = 'not_started' | 'in_progress' | 'completed';

// Diagnostic score interface
export interface IDiagnosticScore {
    overall: number; // 0-100
    dimensions?: Record<string, number>;
}

// Stage data interface
export interface IStageData {
    status: StageStatus;
    input?: any;
    output?: any;
    current_version_id?: string;
    completed_at?: Date;
    diagnostic_score?: IDiagnosticScore;
}

// Conversation message interface
export interface IConversationMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

// Conversation session interface
export interface IConversationSession {
    messages: IConversationMessage[];
}

// Stages map type (Q1-Q10)
export type StagesMap = {
    [key: string]: IStageData;
};

// Conversation sessions map type
export type ConversationSessionsMap = {
    [stage: string]: IConversationSession;
};

export interface IProject extends Document {
    tenant_id: string;
    school_id: string;
    name: string;
    config_version: string;
    current_stage: string;
    overall_progress: number;
    stages: StagesMap;
    conversation_sessions: ConversationSessionsMap;
    audit_log: any[];
    createdAt?: Date;
    updatedAt?: Date;
}

// Sub-schemas for better structure
const DiagnosticScoreSchema = new Schema({
    overall: { type: Number, min: 0, max: 100 },
    dimensions: { type: Schema.Types.Mixed }
}, { _id: false });

const StageDataSchema = new Schema({
    status: { 
        type: String, 
        enum: ['not_started', 'in_progress', 'completed'],
        default: 'not_started'
    },
    input: { type: Schema.Types.Mixed, default: null },
    output: { type: Schema.Types.Mixed, default: null },
    current_version_id: { type: String },
    completed_at: { type: Date },
    diagnostic_score: DiagnosticScoreSchema
}, { _id: false });

const ConversationMessageSchema = new Schema({
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
}, { _id: false });

const ConversationSessionSchema = new Schema({
    messages: [ConversationMessageSchema]
}, { _id: false });

const ProjectSchema: Schema = new Schema(
    {
        tenant_id: { type: String, required: true },
        school_id: { type: String, required: true },
        name: { type: String, required: true },
        config_version: { type: String, required: true },
        current_stage: { type: String, default: "Q1" },
        overall_progress: { type: Number, default: 0, min: 0, max: 100 },
        stages: { type: Schema.Types.Mixed, default: {} },
        conversation_sessions: { type: Schema.Types.Mixed, default: {} },
        audit_log: [{ type: Schema.Types.Mixed }],
    },
    { timestamps: true }
);

// Helper function to create default stage data
export function createDefaultStageData(): IStageData {
    return {
        status: 'not_started',
        input: null,
        output: null
    };
}

// Helper function to initialize all stages (Q1-Q10)
export function initializeStages(): StagesMap {
    const stages: StagesMap = {};
    for (let i = 1; i <= 10; i++) {
        stages[`Q${i}`] = createDefaultStageData();
    }
    return stages;
}

// Helper function to calculate overall progress
export function calculateOverallProgress(stages: StagesMap): number {
    const stageKeys = Object.keys(stages).filter(key => /^Q([1-9]|10)$/.test(key));
    if (stageKeys.length === 0) return 0;
    
    const completedCount = stageKeys.filter(
        key => stages[key]?.status === 'completed'
    ).length;
    
    return Math.round((completedCount / 10) * 100);
}

const Project: Model<IProject> =
    mongoose.models.Project || mongoose.model<IProject>("Project", ProjectSchema);

export default Project;

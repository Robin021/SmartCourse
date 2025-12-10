import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStageConfig extends Document {
    version: string;
    status: "DRAFT" | "ACTIVE" | "ARCHIVED";
    effective_date: Date;
    created_by: string;
    global_settings: {
        rag_exclude_keywords: string[];
        default_llm_model: string;
    };
    stages: any[]; // Using any for complexity, can be refined
}

const StageConfigSchema: Schema = new Schema(
    {
        version: { type: String, required: true, unique: true },
        status: {
            type: String,
            enum: ["DRAFT", "ACTIVE", "ARCHIVED"],
            default: "DRAFT",
        },
        effective_date: { type: Date, default: Date.now },
        created_by: { type: String, required: true },
        global_settings: {
            rag_exclude_keywords: [{ type: String }],
            default_llm_model: { type: String, default: "gpt-4" },
        },
        stages: [{ type: Schema.Types.Mixed }],
    },
    { timestamps: true }
);

const StageConfig: Model<IStageConfig> =
    mongoose.models.StageConfig ||
    mongoose.model<IStageConfig>("StageConfig", StageConfigSchema);

export default StageConfig;

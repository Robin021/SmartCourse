import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILLMProvider {
    _id?: string;
    name: string;
    provider: string; // e.g. 'openai', 'deepseek', 'azure'
    type: "chat" | "embedding";
    base_url: string;
    api_key: string;
    model: string;
    is_active: boolean;
}

export interface IStorageProvider {
    _id?: string;
    name: string; // Friendly name e.g. "Dev MinIO"
    provider: "s3" | "minio" | "aliyun" | "local";
    endpoint: string;
    region: string;
    bucket: string;
    access_key: string;
    secret_key: string;
    is_active: boolean;
}

export interface ISystemConfig extends Document {
    llm_providers: ILLMProvider[];
    storage_providers: IStorageProvider[];
    updated_by: string;
}

const SystemConfigSchema: Schema = new Schema(
    {
        llm_providers: [
            {
                name: { type: String, required: true },
                provider: { type: String, default: "other" },
                type: {
                    type: String,
                    enum: ["chat", "embedding"],
                    default: "chat",
                },
                base_url: { type: String, required: true },
                api_key: { type: String, required: true },
                model: { type: String, required: true },
                is_active: { type: Boolean, default: false },
            },
        ],
        storage_providers: [
            {
                name: { type: String, required: true },
                provider: {
                    type: String,
                    enum: ["s3", "minio", "aliyun", "local"],
                    default: "local",
                },
                endpoint: { type: String, default: "" },
                region: { type: String, default: "us-east-1" },
                bucket: { type: String, default: "" },
                access_key: { type: String, default: "" },
                secret_key: { type: String, default: "" },
                is_active: { type: Boolean, default: false },
            },
        ],
        updated_by: { type: String },
    },
    { timestamps: true }
);

const SystemConfig: Model<ISystemConfig> =
    mongoose.models.SystemConfig ||
    mongoose.model<ISystemConfig>("SystemConfig", SystemConfigSchema);

export default SystemConfig;

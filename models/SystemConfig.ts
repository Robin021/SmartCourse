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
    max_output_tokens?: number;
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

export interface IWebSearchConfig {
    enabled: boolean;
    serper_api_key: string;
    firecrawl_api_key: string;
    jina_api_key: string;
    max_k: number;
    language: string;
    region: string;
    use_firecrawl: boolean;
    use_jina: boolean;
}

export interface ISystemConfig extends Document {
    llm_providers: ILLMProvider[];
    storage_providers: IStorageProvider[];
    web_search?: IWebSearchConfig;
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
                max_output_tokens: { type: Number, default: 2000 },
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
        web_search: {
            enabled: { type: Boolean, default: false },
            serper_api_key: { type: String, default: "" },
            firecrawl_api_key: { type: String, default: "" },
            jina_api_key: { type: String, default: "" },
            max_k: { type: Number, default: 5 },
            language: { type: String, default: "zh-CN" },
            region: { type: String, default: "" },
            use_firecrawl: { type: Boolean, default: true },
            use_jina: { type: Boolean, default: true },
        },
        updated_by: { type: String },
    },
    { timestamps: true }
);

const SystemConfig: Model<ISystemConfig> =
    mongoose.models.SystemConfig ||
    mongoose.model<ISystemConfig>("SystemConfig", SystemConfigSchema);

export default SystemConfig;

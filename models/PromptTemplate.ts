import mongoose, { Schema, Document, Model } from "mongoose";

export interface IABTestVersion {
    version: number;
    weight: number; // 0-100 percentage
}

export interface IPromptTemplate extends Document {
    name: string;
    key: string;
    template: string;
    variables: string[];
    description: string;
    is_system: boolean;
    current_version: number;
    ab_testing: {
        enabled: boolean;
        versions: IABTestVersion[];
    };
}

const PromptTemplateSchema: Schema = new Schema(
    {
        name: { type: String, required: true },
        key: { type: String, required: true, unique: true },
        template: { type: String, required: true },
        variables: [{ type: String }],
        description: { type: String, default: "" },
        is_system: { type: Boolean, default: false },
        current_version: { type: Number, default: 1 },
        ab_testing: {
            enabled: { type: Boolean, default: false },
            versions: [{
                version: { type: Number },
                weight: { type: Number, default: 50 },
            }],
        },
    },
    { timestamps: true }
);

const PromptTemplate: Model<IPromptTemplate> =
    mongoose.models.PromptTemplate ||
    mongoose.model<IPromptTemplate>("PromptTemplate", PromptTemplateSchema);

export default PromptTemplate;

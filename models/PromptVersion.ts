import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPromptVersion extends Document {
    prompt_id: mongoose.Types.ObjectId;
    version: number;
    template: string;
    variables: string[];
    created_by: string;
    change_note: string;
}

const PromptVersionSchema: Schema = new Schema(
    {
        prompt_id: { type: Schema.Types.ObjectId, ref: "PromptTemplate", required: true },
        version: { type: Number, required: true },
        template: { type: String, required: true },
        variables: [{ type: String }],
        created_by: { type: String, default: "system" },
        change_note: { type: String, default: "" },
    },
    { timestamps: true }
);

// Compound index for efficient lookups
PromptVersionSchema.index({ prompt_id: 1, version: -1 });

const PromptVersion: Model<IPromptVersion> =
    mongoose.models.PromptVersion ||
    mongoose.model<IPromptVersion>("PromptVersion", PromptVersionSchema);

export default PromptVersion;

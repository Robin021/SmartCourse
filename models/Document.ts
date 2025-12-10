import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDocument extends Document {
    filename: string;
    original_name: string;
    mime_type: string;
    size: number;
    s3_key: string;
    status: "pending" | "processing" | "processed" | "error";
    chunk_count: number;
    uploaded_by: string;
    stage_ids?: string[];
}

const DocumentSchema: Schema = new Schema(
    {
        filename: { type: String, required: true },
        original_name: { type: String, required: true },
        mime_type: { type: String, required: true },
        size: { type: Number, required: true },
        s3_key: { type: String, required: true },
        status: {
            type: String,
            enum: ["pending", "processing", "processed", "error"],
            default: "pending",
        },
        chunk_count: { type: Number, default: 0 },
        uploaded_by: { type: String },
        stage_ids: { type: [String], default: [] },
    },
    { timestamps: true }
);

const DocumentModel: Model<IDocument> =
    mongoose.models.Document || mongoose.model<IDocument>("Document", DocumentSchema);

export default DocumentModel;
